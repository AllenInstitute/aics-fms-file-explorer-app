import * as React from "react";
import { useDispatch } from "react-redux";

import AnnotationFilter from "../AnnotationSidebar/AnnotationFilter";
import { ItemRendererParams } from "../../components/DnDList/DnDList";
import SvgIcon from "../../components/SvgIcon";
import { selection } from "../../state";

const styles = require("./HierarchyListItem.module.css");

// Designed Daniel Bruce (www.entypo.com)
// License: https://creativecommons.org/licenses/by-sa/4.0/
const REMOVE_ICON_PATH_DATA =
    "M14.348 14.849c-0.469 0.469-1.229 0.469-1.697 0l-2.651-3.030-2.651 3.029c-0.469 0.469-1.229 0.469-1.697 0-0.469-0.469-0.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-0.469-0.469-0.469-1.228 0-1.697s1.228-0.469 1.697 0l2.652 3.031 2.651-3.031c0.469-0.469 1.228-0.469 1.697 0s0.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c0.469 0.469 0.469 1.229 0 1.698z";

const MARGIN_STEP = 10; // in px

/**
 * A single, draggable/droppable annotation that affects how files are organized in the FileList (i.e., how they are filtered, grouped, and sorted).
 */
export default function HierarchyListItem(props: ItemRendererParams) {
    const {
        index,
        item: { id, title },
    } = props;
    const dispatch = useDispatch();

    return (
        <div className={styles.container} style={{ marginLeft: MARGIN_STEP * index }}>
            <span className={styles.title}>{title}</span>
            <AnnotationFilter annotationName={id} />
            <SvgIcon
                height={15}
                onClick={() => {
                    dispatch(selection.actions.removeFromAnnotationHierarchy(id));
                }}
                pathData={REMOVE_ICON_PATH_DATA}
                viewBox="0 0 20 20"
                width={15}
            />
        </div>
    );
}
