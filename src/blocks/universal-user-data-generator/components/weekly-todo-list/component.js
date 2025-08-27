// Weekly Todo Component - Core Structure and Week Selection
// src/blocks/universal-user-data-generator/components/weekly-todo-breakdown/component.js

import React, { useState, useEffect } from "react";
import EditableTable from "@components/EditableTable";
import { getISOWeek, getYear } from 'date-fns';

export default function WeeklyTodoListComponent({
	blockId,
	isLoggedIn,
	ajaxObject,
	componentName,
}) {
	// State management
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);

	// Component-specific state
	const [loadedData, setLoadedData] = useState({});
	const [weekOffset, setWeekOffset] = useState(0); // -1 = prev week, 0 = this week, 1 = next week
	const [currentWeekData, setCurrentWeekData] = useState(null);
	const [tableData, setTableData] = useState({});

	// Meta keys configuration
	const metaKeysConfig = {
		monthly_allocation: "monthly_time_allocation",
	};

	// Week labels for display - use actual dates and week numbers
	const getWeekLabel = (offset) => {
		const weekInfo = getWeekInfo(offset);
		const weekNumber = weekInfo.weekNumber;

		// Add Lithuanian week abbreviation
		const dayName =
			offset === 0 ? " (šiandien)" : offset === -1 ? " (praėjusi)" : " (kita)";

		return `${weekInfo.dates} (${weekNumber} sav.)${dayName}`;
	};

	// Get short label for buttons (without day indicators)
	const getShortWeekLabel = (offset) => {
		const weekInfo = getWeekInfo(offset);
		return `${weekInfo.dates} (${weekInfo.weekNumber} sav.)`;
	};

	// Get current week info and calculate week offsets
	const getWeekInfo = (offset = 0) => {
		const now = new Date();
		const targetDate = new Date(
			now.getTime() + offset * 7 * 24 * 60 * 60 * 1000,
		);

		// Get Monday of the target week
		const dayOfWeek = targetDate.getDay();
		const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
		const monday = new Date(targetDate);
		monday.setDate(targetDate.getDate() + daysToMonday);

		// Get Sunday of the target week
		const sunday = new Date(monday);
		sunday.setDate(monday.getDate() + 6);

		// Calculate ISO week number
		const year = monday.getFullYear();
		const firstJan = new Date(year, 0, 1);
		const firstMonday = new Date(firstJan);
		const dayOfWeekJan1 = firstJan.getDay();
		const daysToFirstMonday = dayOfWeekJan1 === 0 ? -6 : 1 - dayOfWeekJan1;
		firstMonday.setDate(firstJan.getDate() + daysToFirstMonday);

		const weekNumber = getISOWeek(monday);

		// Format dates as MM DD
		const formatDate = (date) => {
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const day = String(date.getDate()).padStart(2, "0");
			return `${month} ${day}`;
		};

		return {
			year: year,
			weekKey: `week_${weekNumber}`,
			weekNumber: weekNumber,
			dates: `${formatDate(monday)} - ${formatDate(sunday)}`,
			mondayDate: monday,
			sundayDate: sunday,
		};
	};

	// Get week data based on offset
	const getSelectedWeekInfo = () => {
		return getWeekInfo(weekOffset);
	};

	// Load component data via AJAX
	const loadComponentData = async () => {
		setLoading(true);
		setError("");

		try {
			const response = await fetch(ajaxObject.ajax_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "udg_load_saved_data",
					nonce: ajaxObject.nonce,
					meta_keys: JSON.stringify(metaKeysConfig),
				}),
			});

			const result = await response.json();

			if (result.success && result.data?.user_data) {
				setLoadedData(result.data.user_data);
			} else {
				setError(
					"Failed to load data: " + (result.data?.message || "Unknown error"),
				);
				console.error("❌ Load failed:", result.data?.message);
			}
		} catch (err) {
			setError("Network error: " + err.message);
			console.error("❌ Network error:", err);
		} finally {
			setLoading(false);
		}
	};

	// Load data on component mount
	useEffect(() => {
		if (isLoggedIn) {
			loadComponentData();
		}
	}, [isLoggedIn]);

	// Update current week data when selection or loaded data changes
	useEffect(() => {
		if (!loadedData.monthly_allocation) {
			setCurrentWeekData(null);
			setTableData({});
			return;
		}

		const weekInfo = getSelectedWeekInfo();
		const yearData = loadedData.monthly_allocation[weekInfo.year];

		if (yearData && yearData[weekInfo.weekKey]) {
			const weekData = yearData[weekInfo.weekKey];
			setCurrentWeekData({
				...weekData,
				weekInfo: weekInfo,
			});

			// Convert tasks to grouped table data
			generateTableData(weekData.tasks || []);

		} else {
			// No data for this week - create empty structure
			const emptyWeekData = {
				dates: weekInfo.dates,
				tasks: [],
				total_hours: 0,
				weekInfo: weekInfo,
			};
			setCurrentWeekData(emptyWeekData);
			setTableData({});
		}
	}, [weekOffset, loadedData]);

	const handleTableChange = (updatedData, changeInfo) => {
		setTableData(updatedData);
		if (changeInfo.field === "completed" && changeInfo.rowId ) {
			// Use the field ID pattern from EditableTable
            
			rowInactiveStyling(changeInfo.rowId, changeInfo.newValue);
		}
	};

    const rowInactiveStyling = (rowId, isInactive) => {
        const rowElement = document.getElementsByName(`row-${rowId}`)[0];
        if (rowElement) {
            if (isInactive) {
                rowElement.classList.add("inactive");
            } else {
                rowElement.classList.remove("inactive");
            }
        }
    };

	// Handle saving todo data back to monthly allocation structure
	const handleTableSave = async (updatedData) => {
		setSaving(true);

		updatedData = updatedData
			.map((item) => {
				if (item.id.startsWith("empty-")) {
					return null;
				}
				return item;
			})
			.filter(Boolean);

		try {
			// Convert flat array back to monthly allocation structure with todos added
			const weekInfo = getSelectedWeekInfo();
			const updatedAllocation = { ...loadedData.monthly_allocation };

			// Ensure the year and week structure exists
			if (!updatedAllocation[weekInfo.year]) {
				updatedAllocation[weekInfo.year] = {};
			}

			if (!updatedAllocation[weekInfo.year][weekInfo.weekKey]) {
				updatedAllocation[weekInfo.year][weekInfo.weekKey] = {
					dates: weekInfo.dates,
					tasks: [],
					total_hours: 0,
				};
			}

			// Update tasks with todos from flat array
			const weekData = updatedAllocation[weekInfo.year][weekInfo.weekKey];
			weekData.tasks = weekData.tasks.map((task) => {
				// Find todos for this task from flat array
				const taskTodos = updatedData.filter(
					(item) => item.taskGroup === task.task,
				);

				// Clean todos (remove extra fields)
				const cleanTodos = taskTodos.map((item) => ({
					id: item.id,
					todo: item.todo,
					completed: item.completed,
					taskHours: item.taskHours,
				}));

				return {
					...task,
					todo: cleanTodos,
				};
			});

			// Save via AJAX
			const response = await fetch(ajaxObject.ajax_url, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					action: "udg_save_modified_data",
					nonce: ajaxObject.nonce,
					data: JSON.stringify({ monthly_allocation: updatedAllocation }),
					save_to_meta: JSON.stringify({
						monthly_allocation: "monthly_time_allocation",
					}),
				}),
			});

			const result = await response.json();
			if (result.success) {
				setLoadedData((prev) => ({
					...prev,
					monthly_allocation: updatedAllocation,
				}));
			} else {
				console.error("❌ Save failed:", result.data?.message);
			}
		} catch (err) {
			console.error("❌ Network error:", err);
		} finally {
			setSaving(false);
		}
	};

	// Generate table data from tasks (will implement in next chunk)
	// Generate table data from tasks - flat array with groupBy
	const generateTableData = (tasks) => {
		if (!tasks || tasks.length === 0) {
			setTableData([]);
			return;
		}

		// Convert to flat array of todo items with group field
		const flatData = [];

		tasks.forEach((task) => {
			const existingTodos = task.todo || [];

			if (existingTodos.length > 0) {
				// Add existing todos
				existingTodos.forEach((todo) => {
					flatData.push({
						...todo,
						taskGroup: task.task, // Group field
						totalGroupHours: task.hours,
						taskType: task.type,
                        rowClass: todo.completed ? "inactive" : "",
					});
				});
			} else {
				// Add placeholder row for empty groups
				flatData.push({
					id: `empty-${task.task}`,
					taskGroup: task.task,
					totalGroupHours: task.hours,
					taskType: task.type,
				});
			}
		});

		setTableData(flatData);
	};

	const createGroupSubtitles = (tasks) => {
		const subtitles = {};
		tasks.forEach((task) => {
			subtitles[task.task] = `${task.hours} val. • ${task.type}`;
		});
		return subtitles;
	};

	// Get table configuration for grouped EditableTable
	const getTableConfig = () => {
		const groupSubtitles = currentWeekData?.tasks
			? createGroupSubtitles(currentWeekData.tasks)
			: {};
		return {
			title: `Savaitės ${currentWeekData?.weekInfo?.weekNumber} užduočių sąrašas`,
			grouped: true,
			groupBy: "taskGroup", // Group by task name
			groupSubtitle: groupSubtitles,
			allowAdd: true,
			allowRemove: true,
			emptyStateText: "Šiai užduočiai dar nėra to-do elementų",
			addButtonText: "Pridėti veiksmą",
			saveButtonText: "Išsaugoti sąrašą",
			showCounter: false,
		};
	};

	const getTableColumns = () => {
		return [
			{
				key: "todo",
				label: "Veiksmas",
				type: "text",
				flex: "flex-5",
				placeholder: "Aprašyk konkretų veiksmą...",
			},
			{
				key: "taskHours",
				label: "Valandos",
				type: "number",
				flex: "flex-1",
				defaultValue: 0,
				min: 0,
				max: 3,
				step: 0.15,
			},
			{
				key: "completed",
				label: "Atlikta",
				type: "checkbox",
				flex: "flex-1",
				defaultValue: false,
			},
		];
	};

	return (
		<div className="weekly-todo-list-component">
			<div className="sv-mb-lg">
				{/* Week Selection Slider */}
				<div className="sv-mb-md sv-justify-center sv-flex">
					<div className="sv-week-navigator">
						<button
							className="sv-week-arrow"
							onClick={() => setWeekOffset(weekOffset - 1)}
							disabled={weekOffset <= -1}
							aria-label="Previous week"
						>
							&lt;
						</button>
						<div className="sv-week-display">
							{getShortWeekLabel(weekOffset)}
						</div>
						<button
							className="sv-week-arrow"
							onClick={() => setWeekOffset(weekOffset + 1)}
							disabled={weekOffset >= 1}
							aria-label="Next week"
						>
							&gt;
						</button>
					</div>
				</div>
			</div>

			{/* Loading State */}
			{loading && (
				<div className="sv-card sv-text-center">
					<p className="sv-text-base sv-opacity-75">
						Kraunami savaitės duomenys...
					</p>
				</div>
			)}

			{/* Error State */}
			{error && (
				<div className="sv-card sv-bg-primary-light sv-border sv-border-primary sv-text-primary">
					<p className="sv-font-medium">{error}</p>
				</div>
			)}

			{/* Main Content - Table will be rendered here in next chunk */}
			{!loading && !error && currentWeekData && (
				<div className="sv-mb-md">
					{currentWeekData.tasks?.length > 0 &&
					Object.keys(tableData).length > 0 ? (
						<div>
                            
							{/* EditableTable will be implemented in next chunk */}
							<EditableTable
								data={tableData}
								columns={getTableColumns()}
								config={getTableConfig()}
								onDataChange={handleTableChange}
								onSave={handleTableSave}
								blockAbbr="wtl"
								dataType="weekly_todo_list"
								className="weekly-todo-list-table"
							/>
						</div>
					) : (
						<div className="sv-card sv-text-center sv-border-2 sv-border-dashed sv-border sv-opacity-75">
							<div className="sv-text-3xl sv-mb-sm sv-opacity-50">📝</div>
							<p className="sv-text-base sv-font-medium sv-text-dark sv-mb-xs">
								Šiai savaitei užduočių nėra.
							</p>
							<p className="sv-text-sm sv-text-dark sv-opacity-75">
								Pirmiau pridėkite užduočių mėnesio laiko paskirstyme.
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
