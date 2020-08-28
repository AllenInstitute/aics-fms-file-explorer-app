import { map } from "lodash";
import {
    MessageBar,
    MessageBarType,
    Spinner,
    SpinnerSize,
    Stack,
    DefaultButton,
} from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction } from "../../state";
import { StatusUpdate, ProcessStatus } from "../../state/interaction/actions";

const styles = require("./StatusMessage.module.css");

const statusToTypeMap = {
    [ProcessStatus.STARTED]: MessageBarType.info,
    [ProcessStatus.SUCCEEDED]: MessageBarType.success,
    [ProcessStatus.FAILED]: MessageBarType.error,
    [ProcessStatus.NOT_SET]: MessageBarType.info,
};

const statusToBackgroundColorMap = {
    [ProcessStatus.STARTED]: "rgb(210, 207, 212)", // gray
    [ProcessStatus.SUCCEEDED]: "rgb(95, 210, 85)", // green
    [ProcessStatus.FAILED]: "rgb(245, 135, 145)", // red
    [ProcessStatus.NOT_SET]: "rgb(210, 207, 212)", // gray
};

const SPACING = 5; // px
const verticalStackProps = {
    styles: {
        root: {
            top: SPACING,
        },
    },
    tokens: {
        childrenGap: SPACING,
    },
};

/**
 * Pop-up banners that display status messages of processes, such as the download of a CSV manifest. They
 * stack vertically at the top of the window.
 */
export default function StatusMessage() {
    const dispatch = useDispatch();

    return (
        <Stack {...verticalStackProps} className={styles.container}>
            {map(
                useSelector(interaction.selectors.getProcessStatuses),
                (statusUpdate: StatusUpdate) => {
                    const {
                        data: { msg, status = ProcessStatus.NOT_SET },
                        onCancel,
                    } = statusUpdate;
                    let cancelButton;
                    if (onCancel) {
                        cancelButton = <DefaultButton onClick={onCancel}>Cancel</DefaultButton>;
                    }

                    return (
                        <MessageBar
                            actions={cancelButton}
                            key={statusUpdate.id}
                            messageBarType={statusToTypeMap[status]}
                            onDismiss={() =>
                                dispatch(interaction.actions.removeStatus(statusUpdate.id))
                            }
                            styles={{
                                root: {
                                    backgroundColor: statusToBackgroundColorMap[status],
                                },
                            }}
                            isMultiline={msg !== undefined}
                        >
                            <div className={styles.centeringParent}>
                                {status === ProcessStatus.STARTED && (
                                    <Spinner className={styles.spinner} size={SpinnerSize.small} />
                                )}
                                <div
                                    dangerouslySetInnerHTML={{ __html: msg }}
                                    style={{ userSelect: "text" }}
                                ></div>
                            </div>
                        </MessageBar>
                    );
                }
            )}
        </Stack>
    );
}
