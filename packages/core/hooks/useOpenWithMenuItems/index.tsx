import { ContextualMenuItemType, IContextualMenuItem, Icon } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FileDetail from "../../entity/FileDetail";
import FileFilter from "../../entity/FileFilter";
import { interaction } from "../../state";

import styles from "./useOpenWithMenuItems.module.css";

export default (fileDetails?: FileDetail, filters?: FileFilter[]): IContextualMenuItem[] => {
    const dispatch = useDispatch();
    const isOnWeb = useSelector(interaction.selectors.isOnWeb);
    const userSelectedApplications = useSelector(interaction.selectors.getUserSelectedApplications);
    const { executionEnvService } = useSelector(interaction.selectors.getPlatformDependentServices);
    const fileExplorerServiceBaseUrl = useSelector(
        interaction.selectors.getFileExplorerServiceBaseUrl
    );

    const plateLink = fileDetails?.getLinkToPlateUI(fileExplorerServiceBaseUrl);

    return [
        {
            key: "web-apps",
            text: "WEB APPS",
            title: "Web applications (no installation necessary)",
            itemType: ContextualMenuItemType.Header,
        },
        {
            key: "3d-web-viewer",
            text: "3D Web Viewer",
            title: `Open files with 3D Web Viewer`,
            href: `https://allen-cell-animated.github.io/website-3d-cell-viewer/?url=${fileDetails?.path}/`,
            disabled: !fileDetails?.path,
            target: "_blank",
        },
        ...(plateLink
            ? [
                  {
                      key: "open-plate-ui",
                      text: "LabKey Plate UI",
                      title: "Open this plate in the Plate UI",
                      href: plateLink,
                      target: "_blank",
                  },
              ]
            : []),
        {
            key: "desktop-apps",
            text: "DESKTOP APPS",
            title: "Desktop applications (installation required)",
            itemType: ContextualMenuItemType.Header,
        },
        ...[
            ...(userSelectedApplications || []).map((app) => {
                const name = executionEnvService.getFilename(app.filePath);
                return {
                    key: `open-with-${name}`,
                    text: name,
                    title: `Open files with ${name}`,
                    disabled: !filters && !fileDetails,
                    onClick() {
                        if (filters) {
                            dispatch(interaction.actions.openWith(app, filters));
                        } else if (fileDetails) {
                            dispatch(interaction.actions.openWith(app, undefined, [fileDetails]));
                        }
                    },
                };
            }),
            {
                key: "agave",
                className: styles.agaveLink,
                text: "AGAVE",
                title: `Open files with AGAVE`,
                href: `agave://${fileDetails?.path}`,
                disabled: !fileDetails?.path,
                target: "_blank",
                onRenderContent(props, defaultRenders) {
                    return (
                        <>
                            {defaultRenders.renderItemName(props)}
                            <a
                                className={styles.viewLink}
                                href="https://www.allencell.org/pathtrace-rendering.html"
                                rel="noreferrer"
                                target="_blank"
                            >
                                | View info
                                <Icon iconName="Link" />
                            </a>
                        </>
                    );
                },
            } as IContextualMenuItem,
        ].sort((a, b) => (a.text || "").localeCompare(b.text || "")),
        // Unable to open arbitrary applications on the web at the moment
        ...(isOnWeb
            ? []
            : [
                  {
                      key: "other...",
                      text: "Other...",
                      title: "Select an application to open the selection with",
                      onClick() {
                          dispatch(interaction.actions.promptForNewExecutable(filters));
                      },
                  },
              ]),
    ];
};
