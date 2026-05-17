import type { DateRange } from "./types";

interface DateRangeSelectorProps {
  dateRange: DateRange;
  onDateRangeChange: (start: string, end: string) => void;
  onPresetClick: (preset: "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "thisYear") => void;
}

const DateRangeSelector = ({
  dateRange,
  onDateRangeChange,
  onPresetClick,
}: DateRangeSelectorProps) => {
  return (
    <div className="date-range-selector">
      <div className="date-range-inputs">
        <div className="date-input-field">
          <label>From</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => onDateRangeChange(e.target.value, dateRange.endDate)}
            className="date-input"
          />
        </div>
        <div className="date-input-field">
          <label>To</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => onDateRangeChange(dateRange.startDate, e.target.value)}
            className="date-input"
          />
        </div>
        <div className="date-preset-buttons">
          <button className="date-preset-btn" onClick={() => onPresetClick("today")} title="Today">
            Today
          </button>
          <button className="date-preset-btn" onClick={() => onPresetClick("thisWeek")} title="This Week">
            This Week
          </button>
          <button className="date-preset-btn" onClick={() => onPresetClick("thisMonth")} title="This Month">
            This Month
          </button>
          <button className="date-preset-btn" onClick={() => onPresetClick("lastMonth")} title="Last Month">
            Last Month
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateRangeSelector;
