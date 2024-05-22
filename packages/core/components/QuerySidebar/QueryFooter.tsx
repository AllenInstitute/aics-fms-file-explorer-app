import { IContextualMenuItem, IconButton } from "@fluentui/react";
import classNames from "classnames";
import { throttle } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalType } from "../Modal";
import Tutorial from "../../entity/Tutorial";
import { interaction, selection } from "../../state";
import { Query } from "../../state/selection/actions";

import styles from "./QueryFooter.module.css";

interface Props {
    isDeletable?: boolean;
    onQueryDelete: () => void;
    query: Query;
}

/**
 * Footer for a query in the QuerySidebar, used for displaying options available for a query.
 */
export default function QueryFooter(props: Props) {
    const dispatch = useDispatch();

    const url = useSelector(selection.selectors.getEncodedFileExplorerUrl);

    const isEmptyQuery = !props.query.parts.sources.length;

    const onCopy = async () => {
        try {
            navigator.clipboard.writeText(`https://biofile-finder.allencell.org/app?${url}`);
            window.alert("Link copied to clipboard!");
        } catch (error) {
            window.alert("Failed to copy shareable link to clipboard");
        }
    };
    const shareQueryOptions: IContextualMenuItem[] = [
        {
            key: "Code snippet",
            text: "Code snippet",
            iconProps: { iconName: "Code" },
            onClick: () => {
                dispatch(interaction.actions.setVisibleModal(ModalType.CodeSnippet));
            },
        },
        {
            key: "Shareable link",
            text: "Shareable link",
            iconProps: { iconName: "Link" },
            title:
                "If you share this link, the recipient will be able to view the current query by importing it as a new query.",
            onClick: () => {
                onCopy();
            },
        },
    ];
    const deleteQueryOptions: IContextualMenuItem[] = [
        {
            key: "Delete",
            text: "Delete",
            onClick: props.onQueryDelete,
        },
    ];

    const onRefresh = throttle(
        () => {
            dispatch(interaction.actions.refresh());
        },
        100000,
        { trailing: false }
    );

    return (
        <div className={styles.container}>
            <IconButton
                ariaDescription="Delete query"
                ariaLabel="Delete"
                title="Delete"
                className={classNames(styles.button, styles.hiddenInnerIcon, {
                    [styles.disabled]: !props.isDeletable,
                })}
                disabled={!props.isDeletable}
                iconProps={{ iconName: "Delete" }}
                menuProps={{
                    className: styles.buttonMenu,
                    items: deleteQueryOptions,
                    calloutProps: { className: styles.buttonMenuContainer },
                }}
            />
            <IconButton
                ariaDescription="Refresh query"
                ariaLabel="Refresh"
                title="Refresh"
                className={classNames(styles.button, { [styles.disabled]: isEmptyQuery })}
                disabled={isEmptyQuery}
                onClick={onRefresh}
                iconProps={{ iconName: "Refresh" }}
            />
            <IconButton
                ariaDescription="Copy query"
                ariaLabel="Copy"
                title="Duplicate"
                className={classNames(styles.button, { [styles.disabled]: isEmptyQuery })}
                disabled={isEmptyQuery}
                onClick={() => dispatch(selection.actions.addQuery(props.query))}
                iconProps={{ iconName: "Copy" }}
            />
            <IconButton
                ariaDescription="Share query"
                ariaLabel="Share"
                title="Share"
                className={classNames(styles.button, styles.hiddenInnerIcon, {
                    [styles.disabled]: isEmptyQuery,
                })}
                disabled={isEmptyQuery}
                menuProps={{
                    className: styles.buttonMenu,
                    items: shareQueryOptions,
                    calloutProps: { className: styles.buttonMenuContainer },
                }}
                iconProps={{ iconName: "Share" }}
                id={Tutorial.SHARE_BUTTON_ID}
            />
        </div>
    );
}
