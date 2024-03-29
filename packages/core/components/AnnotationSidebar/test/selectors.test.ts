import { mergeState } from "@aics/redux-utils";
import { expect } from "chai";
import { map } from "lodash";

import Annotation from "../../../entity/Annotation";
import { annotationsJson } from "../../../entity/Annotation/mocks";
import * as annotationSelectors from "../selectors";
import { initialState } from "../../../state";
import FileFilter from "../../../entity/FileFilter";
import { SEARCHABLE_TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";

describe("<AnnotationSidebar /> selectors", () => {
    describe("getAnnotationListItems", () => {
        it("transforms available annotations into list item data", () => {
            const state = mergeState(initialState, {
                metadata: {
                    annotations: map(annotationsJson, (annotation) => new Annotation(annotation)),
                },
            });

            const listItems = annotationSelectors.getAnnotationListItems(state);
            expect(listItems.length).to.equal(
                annotationsJson.length + SEARCHABLE_TOP_LEVEL_FILE_ANNOTATIONS.length
            );

            // items are sorted according to Annotation::sort but file properties go first
            const first = listItems[SEARCHABLE_TOP_LEVEL_FILE_ANNOTATIONS.length];
            expect(first).to.have.property("id");
            expect(first).to.have.property("description", "AICS cell line");
            expect(first).to.have.property("title", "Cell line");
        });

        it("denotes filtered annotations as filtered", () => {
            const filters = [
                new FileFilter("Cell Line", "AICS-0"),
                new FileFilter("Date Created", "01/10/15"),
            ];
            const filteredState = {
                ...initialState,
                selection: {
                    ...initialState.selection,
                    filters,
                },
            };
            const state = mergeState(filteredState, {
                metadata: {
                    annotations: map(annotationsJson, (annotation) => new Annotation(annotation)),
                },
            });

            const listItems = annotationSelectors.getAnnotationListItems(state);
            expect(listItems.length).to.equal(
                annotationsJson.length + SEARCHABLE_TOP_LEVEL_FILE_ANNOTATIONS.length
            );

            listItems.forEach((item) => {
                const filtered = filters.findIndex((f) => f.name === item.id) !== -1;
                expect(item).to.have.property("filtered", filtered);
            });
        });

        it("denotes non-available annotations as disabled", () => {
            const annotations = map(annotationsJson, (annotation) => new Annotation(annotation));
            const availableAnnotationsForHierarchy = annotations.slice(1, 3).map((a) => a.name);
            const availableAnnotationsForHierarchySet = new Set(availableAnnotationsForHierarchy);
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
                selection: {
                    availableAnnotationsForHierarchy,
                    annotationHierarchy: annotations.slice(1, 2),
                },
            });

            const listItems = annotationSelectors.getAnnotationListItems(state);
            expect(listItems.length).to.equal(
                annotationsJson.length + SEARCHABLE_TOP_LEVEL_FILE_ANNOTATIONS.length
            );

            listItems.forEach((item) => {
                const disabled = !availableAnnotationsForHierarchySet.has(item.id);
                expect(item).to.have.property("disabled", disabled);
            });
        });

        it("denotes all annotations as enabled when hierarchy is empty", () => {
            const annotations = map(annotationsJson, (annotation) => new Annotation(annotation));
            const availableAnnotationsForHierarchy = annotations.slice(1, 3).map((a) => a.name);
            const state = mergeState(initialState, {
                metadata: {
                    annotations,
                },
                selection: {
                    availableAnnotationsForHierarchy,
                },
            });

            const listItems = annotationSelectors.getAnnotationListItems(state);
            expect(listItems.length).to.equal(
                annotationsJson.length + SEARCHABLE_TOP_LEVEL_FILE_ANNOTATIONS.length
            );

            listItems.forEach((item) => {
                expect(item).to.have.property("disabled", false);
            });
        });
    });
});
