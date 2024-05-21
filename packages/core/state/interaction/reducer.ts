import FrontendInsights from "@aics/frontend-insights";
import { makeReducer } from "@aics/redux-utils";
import { filter, sortBy } from "lodash";

import {
    HIDE_CONTEXT_MENU,
    HIDE_VISIBLE_MODAL,
    REFRESH,
    REMOVE_STATUS,
    SET_USER_SELECTED_APPLICATIONS,
    INITIALIZE_APP,
    SET_STATUS,
    SET_VISIBLE_MODAL,
    SHOW_CONTEXT_MENU,
    SHOW_MANIFEST_DOWNLOAD_DIALOG,
    StatusUpdate,
    MARK_AS_USED_APPLICATION_BEFORE,
    ShowManifestDownloadDialogAction,
    SET_IS_AICS_EMPLOYEE,
    PROMPT_FOR_DATA_SOURCE,
    DownloadManifestAction,
    DOWNLOAD_MANIFEST,
} from "./actions";
import { ContextMenuItem, PositionReference } from "../../components/ContextMenu";
import { ModalType } from "../../components/Modal";
import { Source } from "../../entity/FileExplorerURL";
import FileFilter from "../../entity/FileFilter";
import { PlatformDependentServices } from "../../services";
import ApplicationInfoServiceNoop from "../../services/ApplicationInfoService/ApplicationInfoServiceNoop";
import FileDownloadServiceNoop from "../../services/FileDownloadService/FileDownloadServiceNoop";
import FileViewerServiceNoop from "../../services/FileViewerService/FileViewerServiceNoop";
import { DEFAULT_CONNECTION_CONFIG } from "../../services/HttpServiceBase";
import ExecutionEnvServiceNoop from "../../services/ExecutionEnvService/ExecutionEnvServiceNoop";
import { UserSelectedApplication } from "../../services/PersistentConfigService";
import NotificationServiceNoop from "../../services/NotificationService/NotificationServiceNoop";
import DatabaseServiceNoop from "../../services/DatabaseService/DatabaseServiceNoop";

export interface InteractionStateBranch {
    applicationVersion?: string;
    dataSourceForVisibleModal?: Source;
    contextMenuIsVisible: boolean;
    contextMenuItems: ContextMenuItem[];
    contextMenuPositionReference: PositionReference;
    contextMenuOnDismiss?: () => void;
    csvColumns?: string[];
    fileExplorerServiceBaseUrl: string;
    fileTypeForVisibleModal: "csv" | "json" | "parquet";
    fileFiltersForVisibleModal: FileFilter[];
    hasUsedApplicationBefore: boolean;
    isAicsEmployee?: boolean;
    isOnWeb: boolean;
    platformDependentServices: PlatformDependentServices;
    refreshKey?: string;
    status: StatusUpdate[];
    userSelectedApplications?: UserSelectedApplication[];
    visibleModal?: ModalType;
}

export const initialState: InteractionStateBranch = {
    contextMenuIsVisible: false,
    contextMenuItems: [],
    // Passed to `ContextualMenu` as `target`. From the "@fluentui/react" docs:
    // "The target that ContextualMenu should try to position itself based on.
    // It can be either an element, a query selector string resolving to a valid element, or a MouseEvent.
    // If a MouseEvent is given, the origin point of the event will be used."
    contextMenuPositionReference: null,
    fileExplorerServiceBaseUrl: DEFAULT_CONNECTION_CONFIG.baseUrl,
    fileFiltersForVisibleModal: [],
    fileTypeForVisibleModal: "csv",
    hasUsedApplicationBefore: false,
    isOnWeb: false,
    platformDependentServices: {
        applicationInfoService: new ApplicationInfoServiceNoop(),
        databaseService: new DatabaseServiceNoop(),
        fileDownloadService: new FileDownloadServiceNoop(),
        fileViewerService: new FileViewerServiceNoop(),
        frontendInsights: new FrontendInsights({
            application: {
                name: "FMS File Explorer",
                version: "0.0.0-noop",
            },
        }),
        executionEnvService: new ExecutionEnvServiceNoop(),
        notificationService: new NotificationServiceNoop(),
    },
    status: [],
};

export default makeReducer<InteractionStateBranch>(
    {
        [MARK_AS_USED_APPLICATION_BEFORE]: (state) => ({
            ...state,
            hasUsedApplicationBefore: true,
        }),
        [SHOW_CONTEXT_MENU]: (state, action) => ({
            ...state,
            contextMenuIsVisible: true,
            contextMenuItems: action.payload.items,
            contextMenuOnDismiss: action.payload.onDismiss,
            contextMenuPositionReference: action.payload.positionReference,
        }),
        [REMOVE_STATUS]: (state, action) => ({
            ...state,
            status: filter(
                state.status,
                (status: StatusUpdate) => status.processId !== action.payload.processId
            ),
        }),
        [HIDE_CONTEXT_MENU]: (state) => ({
            ...state,
            contextMenuIsVisible: false,
            contextMenuItems: [],
            contextMenuOnDismiss: undefined,
            contextMenuPositionReference: null,
        }),
        [HIDE_VISIBLE_MODAL]: (state) => ({
            ...state,
            dataSourceForVisibleModal: undefined,
            visibleModal: undefined,
        }),
        [REFRESH]: (state, action) => ({
            ...state,
            refreshKey: action.payload,
        }),
        [SET_USER_SELECTED_APPLICATIONS]: (state, action) => ({
            ...state,
            userSelectedApplications: action.payload,
        }),
        [SET_IS_AICS_EMPLOYEE]: (state, action) => ({
            ...state,
            isAicsEmployee: action.payload,
        }),
        [SET_STATUS]: (state, action) => ({
            ...state,
            status: sortBy(
                [
                    ...filter(
                        state.status,
                        (status: StatusUpdate) => status.processId !== action.payload.processId
                    ),
                    action.payload,
                ],
                "processId"
            ),
        }),
        [DOWNLOAD_MANIFEST]: (state, action: DownloadManifestAction) => ({
            ...state,
            csvColumns: action.payload.annotations,
        }),
        [INITIALIZE_APP]: (state, action) => ({
            ...state,
            fileExplorerServiceBaseUrl: action.payload,
        }),
        [SET_VISIBLE_MODAL]: (state, action) => ({
            ...state,
            ...action.payload,
            fileFiltersForVisibleModal: [],
        }),
        [SHOW_MANIFEST_DOWNLOAD_DIALOG]: (state, action: ShowManifestDownloadDialogAction) => ({
            ...state,
            visibleModal: ModalType.MetadataManifest,
            fileTypeForVisibleModal: action.payload.fileType,
            fileFiltersForVisibleModal: action.payload.fileFilters,
        }),
        [PROMPT_FOR_DATA_SOURCE]: (state, action) => ({
            ...state,
            visibleModal: ModalType.DataSource,
            dataSourceForVisibleModal: action.payload,
        }),
    },
    initialState
);
