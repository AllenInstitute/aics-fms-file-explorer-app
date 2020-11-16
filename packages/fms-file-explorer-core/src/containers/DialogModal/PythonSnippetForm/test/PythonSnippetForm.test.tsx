import { configureMockStore, mergeState } from "@aics/redux-utils";
import { expect } from "chai";
import * as React from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";

import PythonSnippetForm from "..";
import { Modal } from "../..";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../../constants";
import Annotation from "../../../../entity/Annotation";
import { initialState } from "../../../../state";

describe("<PythonSnippetForm />", () => {
    const visibleDialogState = mergeState(initialState, {
        interaction: {
            visibleModal: Modal.PythonSnippetForm,
        },
    });

    it("is visible when should not be hidden", async () => {
        // Arrange
        const { store } = configureMockStore({ state: visibleDialogState });
        const { getByText } = render(
            <Provider store={store}>
                <PythonSnippetForm onDismiss={() => {}} />
            </Provider>
        );

        // Assert
        expect(getByText("Generate Python Snippet")).to.exist;
    });

    describe("column list", () => {
        it("has default columns when none were previousuly saved", async () => {
            // Arrange
            const { store } = configureMockStore({ state: visibleDialogState });
            const { getByText } = render(
                <Provider store={store}>
                    <PythonSnippetForm onDismiss={() => {}} />
                </Provider>
            );

            // Assert
            TOP_LEVEL_FILE_ANNOTATIONS.forEach((annotation) => {
                expect(getByText(annotation.displayName)).to.exist;
            });
        });

        it("has pre-saved columns when some were previousuly saved", async () => {
            // Arrange
            const preSavedColumns = ["Cas9", "Cell Line", "Donor Plasmid"];
            const state = mergeState(visibleDialogState, {
                interaction: {
                    csvColumns: preSavedColumns,
                },
                metadata: {
                    annotations: preSavedColumns.map(
                        (c) =>
                            new Annotation({
                                annotationDisplayName: c,
                                annotationName: c,
                                description: "test",
                                type: "text",
                            })
                    ),
                },
            });
            const { store } = configureMockStore({ state });
            const { getByText } = render(
                <Provider store={store}>
                    <PythonSnippetForm onDismiss={() => {}} />
                </Provider>
            );

            // Assert
            preSavedColumns.forEach((value) => {
                expect(getByText(value)).to.exist;
            });
        });
    });
});