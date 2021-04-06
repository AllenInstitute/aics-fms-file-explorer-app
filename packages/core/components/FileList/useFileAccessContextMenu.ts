import { ContextualMenuItemType, IContextualMenuItem } from "@fluentui/react";
import { map } from "lodash";
import * as path from "path";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnnotationName } from "../../constants";
import FileFilter from "../../entity/FileFilter";
import { interaction, selection } from "../../state";
import getContextMenuItems, { ContextMenuActions } from "../ContextMenu/items";

/**
 * Custom React hook for creating the file access context menu.
 *
 * File access context menu items are dynamically generated from a list of
 * previously saved applications. The list generated also prioritizes
 * displaying context menu items that are the default for the "Kind" of files
 * selected. Can be supplied an array of filters to use to find files to access
 * instead of the currently selected files.
 */
export default function useFileAccessContextMenu(filters?: FileFilter[], onDismiss?: () => void) {
    const dispatch = useDispatch();
    const [fileKinds, setFileKinds] = React.useState<string[]>([]);
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const userSelectedApplications = useSelector(interaction.selectors.getUserSelectedApplications);

    React.useEffect(() => {
        async function getFileKinds() {
            const selectedFilesDetails = await fileSelection.fetchAllDetails();
            const kinds = selectedFilesDetails.flatMap(
                (file) =>
                    file.annotations.find((a) => a.name === AnnotationName.KIND)?.values as string[]
            );
            setFileKinds(kinds);
        }
        getFileKinds();
    }, [fileSelection]);

    return React.useCallback(
        (evt: React.MouseEvent) => {
            // Map apps to context menu options splitting them up by
            // whether they are meant to be the default for the file kind
            // currently selected
            const defaultApps: IContextualMenuItem[] = [];
            const otherSavedApps: IContextualMenuItem[] = [];
            (userSelectedApplications || [])
                .map((app) => ({ ...app, name: path.basename(app.filePath) }))
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach((app) => {
                    if (fileKinds.some((k) => app.defaultFileKinds.includes(k))) {
                        defaultApps.push({
                            key: `open-with-${app.name}`,
                            text: `Open with ${app.name} (default)`,
                            title: `Open files with ${app.name}`,
                            onClick() {
                                dispatch(
                                    interaction.actions.openFilesWithApplication(app, filters)
                                );
                            },
                        });
                    } else {
                        otherSavedApps.push({
                            key: `open-with-${app.name}`,
                            text: app.name,
                            title: `Open files with ${app.name}`,
                            onClick() {
                                dispatch(
                                    interaction.actions.openFilesWithApplication(app, filters)
                                );
                            },
                        });
                    }
                });

            const staticItems: IContextualMenuItem[] = getContextMenuItems(dispatch).ACCESS;

            // Combine the static and dynamically generated items
            const items = staticItems
                .flatMap((item) => {
                    if (item.key === ContextMenuActions.OPEN_WITH) {
                        item.subMenuProps = {
                            items: [
                                ...defaultApps,
                                ...(defaultApps.length > 0
                                    ? [
                                          {
                                              key: "default-apps-border",
                                              itemType: ContextualMenuItemType.Divider,
                                          },
                                      ]
                                    : []),
                                ...otherSavedApps,
                                ...(otherSavedApps.length > 0
                                    ? [
                                          {
                                              key: "other-saved-apps-border",
                                              itemType: ContextualMenuItemType.Divider,
                                          },
                                      ]
                                    : []),
                                // Other is constant option that allows the user
                                // to add another app for file access
                                {
                                    key: ContextMenuActions.OPEN_WITH_OTHER,
                                    text: "Other...",
                                    title: "Select an application to open the selection with",
                                    onClick() {
                                        dispatch(
                                            interaction.actions.promptForNewExecutable(filters)
                                        );
                                    },
                                },
                            ],
                        };
                        return [...defaultApps, item];
                    } else if (item.key === ContextMenuActions.CSV_MANIFEST) {
                        return [
                            {
                                ...item,
                                onClick() {
                                    dispatch(
                                        interaction.actions.showManifestDownloadDialog(filters)
                                    );
                                },
                            },
                        ];
                    } else if (item.key === ContextMenuActions.PYTHON_SNIPPET) {
                        return [
                            {
                                ...item,
                                onClick() {
                                    dispatch(
                                        interaction.actions.showGeneratePythonSnippetDialog(filters)
                                    );
                                },
                            },
                        ];
                    }
                    return [item];
                })
                .map((app) => ({
                    ...app,
                    disabled: !filters && fileSelection.count() === 0,
                }));
            dispatch(interaction.actions.showContextMenu(items, evt.nativeEvent, onDismiss));
        },
        [dispatch, fileKinds, fileSelection, userSelectedApplications]
    );
}
