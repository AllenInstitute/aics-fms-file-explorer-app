import FrontendInsights from "@aics/frontend-insights";
import { makeReducer } from "@aics/redux-utils";
import { filter, sortBy } from "lodash";

import {
    HIDE_CONTEXT_MENU,
    HIDE_VISIBLE_MODAL,
    PlatformDependentServices,
    REFRESH,
    REMOVE_STATUS,
    SET_USER_SELECTED_APPLICATIONS,
    SET_CSV_COLUMNS,
    SET_FILE_EXPLORER_SERVICE_BASE_URL,
    SET_PLATFORM_DEPENDENT_SERVICES,
    SET_STATUS,
    SET_VISIBLE_MODAL,
    SHOW_CONTEXT_MENU,
    SHOW_CREATE_COLLECTION_DIALOG,
    SHOW_MANIFEST_DOWNLOAD_DIALOG,
    StatusUpdate,
    SUCCEED_PYTHON_SNIPPET_GENERATION,
    SHOW_EDIT_COLLECTION_DIALOG,
    GENERATE_SHAREABLE_FILE_SELECTION_LINK,
    UPDATE_COLLECTION,
    MARK_AS_USED_APPLICATION_BEFORE,
    SHOW_TIPS_AND_TRICKS_DIALOG,
} from "./actions";
import { ContextMenuItem, PositionReference } from "../../components/ContextMenu";
import { ModalType } from "../../components/Modal";
import ApplicationInfoServiceNoop from "../../services/ApplicationInfoService/ApplicationInfoServiceNoop";
import { PythonicDataAccessSnippet } from "../../services/DatasetService";
import FileDownloadServiceNoop from "../../services/FileDownloadService/FileDownloadServiceNoop";
import FileViewerServiceNoop from "../../services/FileViewerService/FileViewerServiceNoop";
import PersistentConfigServiceNoop from "../../services/PersistentConfigService/PersistentConfigServiceNoop";
import { DEFAULT_CONNECTION_CONFIG } from "../../services/HttpServiceBase";
import FileFilter from "../../entity/FileFilter";
import ExecutionEnvServiceNoop from "../../services/ExecutionEnvService/ExecutionEnvServiceNoop";
import { UserSelectedApplication } from "../../services/PersistentConfigService";
import NotificationServiceNoop from "../../services/NotificationService/NotificationServiceNoop";

export interface InteractionStateBranch {
    applicationVersion?: string;
    contextMenuIsVisible: boolean;
    contextMenuItems: ContextMenuItem[];
    contextMenuPositionReference: PositionReference;
    contextMenuOnDismiss?: () => void;
    csvColumns?: string[];
    fileExplorerServiceBaseUrl: string;
    fileFiltersForVisibleModal: FileFilter[];
    hasUsedApplicationBefore: boolean;
    platformDependentServices: PlatformDependentServices;
    pythonSnippet?: PythonicDataAccessSnippet;
    refreshKey?: string;
    status: StatusUpdate[];
    userSelectedApplications?: UserSelectedApplication[];
    visibleModal?: ModalType;
}

export const initialState = {
    contextMenuIsVisible: false,
    contextMenuItems: [],
    // Passed to `ContextualMenu` as `target`. From the "@fluentui/react" docs:
    // "The target that ContextualMenu should try to position itself based on.
    // It can be either an element, a query selector string resolving to a valid element, or a MouseEvent.
    // If a MouseEvent is given, the origin point of the event will be used."
    contextMenuPositionReference: null,
    fileExplorerServiceBaseUrl: DEFAULT_CONNECTION_CONFIG.baseUrl,
    fileFiltersForVisibleModal: [],
    hasUsedApplicationBefore: false,
    platformDependentServices: {
        applicationInfoService: new ApplicationInfoServiceNoop(),
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
        persistentConfigService: new PersistentConfigServiceNoop(),
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
        [SET_CSV_COLUMNS]: (state, action) => ({
            ...state,
            csvColumns: action.payload,
        }),
        [SET_FILE_EXPLORER_SERVICE_BASE_URL]: (state, action) => ({
            ...state,
            fileExplorerServiceBaseUrl: action.payload,
        }),
        [SET_PLATFORM_DEPENDENT_SERVICES]: (state, action) => {
            const platformDependentServices: PlatformDependentServices = {
                ...state.platformDependentServices,
                ...action.payload,
            };

            return {
                ...state,
                applicationVersion: platformDependentServices.applicationInfoService.getApplicationVersion(),
                platformDependentServices,
            };
        },
        [SET_VISIBLE_MODAL]: (state, action) => ({
            ...state,
            ...action.payload,
            fileFiltersForVisibleModal: [],
        }),
        [SHOW_CREATE_COLLECTION_DIALOG]: (state, action) => ({
            ...state,
            visibleModal: ModalType.CreateCollectionForm,
            fileFiltersForVisibleModal: action.payload,
        }),
        [SHOW_EDIT_COLLECTION_DIALOG]: (state) => ({
            ...state,
            visibleModal: ModalType.EditCollectionForm,
        }),
        [SHOW_MANIFEST_DOWNLOAD_DIALOG]: (state, action) => ({
            ...state,
            visibleModal: ModalType.CsvManifest,
            fileFiltersForVisibleModal: action.payload,
        }),
        [SHOW_TIPS_AND_TRICKS_DIALOG]: (state) => ({
            ...state,
            visibleModal: ModalType.TipsAndTricks,
        }),
        [UPDATE_COLLECTION]: (state) => ({
            ...state,
            visibleModal: undefined,
            fileFiltersForVisibleModal: undefined,
        }),
        [GENERATE_SHAREABLE_FILE_SELECTION_LINK]: (state) => ({
            ...state,
            visibleModal: undefined,
            fileFiltersForVisibleModal: undefined,
        }),
        [SUCCEED_PYTHON_SNIPPET_GENERATION]: (state, action) => ({
            ...state,
            pythonSnippet: action.payload.pythonSnippet,
            status: filter(
                state.status,
                (status: StatusUpdate) => status.processId !== action.payload.processId
            ),
            visibleModal: ModalType.PythonSnippet,
        }),
    },
    initialState
);
