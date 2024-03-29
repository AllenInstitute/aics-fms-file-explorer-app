import { DatePicker, Icon, IconButton } from "@fluentui/react";
import * as React from "react";
import FileFilter from "../../entity/FileFilter";
import { DATE_ABSOLUTE_MIN, END_OF_TODAY } from "../../constants";
import { extractDatesFromRangeOperatorFilterString } from "../../entity/AnnotationFormatter/date-time-formatter";

import styles from "./DateRangePicker.module.css";

interface DateRangePickerProps {
    onSearch: (filterValue: string) => void;
    onReset: () => void;
    currentRange: FileFilter | undefined;
}

// Color chosen from App.module.css
const PURPLE_ICON_STYLE = { icon: { color: "#827aa3" } };

// Because the datestring comes in as an ISO formatted date like 2021-01-02
// creating a new date from that would result in a date displayed as the
// day before due to the UTC offset, to account for this we can add in the offset
// ahead of time.
export function extractDateFromDateString(dateString?: string): Date | undefined {
    if (!dateString) {
        return undefined;
    }
    const date = new Date(dateString);
    date.setMinutes(date.getTimezoneOffset());
    return date;
}

/**
 * This component renders a simple form for selecting a minimum and maximum date range
 */
export default function DateRangePicker(props: DateRangePickerProps) {
    const { onSearch, onReset, currentRange } = props;

    function onDateRangeSelection(startDate: Date | null, endDate: Date | null) {
        // Derive previous startDate/endDate from current filter state, if possible
        const {
            startDate: oldStartDate,
            endDate: oldEndDate,
        } = extractDatesFromRangeOperatorFilterString(currentRange?.value);
        if (oldEndDate) {
            // The RANGE() filter uses an exclusive upper bound.
            // However, we want to present dates in the UI as if the upper bound was inclusive.
            // To handle that, we subtract a day from the upper bound used by the filter, then present the result
            oldEndDate.setDate(oldEndDate.getDate() - 1);
        }
        const newStartDate = startDate || oldStartDate || DATE_ABSOLUTE_MIN;
        const newEndDate = endDate || oldEndDate || END_OF_TODAY;
        if (newStartDate && newEndDate) {
            // Add 1 day to endDate to account for RANGE() filter upper bound exclusivity
            const newEndDatePlusOne = new Date(newEndDate);
            newEndDatePlusOne.setDate(newEndDatePlusOne.getDate() + 1);
            onSearch(`RANGE(${newStartDate.toISOString()},${newEndDatePlusOne.toISOString()})`);
        }
    }
    const { startDate, endDate } = extractDatesFromRangeOperatorFilterString(currentRange?.value);
    if (endDate) {
        // Subtract 1 day to endDate to account for RANGE() filter upper bound exclusivity
        endDate.setDate(endDate.getDate() - 1);
    }
    return (
        <span className={styles.dateRangeBox}>
            <DatePicker
                borderless
                className={styles.filterInput}
                ariaLabel="Select a start date"
                placeholder={`Start of date range`}
                onSelectDate={(v) => (v ? onDateRangeSelection(v, null) : onReset())}
                styles={PURPLE_ICON_STYLE}
                value={extractDateFromDateString(startDate?.toISOString())}
            />
            <div className={styles.dateRangeSeparator}>
                <Icon iconName="Forward" />
            </div>
            <DatePicker
                borderless
                className={styles.filterInput}
                ariaLabel="Select an end date"
                placeholder={`End of date range`}
                onSelectDate={(v) => (v ? onDateRangeSelection(null, v) : onReset())}
                styles={PURPLE_ICON_STYLE}
                value={extractDateFromDateString(endDate?.toISOString())}
            />
            <IconButton
                ariaLabel="Clear filter date"
                iconProps={{ iconName: "Cancel" }}
                onClick={onReset}
                styles={PURPLE_ICON_STYLE}
                title="Clear"
            />
        </span>
    );
}
