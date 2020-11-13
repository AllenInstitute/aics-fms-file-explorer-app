import { createSelector } from "reselect";

import { State } from "../";
import FileService from "../../services/FileService";
import AnnotationService from "../../services/AnnotationService";

// BASIC SELECTORS
export const isManifestDownloadDialogVisible = (state: State) =>
    state.interaction.isManifestDownloadDialogVisible;
export const isPythonSnippetDialogVisible = (state: State) =>
    state.interaction.isPythonSnippetDialogVisible;
export const getAllenMountPoint = (state: State) => state.interaction.allenMountPoint;
export const getApplicationVersion = (state: State) => state.interaction.applicationVersion;
export const getContextMenuVisibility = (state: State) => state.interaction.contextMenuIsVisible;
export const getContextMenuItems = (state: State) => state.interaction.contextMenuItems;
export const getContextMenuPositionReference = (state: State) =>
    state.interaction.contextMenuPositionReference;
export const getContextMenuOnDismiss = (state: State) => state.interaction.contextMenuOnDismiss;
export const getCsvColumns = (state: State) => state.interaction.csvColumns;
export const getFileExplorerServiceBaseUrl = (state: State) =>
    state.interaction.fileExplorerServiceBaseUrl;
export const getFileFiltersForManifestDownload = (state: State) =>
    state.interaction.fileFiltersForManifestDownload;
export const getImageJExecutable = (state: State) => state.interaction.imageJExecutable;
export const getPlatformDependentServices = (state: State) =>
    state.interaction.platformDependentServices;
export const getProcessStatuses = (state: State) => state.interaction.status;
export const getPythonSnippet = (state: State) => state.interaction.pythonSnippet;

// COMPOSED SELECTORS
export const getFileService = createSelector(
    [getApplicationVersion, getFileExplorerServiceBaseUrl],
    (applicationVersion, fileExplorerBaseUrl) => {
        return new FileService({ applicationVersion, baseUrl: fileExplorerBaseUrl });
    }
);

export const getAnnotationService = createSelector(
    [getApplicationVersion, getFileExplorerServiceBaseUrl],
    (applicationVersion, fileExplorerBaseUrl) => {
        return new AnnotationService({ applicationVersion, baseUrl: fileExplorerBaseUrl });
    }
);

/**
 * In order to make certain a new ContextMenu is rendered on each contextmenu event (e.g., a right-click),
 * we pass a new `key` (as in, a React key) to the component so that React knows to replace, not update,
 * the ContextMenu component. This application _should_ generally store MouseEvents in `contextMenuPositionReference`,
 * in which case treat the event's timestamp as the key. For completeness, if the value is not an event,
 * JSON.stringify it so that it can be treated as a React key no matter its type.
 */
export const getContextMenuKey = createSelector([getContextMenuPositionReference], (target) => {
    if (target instanceof Event) {
        return target.timeStamp;
    }

    return JSON.stringify(target);
});
