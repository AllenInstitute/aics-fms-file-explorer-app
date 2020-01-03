import { cross, groups } from "d3-array";
import { isEmpty, map, reduce } from "lodash";
import { createSelector } from "reselect";

import FileFilter from "../../entity/FileFilter";
import FileSet from "../../entity/FileSet";
import { metadata, selection } from "../../state";

/**
 * Given annotation hierarchy (list of annotations, in order, by which user wants files to be grouped), and all unique values for each of those annotations,
 * return cartesian product of those unique annotation values, wrapped in FileFilter containers.
 *
 * For example,
 * given:
 *  annotationHierarchy = ["A", "B"]
 *  annotationNameToValuesMap = {
 *      A: [1, 2, 3],
 *      B: [true, false],
 *  }
 *
 * expect:
 *  return = [[FileFilter("A", 1), FileFilter("B", true)], [FileFilter("A", 1), FileFilter("B", false)],
 *            [FileFilter("A", 2), FileFilter("B", true)], [FileFilter("A", 2), FileFilter("B", false)],
 *            [FileFilter("A", 3), FileFilter("B", true)], [FileFilter("A", 3), FileFilter("B", false)]]
 */
export const getFileFilters = createSelector(
    [selection.selectors.getAnnotationHierarchy, metadata.selectors.getAnnotationNameToValuesMap],
    (annotationHierarchy, annotationNameToValuesMap): FileFilter[][] => {
        const fileFilters = reduce(
            annotationHierarchy,
            (accum, annotation) => {
                // only include those annotations that we have values for
                if (annotationNameToValuesMap[annotation.name] !== undefined) {
                    const filters = map(
                        annotationNameToValuesMap[annotation.name],
                        (val) => new FileFilter(annotation.name, val)
                    );
                    accum.push(filters);
                    return accum;
                }

                return accum;
            },
            [] as FileFilter[][]
        );
        return cross(...fileFilters);
    }
);

export type FileSetTree = [string | number | boolean | null, (FileSet[] | FileSetTree[])];

/**
 * Given output of `getFileFilters` (cartesian product of unique values of all annotations in the user-selected annotation hierarchy), output a nested data structure
 * of type `Grouping`. The first element in each `Grouping` is a unique annotation value. This is to be used as a "directory name." The second element in each `Grouping`
 * is either a nested `Grouping`, or, at the leaf-level, a list of `FileSet`. NOTE! Each list of `FileSet` will only ever have 1 `FileSet` object within it--that it must be an array
 * is an artifact of how d3-array::groups works. See https://github.com/d3/d3-array#groups.
 *
 * The nesting performed by d3-array:groups corresponds to the order of the annotation hierarchy. For example,
 * given:
 *  annotationHierarchy = ["A", "B"]
 *  annotationNameToValuesMap = {
 *      A: [1, 2],
 *      B: ["foo", "bar"],
 *  }
 *
 * expect:
 *  return = [
 *      [1,
 *          ["foo", [new FileSet({ ... })]],
 *          ["bar", [new FileSet({ ... })]],
 *      ]
 *      [2,
 *          ["foo", [new FileSet({ ... })]],
 *          ["bar", [new FileSet({ ... })]],
 *      ]
 *  ]
 */
export const getFileSetTree = createSelector(
    [getFileFilters],
    (fileFilters): FileSetTree[] => {
        // "Root" of FMS -- no annotation hierarchy in place. The "directory name" is null, and the FileSet is filterless.
        if (isEmpty(fileFilters)) {
            return [[null, [new FileSet()]]];
        }

        // Turn cartesian product of annotation values (wrapped in FileFilter containers) into a list of `FileSet`s.
        // Example:
        // given: fileFilters = [[FileFilter("A", 1), FileFilter("B", true)], [FileFilter("A", 1), FileFilter("B", false)]]
        // expect: fileSets = [Fileset({ filters: [FileFilter("A", 1), FileFilter("B", true)] }),
        //                     FileSet({ filters: [FileFilter("A", 1), FileFilter("B", false)] })]
        const fileSets = map(fileFilters, (filters: FileFilter[]) => new FileSet({ filters }));

        // Group `fileSets` by the values of the `FileFilter`s in the order in which they were given to each `FileSet`
        // This order corresponds to the annotation hierarchy. The values of the `FileFilter`s become the "directory names."
        const numKeyFuncs = fileFilters[0].length;
        const keyFuncs = Array.from({ length: numKeyFuncs }).map(
            (_, i) => (fileSet: FileSet): any => fileSet.filters[i].value
        );
        return groups(fileSets, ...keyFuncs);
    }
);

const childrenAreFileSets = (children: FileSet[] | FileSetTree[]): children is FileSet[] => {
    return children[0] instanceof FileSet;
};

export interface TreeNode {
    depth: number;
    fileSet?: FileSet;
    dir: null | string | number | boolean;
    isLeaf: boolean;
    isRoot: boolean;
    parent: number | null;
}

export const getDirectoryTree = createSelector(
    [getFileSetTree],
    (fileSetTree: FileSetTree[]): Map<number, TreeNode> => {
        const mapping = new Map<number, TreeNode>();
        const nodes = fileSetTree;
        let index = 0;
        const depths = Array.from<number>({ length: nodes.length }).fill(0);
        const parents = Array.from<number | null>({ length: nodes.length }).fill(null);

        while (nodes.length) {
            const node = nodes.shift();
            const depth = depths.shift();
            const parent = parents.shift();
            if (node === undefined || depth === undefined || parent === undefined) {
                break;
            }
            const [dir, children] = node;
            if (!childrenAreFileSets(children)) {
                Array.prototype.unshift.apply(nodes, Array.from(children));
                Array.prototype.unshift.apply(
                    depths,
                    Array.from<number>({ length: children.length }).fill(depth + 1)
                );
                Array.prototype.unshift.apply(
                    parents,
                    Array.from<number>({ length: children.length }).fill(index)
                );
                mapping.set(index, { dir, depth, isLeaf: false, isRoot: dir === null, parent });
            } else {
                mapping.set(index, {
                    dir,
                    depth,
                    fileSet: children[0],
                    isLeaf: true,
                    isRoot: dir === null,
                    parent,
                });
            }
            index++;
        }

        return mapping;
    }
);