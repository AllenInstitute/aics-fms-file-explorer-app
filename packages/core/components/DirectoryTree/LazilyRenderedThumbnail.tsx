import classNames from "classnames";
import { map } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import FileSet from "../../entity/FileSet";
import { selection } from "../../state";

import styles from "../FileList/LazilyRenderedRow.module.css";
import { Shimmer } from "@fluentui/react";
import FileThumbnail from "../FileThumbnail";

/**
 * Contextual data passed to LazilyRenderedRows by react-window. Basically a light-weight React context. The same data
 * is passed to each LazilyRenderedRow within the same FileList.
 */
export interface LazilyRenderedRowContext {
    fileSet: FileSet;
    // onContextMenu: (evt: React.MouseEvent) => void;
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
export default function LazilyRenderedThumbnail(props: LazilyRenderedRowProps) {
    const {
        data: { fileSet },
        index,
        style,
    } = props;

    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);

    const file = fileSet.getFileByIndex(index);

    const content = (
        <Shimmer className={styles.shimmer} isDataLoaded={!!file?.thumbnail}>
            <FileThumbnail
                uri={
                    file?.thumbnail?.includes("http")
                        ? file.thumbnail
                        : `http://aics.corp.alleninstitute.org/labkey/fmsfiles/image${file?.thumbnail}`
                }
            />
        </Shimmer>
    );

    return (
        <div
            className={classNames({
                [styles.smallFont]: shouldDisplaySmallFont,
            })}
            style={{
                ...style,
                width: `calc(100% - ${2 * MARGIN}px)`,
            }}
        >
            {content}
        </div>
    );
}
