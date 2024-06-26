import { DirectionalHint, Icon, IconButton } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import { useButtonMenu } from "../Buttons";
import { DnDItem, DnDItemRendererParams } from "../DnDList/DnDList";

import styles from "./QueryPartRow.module.css";

export interface QueryPartRowItem extends DnDItem {
    titleIconName?: string;
    onClick?: (itemId: string) => void;
    onDelete?: (itemId: string) => void;
    onRenderEditMenuList?: (item: QueryPartRowItem) => React.ReactElement<QueryPartRowItem>;
}

interface Props extends DnDItemRendererParams {
    item: QueryPartRowItem;
}

/**
 * Row within a query part that can be reordered and deleted
 */
export default function QueryGroupRow(props: Props) {
    const editMenu = useButtonMenu({
        shouldFocusOnMount: true,
        directionalHint: DirectionalHint.rightTopEdge,
        items: [{ key: "placeholder" }], // necessary to have a non-empty items list to have `onRenderMenuList` called
        onRenderMenuList: () => props.item.onRenderEditMenuList?.(props.item) as React.ReactElement,
    });

    const isInteractive = !!props.item.onClick || !props.item.disabled;
    const baseMargin = isInteractive ? 8 : 0;
    const marginLeft = props.item.disabled ? baseMargin : props.index * 16 + baseMargin;

    return (
        <div
            className={classNames(styles.row, {
                [styles.grabbable]: !props.item.disabled,
                [styles.interactive]: isInteractive,
            })}
            style={{ marginLeft }}
        >
            <div
                className={classNames(styles.rowTitle, {
                    [styles.shortenedRowTitle]: !!props.item.onRenderEditMenuList,
                    [styles.dynamicRowTitle]: !isInteractive,
                })}
                title={props.item.title}
                onClick={() => props.item.onClick?.(props.item.id)}
            >
                {props.item.titleIconName && (
                    <Icon className={styles.icon} iconName={props.item.titleIconName} />
                )}
                <p>{props.item.title}</p>
            </div>
            {!!props.item.onRenderEditMenuList && (
                <IconButton
                    ariaLabel="Edit"
                    className={classNames(styles.iconButton, styles.hiddenInnerIcon)}
                    iconProps={{ iconName: "Edit" }}
                    title="Edit"
                    menuProps={editMenu}
                />
            )}
            {props.item.onDelete && (
                <IconButton
                    ariaDescription="Delete"
                    ariaLabel="Delete"
                    className={styles.iconButton}
                    iconProps={{ iconName: "Cancel" }}
                    title="Delete"
                    onClick={() => props.item.onDelete?.(props.item.id)}
                />
            )}
        </div>
    );
}
