import { Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction } from "../../state";
import FileDetail from "../../entity/FileDetail";

import styles from "./Download.module.css";

interface DownloadProps {
    className?: string;
    fileDetails: FileDetail | null;
}

/**
 * Button for dispatching an event declaring intention to download a file.
 */
export default function Download(props: DownloadProps) {
    const { fileDetails } = props;

    const dispatch = useDispatch();
    const processStatuses = useSelector(interaction.selectors.getProcessStatuses);

    const downloadLink = React.useMemo(() => {
        if (!fileDetails) {
            return "";
        }

        // TODO: Need to make sure this works with VPN users from home with no vast connection
        return fileDetails.path;
    }, [dispatch, fileDetails]);

    if (!fileDetails) {
        return null;
    }

    return (
        <a
            className={classNames(
                styles.downloadButton, 
                { [styles.disabled]: processStatuses.some(status => status.data.fileId?.includes(fileDetails.id))},
                props.className
            )}
            download={fileDetails.path.replace(/^.*[\\\/]/, '')}
            href={downloadLink}
            target="_blank"
            title="Download"
        >
            <Icon iconName="Download" />
            <p>Download</p>
        </a>
    );
}
