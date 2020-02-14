import { defaults, isEmpty, pull, uniqWith, zip } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import DirectoryTreeNode from "./DirectoryTreeNode";
import FileList from "../FileList";
import FileFilter from "../../entity/FileFilter";
import FileSet from "../../entity/FileSet";
import * as directoryTreeSelectors from "./selectors";
import { selection } from "../../state";

interface UseDirectoryHierarchyParams {
    ancestorNodes?: string[];
    currentNode?: string;
    initialCollapsed: boolean;
}

export const ROOT_NODE = "root_node_sentinal_value";

const DEFAULTS = {
    ancestorNodes: [],
    currentNode: ROOT_NODE,
};

/**
 * React hook to encapsulate all logic for constructing the directory hierarchy at a given depth
 * and path. Responsible for fetching any data required to do so.
 */
export default function useDirectoryHierarchy(params: UseDirectoryHierarchyParams) {
    const { ancestorNodes, currentNode, initialCollapsed } = defaults({}, params, DEFAULTS);
    const hierarchy = useSelector(directoryTreeSelectors.getHierarchy);
    const annotationService = useSelector(directoryTreeSelectors.getAnnotationService);
    const fileService = useSelector(directoryTreeSelectors.getFileService);
    const selectedFileFilters = useSelector(selection.selectors.getFileFilters);

    const [collapsed, setCollapsed] = React.useState(initialCollapsed);
    const [content, setContent] = React.useState<JSX.Element | JSX.Element[] | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<Error | null>(null);

    const isRoot = currentNode === ROOT_NODE;
    const isLeaf = !isRoot && hierarchy.length && ancestorNodes.length === hierarchy.length - 1;

    React.useEffect(() => {
        let cancel = false;

        // nothing to do if the node is collapsed
        if (collapsed) {
            return;
        }

        setIsLoading(true);

        // if at root of hierarchy, currentNode will be set to the sentinal "ROOT_NODE"
        // we need to trim that from the path as its not meaningful in this context
        const pathToNode = pull([...ancestorNodes, currentNode], ROOT_NODE);

        async function getContent() {
            if (isLeaf || hierarchy.length === 0) {
                // if we're at the top or bottom of the hierarchy, render a FileList

                const hierarchyFilters: FileFilter[] = zip<string, string>(
                    hierarchy,
                    pathToNode
                ).map((pair) => {
                    const [name, value] = pair as [string, string];
                    return new FileFilter(name, value);
                });

                // Filters are a combination of any user-selected filters and the filters
                // at a particular path in the hierarchy.
                let filters;
                if (isRoot) {
                    // At the root level, it's OK to have two annotation values used as filters for the same annotation.
                    // E.g., "workflow=Pipeline4.1&workflow=Pipeline4.2". This gives us an OR query. But, filter out
                    // duplicates to avoid querying by "workflow=Pipeline 4.4&workflow=Pipeline 4.4".
                    filters = uniqWith([...hierarchyFilters, ...selectedFileFilters], (a, b) =>
                        a.equals(b)
                    );
                } else {
                    // When not at the root level, remove any user-applied filters for any annotation within the current path.
                    // E.g., if under the path "AICS-12" -> "ZSD-1", and a user has applied the filters FileFilter("cell_line", "AICS-12")
                    // and FileFilter("cell_line", "AICS-33"), we do not want to include the latter in the query for this FileList.
                    filters = uniqWith(
                        [...hierarchyFilters, ...selectedFileFilters],
                        (a, b) => a.equals(b) || a.name === b.name
                    );
                }

                const fileSet = new FileSet({
                    fileService,
                    filters,
                });

                try {
                    const totalCount = await fileSet.fetchTotalCount();
                    if (!cancel) {
                        setContent(<FileList fileSet={fileSet} totalCount={totalCount} />);
                        setError(null);
                        setIsLoading(false);
                    }
                } catch (e) {
                    console.error(
                        `Failed to fetch the total number of documents beloning to ${fileSet.toString()}`,
                        e
                    );
                    if (!cancel) {
                        if (!isRoot) {
                            setCollapsed(true);
                        }
                        setError(e);
                        setIsLoading(false);
                    }
                }
            } else {
                // otherwise, there's more hierarchy to show
                try {
                    const depth = pathToNode.length;
                    const annotationNameAtDepth = hierarchy[depth];
                    const userSelectedFiltersForCurrentAnnotation = selectedFileFilters
                        .filter((filter) => filter.name === annotationNameAtDepth)
                        .map((filter) => filter.value);

                    // TODO, send user-selected filters to backend
                    let values: any[];
                    if (isRoot) {
                        values = await annotationService.fetchRootHierarchyValues(hierarchy);
                    } else {
                        values = await annotationService.fetchHierarchyValuesUnderPath(
                            hierarchy,
                            pathToNode
                        );
                    }

                    const filteredValues = values.filter((value) => {
                        if (!isEmpty(userSelectedFiltersForCurrentAnnotation)) {
                            return userSelectedFiltersForCurrentAnnotation.includes(value);
                        }

                        return true;
                    });

                    const nodes = filteredValues.map((value) => (
                        <DirectoryTreeNode
                            key={`${[...pathToNode, value].join(":")}|${hierarchy.join(":")}`}
                            ancestorNodes={pathToNode}
                            currentNode={value}
                        />
                    ));

                    if (!cancel) {
                        setContent(nodes);
                        setError(null);
                        setIsLoading(false);
                    }
                } catch (e) {
                    console.error(
                        `Something went wrong fetching next level of hierarchy underneath ${pathToNode}`,
                        e
                    );

                    if (!cancel) {
                        if (!isRoot) {
                            setCollapsed(true);
                        }
                        setError(e);
                        setIsLoading(false);
                    }
                }
            }
        }

        getContent();

        return function cleanUp() {
            cancel = true;
        };
    }, [
        ancestorNodes,
        annotationService,
        currentNode,
        collapsed,
        fileService,
        hierarchy,
        isRoot,
        isLeaf,
        selectedFileFilters,
    ]);

    return {
        collapsed,
        content,
        error,
        isLeaf,
        isLoading,
        setCollapsed,
    };
}
