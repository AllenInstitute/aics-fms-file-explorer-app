import { createSelector } from "reselect";

import { State } from "../";
import Annotation from "../../entity/Annotation";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";
import { Dataset } from "../../services/DatasetService";

// BASIC SELECTORS
export const getAnnotations = (state: State) => state.metadata.annotations;
export const getCollections = (state: State) => state.metadata.collections;

// COMPOSED SELECTORS
export const getSortedAnnotations = createSelector(getAnnotations, (annotations: Annotation[]) =>
    Annotation.sort(annotations)
);

export const getCustomAnnotationsCombinedWithFileAttributes = createSelector(
    getSortedAnnotations,
    (annotations) => Annotation.sort([...TOP_LEVEL_FILE_ANNOTATIONS, ...annotations])
);

export const getActiveCollections = createSelector(getCollections, (collections): Dataset[] =>
    collections.filter(
        (collection) => !collection.expiration || new Date(collection.expiration) > new Date()
    )
);
