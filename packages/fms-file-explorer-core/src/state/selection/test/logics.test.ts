import { expect } from "chai";

import {
    DESELECT_FILE,
    SELECT_FILE,
    selectFile,
    reorderAnnotationHierarchy,
    SET_ANNOTATION_HIERARCHY,
    removeFromAnnotationHierarchy,
} from "../actions";
import Annotation from "../../../entity/Annotation";
import { annotationsJson } from "../../../entity/Annotation/mocks";
import createMockReduxStore from "../../test/mock-redux-store";

describe("Selection logics", () => {
    describe("selectFile", () => {
        it("does not include existing file selections when updateExistingSelection is false", async () => {
            // setup
            const [store, logicMiddleware, actions] = createMockReduxStore();

            // act
            store.dispatch(selectFile("abc123"));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SELECT_FILE,
                    payload: {
                        file: ["abc123"],
                    },
                })
            ).to.equal(true);
        });

        it("appends newly selected file to existing selections when updateExistingSelection is true", async () => {
            // setup
            const mockState = {
                selection: {
                    selectedFiles: ["abc123"],
                },
            };
            const [store, logicMiddleware, actions] = createMockReduxStore({ mockState });

            // act
            store.dispatch(selectFile("xyz789", true));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SELECT_FILE,
                    payload: {
                        file: ["abc123", "xyz789"],
                    },
                })
            ).to.equal(true);
        });

        it("deselects a file if file is already selected and updateExistingSelection is true", async () => {
            // setup
            const mockState = {
                selection: {
                    selectedFiles: ["abc123", "xyz789"],
                },
            };
            const [store, logicMiddleware, actions] = createMockReduxStore({ mockState });

            // act
            store.dispatch(selectFile("xyz789", true));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includes({
                    type: DESELECT_FILE,
                    payload: "xyz789",
                })
            ).to.equal(true);
        });

        it("does not deselect a file if file is already selected and updateExistingSelection is true when file is part of a list of new selections", async () => {
            // setup
            const mockState = {
                selection: {
                    selectedFiles: ["abc123", "xyz789"],
                },
            };
            const [store, logicMiddleware, actions] = createMockReduxStore({ mockState });

            // act
            store.dispatch(selectFile(["xyz789", "mno456"], true));
            await logicMiddleware.whenComplete();

            // assert
            expect(actions.includesMatch({ type: DESELECT_FILE })).to.equal(false);
            expect(
                actions.includesMatch({
                    type: SELECT_FILE,
                    payload: {
                        file: ["abc123", "xyz789", "mno456"],
                    },
                })
            ).to.equal(true);
        });
    });

    describe("modifyAnnotationHierarchy", () => {
        const annotations = Object.freeze(
            annotationsJson.map((annotation) => new Annotation(annotation))
        );

        it("adds a new annotation to the end of the hierarchy", async () => {
            // setup
            const mockState = {
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: annotations.slice(0, 2),
                },
            };
            const [store, logicMiddleware, actions] = createMockReduxStore({ mockState });

            // act
            store.dispatch(reorderAnnotationHierarchy(annotations[2].name, 2));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_ANNOTATION_HIERARCHY,
                    payload: [...annotations.slice(0, 2), annotations[2]],
                })
            ).to.equal(true);
        });

        it("moves an annotation within the hierarchy to a new position", async () => {
            // setup
            const mockState = {
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: [
                        annotations[0],
                        annotations[1],
                        annotations[2],
                        annotations[3],
                    ],
                },
            };
            const [store, logicMiddleware, actions] = createMockReduxStore({ mockState });

            // act
            store.dispatch(reorderAnnotationHierarchy(annotations[2].name, 0));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_ANNOTATION_HIERARCHY,
                    payload: [annotations[2], annotations[0], annotations[1], annotations[3]],
                })
            ).to.equal(true);
        });

        it("removes an annotation from the hierarchy", async () => {
            // setup
            const mockState = {
                metadata: {
                    annotations: [...annotations],
                },
                selection: {
                    annotationHierarchy: [
                        annotations[0],
                        annotations[1],
                        annotations[2],
                        annotations[3],
                    ],
                },
            };
            const [store, logicMiddleware, actions] = createMockReduxStore({ mockState });

            // act
            store.dispatch(removeFromAnnotationHierarchy(annotations[2].name));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_ANNOTATION_HIERARCHY,
                    payload: [annotations[0], annotations[1], annotations[3]],
                })
            ).to.equal(true);
        });
    });
});
