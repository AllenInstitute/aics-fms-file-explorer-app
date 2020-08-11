import * as classNames from "classnames";
import { map } from "lodash";
import * as React from "react";

import Cell from "./Cell";
import { OnSelect } from "../../containers/FileList/useFileSelector";

interface CellConfig {
    columnKey: string;
    displayValue: string;
    width: number;
}

interface FileRowProps {
    cells: CellConfig[];
    className?: string;
    rowIdentifier?: any;
    onContextMenu?: (evt: React.MouseEvent) => void;
    onResize?: (columnKey: string, deltaX?: number) => void;
    onSelect?: OnSelect;
}

/**
 * A single row within the file list.
 */
export default function FileRow(props: FileRowProps) {
    const { cells, className, rowIdentifier, onContextMenu, onResize, onSelect } = props;

    const onClick = (evt: React.MouseEvent) => {
        evt.preventDefault();
        evt.stopPropagation();

        if (onSelect && rowIdentifier !== undefined) {
            onSelect(rowIdentifier, {
                // Details on different OS keybindings
                // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent#Properties
                ctrlKeyIsPressed: evt.ctrlKey || evt.metaKey,
                shiftKeyIsPressed: evt.shiftKey,
            });
        }
    };

    return (
        <div className={classNames(className)} onClick={onClick}>
            {map(cells, (cell) => (
                <Cell
                    key={cell.columnKey}
                    columnKey={cell.columnKey}
                    onContextMenu={onContextMenu}
                    onResize={onResize}
                    width={cell.width}
                >
                    {cell.displayValue}
                </Cell>
            ))}
        </div>
    );
}
