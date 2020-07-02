import { castArray, find, includes, sortBy, uniqWith, without } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import {
    ADD_FILE_FILTER,
    SELECT_FILE,
    REORDER_ANNOTATION_HIERARCHY,
    REMOVE_FILE_FILTER,
    REMOVE_FROM_ANNOTATION_HIERARCHY,
    SelectFileAction,
    setAnnotationHierarchy,
    setAvailableAnnotations,
    setFileFilters,
    setFileSelection,
} from "./actions";
import { interaction, metadata, ReduxLogicDeps } from "../";
import * as selectionSelectors from "./selectors";
import Annotation from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";
import NumericRange from "../../entity/NumericRange";
import AnnotationService from "../../services/AnnotationService";

/**
 * Interceptor responsible for transforming payload of SELECT_FILE actions to account for whether the intention is to
 * add to existing selected files state, to replace existing selection state, or to remove a file from the existing
 * selection state.
 */
const selectFile = createLogic({
    transform(deps: ReduxLogicDeps, next: (action: AnyAction) => void) {
        const { getState } = deps;
        const action = deps.action as SelectFileAction;
        const selection = action.payload.selection;
        let nextSelectionsForFileSet: NumericRange[];

        if (action.payload.updateExistingSelection) {
            const existingSelectionsByFileSet = selectionSelectors.getSelectedFileIndicesByFileSet(
                getState()
            );
            const existingSelections =
                existingSelectionsByFileSet[action.payload.correspondingFileSet] || [];

            if (
                !NumericRange.isNumericRange(selection) &&
                existingSelections.some((range) => range.contains(selection))
            ) {
                // if updating existing selections and clicked file is already selected, interpret as a deselect action
                // ensure selection is not a range--that case is more difficult to guess user intention
                nextSelectionsForFileSet = existingSelections.reduce((accum, range) => {
                    if (range.contains(selection)) {
                        return [...accum, ...range.partitionAt(selection)];
                    }

                    return [...accum, range];
                }, [] as NumericRange[]);
            } else {
                // else, add to existing selection
                nextSelectionsForFileSet = existingSelections.reduce((accum, range) => {
                    if (NumericRange.isNumericRange(selection)) {
                        // combine ranges if they are continuous
                        if (range.abuts(selection)) {
                            return [...accum, range.union(selection)];
                        }

                        return [...accum, range, selection];
                    } else {
                        if (range.abuts(selection)) {
                            return [...accum, range.expandTo(selection)];
                        }

                        return [...accum, range, new NumericRange(selection, selection)];
                    }
                }, [] as NumericRange[]);
            }
        } else {
            if (NumericRange.isNumericRange(selection)) {
                nextSelectionsForFileSet = [selection];
            } else {
                nextSelectionsForFileSet = [new NumericRange(selection)];
            }
        }

        next(
            setFileSelection(
                action.payload.correspondingFileSet,
                NumericRange.compact(...nextSelectionsForFileSet)
            )
        );
    },
    type: SELECT_FILE,
});

/**
 * Interceptor responsible for transforming REORDER_ANNOTATION_HIERARCHY and REMOVE_FROM_ANNOTATION_HIERARCHY actions into
 * a concrete list of ordered annotations that can be directly stored in application state under `selections.annotationHierarchy`.
 */
const modifyAnnotationHierarchy = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { action, httpClient, getState } = deps;
        const annotationNamesInHierachy = action.payload.map((a: Annotation) => a.name);
        const baseUrl = interaction.selectors.getFileExplorerServiceBaseUrl(getState());
        const annotationService = new AnnotationService({ baseUrl, httpClient });

        try {
            dispatch(
                setAvailableAnnotations(
                    await annotationService.fetchAvailableAnnotationsForHierarchy(
                        annotationNamesInHierachy
                    )
                )
            );
        } catch (err) {
            console.error(
                "Something went wrong finding available annotations, nobody knows why. But here's a hint:",
                err
            );
        } finally {
            done();
        }
    },
    transform(deps: ReduxLogicDeps, next, reject) {
        const { action, getState } = deps;

        const existingHierarchy = selectionSelectors.getAnnotationHierarchy(getState());
        const allAnnotations = metadata.selectors.getAnnotations(getState());
        const annotation = find(
            allAnnotations,
            (annotation) => annotation.name === action.payload.id
        );

        if (annotation === undefined) {
            reject && reject(action); // reject is for some reason typed in react-logic as optional
            return;
        }

        let nextHierarchy: Annotation[];
        if (includes(existingHierarchy, annotation)) {
            const removed = without(existingHierarchy, annotation);

            // if moveTo is defined, change the order
            // otherwise, remove it from the hierarchy
            if (action.payload.moveTo !== undefined) {
                // change order
                removed.splice(action.payload.moveTo, 0, annotation);
            }

            nextHierarchy = removed;
        } else {
            // add to list
            nextHierarchy = Array.from(existingHierarchy);
            nextHierarchy.splice(action.payload.moveTo, 0, annotation);
        }

        next(setAnnotationHierarchy(nextHierarchy));
    },
    type: [REORDER_ANNOTATION_HIERARCHY, REMOVE_FROM_ANNOTATION_HIERARCHY],
});

/**
 * Interceptor responsible for transforming ADD_FILE_FILTER and REMOVE_FILE_FILTER
 * actions into a concrete list of ordered FileFilters that can be stored directly in
 * application state under `selections.filters`.
 */
const modifyFileFilters = createLogic({
    transform(deps: ReduxLogicDeps, next, reject) {
        const { action, getState } = deps;

        const previousFilters = selectionSelectors.getFileFilters(getState());
        let nextFilters: FileFilter[];

        const incomingFilters = castArray(action.payload);
        if (action.type === ADD_FILE_FILTER) {
            nextFilters = uniqWith(
                [...previousFilters, ...incomingFilters],
                (existing, incoming) => {
                    return existing.equals(incoming);
                }
            );
        } else {
            nextFilters = previousFilters.filter((existing) => {
                return !incomingFilters.some((incoming) => incoming.equals(existing));
            });
        }

        const sortedNextFilters = sortBy(nextFilters, ["name", "value"]);

        const filtersAreUnchanged =
            previousFilters.length === sortedNextFilters.length &&
            previousFilters.every((existing) =>
                sortedNextFilters.some((incoming) => incoming.equals(existing))
            );

        if (filtersAreUnchanged) {
            reject && reject(action);
            return;
        }

        next(setFileFilters(sortedNextFilters));
    },
    type: [ADD_FILE_FILTER, REMOVE_FILE_FILTER],
});

export default [selectFile, modifyAnnotationHierarchy, modifyFileFilters];
