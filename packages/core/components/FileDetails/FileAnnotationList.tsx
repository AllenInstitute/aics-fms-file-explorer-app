import classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import FileAnnotationRow from "./FileAnnotationRow";
import Annotation from "../../entity/Annotation";
import AnnotationName from "../../entity/Annotation/AnnotationName";
import FileDetail from "../../entity/FileDetail";
import { interaction, metadata } from "../../state";

import styles from "./FileAnnotationList.module.css";

interface FileAnnotationListProps {
    className?: string;
    fileDetails: FileDetail | null;
    isLoading: boolean;
}

/**
 * Component responsible for rendering the metadata pertaining to a file inside the file
 * details pane on right hand side of the application.
 */
export default function FileAnnotationList(props: FileAnnotationListProps) {
    const { className, fileDetails, isLoading } = props;
    const annotations = useSelector(metadata.selectors.getSortedAnnotations);
    const { executionEnvService } = useSelector(interaction.selectors.getPlatformDependentServices);

    // The path to this file on the host this application is running on
    // may not match the path to this file stored in the database.
    // Determine this local path.
    const [localPath, setLocalPath] = React.useState<string | null>(null);
    React.useEffect(() => {
        let active = true;

        async function formatPathForHost() {
            if (!fileDetails) {
                return;
            }

            const path = await executionEnvService.formatPathForHost(fileDetails.path);
            if (!active) {
                return;
            }
            setLocalPath(path);
        }

        formatPathForHost();

        return () => {
            active = false;
        };
    }, [fileDetails, executionEnvService]);

    const content: JSX.Element | JSX.Element[] | null = React.useMemo(() => {
        if (isLoading) {
            return <div>Loading...</div>;
        }

        if (!fileDetails) {
            return null;
        }

        return annotations.reduce((accum, annotation) => {
            if (annotation.displayName === "File Name") {
                return accum;
            }

            const annotationValue = annotation.extractFromFile(fileDetails);
            if (annotationValue === Annotation.MISSING_VALUE) {
                // Nothing to show for this annotation -- skip
                return accum;
            }

            const ret = [
                ...accum,
                <FileAnnotationRow
                    key={annotation.displayName}
                    className={styles.row}
                    name={annotation.displayName}
                    value={annotationValue}
                />,
            ];

            // Special case for file paths: we want to display both the "canonical" FMS path
            // (i.e. POSIX path held in the database; what we have an annotation for)
            // as well as the path at which the file is *actually* accessible on _this_ computer ("local" file path)
            if (annotation.name === AnnotationName.FILE_PATH) {
                if (fileDetails.path !== fileDetails.cloudPath) {
                    ret.push(
                        <FileAnnotationRow
                            key="file-path-cloud"
                            className={styles.row}
                            name="File Path (Cloud)"
                            value={fileDetails.cloudPath}
                        />
                    );
                }

                // In certain circumstances (i.e., linux), the path at which a file is accessible is === the canonical path
                if (localPath && localPath !== annotationValue && !localPath.startsWith("http")) {
                    ret.splice(
                        -1, // Insert before the "canonical" path so that it is the first path-like row to be seen
                        0, // ...don't delete the "canonical" path
                        <FileAnnotationRow
                            key="file-path-local"
                            className={styles.row}
                            name="File Path (Local)"
                            value={localPath}
                        />
                    );
                }
            }

            return ret;
        }, [] as JSX.Element[]);
    }, [annotations, fileDetails, isLoading, localPath]);

    return <div className={classNames(styles.list, className)}>{content}</div>;
}
