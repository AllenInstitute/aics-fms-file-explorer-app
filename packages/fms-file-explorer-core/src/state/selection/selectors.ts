import { first } from "lodash";
import { createSelector } from "reselect";

import { State } from "../";

// BASIC SELECTORS
export const getAnnotationHierarchy = (state: State) => state.selection.annotationHierarchy;
export const getAnnotationsToDisplay = (state: State) => state.selection.displayAnnotations;
export const getFileFilters = (state: State) => state.selection.filters;
export const getSelectedFiles = (state: State) => state.selection.selectedFiles;

// COMPOSED SELECTORS
export const getFirstSelectedFile = createSelector(
    [getSelectedFiles],
    (selectedFiles) => {
        return first(selectedFiles);
    }
);
