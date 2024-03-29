import classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import FileRow from "../../components/FileRow";
import FileSet from "../../entity/FileSet";
import { selection } from "../../state";
import { OnSelect } from "./useFileSelector";

import styles from "./LazilyRenderedRow.module.css";

/**
 * Contextual data passed to LazilyRenderedRows by react-window. Basically a light-weight React context. The same data
 * is passed to each LazilyRenderedRow within the same FileList.
 */
export interface LazilyRenderedRowContext {
    fileSet: FileSet;
    onContextMenu: (evt: React.MouseEvent) => void;
    onSelect: OnSelect;
}

interface LazilyRenderedRowProps {
    data: LazilyRenderedRowContext; // injected by react-window
    index: number; // injected by react-window
    style: React.CSSProperties; // injected by react-window
}

const MARGIN = 1.5; // px; defined in LazilyRenderedRow.module.css

/**
 * A single file in the listing of available files FMS.
 */
export default function LazilyRenderedRow(props: LazilyRenderedRowProps) {
    const {
        data: { fileSet, onContextMenu, onSelect },
        index,
        style,
    } = props;

    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);
    const annotations = useSelector(selection.selectors.getOrderedDisplayAnnotations);
    const columnWidths = useSelector(selection.selectors.getColumnWidths);
    const fileSelection = useSelector(selection.selectors.getFileSelection);

    const file = fileSet.getFileByIndex(index);

    const isSelected = React.useMemo(() => {
        return fileSelection.isSelected(fileSet, index);
    }, [fileSelection, fileSet, index]);

    const isFocused = React.useMemo(() => {
        return fileSelection.isFocused(fileSet, index);
    }, [fileSelection, fileSet, index]);

    let content;
    if (file) {
        const cells = map(annotations, (annotation) => ({
            columnKey: annotation.name,
            displayValue: annotation.extractFromFile(file),
            width: columnWidths[annotation.name] || 1 / annotations.length,
        }));
        content = (
            <FileRow
                cells={cells}
                cellClassName={classNames({
                    [styles.smallFont]: shouldDisplaySmallFont,
                })}
                className={classNames(styles.row, {
                    [styles.selected]: isSelected,
                    [styles.focused]: isFocused,
                })}
                rowIdentifier={{ index, id: file.file_id }}
                onSelect={onSelect}
            />
        );
    } else {
        content = "Loading...";
    }

    return (
        <div
            className={classNames({
                [styles.smallFont]: shouldDisplaySmallFont,
            })}
            style={{
                ...style,
                width: `calc(100% - ${2 * MARGIN}px)`,
            }}
            onContextMenu={onContextMenu}
        >
            {content}
        </div>
    );
}
