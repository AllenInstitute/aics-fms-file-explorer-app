import { makeConstant } from "@aics/redux-utils";

import Annotation from "../../entity/Annotation";
import { Dataset } from "../../services/DatasetService";

const STATE_BRANCH_NAME = "metadata";

/**
 * RECEIVE_ANNOTATIONS
 *
 * Intention to store listing of available annotations returned from data service. These are the attributes on FmsFiles
 * that are available for grouping, filtering, and sorting.
 */
export const RECEIVE_ANNOTATIONS = makeConstant(STATE_BRANCH_NAME, "receive-annotations");

export interface ReceiveAnnotationAction {
    payload: Annotation[];
    type: string;
}

export function receiveAnnotations(payload: Annotation[]): ReceiveAnnotationAction {
    return {
        payload,
        type: RECEIVE_ANNOTATIONS,
    };
}

/**
 * REQUEST_ANNOTATIONS
 *
 * Intention to request listing of available annotations that are available for grouping, filtering, and sorting files.
 */
export const REQUEST_ANNOTATIONS = makeConstant(STATE_BRANCH_NAME, "request-annotations");

export interface RequestAnnotationAction {
    type: string;
}

export function requestAnnotations(): RequestAnnotationAction {
    return {
        type: REQUEST_ANNOTATIONS,
    };
}

/**
 * RECEIVE_DATASETS
 *
 * Intention to store listing of collections returned from data service. These are sets of file metadata
 * that can be used to narrow the set of explorable files down.
 */
export const RECEIVE_COLLECTIONS = makeConstant(STATE_BRANCH_NAME, "receive-collections");

export interface ReceiveCollectionsAction {
    payload: Dataset[];
    type: string;
}

export function receiveCollections(payload: Dataset[]): ReceiveCollectionsAction {
    return {
        payload,
        type: RECEIVE_COLLECTIONS,
    };
}

/**
 * REQUEST_COLLECTIONS
 *
 * Intention to request listing of available collections usable as a data source for files.
 */
export const REQUEST_COLLECTIONS = makeConstant(STATE_BRANCH_NAME, "request-collections");

export interface RequestCollectionsAction {
    type: string;
}

export function requestCollections(): RequestCollectionsAction {
    return {
        type: REQUEST_COLLECTIONS,
    };
}
