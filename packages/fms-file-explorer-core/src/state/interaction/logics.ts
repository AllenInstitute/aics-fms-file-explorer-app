import path from "path";

import { isEmpty, uniqueId } from "lodash";
import { createLogic } from "redux-logic";

import { interaction, ReduxLogicDeps, selection } from "../";
import {
    DOWNLOAD_MANIFEST,
    succeedManifestDownload,
    failManifestDownload,
    removeStatus,
    startManifestDownload,
    SHOW_CONTEXT_MENU,
    CANCEL_MANIFEST_DOWNLOAD,
    cancelManifestDownload,
    OPEN_FILES_IN_IMAGE_J,
    setImageJLocation,
    setAllenMountPoint,
    GENERATE_PYTHON_SNIPPET,
} from "./actions";
import * as interactionSelectors from "./selectors";
import CsvService from "../../services/CsvService";
import { CancellationToken } from "../../services/FileDownloadService";
import FileSet from "../../entity/FileSet";
import NumericRange from "../../entity/NumericRange";
import { SelectionRequest, Selection } from "../../services/FileService";
import { ExecutableEnvCancellationToken } from "../../services/ExecutionEnvService";
import { Expiration, SnippetType } from "../../containers/PythonSnippetDialog";
import FileFilter from "../../entity/FileFilter";

/**
 * Interceptor responsible for responding to a DOWNLOAD_MANIFEST action and triggering a manifest download.
 */
const downloadManifest = createLogic({
    type: DOWNLOAD_MANIFEST,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { action, getState } = deps;
        const manifestDownloadProcessId = uniqueId();

        try {
            const state = getState();
            const applicationVersion = interactionSelectors.getApplicationVersion(state);
            const baseUrl = interactionSelectors.getFileExplorerServiceBaseUrl(state);
            const platformDependentServices = interactionSelectors.getPlatformDependentServices(
                state
            );
            const fileService = interactionSelectors.getFileService(state);
            const csvService = new CsvService({
                applicationVersion,
                baseUrl,
                downloadService: platformDependentServices.fileDownloadService,
            });

            let selections: Selection[];

            // If we have a specific path to get files from ignore selected files
            if (action.payload.fileFilters.length) {
                const fileSet = new FileSet({
                    filters: action.payload.fileFilters,
                    fileService,
                });
                const count = await fileSet.fetchTotalCount();
                const accumulator: { [index: string]: any } = {};
                const selection: Selection = {
                    filters: fileSet.filters.reduce((accum, filter) => {
                        const existing = accum[filter.name] || [];
                        return {
                            ...accum,
                            [filter.name]: [...existing, filter.value],
                        };
                    }, accumulator),
                    indexRanges: [new NumericRange(0, count - 1).toJSON()],
                };
                selections = [selection];
            } else {
                const fileSelection = selection.selectors.getFileSelection(state);
                selections = fileSelection.toCompactSelectionList();
            }

            if (isEmpty(selections)) {
                return;
            }

            const onManifestDownloadCancel = () => {
                dispatch(cancelManifestDownload(manifestDownloadProcessId));
            };
            dispatch(
                startManifestDownload(
                    manifestDownloadProcessId,
                    "Download of CSV manifest in progress.",
                    onManifestDownloadCancel
                )
            );

            const selectionRequest: SelectionRequest = {
                annotations: action.payload.columns,
                selections,
            };
            const message = await csvService.downloadCsv(
                selectionRequest,
                manifestDownloadProcessId
            );

            if (message === CancellationToken) {
                dispatch(removeStatus(manifestDownloadProcessId));
                return;
            }

            const successMsg = `Download of CSV manifest successfully finished.<br/>${message}`;
            dispatch(succeedManifestDownload(manifestDownloadProcessId, successMsg));
        } catch (err) {
            const errorMsg = `Download of CSV manifest failed.<br/>${err}`;
            dispatch(failManifestDownload(manifestDownloadProcessId, errorMsg));
        } finally {
            done();
        }
    },
});

/**
 * Interceptor responsible for responding to a CANCEL_MANIFEST_DOWNLOAD action and cancelling
 * the corresponding manifest download request (including deleting the potential artifact)
 */
const cancelManifestDownloadLogic = createLogic({
    type: CANCEL_MANIFEST_DOWNLOAD,
    async transform(deps: ReduxLogicDeps, next, reject) {
        const { action, getState } = deps;
        const { fileDownloadService } = interactionSelectors.getPlatformDependentServices(
            getState()
        );
        try {
            await fileDownloadService.cancelActiveRequest(action.payload.id);
            reject && reject(action);
        } catch (err) {
            next(
                failManifestDownload(
                    action.payload.id,
                    "Something went wrong cleaning up cancelled download."
                )
            );
        }
    },
});

/**
 * Interceptor responsible for responding to an OPEN_FILES_IN_IMAGE_J action and triggering the
 * opening of a file in ImageJ
 */
const openFilesInImageJ = createLogic({
    type: OPEN_FILES_IN_IMAGE_J,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const savedAllenMountPoint = interactionSelectors.getAllenMountPoint(deps.getState());
        const savedImageJExecutable = interactionSelectors.getImageJExecutable(deps.getState());
        const {
            executionEnvService,
            fileViewerService,
        } = interactionSelectors.getPlatformDependentServices(deps.getState());
        let allenMountPoint = savedAllenMountPoint;
        let imageJExecutable = savedImageJExecutable;

        // Verify that the known Allen mount point is valid, if not prompt for it
        const isValidAllenDrive =
            allenMountPoint && (await executionEnvService.isValidAllenMountPoint(allenMountPoint));
        if (!isValidAllenDrive) {
            allenMountPoint = await executionEnvService.promptForAllenMountPoint(true);
        }

        // If the user did not cancel out of a prompt, continue trying to open ImageJ/Fiji
        if (allenMountPoint && allenMountPoint !== ExecutableEnvCancellationToken) {
            // Save Allen mount point for future use if new
            if (allenMountPoint !== savedAllenMountPoint) {
                dispatch(setAllenMountPoint(allenMountPoint));
            }

            // Verify that the known ImageJ/Fiji location is valid, if not prompt for it
            const isValidImageJLocation =
                imageJExecutable && (await executionEnvService.isValidExecutable(imageJExecutable));
            if (!isValidImageJLocation) {
                imageJExecutable = await executionEnvService.promptForExecutable(
                    "ImageJ/Fiji Executable",
                    "It appears that your ImageJ/Fiji application isn't located where we thought it would be. " +
                        "Select your ImageJ/Fiji application now?"
                );
            }

            // If the user did not cancel out of a prompt, continue trying to open ImageJ/Fiji
            if (imageJExecutable && imageJExecutable !== ExecutableEnvCancellationToken) {
                // Save the ImageJ/Fiji executable location for future use if new
                if (imageJExecutable !== savedImageJExecutable) {
                    dispatch(setImageJLocation(imageJExecutable));
                }

                // Collect the file paths from the selected files
                const fileSelection = selection.selectors.getFileSelection(deps.getState());
                const selectedFilesDetails = await fileSelection.fetchAllDetails();
                const filePaths = selectedFilesDetails.map(
                    (file) =>
                        allenMountPoint + path.normalize(file.filePath.substring("/allen".length))
                );

                // Open the files in the specified executable
                await fileViewerService.open(imageJExecutable, filePaths);
            }
        }

        done();
    },
});

/**
 * Interceptor responsible for responding to a SHOW_CONTEXT_MENU action and ensuring the previous
 * context menu is dismissed gracefully.
 */
const showContextMenu = createLogic({
    type: SHOW_CONTEXT_MENU,
    async transform(deps: ReduxLogicDeps, next) {
        const { action, getState } = deps;
        // In some cases (like if the context menu was re-triggered to appear somewhere else)
        // there is no automatic call to dismiss the menu, in which case we need to manually trigger this
        const existingDismissAction = interactionSelectors.getContextMenuOnDismiss(getState());
        if (existingDismissAction) {
            existingDismissAction();
        }
        next(action);
    },
});

/**
 * Interceptor responsible for responding to a GENERATE_PYTHON_SNIPPET action and generating the corresponding
 * snippet type.
 */
const generatePythonSnippet = createLogic({
    type: GENERATE_PYTHON_SNIPPET,
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const {
            action: {
                payload: { snippetType, dataset, expiration },
            },
            getState,
        } = deps;

        class DatasetService {
            async createDataset(dataset: string, expiration: Expiration): Promise<string> {
                // TODO: Send request to FES endpoint
                return "123901" + dataset + expiration;
            }
            async getPythonSnippetForDataset(datasetId: string): Promise<string> {
                // TODO: Wait for python snippet endpoint to be created
                return "...TODO" + datasetId;
            }
            async getPythonSnippetForQuery(fileFilters: FileFilter[]): Promise<string> {
                // TODO: Wait for python snippet endpoint to be created
                return "...TODO" + fileFilters;
            }
        }
        const datasetService = new DatasetService();

        let snippet;
        if (snippetType === SnippetType.Dataset) {
            const datasetId = await datasetService.createDataset(dataset, expiration);
            snippet = await datasetService.getPythonSnippetForDataset(datasetId);
        } else if (snippetType === SnippetType.Query) {
            const fileFilters = selection.selectors.getFileFilters(getState());
            snippet = await datasetService.getPythonSnippetForQuery(fileFilters);
        }

        snippet && dispatch(interaction.actions.receivePythonSnippet(snippet));
        done();
    },
    async transform(deps: ReduxLogicDeps, next, reject) {
        const { action } = deps;
        const { snippetType, dataset, expiration } = action.payload;
        if (snippetType === SnippetType.Dataset) {
            if (!dataset || !expiration) {
                reject && reject(action);
                return;
            }
        } else if (snippetType !== SnippetType.Query) {
            reject && reject(action);
            return;
        }
        next(action);
    },
});

export default [
    downloadManifest,
    cancelManifestDownloadLogic,
    openFilesInImageJ,
    showContextMenu,
    generatePythonSnippet,
];
