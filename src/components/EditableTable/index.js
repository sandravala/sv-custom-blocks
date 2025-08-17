// EditableTable.js - Reusable component for AI blocks
// Follows sv_cb_{block_abbreviation}_{data_type} naming convention

import React, { useState, useEffect } from "react";

/**
 * EditableTable Component
 *
 * @param {Object} props
 * @param {Array} props.data - Array of data objects or grouped data object
 * @param {Array} props.columns - Column configuration array
 * @param {Object} props.config - Table configuration
 * @param {Function} props.onDataChange - Callback when data changes
 * @param {Function} props.onSave - Callback for save action
 * @param {string} props.blockAbbr - Block abbreviation for naming convention
 * @param {string} props.dataType - Data type for naming convention
 */
const EditableTable = ({
	data = [],
	columns = [],
	config = {},
	onDataChange,
	onSave,
	blockAbbr = "",
	dataType = "",
	className = "",
}) => {
	// Default configuration
	const defaultConfig = {
		title: "Editable Table",
		allowEditing: true,
		allowAddRemove: true,
		grouped: false,
		groupBy: null,
		showActions: true,
		actionsLabel: "",
		showCounter: true,
		emptyStateText: "No items added yet",
		emptyStateSubtext: "Add your first item to get started",
		addButtonText: "Add Item",
		saveButtonText: "Save Changes",
		deleteConfirmText: "Are you sure you want to delete this item?",
		showTotals: false,
		totalsConfig: {
			label: "Total",
			position: "bottom", // 'top' or 'bottom'
			fields: {}, // Which fields to calculate totals for
		},
	};

	const tableConfig = { ...defaultConfig, ...config };

	// State management
	const [tableData, setTableData] = useState(data);
	const [editingRows, setEditingRows] = useState(new Set());
	const [isDirty, setIsDirty] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Update internal data when props change
	// useEffect(() => {
	// 	setTableData(data);
	// 	setIsDirty(false);
	// }, [data]);

	// Generate unique ID for new rows
	const generateId = () => {
		return Date.now() + Math.random().toString(36).substr(2, 9);
	};

	// Handle data changes
	const handleDataChange = (newData) => {
		setTableData(newData);
		setIsDirty(true);
		if (onDataChange) {
			onDataChange(newData);
		}
	};

	// Toggle edit mode for a row
	const toggleEdit = (rowId) => {
		const newEditingRows = new Set(editingRows);
		if (newEditingRows.has(rowId)) {
			newEditingRows.delete(rowId);
		} else {
			newEditingRows.add(rowId);
		}
		setEditingRows(newEditingRows);
	};

	// Save changes
	const handleSave = async () => {
		if (!onSave) return;

		setIsLoading(true);
		try {
			await onSave(tableData, `sv_cb_${blockAbbr}_${dataType}`);
			setIsDirty(false);
			setEditingRows(new Set());
		} catch (error) {
			console.error("Error saving data:", error);
		} finally {
			setIsLoading(false);
		}
	};

	// Add new row
	const addRow = (groupKey = null) => {
		const newRow = {
			id: generateId(),
			...columns.reduce((acc, col) => {
				acc[col.key] = col.defaultValue || "";
				return acc;
			}, {}),
		};

		// Add group field for flat array mode
		if (tableConfig.grouped && groupKey && Array.isArray(tableData)) {
			const groupByField = tableConfig.groupBy || "group";
			newRow[groupByField] = groupKey;
		}

		let newData;
		if (tableConfig.grouped) {
			if (Array.isArray(tableData)) {
				// Flat array - just add to array
				newData = [...tableData, newRow];
			} else {
				// Pre-grouped object - add to specific group
				newData = { ...tableData };
				if (!newData[groupKey]) {
					newData[groupKey] = [];
				}
				newData[groupKey] = [...newData[groupKey], newRow];
			}
		} else {
			// Simple ungrouped mode
			newData = [...tableData, newRow];
		}

		handleDataChange(newData);
		setEditingRows(new Set([...editingRows, newRow.id]));
	};

	// Delete row
	const deleteRow = (rowId, groupKey = null) => {
		if (!confirm(tableConfig.deleteConfirmText)) return;

		let newData;

		if (tableConfig.grouped) {
			// Check if data is pre-grouped object or flat array
			if (Array.isArray(tableData)) {
				// Flat array - filter directly
				newData = tableData.filter((row) => row.id !== rowId);
			} else {
				// Pre-grouped object - filter within the group
				newData = { ...tableData };
				newData[groupKey] = newData[groupKey].filter((row) => row.id !== rowId);
			}
		} else {
			// Simple ungrouped mode
			newData = tableData.filter((row) => row.id !== rowId);
		}

		handleDataChange(newData);

		const newEditingRows = new Set(editingRows);
		newEditingRows.delete(rowId);
		setEditingRows(newEditingRows);
	};

	// Update row data
	const updateRow = (rowId, field, value, groupKey = null) => {
		const column = columns.find((col) => col.key === field);
		value = convertValue(value, column);

		let newData;

		if (tableConfig.grouped) {
			// Check if data is pre-grouped object or flat array
			if (Array.isArray(tableData)) {
				// Flat array - update directly in the array
				newData = tableData.map((row) =>
					row.id === rowId ? { ...row, [field]: value } : row,
				);
			} else {
				// Pre-grouped object - update within the group
				newData = { ...tableData };
				newData[groupKey] = newData[groupKey].map((row) =>
					row.id === rowId ? { ...row, [field]: value } : row,
				);
			}
		} else {
			// Simple ungrouped mode
			newData = tableData.map((row) =>
				row.id === rowId ? { ...row, [field]: value } : row,
			);
		}

		handleDataChange(newData);
	};
	const convertValue = (value, column) => {
		if (!column) return value;

		switch (column.type) {
			case "number":
				if (value === "" || value === null || value === undefined) {
					return column.defaultValue || 0;
				}
				const num = Number(value);
				return isNaN(num) ? column.defaultValue || 0 : num;

			case "select":
				return value || column.defaultValue || "";

			default:
				return value;
		}
	};

	// Render field based on column configuration
	const renderField = (row, column, isEditing, groupKey = null) => {
		const value = row[column.key];

		// Special handling for totals row
		if (row.__isTotalsRow) {
			return (
				<div className="sv-field-value sv-totals-value">
					{column.type === "number" && typeof value === "number"
						? value.toLocaleString()
						: value}
				</div>
			);
		}
		const fieldId = `${blockAbbr}_${dataType}_${column.key}_${row.id}`;

		if (!isEditing) {
			// Display mode
			if (column.render) {
				return column.render(value, row);
			}

			if (column.type === "badge") {
				const badgeClass = column.getBadgeClass
					? column.getBadgeClass(value)
					: "";
				return <span className={`sv-badge ${badgeClass}`}>{value}</span>;
			}

			return <div className="sv-field-value">{value}</div>;
		}

		// Edit mode
		const commonProps = {
			id: fieldId,
			className: `sv-field-input ${column.type === "number" ? "number" : ""} ${
				column.type === "textarea" ? "textarea" : ""
			}`,
			value: value || "",
			onChange: (e) => updateRow(row.id, column.key, e.target.value, groupKey),
			placeholder:
				column.placeholder || `Enter ${column.label.toLowerCase()}...`,
		};

		switch (column.type) {
			case "textarea":
				return <textarea {...commonProps} rows={column.rows || 3} />;

			case "number":
				return (
					<input
						{...commonProps}
						type="number"
						min={column.min || 0}
						max={column.max}
						step={column.step || 1}
					/>
				);

			case "select":
				return (
					<select {...commonProps}>
						{column.options?.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				);

			default:
				return <input {...commonProps} type="text" />;
		}
	};

	const calculateTotals = () => {
		if (!tableConfig.showTotals) return null;

		const { totalsConfig } = tableConfig;
		const allRows =
			tableConfig.grouped && Array.isArray(tableData)
				? tableData
				: tableConfig.grouped
				? Object.values(tableData).flat()
				: tableData;

		const totalsRow = {
			id: "__totals__",
			__isTotalsRow: true,
		};

		columns.forEach((column) => {
			const fieldConfig = totalsConfig.fields[column.key];

			if (fieldConfig === "sum") {
				// Calculate sum for numeric fields
				totalsRow[column.key] = allRows.reduce((sum, row) => {
					const value = Number(row[column.key]) || 0;
					return sum + value;
				}, 0);
			} else if (typeof fieldConfig === "string") {
				// Use custom text
				totalsRow[column.key] = fieldConfig;
			} else {
				// Empty for other fields
				totalsRow[column.key] = "";
			}
		});

		return totalsRow;
	};

	// Render table row
	const renderRow = (row, groupKey = null) => {
		const isEditing = editingRows.has(row.id);
		const isTotalsRow = row.__isTotalsRow;

		return (
			<div
				key={row.id}
				className={`sv-table-row ${isEditing ? "editing" : ""} ${isTotalsRow ? "sv-totals-row" : ""}`}
			>
				{columns.map((column) => {

					const isSumField = isTotalsRow && 
        tableConfig.totalsConfig?.fields[column.key] === 'sum';
					
					return (
					<div
						key={column.key}
						className={`sv-table-field ${column.flex || "flex-auto"}`}
					>
						<div className={`sv-field-label ${isSumField ? "sum-field" : ""}`}>{column.label}</div>
						{renderField(row, column, isEditing, groupKey)}
					</div>
				)})}

				{tableConfig.showActions && (
					<div className="sv-row-actions">
						{!isTotalsRow && (
							<>
								<button
									className={`sv-btn sv-btn-secondary sv-btn-small ${
										isEditing ? "" : "sv-btn-edit"
									}`}
									onClick={() => toggleEdit(row.id)}
									id={`edit-button-${row.id}`}
								>
									{isEditing ? "✓" : "✎"}
								</button>
								{tableConfig.allowAddRemove && (
									<button
										className="sv-btn sv-btn-danger"
										onClick={() => deleteRow(row.id, groupKey)}
										title="Delete"
									>
										×
									</button>
								)}
							</>
						)}
					</div>
				)}
			</div>
		);
	};

	// Render empty state
	const renderEmptyState = () => (
		<div className="sv-table-empty">
			<svg
				className="sv-table-empty-icon"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.5"
					d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
				/>
			</svg>
			<div className="sv-table-empty-title">{tableConfig.emptyStateText}</div>
			<div className="sv-table-empty-text">{tableConfig.emptyStateSubtext}</div>
		</div>
	);

	// Render loading state
	const renderLoadingState = () => (
		<div className="sv-table-loading">
			<div>Kraunami duomenys...</div>
		</div>
	);

	// Single unified render function
	const renderTable = () => {
		let allGroupsData;
		let totalCount;

		if (tableConfig.grouped) {
			// Handle grouped data
			if (Array.isArray(tableData)) {
				// Flat array - group by specified field
				const groupByField = tableConfig.groupBy || "group";
				const grouped = tableData.reduce((acc, item) => {
					const groupKey = item[groupByField] || "Ungrouped";
					if (!acc[groupKey]) acc[groupKey] = [];
					acc[groupKey].push(item);
					return acc;
				}, {});
				allGroupsData = Object.entries(grouped);
			} else {
				// Already grouped object structure
				allGroupsData = Object.entries(tableData);
			}

			totalCount = allGroupsData.reduce(
				(sum, [, groupData]) => sum + (groupData?.length || 0),
				0,
			);
		} else {
			// Simple ungrouped data
			totalCount = Array.isArray(tableData) ? tableData.length : 0;
			allGroupsData = null;
		}

		const totalsRow = calculateTotals();

		return (
			<div className="sv-editable-table" data-dirty={isDirty}>
				<div className="sv-table-header-rows">
					<div className="sv-table-header">
						<h3 className="sv-table-title">{tableConfig.title}</h3>
						<div className="sv-table-actions">
							{tableConfig.showCounter && (
								<span className="sv-badge">
									{totalCount} {totalCount === 1 ? "item" : "items"}
								</span>
							)}
							{tableConfig.allowAddRemove && !tableConfig.grouped && (
								<button
									className="sv-btn sv-btn-primary sv-btn-small"
									onClick={() => addRow()}
								>
									<svg
										className="icon icon-plus"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
											clipRule="evenodd"
										/>
									</svg>
									{tableConfig.addButtonText}
								</button>
							)}
							{isDirty && onSave && (
								<button
									className="sv-btn sv-btn-secondary sv-btn-small sv-editable-table-save-btn"
									onClick={handleSave}
									disabled={isLoading}
								>
									{isLoading ? "Saugoma..." : tableConfig.saveButtonText}
								</button>
							)}
						</div>
					</div>
					{/* ADD: Column headers (once for entire table) */}
					<div className="sv-table-column-headers">
						{columns.map((column) => (
							<div
								key={column.key}
								className={`sv-table-header-cell ${column.flex || "flex-auto"}`}
							>
								{column.label}
							</div>
						))}
						{tableConfig.showActions && (
							<div className="sv-table-header-cell actions">
								{tableConfig.actionsLabel}
							</div>
						)}
					</div>
					{/* Top totals */}
					{totalsRow &&
						tableConfig.totalsConfig.position === "top" &&
						renderRow(totalsRow)}
				</div>
				<div className="sv-table-rows">
					{isLoading
						? renderLoadingState()
						: totalCount === 0
						? renderEmptyState()
						: tableConfig.grouped
						? // Grouped rendering
						  allGroupsData.map(([groupKey, groupData]) => (
								<div key={`group-${groupKey}`} className="sv-table-group">
									<div className="sv-group-section-header">{groupKey}</div>
									{groupData.map((row) => renderRow(row, groupKey))}
								</div>
						  ))
						: // Simple rendering
						  tableData.map((row) => renderRow(row))}
					{/* Bottom totals */}
					{totalsRow &&
						tableConfig.totalsConfig.position === "bottom" &&
						renderRow(totalsRow)}
				</div>
			</div>
		);
	};

	// Replace the return statement with:
	return (
		<div className={`sv-editable-table-container ${className}`}>
			{renderTable()}
		</div>
	);
};

// Example usage configurations

// Simple list configuration
export const createSimpleListConfig = (title = "Items") => ({
	title,
	allowEditing: true,
	allowAddRemove: true,
	grouped: false,
	showActions: true,
	showCounter: true,
});

// Grouped data configuration
export const createGroupedConfig = (
	title = "Actions",
	groupBy = "quarter",
) => ({
	title,
	allowEditing: true,
	allowAddRemove: true,
	grouped: true,
	groupBy,
	showActions: true,
	showCounter: true,
});

// Column definitions examples
export const createTaskColumns = () => [
	{
		key: "description",
		label: "Task Description",
		type: "text",
		flex: "flex-1",
		placeholder: "Enter task description...",
	},
	{
		key: "hours",
		label: "Hours/Month",
		type: "number",
		flex: "flex-auto",
		min: 0,
		max: 168,
		defaultValue: 0,
	},
	{
		key: "status",
		label: "Status",
		type: "select",
		flex: "flex-auto",
		options: [
			{ value: "active", label: "Active" },
			{ value: "in-progress", label: "In Progress" },
			{ value: "completed", label: "Completed" },
		],
		render: (value) => {
			const badgeClass =
				{
					active: "info",
					"in-progress": "warning",
					completed: "success",
				}[value] || "";
			return <span className={`sv-badge ${badgeClass}`}>{value}</span>;
		},
	},
];

export const createActionColumns = () => [
	{
		key: "description",
		label: "Action Description",
		type: "textarea",
		flex: "flex-1",
		placeholder: "Enter detailed action description...",
		rows: 2,
	},
	{
		key: "hours",
		label: "Estimated Hours",
		type: "number",
		flex: "flex-auto",
		min: 0,
		defaultValue: 0,
	},
	{
		key: "priority",
		label: "Priority",
		type: "select",
		flex: "flex-auto",
		options: [
			{ value: "high", label: "High" },
			{ value: "medium", label: "Medium" },
			{ value: "low", label: "Low" },
		],
		render: (value) => {
			const badgeClass =
				{
					high: "danger",
					medium: "warning",
					low: "info",
				}[value] || "";
			return <span className={`sv-badge ${badgeClass}`}>{value}</span>;
		},
	},
];

export default EditableTable;
