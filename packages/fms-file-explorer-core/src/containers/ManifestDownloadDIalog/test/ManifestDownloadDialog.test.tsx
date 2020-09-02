import { configureMockStore, mergeState } from "@aics/redux-utils";
import { expect } from "chai";
import * as React from "react";
import { render, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";

import ManifestDownloadDialog from "..";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import Annotation from "../../../entity/Annotation";
import PersistentConfigService from "../../../services/PersistentConfigService";
import FileDownloadService from "../../../services/FileDownloadService";
import { initialState, reduxLogics } from "../../../state";

describe("<ManifestDownloadDialog />", () => {
    const visibleDialogState = mergeState(initialState, {
        interaction: {
            isManifestDownloadDialogVisible: true,
        },
    });

    it("is not visible when should be hidden", async () => {
        // Arrange
        const { store } = configureMockStore({ state: initialState });
        const { getByText } = render(
            <Provider store={store}>
                <ManifestDownloadDialog />
            </Provider>
        );

        // Assert
        expect(() => getByText("Download CSV Manifest")).to.throw();
    });

    it("is visible when should not be hidden", async () => {
        // Arrange
        const { store } = configureMockStore({ state: visibleDialogState });
        const { getByText } = render(
            <Provider store={store}>
                <ManifestDownloadDialog />
            </Provider>
        );

        // Assert
        expect(getByText("Download CSV Manifest")).to.exist;
    });

    it("starts download and saves columns when download button is clicked", async () => {
        // Arrange
        let savedColumns;
        class ScopedPersistentConfigService implements PersistentConfigService {
            public get(): any {
                return "test";
            }
            public set(_: string, value: any) {
                savedColumns = value;
            }
        }
        let downloadTriggered = false;
        class ScopedFileDownloadService implements FileDownloadService {
            public downloadCsvManifest() {
                downloadTriggered = true;
                return Promise.resolve("test");
            }

            public cancelActiveRequest() {
                return Promise.reject();
            }
        }
        const state = mergeState(visibleDialogState, {
            interaction: {
                platformDependentServices: {
                    fileDownloadService: new ScopedFileDownloadService(),
                    persistentConfigService: new ScopedPersistentConfigService(),
                },
            },
        });
        const { store, logicMiddleware } = configureMockStore({ state, logics: reduxLogics });
        const { findByText } = render(
            <Provider store={store}>
                <ManifestDownloadDialog />
            </Provider>
        );

        // Act
        const downloadButton = await findByText("Download");
        fireEvent.click(downloadButton);
        await logicMiddleware.whenComplete();

        // Assert
        expect(savedColumns).to.be.deep.eq([]);
        expect(downloadTriggered).to.be.true;
    });

    it("selects all columns when 'Select All' button is clicked", async () => {
        // Arrange
        const columns = ["Cell Line", "Cas9", "Donor Plasmid"];
        const state = mergeState(visibleDialogState, {
            metadata: {
                annotations: columns.map(
                    (c) =>
                        new Annotation({
                            annotationDisplayName: c,
                            annotationName: c,
                            description: "test",
                            type: "Text",
                        })
                ),
            },
        });
        const { store } = configureMockStore({ state });
        const { getByText, findByText } = render(
            <Provider store={store}>
                <ManifestDownloadDialog />
            </Provider>
        );
        // (sanity-check) ensure columns are not present in list before asserting that they are added
        columns.forEach((column) => {
            expect(() => getByText(column)).to.throw;
        });

        // Act
        const selectAllButton = await findByText("Select All");
        fireEvent.click(selectAllButton);

        // Assert
        columns.forEach((column) => {
            expect(getByText(column)).to.exist;
        });
    });

    it("deselects all columns when 'Select None' button is clicked", async () => {
        // Arrange
        const columns = ["Cell Line", "Cas9", "Donor Plasmid"];
        class ScopedPersistentConfigService implements PersistentConfigService {
            public get(): any {
                return columns;
            }
            public set() {
                return;
            }
        }
        const state = mergeState(visibleDialogState, {
            interaction: {
                platformDependentServices: {
                    persistentConfigService: new ScopedPersistentConfigService(),
                },
            },
            metadata: {
                annotations: columns.map(
                    (c) =>
                        new Annotation({
                            annotationDisplayName: c,
                            annotationName: c,
                            description: "test",
                            type: "Text",
                        })
                ),
            },
        });
        const { store } = configureMockStore({ state });
        const { getByText, findByText } = render(
            <Provider store={store}>
                <ManifestDownloadDialog />
            </Provider>
        );
        // (sanity-check) ensure columns are present in list before asserting that they are removed
        columns.forEach((column) => {
            expect(getByText(column)).to.exist;
        });

        // Act
        const selectNoneButton = await findByText("Select None");
        fireEvent.click(selectNoneButton);

        // Assert
        columns.forEach((column) => {
            expect(() => getByText(column)).to.throw;
        });
    });

    describe("column list", () => {
        it("has default & pre-saved columns that were persisted", async () => {
            // Arrange
            const preSavedColumns = ["Cas9", "Cell Line", "Donor Plasmid"];
            class ScopedPersistentConfigService implements PersistentConfigService {
                public get(): any {
                    return preSavedColumns;
                }
                public set() {
                    return;
                }
            }
            const state = mergeState(visibleDialogState, {
                interaction: {
                    platformDependentServices: {
                        persistentConfigService: new ScopedPersistentConfigService(),
                    },
                },
            });
            const { store } = configureMockStore({ state });
            const { getByText } = render(
                <Provider store={store}>
                    <ManifestDownloadDialog />
                </Provider>
            );

            // Assert
            TOP_LEVEL_FILE_ANNOTATIONS.forEach((annotation) => {
                expect(getByText(annotation.displayName)).to.exist;
            });
            preSavedColumns.forEach((value) => {
                expect(getByText(value)).to.exist;
            });
        });

        it("removes column when icon is clicked", async () => {
            // Arrange
            const column = "Cell Line";
            class ScopedPersistentConfigService implements PersistentConfigService {
                public get(): any {
                    return [column];
                }
                public set() {
                    return;
                }
            }
            const state = mergeState(visibleDialogState, {
                metadata: {
                    annotations: [
                        new Annotation({
                            annotationDisplayName: column,
                            annotationName: column,
                            description: "test",
                            type: "Text",
                        }),
                    ],
                },
                interaction: {
                    platformDependentServices: {
                        persistentConfigService: new ScopedPersistentConfigService(),
                    },
                },
            });
            const { store } = configureMockStore({ state });
            const { findByTestId, findAllByRole } = render(
                <Provider store={store}>
                    <ManifestDownloadDialog />
                </Provider>
            );
            // (sanity-check) ensure column is present in list before asserting that it was removed
            let columns = await findAllByRole("listitem");
            expect(columns).to.be.length(TOP_LEVEL_FILE_ANNOTATIONS.length + 1);

            // Act
            const deselectIcon = await findByTestId("column-deselect-icon");
            fireEvent.click(deselectIcon);

            // Assert
            columns = await findAllByRole("listitem");
            expect(columns).to.be.length(TOP_LEVEL_FILE_ANNOTATIONS.length);
        });

        it("adds column to list when selected in dropdown", async () => {
            // Arrange
            const column = "Cell Line";
            const state = mergeState(visibleDialogState, {
                metadata: {
                    annotations: [
                        new Annotation({
                            annotationDisplayName: column,
                            annotationName: column,
                            description: "test",
                            type: "Text",
                        }),
                    ],
                },
            });
            const { store } = configureMockStore({ state });
            const { findByText, findAllByRole } = render(
                <Provider store={store}>
                    <ManifestDownloadDialog />
                </Provider>
            );
            // (sanity-check) ensure column is not present in list before asserting that it was added
            let columns = await findAllByRole("listitem");
            expect(columns).to.be.length(TOP_LEVEL_FILE_ANNOTATIONS.length);

            // Act
            const dropdown = await findByText("Add more columns");
            fireEvent.click(dropdown);
            const dropdownOption = await findByText(column);
            fireEvent.click(dropdownOption);

            // Assert
            columns = await findAllByRole("listitem");
            expect(columns).to.be.length(TOP_LEVEL_FILE_ANNOTATIONS.length + 1);
        });
    });
});
