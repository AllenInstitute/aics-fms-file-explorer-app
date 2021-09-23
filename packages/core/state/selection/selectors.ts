import { createSelector } from "reselect";

import { State } from "../";
import { TOP_LEVEL_FILE_ANNOTATION_NAMES } from "../../constants";
import Annotation from "../../entity/Annotation";
import FileExplorerURL from "../../entity/FileExplorerURL";
import FileFilter from "../../entity/FileFilter";
import FileFolder from "../../entity/FileFolder";
import FileSort from "../../entity/FileSort";

// BASIC SELECTORS
export const getAnnotationHierarchy = (state: State) => state.selection.annotationHierarchy;
export const getAnnotationsToDisplay = (state: State) => state.selection.displayAnnotations;
export const getAvailableAnnotationsForHierarchy = (state: State) =>
    state.selection.availableAnnotationsForHierarchy;
export const getAvailableAnnotationsForHierarchyLoading = (state: State) =>
    state.selection.availableAnnotationsForHierarchyLoading;
export const getColumnWidths = (state: State) => state.selection.columnWidths;
export const getFileFilters = (state: State) => state.selection.filters;
export const getFileSetSourceId = (state: State) => state.selection.fileSetSourceId;
export const getFileSelection = (state: State) => state.selection.fileSelection;
export const getOpenFileFolders = (state: State) => state.selection.openFileFolders;
export const getSortColumn = (state: State) => state.selection.sortColumn;
export const getViewId = (state: State) => state.selection.viewId;

// COMPOSED SELECTORS
export const getOrderedDisplayAnnotations = createSelector(
    getAnnotationsToDisplay,
    (annotations: Annotation[]) => {
        return Annotation.sort(annotations);
    }
);

export const getEncodedFileExplorerUrl = createSelector(
    [getAnnotationHierarchy, getFileFilters, getOpenFileFolders, getSortColumn, getFileSetSourceId],
    (
        hierarchy: Annotation[],
        filters: FileFilter[],
        openFolders: FileFolder[],
        sortColumn?: FileSort,
        fileSetSourceId?: string
    ) => {
        return FileExplorerURL.encode({
            hierarchy,
            filters,
            openFolders,
            sortColumn,
            fileSetSourceId,
        });
    }
);

export const getAnnotationFilters = createSelector([getFileFilters], (fileFilters): FileFilter[] =>
    fileFilters.filter((f) => ![...TOP_LEVEL_FILE_ANNOTATION_NAMES, "source"].includes(f.name))
);

export const getFileAttributeFilter = createSelector([getFileFilters], (fileFilters):
    | FileFilter
    | undefined => fileFilters.find((f) => TOP_LEVEL_FILE_ANNOTATION_NAMES.includes(f.name)));
