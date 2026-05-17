import {
  FiCheckSquare,
  FiDownload,
  FiFileText,
  FiLayers,
  FiPrinter,
  FiRefreshCw,
} from "react-icons/fi";

interface BulkActionPanelProps {
  itemLabelSingular: string;
  itemLabelPlural: string;
  selectedCount: number;
  filteredCount: number;
  totalPages: number;
  itemsPerPage: number;
  helperText: string;
  receiptHint?: string;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onPrint: () => void;
  disableSelectAll: boolean;
  disableClearSelection: boolean;
  disableActions: boolean;
}

const BulkActionPanel = ({
  itemLabelSingular,
  itemLabelPlural,
  selectedCount,
  filteredCount,
  totalPages,
  itemsPerPage,
  helperText,
  receiptHint,
  onSelectAll,
  onClearSelection,
  onExportCSV,
  onExportPDF,
  onPrint,
  disableSelectAll,
  disableClearSelection,
  disableActions,
}: BulkActionPanelProps) => {
  const activeCount = selectedCount > 0 ? selectedCount : filteredCount;
  const activeScopeLabel =
    selectedCount > 0 ? `${selectedCount} selected ${itemLabelPlural}` : `All ${filteredCount} filtered ${itemLabelPlural}`;
  const summaryText =
    selectedCount > 0
      ? `Exports and printouts will use only the ${itemLabelPlural} you selected.`
      : `Nothing is selected yet, so actions will use every filtered ${itemLabelSingular}.`;

  return (
    <div className="data-action-panel">
      <div className="data-action-summary">
        <span className="data-action-kicker">Export & Print Center</span>
        <h3>{activeScopeLabel}</h3>
        <p>{summaryText}</p>
        <div className="data-action-metrics">
          <span className="data-action-chip">
            <FiLayers />
            <strong>{activeCount}</strong> ready
          </span>
          <span className="data-action-chip">{itemsPerPage} per page</span>
          <span className="data-action-chip">{totalPages} pages</span>
        </div>
      </div>

      <div className="data-action-groups">
        <div className="data-action-group">
          <span className="data-action-group-label">Selection</span>
          <div className="data-action-group-buttons">
            <button type="button" className="btn outline data-action-btn" onClick={onSelectAll} disabled={disableSelectAll}>
              <FiCheckSquare />
              <span>Select All</span>
            </button>
            <button
              type="button"
              className="btn outline data-action-btn"
              onClick={onClearSelection}
              disabled={disableClearSelection}
            >
              <FiRefreshCw />
              <span>Clear</span>
            </button>
          </div>
        </div>

        <div className="data-action-group">
          <span className="data-action-group-label">Output</span>
          <div className="data-action-group-buttons">
            <button type="button" className="btn outline data-action-btn" onClick={onExportCSV} disabled={disableActions}>
              <FiDownload />
              <span>Export CSV</span>
            </button>
            <button type="button" className="btn outline data-action-btn" onClick={onExportPDF} disabled={disableActions}>
              <FiFileText />
              <span>Export PDF</span>
            </button>
            <button type="button" className="btn secondary data-action-btn data-action-btn-print" onClick={onPrint} disabled={disableActions}>
              <FiPrinter />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      <div className="data-action-footer">
        <p className="data-action-note">{helperText}</p>
        {receiptHint && <p className="data-action-note data-action-note-accent">{receiptHint}</p>}
      </div>
    </div>
  );
};

export default BulkActionPanel;
