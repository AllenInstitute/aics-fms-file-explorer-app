import { map } from "lodash";

import HttpServiceBase from "../HttpServiceBase";
import Annotation from "../../entity/Annotation";

/**
 * Expected JSON structure of an annotation returned from the query service.
 */
export interface AnnotationResponse {
    annotationDisplayName: string;
    annotationName: string;
    description: string;
    type: string;
    units?: string;
}

export type AnnotationValue = string | number | boolean | Date;

/**
 * Service responsible for fetching annotation related metadata.
 */
export default class AnnotationService extends HttpServiceBase {
    public static ANNOTATION_ENDPOINT_VERSION = "1.0";
    public static BASE_ANNOTATION_URL = `file-explorer-service/${AnnotationService.ANNOTATION_ENDPOINT_VERSION}/annotations`;
    public static BASE_ANNOTATION_HIERARCHY_ROOT_URL = `${AnnotationService.BASE_ANNOTATION_URL}/hierarchy/root`;
    public static BASE_ANNOTATION_HIERARCHY_UNDER_PATH_URL = `${AnnotationService.BASE_ANNOTATION_URL}/hierarchy/under-path`;
    public static BASE_AVAILABLE_ANNOTATIONS_UNDER_HIERARCHY = `${AnnotationService.BASE_ANNOTATION_URL}/hierarchy/available`;

    /**
     * Fetch all annotations.
     */
    public async fetchAnnotations(): Promise<Annotation[]> {
        const requestUrl = `${this.baseUrl}/${AnnotationService.BASE_ANNOTATION_URL}`;
        console.log(`Requesting annotation values from ${requestUrl}`);

        const response = await this.get<AnnotationResponse>(requestUrl);
        return map(response.data, (annotationResponse) => new Annotation(annotationResponse));
    }

    /**
     * Fetch the unique values for a specific annotation.
     */
    public async fetchValues(annotation: string): Promise<AnnotationValue[]> {
        // Encode any special characters in the annotation as necessary
        const encodedAnnotation = HttpServiceBase.encodeURISection(annotation);
        const requestUrl = `${this.baseUrl}/${AnnotationService.BASE_ANNOTATION_URL}/${encodedAnnotation}/values`;
        console.log(`Requesting annotation values from ${requestUrl}`);

        const response = await this.get<AnnotationValue>(requestUrl);
        return response.data;
    }

    public async fetchRootHierarchyValues(hierarchy: string[]): Promise<string[]> {
        // It's important that we fetch values for the correct (i.e., first) level of the hierarchy.
        // But after that, sort the levels so that we can effectively cache the result
        // resorting the hierarchy underneath the first level should have no effect on the result.
        // This is a huge optimization.
        const [first, ...rest] = hierarchy;
        const queryParams = [first, ...rest.sort()]
            .map((annotationName) => `order=${annotationName}`)
            .join("&");
        const requestUrl = `${this.baseUrl}/${AnnotationService.BASE_ANNOTATION_HIERARCHY_ROOT_URL}?${queryParams}`;
        console.log(`Requesting root hierarchy values: ${requestUrl}`);

        const response = await this.get<string>(requestUrl);
        return response.data;
    }

    public async fetchHierarchyValuesUnderPath(
        hierarchy: string[],
        path: string[]
    ): Promise<string[]> {
        const queryParams = [
            ...hierarchy.map((annotationName) => `order=${annotationName}`),
            ...path.map((annotationValue) => `path=${annotationValue}`),
        ].join("&");
        const requestUrl = `${this.baseUrl}/${AnnotationService.BASE_ANNOTATION_HIERARCHY_UNDER_PATH_URL}?${queryParams}`;
        console.log(`Requesting hierarchy values under path: ${requestUrl}`);

        const response = await this.get<string>(requestUrl);
        return response.data;
    }

    /**
     * Fetchs annotations that can be combined with current hierarchy while still producing a non-empty
     * file set
     */
    public async fetchAvailableAnnotationsForHierarchy(annotations: string[]): Promise<string[]> {
        const queryParams = [...annotations]
            .sort() // sort in order to effectively cache
            .map((annotation) => `hierarchy=${annotation}`)
            .join("&");
        const requestUrl = `${this.baseUrl}/${AnnotationService.BASE_AVAILABLE_ANNOTATIONS_UNDER_HIERARCHY}?${queryParams}`;
        console.log(`Requesting available annotations with current hierarchy: ${requestUrl}`);

        const response = await this.get<string>(requestUrl);
        return response.data;
    }
}
