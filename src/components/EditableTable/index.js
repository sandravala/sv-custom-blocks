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
		allowAdd: true,
		allowRemove: true,
		grouped: false,
		groupBy: null,
		groupSubtitle: {},
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

	//Update internal data when props change
	useEffect(() => {
		if (!data) return;

		let processedData = data;

		// Handle flat array (most common case)
		if (Array.isArray(data)) {
			processedData = data.map((row) => ({
				...row,
				id: row.id || generateId(),
			}));
		}
		// Handle grouped object
		else if (typeof data === "object") {
			processedData = {};
			Object.entries(data).forEach(([groupKey, items]) => {
				if (Array.isArray(items)) {
					processedData[groupKey] = items.map((row) => ({
						...row,
						id: row.id || generateId(),
					}));
				} else {
					processedData[groupKey] = items;
				}
			});
		}

		setTableData(processedData);
		
	}, [data]);

	const canAddRows = () => {
		return config.allowAdd !== undefined
			? config.allowAdd
			: tableConfig.allowAddRemove;
	};

	const canRemoveRows = () => {
		return config.allowRemove !== undefined
			? config.allowRemove
			: tableConfig.allowAddRemove;
	};
	// Generate unique ID for new rows
	const generateId = () => {
		return Date.now() + Math.random().toString(36).substr(2, 9);
	};

	// Helper to find current value in existing data
	const getCurrentValue = (rowId, field, groupKey = null) => {
		if (tableConfig.grouped) {
			if (Array.isArray(tableData)) {
				const row = tableData.find((r) => r.id === rowId);
				return row ? row[field] : null;
			} else {
				const groupData = tableData[groupKey];
				if (Array.isArray(groupData)) {
					const row = groupData.find((r) => r.id === rowId);
					return row ? row[field] : null;
				} else if (groupData?.items) {
					const row = groupData.items.find((r) => r.id === rowId);
					return row ? row[field] : null;
				}
			}
		} else {
			const row = tableData.find((r) => r.id === rowId);
			return row ? row[field] : null;
		}
		return null;
	};
	// Handle data changes
	const handleDataChange = (newData, changeInfo) => {
				// If we have change info, enhance it with old value
		if (changeInfo && changeInfo.type === "update") {
			const oldValue = getCurrentValue(
				changeInfo.rowId,
				changeInfo.field,
				changeInfo.groupKey,
			);
			changeInfo.oldValue = oldValue;
		}
		setTableData(newData);
		let isActualChange = false;
		if (changeInfo) {
			
			switch (changeInfo.type) {
				case "add":
					// Don't set dirty on add - wait for user to actually enter data
					isActualChange = false;
					break;

				case "delete":
					// Deleting a row is always an actual change
					isActualChange = true;
					break;

				case "update":
					// Only mark as change if values are actually different
					const emptyFields = getEmptyFields(changeInfo.row);
					if(emptyFields.length > 0) {
						isActualChange = false;
					} else {
					isActualChange = changeInfo.oldValue !== changeInfo.newValue;
					}
					
					break;
			}

			// if (isActualChange) {
			// 	setIsDirty(true);
			// }
		}

		//setIsDirty(isActualChange);
		if (onDataChange) {
			onDataChange(newData, changeInfo);
		}
	};

	// Helper to get empty field names for user feedback
	const getEmptyFields = (row) => {
		const editableFields = columns.filter(
			(col) =>
				!col.calculated &&
				!col.readonly &&
				col.key !== "id" &&
				!col.key.startsWith("__") &&
				col.type !== "checkbox"
		);

		return editableFields.filter((col) => {
			
			const value = row && col.key in row ? row[col.key] : null;
			return (
				value === "" ||
				value === null ||
				value === undefined ||
				(typeof value === "string" && value.trim() === "")
			);
		});
	};
	const validateRowForSaving = (row) => {
	
			const emptyFields = getEmptyFields(row);

		if (emptyFields.length === 0) {
			return { isValid: true };
		}

		// Create helpful message
		const fieldNames = emptyFields.map((field) => field.label).join(", ");

		let message;
		if (emptyFields.length > 0) {
			message = "Užpildyk visus laukelius!";
		}
		return {
			isValid: false,
			message,
			emptyFields,
		};
	};

	// Toggle edit mode for a row
	const toggleEdit = (rowId) => {
		const isCurrentlyEditing = editingRows.has(rowId);

		if (isCurrentlyEditing) {
			// Find the row being edited
			let rowBeingEdited = null;

			if (tableConfig.grouped) {
				if (Array.isArray(tableData)) {
					rowBeingEdited = tableData.find((row) => row.id === rowId);
				} else {
					Object.values(tableData).forEach((groupData) => {
						const items = Array.isArray(groupData)
							? groupData
							: groupData?.items || [];
						const found = items.find((row) => row.id === rowId);
						if (found) rowBeingEdited = found;
					});
				}
			} else {
				rowBeingEdited = tableData.find((row) => row.id === rowId);
			}

			if (rowBeingEdited) {
				const validation = validateRowForSaving(rowBeingEdited);

				if (!validation.isValid) {
					alert(validation.message);
					return; // Stay in edit mode
				}
			}
		}
		

		const newEditingRows = new Set(editingRows);
		if (newEditingRows.has(rowId)) {
			newEditingRows.delete(rowId);
			setIsDirty(true);
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
				// Handle both new structure (with items) and legacy structure (direct array)
				newData = { ...tableData };
				if (!newData[groupKey]) {
					// Create new group - check if we're using new structure
					const hasNewStructure = Object.values(tableData).some(
						(group) =>
							group &&
							typeof group === "object" &&
							!Array.isArray(group) &&
							group.items,
					);

					if (hasNewStructure) {
						// New structure: create group with items array
						newData[groupKey] = {
							subtitle: null,
							items: [newRow],
						};
					} else {
						// Legacy structure: create direct array
						newData[groupKey] = [newRow];
					}
				} else {
					// Add to existing group
					if (Array.isArray(newData[groupKey])) {
						// Legacy structure: direct array
						newData[groupKey] = [...newData[groupKey], newRow];
					} else {
						// New structure: items array
						newData[groupKey] = {
							...newData[groupKey],
							items: [...(newData[groupKey].items || []), newRow],
						};
					}
				}
			}
		} else {
			// Simple ungrouped mode
			newData = [...tableData, newRow];
		}

		// Simple change info
		const changeInfo = {
			type: "add",
			rowId: newRow.id,
			rowData: newRow,
			groupKey: groupKey || null,
		};
		setEditingRows(new Set([...editingRows, newRow.id]));
		handleDataChange(newData, changeInfo);
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
				if (Array.isArray(newData[groupKey])) {
					// Legacy structure: direct array
					newData[groupKey] = newData[groupKey].filter(
						(row) => row.id !== rowId,
					);
				} else {
					// New structure: items array
					newData[groupKey] = {
						...newData[groupKey],
						items: newData[groupKey].items.filter((row) => row.id !== rowId),
					};
				}
			}
		} else {
			// Simple ungrouped mode
			newData = tableData.filter((row) => row.id !== rowId);
		}

		// Simple change info - no need to find deleted row ourselves
		const changeInfo = {
			type: "delete",
			rowId,
			groupKey: groupKey || null,
		};
		const newEditingRows = new Set(editingRows);
		newEditingRows.delete(rowId);
		setEditingRows(newEditingRows);

		handleDataChange(newData, changeInfo);


	};

	// Value conversion helper function
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

	// Updated updateRow function to handle both data structures
	const updateRowWithCalculation = (row, rowId, field, value) => {
		if (row.id === rowId) {
			// Update the field and recalculate
			return { ...row, [field]: value };
			//return recalculateRow(updatedRow);
		}
		return row;
	};

	const updateRow = (rowId, field, value, groupKey = null) => {
		const column = columns.find((col) => col.key === field);

		value = convertValue(value, column);

		let newData;

		if (tableConfig.grouped) {
			// Check if data is pre-grouped object or flat array
			if (Array.isArray(tableData)) {
				// Flat array - update directly in the array
				newData = tableData.map((row) =>
					updateRowWithCalculation(row, rowId, field, value),
				);
			} else {
				// Pre-grouped object - update within the group
				newData = { ...tableData };
				if (Array.isArray(newData[groupKey])) {
					// Legacy structure: direct array
					newData[groupKey] = newData[groupKey].map((row) =>
						updateRowWithCalculation(row, rowId, field, value),
					);
				} else {
					// New structure: items array
					newData[groupKey] = {
						...newData[groupKey],
						items: newData[groupKey].items.map((row) =>
							updateRowWithCalculation(row, rowId, field, value),
						),
					};
				}
			}
		} else {
			// Simple ungrouped mode
			newData = tableData.map((row) =>
				updateRowWithCalculation(row, rowId, field, value),
			);
		}

		// Simple change info - let handleDataChange look up old value
		const changeInfo = {
			type: "update",
			rowId,
			field,
			newValue: value,
			groupKey: groupKey || null,
		};

		handleDataChange(newData, changeInfo);
	};

	// Render field based on column configuration
	const renderField = (row, column, isEditing, groupKey = null) => {
		const value = row[column.key];

		// Special handling for totals row
		if (row.__isTotalsRow) {
			let displayValue = value;
			if (column.type === "number" && typeof value === "number") {
				displayValue =
					column.valueDisplayStyle !== undefined
						? displayValue.toLocaleString("lt-LT", column.valueDisplayStyle)
						: displayValue.toLocaleString("lt-LT", {
								style: "decimal",
								minimumFractionDigits: 0,
								maximumFractionDigits: 2,
						  });
			}

			return (
				<div
					className={`sv-field-value sv-totals-value ${
						displayValue === "0" || displayValue === 0 ? "zero-value" : ""
					}`}
				>
					{displayValue}
				</div>
			);
		}
		const fieldId = `${blockAbbr}_${dataType}_${column.key}_${row.id}`;

		// Check if field is calculated (always readonly)
		const isCalculated = column.calculated === true;
		const isReadonly = column.readonly === true || isCalculated;
		const isCheckbox = column.type === "checkbox";

		if (isCheckbox) {
			return (
				<input
					{...commonProps}
					type="checkbox"
					id={fieldId}
					checked={value || false}
					onChange={(e) =>
						updateRow(row.id, column.key, e.target.checked, groupKey)
					}
					className={`sv-field-input checkbox`}
				/>
			);
		}

		// Display mode or readonly/calculated field

		if (!isEditing || isReadonly) {
			// Display mode
			let displayValue = value;
			if (isCalculated && column.calculate) {
				displayValue = column.calculate(row);
			}
			if (column.render) {
				return column.render(value, row);
			}

			if (column.type === "badge") {
				const badgeClass = column.getBadgeClass
					? column.getBadgeClass(value)
					: "";
				return <span className={`sv-badge ${badgeClass}`}>{value}</span>;
			}

			// Add calculated styling
			let className = isCalculated
				? "sv-field-value calculated"
				: isReadonly && isEditing
				? "sv-field-value readonly"
				: "sv-field-value";

			if (
				column.type === "number" &&
				(displayValue === "0" || displayValue === 0)
			) {
				className += " zero-value";
			}

			if (column.type === "number" && typeof displayValue === "number") {
				displayValue =
					column.valueDisplayStyle !== undefined
						? displayValue.toLocaleString("lt-LT", column.valueDisplayStyle)
						: displayValue.toLocaleString("lt-LT", {
								style: "decimal",
								minimumFractionDigits: 0,
								maximumFractionDigits: 2,
						  });
			}

			return <div className={className}>{displayValue}</div>;
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
			disabled: isReadonly || isCalculated,
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

			case "checkbox":
				return (
					<input
						{...commonProps}
						type="checkbox"
						checked={value || false}
						onChange={(e) =>
							updateRow(row.id, column.key, e.target.checked, groupKey)
						}
						className={`sv-field-input checkbox`}
					/>
				);

			default:
				return <input {...commonProps} type="text" />;
		}
	};

	const calculateTotals = () => {
		if (!tableConfig.showTotals) return null;

		const { totalsConfig } = tableConfig;
		let allRows;

		if (tableConfig.grouped && Array.isArray(tableData)) {
			// Flat array - use as is
			allRows = tableData;
		} else if (tableConfig.grouped) {
			// Pre-grouped object - flatten all groups
			allRows = Object.values(tableData).reduce((acc, groupData) => {
				// Handle both new structure (with items) and legacy structure (direct array)
				const items = Array.isArray(groupData)
					? groupData
					: groupData?.items || [];
				return acc.concat(items);
			}, []);
		} else {
			// Simple ungrouped data
			allRows = Array.isArray(tableData) ? tableData : [];
		}

		const totals = { __isTotalsRow: true };

		columns.forEach((column) => {
			if (totalsConfig.fields[column.key]) {
				// GET VALUES: Handle calculated columns differently
				const values = allRows
					.map((row) => {
						let value;

						// FOR CALCULATED COLUMNS: Calculate value in real-time
						if (column.calculated && typeof column.calculate === "function") {
							try {
								value = column.calculate(row);
							} catch (error) {
								console.error(
									`Error calculating ${column.key} for totals:`,
									error,
								);
								value = 0;
							}
						} else {
							// FOR REGULAR COLUMNS: Get stored value
							value = row[column.key];
						}

						return value;
					})
					.filter((val) => {
						// More lenient filter - convert strings to numbers
						const num = Number(val);
						return !isNaN(num) && isFinite(num);
					});

				switch (totalsConfig.fields[column.key]) {
					case "sum":
						totals[column.key] = values.reduce((sum, val) => sum + val, 0);
						break;
					case "avg":
						totals[column.key] = values.length
							? values.reduce((sum, val) => sum + val, 0) / values.length
							: 0;
						break;
					case "count":
						// For count, check calculated values too
						const countValues = allRows.filter((row) => {
							let value;
							if (column.calculated && typeof column.calculate === "function") {
								value = column.calculate(row);
							} else {
								value = row[column.key];
							}
							return value != null && value !== "";
						});
						totals[column.key] = countValues.length;
						break;
					default:
						totals[column.key] = "";
				}
			} else if (column.key === totalsConfig.labelColumn) {
				totals[column.key] = totalsConfig.label || "Total";
			} else {
				totals[column.key] = "";
			}
		});

		return totals;
	};
	// Render table row
	const renderRow = (row, groupKey = null) => {
		const isEditing = editingRows.has(row.id);
		const isTotalsRow = row.__isTotalsRow;

		if (!isTotalsRow && !isEditing) {
        const hasAnyData = columns.some(column => {
            // Skip calculated, readonly, and system columns
            if (column.calculated || column.readonly || column.key === 'id' || column.key.startsWith('__')) {
                return false;
            }
            
            const value = row[column.key];
            return value !== null && value !== undefined && value !== "";
        });
        
        if (!hasAnyData) {
            return null; // Don't render empty rows
        }
    }

		return (
			<div
				key={`${row.id ? row.id : generateId()}`}
				name={`row-${row.id}`}
				className={`sv-table-row ${isEditing ? "editing" : ""} ${
					isTotalsRow ? "sv-totals-row" : ""
				} ${row.rowClass ? row.rowClass : ""}`}
			>
				{columns.map((column) => {
					const isSumField =
						isTotalsRow &&
						tableConfig.totalsConfig?.fields[column.key] === "sum";

					return (
						<div
							key={column.key}
							className={`sv-table-field ${column.flex || "flex-auto"}`}
						>
							<div
								className={`sv-field-label ${isSumField ? "sum-field" : ""}`}
							>
								{column.label}
							</div>
							{renderField(row, column, isEditing, groupKey)}
						</div>
					);
				})}

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
								{canRemoveRows() && (
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
			<div className="sv-table-loader"></div>
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

			totalCount = allGroupsData.reduce((sum, [, groupData]) => {
				// Handle both new structure (with items) and legacy structure (direct array)
				const items = Array.isArray(groupData)
					? groupData
					: groupData?.items || [];
				return sum + (items?.length || 0);
			}, 0);
		} else {
			// Simple ungrouped data
			totalCount = Array.isArray(tableData) ? tableData.length : 0;
			allGroupsData = null;
		}

		// NEW: Helper function to get group subtitle
		const getGroupSubtitle = (groupKey, groupData) => {
			if (!tableConfig.groupSubtitle) {
				return null;
			}

			if (typeof tableConfig.groupSubtitle === "object") {
				return tableConfig.groupSubtitle[groupKey] || null;
			}

			// Method 1: Check if groupData has subtitle property (new structure)
			if (groupData && typeof groupData === "object" && groupData.subtitle) {
				return groupData.subtitle;
			}

			// Method 2: Check if group data has items array with subtitle (new structure)
			if (groupData && groupData.items && Array.isArray(groupData.items)) {
				return groupData.subtitle || null;
			}

			// Method 3: Fallback - extract from first item (legacy support)
			const items = Array.isArray(groupData)
				? groupData
				: groupData?.items || [];
			if (items.length === 0) {
				return null;
			}

			const firstItem = items[0];
			return firstItem[tableConfig.groupSubtitle] || null;
		};

		const totalsRow = calculateTotals();

		return (
			<div className="sv-editable-table" data-dirty={isDirty}>
				<div className="sv-table-header-rows">
					<div className="sv-table-header">
						<h3 className="sv-table-title">{tableConfig.title}</h3>
						<div className="sv-table-actions">
							{tableConfig.showCounter && (
								<span className="sv-badge">{totalCount} vnt.</span>
							)}
							{canAddRows() && !tableConfig.grouped && (
								<button
									className="sv-btn sv-btn-primary sv-btn-small sv-btn-add-row"
									onClick={() => addRow()}
									title={`Pridėti eilutę`}
								>
									+
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
					{/* Column headers */}
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
						? // NEW: Updated grouped rendering with subtitles
						  allGroupsData.map(([groupKey, groupData]) => {
								const subtitle = getGroupSubtitle(groupKey, groupData);
								// Handle both new structure (with items) and legacy structure (direct array)
								const items = Array.isArray(groupData)
									? groupData
									: groupData?.items || [];
								return (
									<div key={`group-${groupKey}`} className="sv-table-group">
										<div className="sv-group-section-header">
											<div className="sv-group-header-content">
												<div className="sv-group-title">{groupKey}</div>
												{subtitle && (
													<div className="sv-group-subtitle">{subtitle}</div>
												)}
											</div>
											{tableConfig.showActions && (
												<div className="sv-group-actions">
													{canAddRows() && (
														<button
															className="sv-btn sv-btn-primary sv-btn-small sv-btn-add-row"
															onClick={() => addRow(groupKey)}
															title={`Pridėti eilutę į: ${groupKey}`}
														>
															+
														</button>
													)}
												</div>
											)}
										</div>
										{items.map((row) => renderRow(row, groupKey))}
									</div>
								);
						  })
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
