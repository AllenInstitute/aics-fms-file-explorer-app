import {
    ContextualMenuItemType,
    DefaultButton,
    DirectionalHint,
    IContextualMenuItem,
    Icon,
} from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import styles from "./BaseButton.module.css";

interface Props {
    className?: string;
    disabled?: boolean;
    iconName?: string;
    id?: string;
    isSelected?: boolean;
    menuDirection?: DirectionalHint;
    menuItems?: IContextualMenuItem[];
    onClick?: () => void;
    text?: string;
    title: string;
}

/**
 * Component styled for generic interactions in the app intended to be
 * used as a base for more styled components
 */
export default function BaseButton(props: Props) {
    const styledMenuItems = React.useMemo(
        () =>
            props.menuItems
                ? props.menuItems.map((menuItem) => {
                      if (menuItem.itemType === ContextualMenuItemType.Divider) {
                          return {
                              ...menuItem,
                              className: styles.buttonMenuDivider,
                          };
                      }

                      if (menuItem.itemType === ContextualMenuItemType.Header) {
                          return {
                              ...menuItem,
                              className: styles.buttonMenuHeader,
                          };
                      }

                      return menuItem;
                  })
                : undefined,
        [props.menuItems]
    );

    const content = (
        <span className={styles.buttonContent}>
            {props.iconName && (
                <Icon
                    className={classNames(styles.buttonIcon, { [styles.padRight]: !!props.text })}
                    iconName={props.iconName}
                />
            )}
            <span className={styles.buttonText}>{props.text?.toUpperCase()}</span>
        </span>
    );

    // Avoid button element wrapper if not necessary
    if (!props.onClick && !props.menuItems) {
        return (
            <div
                className={classNames(props.className, styles.button)}
                id={props.id}
                title={props.title}
            >
                {content}
            </div>
        );
    }

    return (
        <DefaultButton
            className={classNames(props.className, styles.button, {
                [styles.disabled]: props.disabled,
                [styles.selected]: props.isSelected,
            })}
            ariaLabel={props.title}
            disabled={props.disabled}
            id={props.id}
            menuIconProps={{ className: styles.hidden }}
            menuProps={
                styledMenuItems
                    ? {
                          className: styles.buttonMenu,
                          calloutProps: { className: styles.buttonMenuCallout },
                          directionalHint: props.menuDirection,
                          shouldFocusOnMount: true,
                          items: styledMenuItems,
                      }
                    : undefined
            }
            onClick={props.onClick}
            title={props.title}
        >
            {content}
        </DefaultButton>
    );
}
