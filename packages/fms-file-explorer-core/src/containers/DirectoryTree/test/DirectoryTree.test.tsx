import {
    configureMockStore,
    createMockHttpClient,
    mergeState,
    ResponseStub,
} from "@aics/redux-utils";
import { expect } from "chai";
import { get as _get, tail } from "lodash";
import * as React from "react";
import { fireEvent, render, wait } from "@testing-library/react";
import { Provider } from "react-redux";
import { createSandbox } from "sinon";

import DirectoryTree from "../";
import Annotation from "../../../entity/Annotation";
import AnnotationService from "../../../services/AnnotationService";
import { initialState, interaction, reducer, reduxLogics } from "../../../state";
import FileService from "../../../services/FileService";
import { addFileFilter } from "../../../state/selection/actions";
import FileFilter from "../../../entity/FileFilter";

describe("<DirectoryTree />", () => {
    const sandbox = createSandbox();

    // SO MUCH SETUP
    const expectedTopLevelHierarchyValues = ["first", "second", "third", "fourth"];
    const expectedSecondLevelHierarchyValues = ["a", "b", "c"];

    const annotations = [
        new Annotation(
            {
                annotationDisplayName: "Foo",
                annotationName: "foo",
                description: "",
                type: "Text",
            },
            expectedTopLevelHierarchyValues
        ),
        new Annotation(
            {
                annotationDisplayName: "Bar",
                annotationName: "bar",
                description: "",
                type: "Text",
            },
            expectedSecondLevelHierarchyValues
        ),
    ];

    const baseUrl = "test";
    const state = mergeState(initialState, {
        interaction: {
            fileExplorerServiceBaseUrl: baseUrl,
        },
        selection: {
            annotationHierarchy: annotations,
        },
    });

    const responseStubs: ResponseStub[] = [
        {
            when: (config) =>
                _get(config, "url", "").includes(
                    AnnotationService.BASE_ANNOTATION_HIERARCHY_ROOT_URL
                ),
            respondWith: {
                data: { data: expectedTopLevelHierarchyValues },
            },
        },
        {
            when: (config) =>
                _get(config, "url", "").includes(
                    AnnotationService.BASE_ANNOTATION_HIERARCHY_UNDER_PATH_URL
                ),
            respondWith: {
                data: { data: expectedSecondLevelHierarchyValues },
            },
        },
        {
            when: (config) => _get(config, "url", "").includes(FileService.BASE_FILE_COUNT_URL),
            respondWith: {
                data: { data: [42] },
            },
        },
    ];
    const mockHttpClient = createMockHttpClient(responseStubs);
    const annotationService = new AnnotationService({ baseUrl, httpClient: mockHttpClient });
    const fileService = new FileService({ baseUrl, httpClient: mockHttpClient });

    before(() => {
        sandbox.stub(interaction.selectors, "getAnnotationService").returns(annotationService);
        sandbox.stub(interaction.selectors, "getFileService").returns(fileService);
    });

    afterEach(() => {
        sandbox.resetHistory();
    });

    after(() => {
        sandbox.restore();
    });

    it("renders the top level of the hierarchy", async () => {
        const { store } = configureMockStore({ state, responseStubs });

        const { getByText, findAllByRole } = render(
            <Provider store={store}>
                <DirectoryTree />
            </Provider>
        );

        // wait for the requests for data
        const directoryTreeNodes = await findAllByRole("treeitem");

        // expect the top level annotation values to be in the dom
        expect(directoryTreeNodes.length).to.equal(4);
        expectedTopLevelHierarchyValues.forEach((value) => {
            expect(getByText(value)).to.exist.and.to.be.instanceOf(HTMLElement);
        });
    });

    it("collapses and expands sub-levels of the annotation hierarchy", async () => {
        const { store } = configureMockStore({ state, responseStubs });

        const { getByText, findByText } = render(
            <Provider store={store}>
                <DirectoryTree />
            </Provider>
        );

        // wait for the requests for annotation values at the top level of the hierarchy
        const topLevelValue = await findByText(expectedTopLevelHierarchyValues[0]);

        // click on the tree item
        fireEvent.click(topLevelValue);

        // it's children should appear
        await findByText(expectedSecondLevelHierarchyValues[2]);

        // click the tree item again and its children should disappear
        fireEvent.click(topLevelValue);

        // getByText will throw if it can't find the element
        expect(() => getByText(expectedSecondLevelHierarchyValues[2])).to.throw();
    });

    it("is filtered by user selected annotation value filters", async () => {
        const { store } = configureMockStore({
            state,
            responseStubs,
            reducer,
            logics: reduxLogics,
        });

        const { getByText, findAllByRole } = render(
            <Provider store={store}>
                <DirectoryTree />
            </Provider>
        );

        const topLevelAnnotation = annotations[0];

        // wait for the requests for data
        expect((await findAllByRole("treeitem")).length).to.equal(topLevelAnnotation.values.length);
        topLevelAnnotation.values.forEach((value) => {
            expect(getByText(String(value))).to.exist;
        });

        // simulate a user filtering the list of top level hierarchy values
        const filterValue = topLevelAnnotation.values[0];
        store.dispatch(addFileFilter(new FileFilter(topLevelAnnotation.name, filterValue)));

        // after going through the store and an update cycle or two, the tree should be filtered
        // down to just the one annotation value selected
        await wait(async () => expect((await findAllByRole("treeitem")).length).to.equal(1));
        expect(getByText(String(filterValue))).to.exist;

        // the remainder should be gone from the DOM
        tail(topLevelAnnotation.values).forEach((value) => {
            expect(() => getByText(String(value))).to.throw();
        });
    });
});
