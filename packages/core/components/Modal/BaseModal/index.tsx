import { ContextualMenu, IconButton, IDragOptions, Modal } from "@fluentui/react";
import { noop } from "lodash";
import * as React from "react";

import styles from "./BaseModal.module.css";

interface BaseModalProps {
    body: React.ReactNode;
    footer?: React.ReactNode;
    onDismiss?: () => void;
    title?: string;
}

const DRAG_OPTIONS: IDragOptions = {
    moveMenuItemText: "Move",
    closeMenuItemText: "Close",
    menu: ContextualMenu,
};

/**
 * Wrapper around @fluent-ui/react Modal with consistent defaults applied and some layout scaffolding
 * for plugging content into.
 */
export default function BaseModal(props: BaseModalProps) {
    const { body, footer, title, onDismiss } = props;

    const titleId = "base-modal-title";
    return (
        <Modal
            isOpen
            containerClassName={styles.container}
            dragOptions={DRAG_OPTIONS}
            scrollableContentClassName={styles.scrollableContainer}
            titleAriaId={titleId}
        >
            <div className={styles.header}>
                {title ? (
                    <h3 className={styles.title} id={titleId}>
                        {title}
                    </h3>
                ) : null}
                <IconButton
                    ariaLabel="Close"
                    className={styles.closeButton}
                    iconProps={{ iconName: "Cancel" }}
                    onClick={onDismiss}
                />
            </div>
            {body}
            <div className={styles.footer}>{footer}</div>
        </Modal>
    );
}

BaseModal.defaultProps = {
    footer: null,
    onDismiss: noop,
};
