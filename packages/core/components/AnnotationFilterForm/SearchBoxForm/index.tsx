import { ChoiceGroup } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import ListPicker from "../../ListPicker";
import { ListItem } from "../../ListPicker/ListRow";
import SearchBox from "../../SearchBox";
import FileFilter from "../../../entity/FileFilter";

import styles from "./SearchBoxForm.module.css";

interface SearchBoxFormProps {
    className?: string;
    items: ListItem[];
    title?: string;
    onDeselect: (item: ListItem) => void;
    onDeselectAll: () => void;
    onSelect: (item: ListItem) => void;
    onSelectAll: () => void;
    onSearch: (filterValue: string) => void;
    fieldName: string;
    defaultValue: FileFilter | undefined;
}

/**
 * This component renders a simple form for searching on text values
 * or selecting indiviudal items via the ListPicker
 */
export default function SearchBoxForm(props: SearchBoxFormProps) {
    const [isListPicking, setIsListPicking] = React.useState(false);

    return (
        <div className={classNames(props.className, styles.container)}>
            <h3 className={styles.title}>{props.title}</h3>
            <ChoiceGroup
                className={styles.choiceGroup}
                label="Filter type"
                defaultSelectedKey={isListPicking ? "list-picker" : "search-box"}
                options={[
                    {
                        key: "search-box",
                        text: "Search box",
                    },
                    {
                        key: "list-picker",
                        text: "List picker",
                        disabled: props.items.length === 0,
                    },
                ]}
                onChange={(_, selection) => {
                    // Clear the selection if the user switches to the search box
                    // and the default value is not in the list (i.e. not deselectable)
                    if (props.defaultValue && !props.items.some((item) => item.selected)) {
                        props.onDeselectAll();
                    }
                    setIsListPicking(selection?.key === "list-picker");
                }}
            />
            {isListPicking ? (
                <ListPicker
                    className={styles.listPicker}
                    items={props.items}
                    onDeselect={props.onDeselect}
                    onDeselectAll={props.onDeselectAll}
                    onSelect={props.onSelect}
                    onSelectAll={props.onSelectAll}
                />
            ) : (
                <div data-is-focusable="true">
                    <SearchBox
                        defaultValue={props.defaultValue}
                        onReset={props.onDeselectAll}
                        onSearch={props.onSearch}
                        placeholder={`Search by ${props.fieldName}`}
                    />
                </div>
            )}
        </div>
    );
}
