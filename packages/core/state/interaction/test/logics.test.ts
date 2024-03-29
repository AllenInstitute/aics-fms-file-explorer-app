import {
    configureMockStore,
    mergeState,
    createMockHttpClient,
    ResponseStub,
} from "@aics/redux-utils";
import { expect } from "chai";
import { get as _get } from "lodash";
import { createSandbox } from "sinon";

import { initialState, interaction, State } from "../..";
import {
    downloadManifest,
    ProcessStatus,
    REMOVE_STATUS,
    SET_STATUS,
    cancelFileDownload,
    generatePythonSnippet,
    SUCCEED_PYTHON_SNIPPET_GENERATION,
    SET_CSV_COLUMNS,
    refresh,
    OPEN_WITH,
    openWith,
    SET_USER_SELECTED_APPLICATIONS,
    promptForNewExecutable,
    openWithDefault,
    downloadFiles,
    generateShareableFileSelectionLink,
    SUCCEED_SHAREABLE_FILE_SELECTION_LINK_GENERATION,
} from "../actions";
import { AnnotationName } from "../../../constants";
import DatasetService, { Dataset } from "../../../services/DatasetService";
import {
    ExecutableEnvCancellationToken,
    SystemDefaultAppLocation,
} from "../../../services/ExecutionEnvService";
import ExecutionEnvServiceNoop from "../../../services/ExecutionEnvService/ExecutionEnvServiceNoop";
import interactionLogics from "../logics";
import Annotation from "../../../entity/Annotation";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import FileFilter from "../../../entity/FileFilter";
import FileSet from "../../../entity/FileSet";
import FileSelection from "../../../entity/FileSelection";
import NumericRange from "../../../entity/NumericRange";
import { RECEIVE_ANNOTATIONS } from "../../metadata/actions";
import { SET_AVAILABLE_ANNOTATIONS } from "../../selection/actions";
import AnnotationService from "../../../services/AnnotationService";
import FileDownloadService, {
    DownloadResolution,
    FileInfo,
} from "../../../services/FileDownloadService";
import FileService, { FmsFile } from "../../../services/FileService";
import FileViewerService from "../../../services/FileViewerService";
import { annotationsJson } from "../../../entity/Annotation/mocks";
import FileDownloadServiceNoop from "../../../services/FileDownloadService/FileDownloadServiceNoop";
import NotificationServiceNoop from "../../../services/NotificationService/NotificationServiceNoop";

describe("Interaction logics", () => {
    const fileSelection = new FileSelection().select({
        fileSet: new FileSet(),
        index: new NumericRange(0, 100),
        sortOrder: 0,
    });

    describe("downloadManifest", () => {
        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it("marks the beginning of a manifest download with a status update", async () => {
            // arrange
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new FileDownloadServiceNoop(),
                    },
                },
                selection: {
                    fileSelection,
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // act
            store.dispatch(downloadManifest([]));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.STARTED,
                        },
                    },
                })
            ).to.equal(true);
        });

        it("marks the success of a manifest download with a status update", async () => {
            // arrange
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new FileDownloadServiceNoop(),
                    },
                },
                selection: {
                    fileSelection,
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // act
            store.dispatch(downloadManifest([]));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.SUCCEEDED,
                        },
                    },
                })
            ).to.equal(true);
        });

        it("marks the failure of a manifest download with a status update", async () => {
            // arrange
            class FailingDownloadSerivce implements FileDownloadService {
                getDefaultDownloadDirectory() {
                    return Promise.reject();
                }
                downloadCsvManifest() {
                    return Promise.reject();
                }
                downloadFile() {
                    return Promise.reject();
                }
                promptForDownloadDirectory() {
                    return Promise.reject();
                }
                cancelActiveRequest() {
                    /** noop */
                }
            }

            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new FailingDownloadSerivce(),
                    },
                },
                selection: {
                    fileSelection,
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // act
            store.dispatch(downloadManifest([]));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.FAILED,
                        },
                    },
                })
            ).to.equal(true);

            // sanity-check: make certain this isn't evergreen
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.SUCCEEDED,
                        },
                    },
                })
            ).to.equal(false);
        });

        it("doesn't use selected files when given a specific file folder path", async () => {
            // arrange
            const baseUrl = "test";
            const filters = [
                new FileFilter("Cell Line", "AICS-12"),
                new FileFilter("Notes", "Hello"),
            ];
            sandbox.stub(fileSelection, "toCompactSelectionList").throws("Test failed");
            const state = mergeState(initialState, {
                interaction: {
                    fileFiltersForVisibleModal: filters,
                    fileExplorerServiceBaseUrl: baseUrl,
                    platformDependentServices: {
                        fileDownloadService: new FileDownloadServiceNoop(),
                    },
                },
                selection: {
                    fileSelection,
                },
            });
            const responseStub = {
                when: `${baseUrl}/${FileService.BASE_FILE_COUNT_URL}?Cell%20Line=AICS-12&Notes=Hello&sort=uploaded(DESC)`,
                respondWith: {
                    data: { data: [42] },
                },
            };
            const mockHttpClient = createMockHttpClient(responseStub);
            const fileService = new FileService({
                baseUrl,
                httpClient: mockHttpClient,
            });

            sandbox.stub(interaction.selectors, "getFileService").returns(fileService);

            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
                responseStubs: responseStub,
            });

            // act
            store.dispatch(downloadManifest([]));
            await logicMiddleware.whenComplete();

            // assert
            // if the selected files were used this shouldn't succeed
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.SUCCEEDED,
                        },
                    },
                })
            ).to.be.true;
        });

        it("updates annotations to persist for the next time a user opens a selection action modal", async () => {
            // arrange
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new FileDownloadServiceNoop(),
                    },
                },
                selection: {
                    fileSelection,
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // act
            store.dispatch(downloadManifest([]));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_CSV_COLUMNS,
                })
            ).to.equal(true);
        });
    });

    describe("downloadFiles", () => {
        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it("marks the beginning of a file download with a status update", async () => {
            // Arrange
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new FileDownloadServiceNoop(),
                    },
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const file: FmsFile = {
                file_id: "678142",
                file_name: "test_file_1",
                file_size: 18,
                file_path: "/some/path/test_file_1",
                uploaded: "whenever",
                annotations: [],
            };

            // Act
            store.dispatch(downloadFiles([file]));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.STARTED,
                        },
                    },
                })
            ).to.equal(true);
        });

        it("downloads multiple files", async () => {
            // Arrange
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new FileDownloadServiceNoop(),
                    },
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const file1: FmsFile = {
                file_id: "930213",
                file_name: "test_file_1",
                file_size: 18,
                file_path: "/some/path/test_file_1",
                uploaded: "whenever",
                annotations: [],
            };
            const file2: FmsFile = {
                file_id: "8932432",
                file_name: "test_file_2",
                file_size: 2349014,
                file_path: "/some/path/test_file_2",
                uploaded: "whenever",
                annotations: [],
            };

            // Act
            store.dispatch(downloadFiles([file1, file2]));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.STARTED,
                            fileId: [file1.file_id],
                        },
                    },
                })
            ).to.be.true;
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.STARTED,
                            fileId: [file2.file_id],
                        },
                    },
                })
            ).to.be.true;
        });

        it("marks the success of a file download with a status update", async () => {
            // Arrange
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new FileDownloadServiceNoop(),
                    },
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const file: FmsFile = {
                file_id: "32490241",
                file_name: "test_file_1",
                file_size: 18,
                file_path: "/some/path/test_file_1",
                uploaded: "whenever",
                annotations: [],
            };

            // Act
            store.dispatch(downloadFiles([file]));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.SUCCEEDED,
                        },
                    },
                })
            ).to.equal(true);
        });

        it("dispatches progress events", async () => {
            // Arrange
            class TestDownloadSerivce implements FileDownloadService {
                getDefaultDownloadDirectory() {
                    return Promise.resolve("wherever");
                }
                downloadCsvManifest() {
                    return Promise.reject();
                }
                downloadFile(
                    _fileInfo: FileInfo,
                    downloadRequestId: string,
                    _?: string,
                    onProgress?: (bytesDownloaded: number) => void
                ) {
                    onProgress?.(1);
                    return Promise.resolve({
                        downloadRequestId,
                        msg: "Success",
                        resolution: DownloadResolution.SUCCESS,
                    });
                }
                promptForDownloadDirectory() {
                    return Promise.reject();
                }
                cancelActiveRequest() {
                    /** noop */
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new TestDownloadSerivce(),
                    },
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const file: FmsFile = {
                file_id: "5483295",
                file_name: "test_file_1",
                file_size: 18,
                file_path: "/some/path/test_file_1",
                uploaded: "whenever",
                annotations: [],
            };

            // Act
            store.dispatch(downloadFiles([file]));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.PROGRESS,
                        },
                    },
                })
            ).to.equal(true);
        });

        it("marks the failure of a file download with a status update", async () => {
            // Arrange
            class TestDownloadSerivce implements FileDownloadService {
                getDefaultDownloadDirectory() {
                    return Promise.resolve("wherever");
                }
                downloadCsvManifest() {
                    return Promise.reject();
                }
                downloadFile() {
                    return Promise.reject();
                }
                promptForDownloadDirectory() {
                    return Promise.reject();
                }
                cancelActiveRequest() {
                    /** noop */
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new TestDownloadSerivce(),
                    },
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const file: FmsFile = {
                file_id: "872342",
                file_name: "test_file_1",
                file_size: 18,
                file_path: "/some/path/test_file_1",
                uploaded: "whenever",
                annotations: [],
            };

            // Act
            store.dispatch(downloadFiles([file]));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.FAILED,
                        },
                    },
                })
            ).to.equal(true);

            // sanity-check: make certain this isn't evergreen
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.SUCCEEDED,
                        },
                    },
                })
            ).to.equal(false);
        });

        it("clears status for download request if request was cancelled", async () => {
            // Arrange
            class TestDownloadSerivce implements FileDownloadService {
                getDefaultDownloadDirectory() {
                    return Promise.resolve("wherever");
                }
                downloadCsvManifest() {
                    return Promise.reject();
                }
                downloadFile(_fileInfo: FileInfo, destination: string, downloadRequestId: string) {
                    return Promise.resolve({
                        destination,
                        downloadRequestId,
                        resolution: DownloadResolution.CANCELLED,
                    });
                }
                promptForDownloadDirectory() {
                    return Promise.reject();
                }
                cancelActiveRequest() {
                    return Promise.reject();
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new TestDownloadSerivce(),
                    },
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const file: FmsFile = {
                file_id: "930213",
                file_name: "test_file_1",
                file_size: 18,
                file_path: "/some/path/test_file_1",
                uploaded: "whenever",
                annotations: [],
            };

            // Act
            store.dispatch(downloadFiles([file]));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: REMOVE_STATUS,
                })
            ).to.equal(true);
        });

        it("downloads files to prompted location", async () => {
            // Arrange
            let actualDestination = "never got set";
            const expectedDestination = "yay real destination";
            class UselessFileDownloadService extends FileDownloadServiceNoop {
                public downloadFile(
                    _: FileInfo,
                    destination: string,
                    downloadRequestId: string,
                    onProgress?: (bytesDownloaded: number) => void
                ) {
                    actualDestination = destination;
                    return Promise.resolve({
                        downloadRequestId,
                        destination,
                        onProgress,
                        msg: "",
                        resolution: DownloadResolution.SUCCESS,
                    });
                }
                public promptForDownloadDirectory(): Promise<string> {
                    return Promise.resolve(expectedDestination);
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new UselessFileDownloadService(),
                    },
                },
            });
            const { store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const file: FmsFile = {
                file_id: "32490241",
                file_name: "test_file_1",
                file_size: 18,
                file_path: "/some/path/test_file_1",
                uploaded: "whenever",
                annotations: [],
            };

            // Act
            store.dispatch(downloadFiles([file], true));
            await logicMiddleware.whenComplete();

            // Assert
            expect(actualDestination).to.equal(expectedDestination);
        });
    });

    describe("cancelFileDownloadLogic", () => {
        it("marks the failure of a download cancellation (on error)", async () => {
            // arrange
            class TestDownloadService implements FileDownloadService {
                getDefaultDownloadDirectory() {
                    return Promise.reject();
                }
                downloadCsvManifest(_url: string, _data: string, downloadRequestId: string) {
                    return Promise.resolve({
                        downloadRequestId,
                        resolution: DownloadResolution.CANCELLED,
                    });
                }
                downloadFile(_fileInfo: FileInfo, destination: string, downloadRequestId: string) {
                    return Promise.resolve({
                        destination,
                        downloadRequestId,
                        resolution: DownloadResolution.CANCELLED,
                    });
                }
                promptForDownloadDirectory() {
                    return Promise.reject();
                }
                cancelActiveRequest() {
                    throw new Error("KABOOM");
                }
            }

            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new TestDownloadService(),
                    },
                },
                selection: {
                    fileSelection,
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // act
            store.dispatch(cancelFileDownload("123456"));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includesMatch({
                    type: SET_STATUS,
                    payload: {
                        data: {
                            status: ProcessStatus.FAILED,
                        },
                    },
                })
            ).to.equal(true);
        });

        it("clears status if cancelled", async () => {
            // arrange
            const downloadRequestId = "beepbop";
            class TestDownloadService implements FileDownloadService {
                getDefaultDownloadDirectory() {
                    return Promise.reject();
                }
                downloadCsvManifest() {
                    return Promise.resolve({
                        downloadRequestId,
                        resolution: DownloadResolution.CANCELLED,
                    });
                }
                downloadFile() {
                    return Promise.resolve({
                        downloadRequestId,
                        resolution: DownloadResolution.CANCELLED,
                    });
                }
                promptForDownloadDirectory() {
                    return Promise.reject();
                }
                cancelActiveRequest() {
                    /** noop */
                }
            }

            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        fileDownloadService: new TestDownloadService(),
                    },
                    status: [
                        {
                            data: {
                                msg: "downloading...",
                                status: ProcessStatus.STARTED,
                            },
                            processId: downloadRequestId,
                        },
                    ],
                },
                selection: {
                    fileSelection,
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // act
            store.dispatch(cancelFileDownload(downloadRequestId));
            await logicMiddleware.whenComplete();

            // assert
            expect(
                actions.includes({
                    type: REMOVE_STATUS,
                    payload: {
                        processId: downloadRequestId,
                    },
                })
            ).to.equal(true);
        });
    });

    describe("generateShareableFileSelectionLink", () => {
        const sandbox = createSandbox();
        let isCopiedToClipboard = false;
        class ClipboardMock {
            public writeText(): void {
                isCopiedToClipboard = true;
            }
        }
        class NavigatorMock {
            public clipboard = new ClipboardMock();
        }
        const collection: Dataset = {
            id: "89j1d321a",
            name: "test",
            version: 1,
            query: "",
            client: "",
            private: false,
            fixed: false,
            created: new Date(),
            createdBy: "test",
        };

        before(() => {
            const datasetService = new DatasetService();
            const navigatorStub = new NavigatorMock();
            sandbox.stub(global, "navigator").value(navigatorStub);
            sandbox.stub(datasetService, "createDataset").resolves(collection);
            sandbox.stub(interaction.selectors, "getDatasetService").returns(datasetService);
        });

        afterEach(() => {
            isCopiedToClipboard = false;
            sandbox.resetHistory();
        });

        after(() => {
            sandbox.restore();
        });

        it("creates collection and url from file selection & copies to clipboard", async () => {
            // Arrange
            const { store, logicMiddleware, actions } = configureMockStore({
                state: initialState,
                logics: interactionLogics,
            });

            // Act
            store.dispatch(generateShareableFileSelectionLink());
            await logicMiddleware.whenComplete();

            // Assert
            expect(isCopiedToClipboard).to.be.true;
            expect(
                actions.includesMatch({
                    payload: collection,
                    type: SUCCEED_SHAREABLE_FILE_SELECTION_LINK_GENERATION,
                })
            ).to.be.true;
        });

        it("utilizes filters instead of explicit file selection when given", async () => {
            // Arrange
            const baseUrl = "test";
            const fileSelection = new FileSelection();
            sandbox.stub(fileSelection, "toCompactSelectionList").throws("Test failed");
            const state: State = mergeState(initialState, {
                interaction: {
                    fileExplorerServiceBaseUrl: baseUrl,
                },
                selection: {
                    fileSelection,
                },
            });
            const responseStub = {
                when: `${baseUrl}/${FileService.BASE_FILE_COUNT_URL}?Cell%20Line=AICS-12&Notes=Hello&sort=uploaded(DESC)`,
                respondWith: {
                    data: { data: [42] },
                },
            };
            const mockHttpClient = createMockHttpClient(responseStub);
            const fileService = new FileService({
                baseUrl,
                httpClient: mockHttpClient,
            });

            sandbox.stub(interaction.selectors, "getFileService").returns(fileService);
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
                responseStubs: responseStub,
            });
            const filters = [
                new FileFilter("Cell Line", "AICS-12"),
                new FileFilter("Notes", "Hello"),
            ];

            // Act
            store.dispatch(generateShareableFileSelectionLink({ filters }));
            await logicMiddleware.whenComplete();

            // Assert
            expect(isCopiedToClipboard).to.be.true;
            expect(
                actions.includesMatch({
                    payload: collection,
                    type: SUCCEED_SHAREABLE_FILE_SELECTION_LINK_GENERATION,
                })
            ).to.be.true;
        });

        it("dispatches process failure action on error", async () => {
            // Arrange
            const baseUrl = "test";
            const fileSelection = new FileSelection();
            const errorMsg = "Test failed";
            sandbox.stub(fileSelection, "toCompactSelectionList").throws(errorMsg);
            const state: State = mergeState(initialState, {
                interaction: {
                    fileExplorerServiceBaseUrl: baseUrl,
                },
                selection: {
                    fileSelection,
                },
            });
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // Act
            store.dispatch(generateShareableFileSelectionLink());
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    payload: {
                        data: {
                            msg: `Failed to generate shareable file selection link: ${errorMsg}`,
                        },
                    },
                    type: SET_STATUS,
                })
            ).to.be.true;
        });
    });

    describe("generatePythonSnippet", () => {
        const baseUrl = "test";
        const mockCollection: Dataset = {
            id: "89j1d321a",
            name: "test",
            version: 1,
            query: "",
            client: "",
            private: false,
            fixed: false,
            created: new Date(),
            createdBy: "test",
        };
        const pythonSnippet = {
            setup: "pip install aicsfiles",
            code: `
            from aicsfiles import FileManagementSystem

            fms = FileManagementSystem()
            df = fms.datasets.get_metadata_for_files_within("test")
            `,
        };
        const responseStubs: ResponseStub[] = [
            // python snippet generation
            {
                when: (requestConfig) => {
                    if (!requestConfig.url) {
                        return false;
                    }
                    return requestConfig.url.endsWith("/pythonSnippet");
                },
                respondWith: {
                    data: { data: [pythonSnippet] },
                },
            },
        ];

        const mockHttpClient = createMockHttpClient(responseStubs);
        const datasetService = new DatasetService({
            baseUrl,
            httpClient: mockHttpClient,
        });

        const sandbox = createSandbox();

        before(() => {
            sandbox.stub(interaction.selectors, "getDatasetService").returns(datasetService);
        });

        afterEach(() => {
            sandbox.resetHistory();
        });

        after(() => {
            sandbox.restore();
        });

        it("it creates expected snippet", async () => {
            const state = mergeState(initialState, {
                selection: {
                    fileSelection,
                },
            });
            const { actions, store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // Act
            const action = generatePythonSnippet(mockCollection);
            store.dispatch(action);
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SUCCEED_PYTHON_SNIPPET_GENERATION,
                    payload: {
                        pythonSnippet,
                    },
                })
            ).to.be.true;
        });
    });

    describe("refresh", () => {
        const sandbox = createSandbox();
        const baseUrl = "test";
        const annotations = annotationsJson.map((annotation) => new Annotation(annotation));
        const availableAnnotations = [annotations[1].displayName];
        const responseStubs = [
            {
                when: `${baseUrl}/${AnnotationService.BASE_ANNOTATION_URL}`,
                respondWith: {
                    data: { data: annotations },
                },
            },
            {
                when: (config: any) =>
                    _get(config, "url", "").includes(
                        AnnotationService.BASE_AVAILABLE_ANNOTATIONS_UNDER_HIERARCHY
                    ),
                respondWith: {
                    data: { data: availableAnnotations },
                },
            },
        ];
        const mockHttpClient = createMockHttpClient(responseStubs);
        const annotationService = new AnnotationService({
            baseUrl,
            httpClient: mockHttpClient,
        });

        afterEach(() => {
            sandbox.restore();
        });

        it("refreshes annotations & which annotations are available based on hierarchy", async () => {
            // Arrange
            sandbox.stub(interaction.selectors, "getAnnotationService").returns(annotationService);
            const { actions, store, logicMiddleware } = configureMockStore({
                state: initialState,
                logics: interactionLogics,
            });

            // Act
            store.dispatch(refresh());
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_AVAILABLE_ANNOTATIONS,
                    payload: availableAnnotations,
                })
            ).to.be.true;
            expect(
                actions.includesMatch({
                    type: RECEIVE_ANNOTATIONS,
                })
            ).to.be.true;
        });

        it("sets available annotations to all annotations on failure", async () => {
            // Arrange
            sandbox.stub(interaction.selectors, "getAnnotationService").throws();
            const expectedAnnotation = new Annotation({
                annotationName: "Failure",
                annotationDisplayName: "Failure",
                type: AnnotationType.BOOLEAN,
                description: "Test annotation for failure",
            });
            const state = mergeState(initialState, {
                metadata: {
                    annotations: [expectedAnnotation],
                },
            });
            const { actions, store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // Act
            store.dispatch(refresh());
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: SET_AVAILABLE_ANNOTATIONS,
                    payload: [expectedAnnotation.displayName],
                })
            ).to.be.true;
        });
    });

    describe("promptForNewExecutable", () => {
        const files = [];
        const fileKinds = ["PNG", "TIFF"];
        for (let i = 0; i <= 100; i++) {
            files.push({
                annotations: [
                    {
                        name: AnnotationName.KIND,
                        values: fileKinds,
                    },
                    {
                        name: "Cell Line",
                        values: ["AICS-10", "AICS-12"],
                    },
                ],
            });
        }
        const baseUrl = "test";
        const responseStub = {
            when: () => true, // `${baseUrl}/${FileService.BASE_FILES_URL}?from=0&limit=101`,
            respondWith: {
                data: { data: files },
            },
        };
        const mockHttpClient = createMockHttpClient(responseStub);
        const fileService = new FileService({
            baseUrl,
            httpClient: mockHttpClient,
        });
        const fakeSelection = new FileSelection().select({
            fileSet: new FileSet({ fileService }),
            index: new NumericRange(0, 100),
            sortOrder: 0,
        });

        it("saves and opens selected files", async () => {
            // Arrange
            let userWasPromptedForDefault = false;
            let userWasPromptedForExecutable = false;
            const expectedExecutablePath = "/some/path/to/imageJ";
            class UselessNotificationService extends NotificationServiceNoop {
                showQuestion() {
                    userWasPromptedForDefault = true;
                    return Promise.resolve(true);
                }
            }
            class UselessExecutionEnvService extends ExecutionEnvServiceNoop {
                promptForExecutable() {
                    userWasPromptedForExecutable = true;
                    return Promise.resolve(expectedExecutablePath);
                }
                isValidExecutable() {
                    return Promise.resolve(false);
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        executionEnvService: new UselessExecutionEnvService(),
                        notificationService: new UselessNotificationService(),
                    },
                },
                selection: {
                    fileSelection: fakeSelection,
                },
            });
            const { actions, store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const app = {
                filePath: expectedExecutablePath,
                defaultFileKinds: fileKinds,
            };

            // Act
            store.dispatch(promptForNewExecutable());
            await logicMiddleware.whenComplete();

            // Assert
            expect(userWasPromptedForDefault).to.be.true;
            expect(userWasPromptedForExecutable).to.be.true;
            expect(
                actions.includesMatch({
                    type: SET_USER_SELECTED_APPLICATIONS,
                    payload: [app],
                })
            ).to.be.true;
            expect(
                actions.includesMatch({
                    type: OPEN_WITH,
                    payload: {
                        app,
                    },
                })
            ).to.be.true;
        });

        it("stops when user cancels", async () => {
            // Arrange
            let userWasPromptedForDefault = false;
            let userWasPromptedForExecutable = false;
            class UselessNotificationService extends NotificationServiceNoop {
                showQuestion() {
                    userWasPromptedForDefault = true;
                    return Promise.resolve(false);
                }
            }
            class UselessExecutionEnvService extends ExecutionEnvServiceNoop {
                promptForExecutable() {
                    userWasPromptedForExecutable = true;
                    return Promise.resolve(ExecutableEnvCancellationToken);
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        executionEnvService: new UselessExecutionEnvService(),
                        notificationService: new UselessNotificationService(),
                    },
                },
                selection: {
                    fileSelection: fakeSelection,
                },
            });
            const { actions, store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // Act
            store.dispatch(promptForNewExecutable());
            await logicMiddleware.whenComplete();

            // Assert
            expect(userWasPromptedForDefault).to.be.false;
            expect(userWasPromptedForExecutable).to.be.true;
            expect(
                actions.includesMatch({
                    type: SET_USER_SELECTED_APPLICATIONS,
                })
            ).to.be.false;
            expect(
                actions.includesMatch({
                    type: OPEN_WITH,
                })
            ).to.be.false;
        });

        it("does not set as default when user selects 'No'", async () => {
            // Arrange
            let userWasPromptedForDefault = false;
            let userWasPromptedForExecutable = false;
            const expectedExecutablePath = "/some/path/to/imageJ";
            class UselessNotificationService extends NotificationServiceNoop {
                showQuestion() {
                    userWasPromptedForDefault = true;
                    return Promise.resolve(false);
                }
            }
            class UselessExecutionEnvService extends ExecutionEnvServiceNoop {
                promptForExecutable() {
                    userWasPromptedForExecutable = true;
                    return Promise.resolve(expectedExecutablePath);
                }
                isValidExecutable() {
                    return Promise.resolve(false);
                }
            }
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        ...initialState.interaction.platformDependentServices,
                        executionEnvService: new UselessExecutionEnvService(),
                        notificationService: new UselessNotificationService(),
                    },
                },
                selection: {
                    fileSelection: fakeSelection,
                },
            });
            const { actions, store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });
            const app = {
                filePath: expectedExecutablePath,
                defaultFileKinds: [],
            };

            // Act
            store.dispatch(promptForNewExecutable());
            await logicMiddleware.whenComplete();

            // Assert
            expect(userWasPromptedForDefault).to.be.true;
            expect(userWasPromptedForExecutable).to.be.true;
            expect(
                actions.includesMatch({
                    type: SET_USER_SELECTED_APPLICATIONS,
                    payload: [app],
                })
            ).to.be.true;
            expect(
                actions.includesMatch({
                    type: OPEN_WITH,
                    payload: { app },
                })
            ).to.be.true;
        });
    });

    describe("openWithDefault", () => {
        const csvKind = "CSV";
        const csvFiles: Partial<FmsFile>[] = [];
        for (let i = 0; i <= 50; i++) {
            csvFiles.push({ annotations: [{ name: AnnotationName.KIND, values: [csvKind] }] });
        }
        const pngKind = "PNG";
        const pngFiles: Partial<FmsFile>[] = [];
        for (let i = 0; i <= 50; i++) {
            pngFiles.push({ annotations: [{ name: AnnotationName.KIND, values: [pngKind] }] });
        }
        const files = [...csvFiles, ...pngFiles];
        const baseUrl = "test";
        const responseStub = {
            when: `${baseUrl}/${FileService.BASE_FILES_URL}?from=0&limit=101`,
            respondWith: {
                data: { data: files },
            },
        };
        const mockHttpClient = createMockHttpClient(responseStub);
        const fileService = new FileService({
            baseUrl,
            httpClient: mockHttpClient,
        });
        const fakeSelection = new FileSelection().select({
            fileSet: new FileSet({ fileService }),
            index: new NumericRange(0, 100),
            sortOrder: 0,
        });

        it("attempts to open selected files with default apps", async () => {
            const app1 = {
                defaultFileKinds: [csvKind],
                filePath: "my/path/to/my/first/fake.app",
            };
            const app2 = {
                defaultFileKinds: [pngKind],
                filePath: "my/path/to/my/second/fake.app",
            };
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        executionEnvService: new ExecutionEnvServiceNoop(),
                    },
                    userSelectedApplications: [app1, app2],
                },
                selection: {
                    fileSelection: fakeSelection,
                },
            });
            const { actions, store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // Act
            store.dispatch(openWithDefault());
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: OPEN_WITH,
                    payload: {
                        app: app1,
                        files: csvFiles,
                    },
                })
            ).to.be.true;
            expect(
                actions.includesMatch({
                    type: OPEN_WITH,
                    payload: {
                        app: app2,
                    },
                })
            ).to.be.true;
        });

        it("attempts to open selected files by system default", async () => {
            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        executionEnvService: new ExecutionEnvServiceNoop(),
                    },
                },
                selection: {
                    fileSelection: fakeSelection,
                },
            });
            const { actions, store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            // Act
            store.dispatch(openWithDefault());
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: OPEN_WITH,
                    payload: {
                        app: {
                            defaultFileKinds: [],
                            filePath: SystemDefaultAppLocation,
                        },
                    },
                })
            ).to.be.true;
        });
    });

    describe("openWith", () => {
        const files: { file_path: string }[] = [];
        for (let i = 0; i <= 100; i++) {
            files.push({ file_path: `/allen/file_${i}.ext` });
        }
        const baseUrl = "test";
        const responseStub = {
            when: `${baseUrl}/${FileService.BASE_FILES_URL}?from=0&limit=101`,
            respondWith: {
                data: { data: files },
            },
        };
        const mockHttpClient = createMockHttpClient(responseStub);
        const fileService = new FileService({
            baseUrl,
            httpClient: mockHttpClient,
        });

        it("attempts to open selected files", async () => {
            // Arrange
            const fakeSelection = new FileSelection().select({
                fileSet: new FileSet({ fileService }),
                index: new NumericRange(0, 100),
                sortOrder: 0,
            });
            const expectedExecutablePath = "/some/path/to/imageJ";
            let actualFilePaths: string[] | undefined = undefined;
            let actualExecutablePath: string | undefined = undefined;

            class FakeFileViewerService implements FileViewerService {
                open(executablePath: string, filePaths?: string[]) {
                    actualFilePaths = filePaths;
                    actualExecutablePath = executablePath;
                    return Promise.resolve();
                }
            }

            class FakeExecutionEnvService extends ExecutionEnvServiceNoop {
                public formatPathForHost(posixPath: string): Promise<string> {
                    return Promise.resolve(posixPath);
                }
            }

            const state = mergeState(initialState, {
                interaction: {
                    platformDependentServices: {
                        executionEnvService: new FakeExecutionEnvService(),
                        fileViewerService: new FakeFileViewerService(),
                    },
                },
                selection: {
                    fileSelection: fakeSelection,
                },
            });

            const { actions, store, logicMiddleware } = configureMockStore({
                state,
                logics: interactionLogics,
            });

            const app = {
                filePath: expectedExecutablePath,
                name: "ImageJ",
                defaultFileKinds: [],
            };

            // Act
            store.dispatch(openWith(app));
            await logicMiddleware.whenComplete();

            // Assert
            expect(actualFilePaths).to.be.deep.equal(files.map((file) => file.file_path));
            expect(actualExecutablePath).to.be.equal(expectedExecutablePath);
            expect(
                actions.includesMatch({
                    type: OPEN_WITH,
                    payload: [
                        {
                            ...app,
                            filePath: expectedExecutablePath,
                        },
                    ],
                })
            ).to.be.false;
        });
    });
});
