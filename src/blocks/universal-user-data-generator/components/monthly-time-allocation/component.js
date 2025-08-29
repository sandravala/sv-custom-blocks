// Monthly Time Allocation Component - AJAX Testing
// src/blocks/universal-user-data-generator/components/monthly-time-allocation/component.js

import React, { useState, useEffect } from "react";
import EditableTable from "@components/EditableTable";
import { getISOWeek, getYear } from 'date-fns';

export default function MonthlyTimeAllocationComponent({
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
	const [selectedMonth, setSelectedMonth] = useState("");
	const [tableData, setTableData] = useState([]);

	// Meta keys configuration (from config.json userMetaKeys)
	const metaKeysConfig = {
		monthly_allocation: "monthly_time_allocation",
		routine_tasks: "routine_tasks",
		monthly_goals: "monthly_goals",
	};

	// Generate month options for select
	const getMonthOptions = () => {
		const monthOptions = [];
		const currentDate = new Date();
		const currentYear = currentDate.getFullYear();

		// Generate 12 months: 6 months back, current month, 5 months forward
		for (let i = -6; i <= 5; i++) {
			const date = new Date(currentYear, currentDate.getMonth() + i, 1);
			const year = date.getFullYear();
			const month = date.getMonth() + 1;
			const monthKey = `${year}-${String(month).padStart(2, "0")}`; // Format: "2025-01"

			const monthNames = [
				"Sausis",
				"Vasaris",
				"Kovas",
				"Balandis",
				"Gegužė",
				"Birželis",
				"Liepa",
				"Rugpjūtis",
				"Rugsėjis",
				"Spalis",
				"Lapkritis",
				"Gruodis",
			];

			monthOptions.push({
				value: monthKey, // This matches your data structure key "2025-09"
				label: `${year} ${monthNames[month - 1]}`, // Display: "2025 Rugsėjis"
			});
		}

		return monthOptions;
	};

	// Calculate ISO week numbers and date ranges for selected month
	const getWeeksForMonth = (monthKey) => {
		if (!monthKey) return [];

		const [year, month] = monthKey.split("-").map(Number);
		const weeks = [];

		// Get first and last day of month
		const firstDay = new Date(year, month - 1, 1);
		const lastDay = new Date(year, month, 0);

		// Find Monday of the first week that contains first day of month
		let currentWeekStart = new Date(firstDay);
		const dayOfWeek = firstDay.getDay();
		const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so 6 days to Monday
		currentWeekStart.setDate(firstDay.getDate() - daysToMonday);

		// Generate weeks until we pass the last day of month
		while (currentWeekStart <= lastDay) {
			const weekEnd = new Date(currentWeekStart);
			weekEnd.setDate(currentWeekStart.getDate() + 6); // Sunday

			// Get ISO week number
			const isoWeek = getISOWeek(currentWeekStart);

			// Format date range - always show month for both ends
			const startDate = currentWeekStart.getDate();
			const endDate = weekEnd.getDate();
			const startMonth = currentWeekStart.getMonth() + 1;
			const endMonth = weekEnd.getMonth() + 1;

			// Always format as "MM DD - MM DD"
			const dateRange = `${String(startMonth).padStart(2, "0")} ${String(
				startDate,
			).padStart(2, "0")} - ${String(endMonth).padStart(2, "0")} ${String(
				endDate,
			).padStart(2, "0")}`;

			weeks.push({
				[isoWeek]: dateRange,
			});

			// Move to next week
			currentWeekStart.setDate(currentWeekStart.getDate() + 7);
		}

		return weeks;
	};

	// Calculate ISO week number
	// const getISOWeek = (date) => {
	// 	const weekNumber = getISOWeek(date);
	// 	return weekNumber;
	// };

	// Get goals for selected month
	const getSelectedMonthGoals = () => {
		if (!selectedMonth || !loadedData.monthly_goals) return [];

		const monthData = loadedData.monthly_goals.find(
			(item) => item.month === selectedMonth,
		);
		return monthData ? monthData.goals : [];
	};

	// Set default selected month on data load
	useEffect(() => {
		if (
			loadedData.monthly_goals &&
			loadedData.monthly_goals.length > 0 &&
			!selectedMonth
		) {
			// Set to first available month or current month
			const currentMonth = new Date().toISOString().slice(0, 7); // "2025-01" format
			const hasCurrentMonth = loadedData.monthly_goals.some(
				(item) => item.month === currentMonth,
			);

			if (hasCurrentMonth) {
				setSelectedMonth(currentMonth);
			} else {
				setSelectedMonth(loadedData.monthly_goals[0].month);
			}
		}
		const newTableData = generateTableData();
		setTableData(newTableData);
		// Set transparent fields after loading data
	}, [loadedData, selectedMonth]);

	// Load data on component mount
	useEffect(() => {
		if (isLoggedIn && ajaxObject) {
			loadComponentData();
		} else {
			setLoading(false);
		}
	}, [isLoggedIn, ajaxObject]);

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

			if (result.success) {
				const userData = result.data.user_data || {};
				setLoadedData(userData);
			} else {
				setError(result.data?.message || "Failed to load data");
			}
		} catch (err) {
			setError("Network error occurred");
			console.error("Load error:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleTableChange = (updatedData) => {
		setTableData(updatedData);
		// Table handles the editing internally
	};

	const handleTableSave = async (dataToSave) => {
		// Convert flat table data back to your week-based structure
		const year = selectedMonth.split("-")[0];
		const weeks = getWeeksForMonth(selectedMonth);
		const allocationsData = { [year]: {} };

		// Initialize weeks structure
		weeks.forEach((weekObj) => {
			const weekNumber = Object.keys(weekObj)[0];
			const dateRange = Object.values(weekObj)[0];

			allocationsData[year][`week_${weekNumber}`] = {
				dates: dateRange,
				tasks: [],
				total_hours: 0,
			};
		});

		// Convert table rows back to tasks per week
		dataToSave.forEach((row) => {
			weeks.forEach((weekObj) => {
				const weekNumber = Object.keys(weekObj)[0];
				const weekKey = `week_${weekNumber}`;
				const hours = row[weekKey] || 0;

				if (hours > 0) {
					// Only save non-zero allocations
					allocationsData[year][weekKey].tasks.push({
						task: row.task,
						hours: parseFloat(hours),
						type: row.type, // from the hidden taskType field
					});
				}
			});
		});

		// Calculate totals for each week
		Object.keys(allocationsData[year]).forEach((weekKey) => {
			const weekData = allocationsData[year][weekKey];
			weekData.total_hours = weekData.tasks.reduce(
				(sum, task) => sum + task.hours,
				0,
			);
		});

		// Save using AJAX
		try {
			const response = await fetch(ajaxObject.ajax_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "udg_save_modified_data",
					nonce: ajaxObject.nonce,
					data: JSON.stringify({ monthly_allocation: allocationsData }),
					save_to_meta: JSON.stringify({
						monthly_allocation: "monthly_time_allocation",
					}),
				}),
			});

			const result = await response.json();

			if (result.success) {
				// Optionally reload data to see saved state
				// loadComponentData();
			} else {
				console.error("❌ Save failed:", result.data?.message);
			}
		} catch (err) {
			console.error("❌ Network error while saving:", err);
		}
	};

	// Get tasks from routine tasks and monthly goals
	const getAllTasks = () => {
		const tasks = [];

		// Add monthly goals for selected month
		if (
			selectedMonth &&
			loadedData.monthly_goals &&
			Array.isArray(loadedData.monthly_goals)
		) {
			const monthData = loadedData.monthly_goals.find(
				(item) => item.month === selectedMonth,
			);
			if (monthData && monthData.goals) {
				monthData.goals.forEach((goal) => {
					tasks.push({
						task: goal.description,
						type: "monthly_goal",
						hours: goal.hours_allocated || 0, // Default total to 0
					});
				});
			}
		}

		// Add routine tasks
		if (loadedData.routine_tasks && Array.isArray(loadedData.routine_tasks)) {
			loadedData.routine_tasks.forEach((task) => {
				tasks.push({
					task: task.responsibility,
					type: "routine",
					hours: task.typical_hours_per_month || 0, // Default total to 0
				});
			});
		}

		return tasks;
	};

	// Generate table data from tasks
	const generateTableData = () => {
		if (!selectedMonth) return [];

		const tasks = getAllTasks();
		const weeks = getWeeksForMonth(selectedMonth);
		const year = selectedMonth.split("-")[0];

		// Get existing allocations from loaded data
		const existingAllocations = loadedData.monthly_allocation?.[year] || {};

		const tasksMap = tasks.map((task, index) => {
			const row = {
				id: `${task.type}_${index}`,
				task: task.task,
				type: task.type,
				hours: task.hours || 0, // Default total to 0
			};

			// Initialize week hours to 0
			// Load existing week hours or default to 0
			weeks.forEach((weekObj) => {
				const weekNumber = Object.keys(weekObj)[0];
				const weekKey = `week_${weekNumber}`;

				// Find existing allocation for this task in this week
				const weekData = existingAllocations[weekKey];
				const existingTask = weekData?.tasks?.find(
					(t) => t.task === task.task && t.type === task.type,
				);

				row[weekKey] = existingTask?.hours || 0;
			});

			return row;
		});
		return tasksMap;
	};

	// Generate table columns based on selected month
	const getTableColumns = () => {
		if (!selectedMonth) return [];

		const weeks = getWeeksForMonth(selectedMonth);
		const flexSettings = {
			taskFlex: "",
			weekFlex: "flex-1",
		};
		if (weeks.length > 0) {
			const weekCounter = weeks.length + 1;
			flexSettings.taskFlex = "flex-" + weekCounter;
		}
		const columns = [
			{
				key: "task",
				label: "Darbai",
				type: "text",
				readonly: true,
				flex: flexSettings.taskFlex,
			},
		];

		// Add week columns
		weeks.forEach((weekObj) => {
			const weekNumber = Object.keys(weekObj)[0];
			const dateRange = Object.values(weekObj)[0];
			columns.push({
				key: `week_${weekNumber}`,
				label: dateRange,
				type: "number",
				min: 0,
				step: 1,
				flex: flexSettings.weekFlex,
				placeholder: 1,
			});
		});

		// Add total column
		columns.push({
			key: "planned",
			label: "viso",
			type: "number",
			calculated: true,
			calculate: (row) => {
				const weeks = getWeeksForMonth(selectedMonth);
				return weeks.reduce((sum, weekObj) => {
					const weekNumber = Object.keys(weekObj)[0];
					row.planned = sum + (Number(row[`week_${weekNumber}`]) || 0);
					return row.planned;
				}, 0);
			},
			flex: flexSettings.weekFlex,
		});
		columns.push({
			key: "remaining",
			label: "Liko",
			type: "number",
			calculated: true,
			calculate: (row) => {
                const remainingHours = Number(row.hours) - Number(row.planned);
				return remainingHours < 0 ? 0 : remainingHours;
			},
			flex: flexSettings.weekFlex,
		});

		return columns;
	};

	const getTableConfig = () => {
		const weeks = getWeeksForMonth(selectedMonth);
		const totalsFields = {};

		// Add sum totals for each week column
		weeks.forEach((weekObj) => {
			const weekNumber = Object.keys(weekObj)[0];
			totalsFields[`week_${weekNumber}`] = "sum";
		});

		// Add total column sum
		totalsFields["planned"] = "sum";
		totalsFields["remaining"] = "sum";

		return {
			title: "Mėnesio planas",
			allowEditing: true,
			allowAddRemove: false,
			grouped: false,
			showActions: true,
			showCounter: false,
			emptyStateText:
				"Jokių užduočių nėra. Grįžk į ankstesnius modulius ir išsaugok atsakomybių sąrašą bei tikslus",
			emptyStateSubtext: "Pasirink mėnesį, kad būtų rodomos užduotys",
			showTotals: true,
            saveButtonText: "Išsaugoti",
			totalsConfig: {
				label: "Viso valandų",
				position: "bottom",
				fields: totalsFields,
			},
		};
	};

    // Check allocation status
const getAllocationStatus = () => {
    const totalAvailableHours = tableData.reduce((sum, row) => sum + (row.hours || 0), 0);
    const totalAllocatedHours = tableData.reduce((sum, row) => {
        const weeks = getWeeksForMonth(selectedMonth);
        const rowAllocated = weeks.reduce((weekSum, weekObj) => {
            const weekNumber = Object.keys(weekObj)[0];
            return weekSum + (row[`week_${weekNumber}`] || 0);
        }, 0);
        return sum + rowAllocated;
    }, 0);
    
    const difference = totalAvailableHours - totalAllocatedHours;
    
    return difference;
};

	if (!isLoggedIn) {
		return (
			<div className="login-required">
				<h4>Prisijungimas reikalingas</h4>
				<p>Turite būti prisijungę, kad galėtumėte naudoti šį įrankį.</p>
			</div>
		);
	}

	if (loading) {
		return (
<div className="sv-table-loading">
			<div className="sv-table-loader"></div>
		</div>
		);
	}

	return (
		<div className="monthly-time-allocation-component">
			{error && (
				<div
					className="error-message"
					style={{ color: "red", marginBottom: "10px" }}
				>
					{error}
				</div>
			)}

			<div className="month-selector" style={{ marginBottom: "20px" }}>
				<select
					id="month-select"
					value={selectedMonth}
					onChange={(e) => setSelectedMonth(e.target.value)}
					style={{
						padding: "8px 12px",
						fontSize: "14px",
						border: "1px solid #ddd",
						borderRadius: "4px",
						minWidth: "200px",
					}}
				>
					<option value="">-- Pasirink mėnesį --</option>
					{getMonthOptions().map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</div>

			{selectedMonth && getAllTasks().length > 0 && (
				<>
					{getAllocationStatus() !== 0 && (
						<div className="sv-alert sv-alert--info sv-px-lg sv-mb-md">
							<div className="sv-alert__content sv-text-sm sv-text-primary">
                                <strong>OHO! </strong>
								<p>{getAllocationStatus() > 0 ? getAllocationStatus() + ' h dar nesuplanuota. Jei nepriskirsi šių valandų konkrečioms savaitėms, tikėtina, kad jas ištaškysi viskam belenkam - bet nebūtinai tam, kas tau svarbu.': 'Tu planuoji darbui skirti daugiau laiko, nei jo turi (maždaug ' + getAllocationStatus()+ ' h). Ar tikrai tai gera idėja? Greičiausiai kažko vistiek nepadarysi - geriau suplanuok realistiškai.' }</p>
							</div>
						</div>
					)}
					<div className="sv-mb-md">
						<EditableTable
							data={tableData}
							columns={getTableColumns()}
							config={getTableConfig()}
							onDataChange={(updatedData) => {
								setTableData(updatedData);
							}}
							onSave={(updatedData) => handleTableSave(updatedData)}
							blockAbbr="mta"
							dataType="monthly_allocation"
							className="monthly-time-allocation-table"
						/>
					</div>
				</>
			)}
		</div>
	);
}
