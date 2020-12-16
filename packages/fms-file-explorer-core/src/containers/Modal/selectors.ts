import { createSelector } from "reselect";

import Annotation from "../../entity/Annotation";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";
import * as interactionSelectors from "../../state/interaction/selectors";
import * as metadataSelectors from "../../state/metadata/selectors";

export const getAnnotations = createSelector(
    [metadataSelectors.getSortedAnnotations],
    (annotations) => Annotation.sort([...TOP_LEVEL_FILE_ANNOTATIONS, ...annotations])
);

export const getAnnotationsPreviouslySelected = createSelector(
    [interactionSelectors.getCsvColumns, getAnnotations],
    (annotationDisplayNames, annotations) => {
        return annotations.filter((annotation) =>
            annotationDisplayNames?.includes(annotation.displayName)
        );
    }
);