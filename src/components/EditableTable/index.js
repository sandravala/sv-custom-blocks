// EditableTable.js - Reusable component for AI blocks
// Follows sv_cb_{block_abbreviation}_{data_type} naming convention

import React, { useState, useEffect } from 'react';

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
    blockAbbr = '',
    dataType = '',
    className = ''
}) => {
    // Default configuration
    const defaultConfig = {
        title: 'Editable Table',
        allowEditing: true,
        allowAddRemove: true,
        grouped: false,
        groupBy: null,
        showActions: true,
        showCounter: true,
        emptyStateText: 'No items added yet',
        emptyStateSubtext: 'Add your first item to get started',
        addButtonText: 'Add Item',
        saveButtonText: 'Save Changes',
        deleteConfirmText: 'Are you sure you want to delete this item?'
    };

    const tableConfig = { ...defaultConfig, ...config };
    
    // State management
    const [tableData, setTableData] = useState(data);
    const [editingRows, setEditingRows] = useState(new Set());
    const [isDirty, setIsDirty] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Update internal data when props change
    useEffect(() => {
        setTableData(data);
        setIsDirty(false);
    }, [data]);

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
            console.error('Error saving data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Add new row
    const addRow = (groupKey = null) => {
        const newRow = {
            id: generateId(),
            ...columns.reduce((acc, col) => {
                acc[col.key] = col.defaultValue || '';
                return acc;
            }, {})
        };

        if (tableConfig.grouped && groupKey) {
            newRow.group = groupKey;
        }

        let newData;
        if (tableConfig.grouped) {
            newData = { ...tableData };
            if (!newData[groupKey]) {
                newData[groupKey] = [];
            }
            newData[groupKey] = [...newData[groupKey], newRow];
        } else {
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
            newData = { ...tableData };
            newData[groupKey] = newData[groupKey].filter(row => row.id !== rowId);
        } else {
            newData = tableData.filter(row => row.id !== rowId);
        }

        handleDataChange(newData);
        
        const newEditingRows = new Set(editingRows);
        newEditingRows.delete(rowId);
        setEditingRows(newEditingRows);
    };

    // Update row data
    const updateRow = (rowId, field, value, groupKey = null) => {
        let newData;
        if (tableConfig.grouped) {
            newData = { ...tableData };
            newData[groupKey] = newData[groupKey].map(row =>
                row.id === rowId ? { ...row, [field]: value } : row
            );
        } else {
            newData = tableData.map(row =>
                row.id === rowId ? { ...row, [field]: value } : row
            );
        }
        
        handleDataChange(newData);
    };

    // Render field based on column configuration
    const renderField = (row, column, isEditing, groupKey = null) => {
        const value = row[column.key];
        const fieldId = `${blockAbbr}_${dataType}_${column.key}_${row.id}`;

        if (!isEditing) {
            // Display mode
            if (column.render) {
                return column.render(value, row);
            }
            
            if (column.type === 'badge') {
                const badgeClass = column.getBadgeClass ? column.getBadgeClass(value) : '';
                return <span className={`sv-badge ${badgeClass}`}>{value}</span>;
            }
            
            return <div className="sv-field-value">{value}</div>;
        }

        // Edit mode
        const commonProps = {
            id: fieldId,
            className: `sv-field-input ${column.type === 'number' ? 'number' : ''} ${column.type === 'textarea' ? 'textarea' : ''}`,
            value: value || '',
            onChange: (e) => updateRow(row.id, column.key, e.target.value, groupKey),
            placeholder: column.placeholder || `Enter ${column.label.toLowerCase()}...`
        };

        switch (column.type) {
            case 'textarea':
                return <textarea {...commonProps} rows={column.rows || 3} />;
            
            case 'number':
                return (
                    <input
                        {...commonProps}
                        type="number"
                        min={column.min || 0}
                        max={column.max}
                        step={column.step || 1}
                    />
                );
            
            case 'select':
                return (
                    <select {...commonProps}>
                        {column.options?.map(option => (
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

    // Render table row
    const renderRow = (row, groupKey = null) => {
        const isEditing = editingRows.has(row.id);
        
        return (
            <div key={row.id} className={`sv-table-row ${isEditing ? 'editing' : ''}`}>
                {columns.map(column => (
                    <div key={column.key} className={`sv-table-field ${column.flex || 'flex-auto'}`}>
                        <div className="sv-field-label">{column.label}</div>
                        {renderField(row, column, isEditing, groupKey)}
                    </div>
                ))}
                
                {tableConfig.showActions && (
                    <div className="sv-row-actions">
                        <button
                            className={`sv-btn sv-btn-secondary sv-btn-small ${isEditing ? '' : 'sv-btn-edit'}`}
                            onClick={() => toggleEdit(row.id)}
                            id={`edit-button-${row.id}`}
                        >
                            {isEditing ? '✓' : '✎'}
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
                    </div>
                )}
            </div>
        );
    };

    // Render empty state
    const renderEmptyState = () => (
        <div className="sv-table-empty">
            <svg className="sv-table-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <div className="sv-table-empty-title">{tableConfig.emptyStateText}</div>
            <div className="sv-table-empty-text">{tableConfig.emptyStateSubtext}</div>
        </div>
    );

    // Render loading state
    const renderLoadingState = () => (
        <div className="sv-table-loading">
            <div>Saving changes...</div>
        </div>
    );

    // Render grouped table
    const renderGroupedTable = () => {
        return Object.entries(tableData).map(([groupKey, groupData]) => {
            const groupCount = Array.isArray(groupData) ? groupData.length : 0;
            
            return (
                <div key={groupKey} className="sv-editable-table" data-dirty={isDirty}>
                    <div className="sv-group-header">{groupKey}</div>
                    <div className="sv-table-header">
                        <h3 className="sv-table-title">
                            {groupKey} {tableConfig.title}
                        </h3>
                        <div className="sv-table-actions">
                            {tableConfig.showCounter && (
                                <span className="sv-badge">
                                    {groupCount} {groupCount === 1 ? 'item' : 'items'}
                                </span>
                            )}
                            {tableConfig.allowAddRemove && (
                                <button
                                    className="sv-btn sv-btn-primary sv-btn-small"
                                    onClick={() => addRow(groupKey)}
                                >
                                    <svg className="icon icon-plus" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                    </svg>
                                    {tableConfig.addButtonText}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="sv-table-rows">
                        {groupCount === 0 ? renderEmptyState() : 
                         groupData.map(row => renderRow(row, groupKey))}
                    </div>
                </div>
            );
        });
    };

    // Render simple table
    const renderSimpleTable = () => {
        const dataCount = Array.isArray(tableData) ? tableData.length : 0;
        
        return (
            <div className="sv-editable-table" data-dirty={isDirty}>
                <div className="sv-table-header">
                    <h3 className="sv-table-title">{tableConfig.title}</h3>
                    <div className="sv-table-actions">
                        {tableConfig.showCounter && (
                            <span className="sv-badge">
                                {dataCount} {dataCount === 1 ? 'item' : 'items'}
                            </span>
                        )}
                        {tableConfig.allowAddRemove && (
                            <button
                                className="sv-btn sv-btn-primary sv-btn-small"
                                onClick={() => addRow()}
                            >
                                <svg className="icon icon-plus" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                </svg>
                                {tableConfig.addButtonText}
                            </button>
                        )}
                        {isDirty && onSave && (
                            <button
                                className="sv-btn sv-btn-secondary sv-btn-small"
                                onClick={handleSave}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Saving...' : tableConfig.saveButtonText}
                            </button>
                        )}
                    </div>
                </div>
                <div className="sv-table-rows" key='table-rows'>
                    {isLoading ? renderLoadingState() :
                     dataCount === 0 ? renderEmptyState() :
                     tableData.map(row => renderRow(row))}
                </div>
            </div>
        );
    };

    return (
        <div className={`sv-editable-table-container ${className}`}>
            {tableConfig.grouped ? renderGroupedTable() : renderSimpleTable()}
        </div>
    );
};

// Example usage configurations

// Simple list configuration
export const createSimpleListConfig = (title = 'Items') => ({
    title,
    allowEditing: true,
    allowAddRemove: true,
    grouped: false,
    showActions: true,
    showCounter: true
});

// Grouped data configuration  
export const createGroupedConfig = (title = 'Actions', groupBy = 'quarter') => ({
    title,
    allowEditing: true,
    allowAddRemove: true,
    grouped: true,
    groupBy,
    showActions: true,
    showCounter: true
});

// Column definitions examples
export const createTaskColumns = () => [
    {
        key: 'description',
        label: 'Task Description',
        type: 'text',
        flex: 'flex-1',
        placeholder: 'Enter task description...'
    },
    {
        key: 'hours',
        label: 'Hours/Month',
        type: 'number',
        flex: 'flex-auto',
        min: 0,
        max: 168,
        defaultValue: 0
    },
    {
        key: 'status',
        label: 'Status',
        type: 'select',
        flex: 'flex-auto',
        options: [
            { value: 'active', label: 'Active' },
            { value: 'in-progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' }
        ],
        render: (value) => {
            const badgeClass = {
                'active': 'info',
                'in-progress': 'warning', 
                'completed': 'success'
            }[value] || '';
            return <span className={`sv-badge ${badgeClass}`}>{value}</span>;
        }
    }
];

export const createActionColumns = () => [
    {
        key: 'description',
        label: 'Action Description',
        type: 'textarea',
        flex: 'flex-1',
        placeholder: 'Enter detailed action description...',
        rows: 2
    },
    {
        key: 'hours',
        label: 'Estimated Hours',
        type: 'number',
        flex: 'flex-auto',
        min: 0,
        defaultValue: 0
    },
    {
        key: 'priority',
        label: 'Priority',
        type: 'select',
        flex: 'flex-auto',
        options: [
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' }
        ],
        render: (value) => {
            const badgeClass = {
                'high': 'danger',
                'medium': 'warning',
                'low': 'info'
            }[value] || '';
            return <span className={`sv-badge ${badgeClass}`}>{value}</span>;
        }
    }
];

export default EditableTable;