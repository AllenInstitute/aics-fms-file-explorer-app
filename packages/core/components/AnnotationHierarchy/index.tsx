import classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import DnDList from "../../components/DnDList";
import Tutorial from "../../entity/Tutorial";
import HierarchyListItem from "./HierarchyListItem";
import * as annotationSelectors from "../AnnotationSidebar/selectors";

import styles from "./AnnotationHierarchy.module.css";
import { selection } from "../../state";

export const DROPPABLE_ID = "HIERARCHY_LIST";

interface AnnotationHierarchyProps {
    className?: string;
    highlightDropZone: boolean;
}

/**
 * Ordered listing of metadata annotations (a.k.a., "keys", "attributes", etc) that a user has selected by which to group files in the FileList.
 * A user can drag an annotation from AnnotationList into this component, and can later reorder the annotations already dropped into the component.
 */
export default function AnnotationHierarchy(props: AnnotationHierarchyProps) {
    const { className, highlightDropZone } = props;
    const annotationHierarchyListItems = useSelector(annotationSelectors.getHierarchyListItems);
    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);

    return (
        <div className={classNames(styles.root, className)} id={Tutorial.ANNOTATION_HIERARCHY_ID}>
            <h3 className={styles.title}>Annotation Hierarchy</h3>
            <h6 className={styles.description}>
                Files will be grouped by the following annotations
            </h6>
            <DnDList
                className={classNames(styles.hierarchy, {
                    [styles.smallFont]: shouldDisplaySmallFont,
                })}
                highlight={highlightDropZone}
                id={DROPPABLE_ID}
                items={annotationHierarchyListItems}
                itemRenderer={HierarchyListItem}
            />
        </div>
    );
}
