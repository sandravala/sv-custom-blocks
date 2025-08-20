/**
 * Monthly Goals Block - Main View Component
 */
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import EditableTable, {
	createSimpleListConfig,
} from "@components/EditableTable";
import {
	calculateWorkingHours,
	formatWorkingHours,
} from "@shared/utils/WorkingHoursCalc";
import AccordionHeader from "@components/AccordionHeader";

function MonthlyGoalsComponent({ blockElement }) {
	// Get configuration from data attributes
	const monthSelectionMode =
		blockElement.dataset.monthSelectionMode || "limited";
	const isLoggedIn = blockElement.dataset.isLoggedIn === "true";

	// Component state
	const [selectedMonth, setSelectedMonth] = useState("");
	const [allGoalActions, setAllGoalActions] = useState([]);
	const [allGoalStages, setAllGoalStages] = useState({});
	const [allMonthlyGoals, setAllMonthlyGoals] = useState([]);
	const [currentMonthGoals, setCurrentMonthGoals] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);
	const [dataLoaded, setDataLoaded] = useState(false);
	const [allTCPreferences, setAllTCPreferences] = useState({});
	const [vacationDays, setVacationDays] = useState(2);
	const [hoursPerDay, setHoursPerDay] = useState(8);
	const [workingHoursDisplay, setWorkingHoursDisplay] = useState("");
	const [workingHours, setWorkingHours] = useState(0);
	const [allRoutineTasks, setAllRoutineTasks] = useState([]);
	const [routineTaskHours, setRoutineTaskHours] = useState(0);
	const [otherMonthsGoals, setOtherMonthsGoals] = useState([]);
	const [showWorkingHoursSaveButton, setShowWorkingHoursSaveButton] =
		useState(false);

	// Calculate other months' goals for current quarter
	useEffect(() => {
		const calculatedGoals = getOtherMonthsGoals(allMonthlyGoals, selectedMonth);
		setOtherMonthsGoals(calculatedGoals);
	}, [allMonthlyGoals, selectedMonth]);

	const getAvailableMonths = () => {
		const currentDate = new Date();
		const currentYear = currentDate.getFullYear();
		const currentMonth = currentDate.getMonth() + 1; // 1-based
		const currentDay = currentDate.getDate();

		let monthNumbers = [];

		if (monthSelectionMode === "extended") {
			// All 12 months of current year
			monthNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
		} else {
			// Limited mode: current or next quarter based on date
			const quarters = [
				{ months: [1, 2, 3], name: "Q1" },
				{ months: [4, 5, 6], name: "Q2" },
				{ months: [7, 8, 9], name: "Q3" },
				{ months: [10, 11, 12], name: "Q4" },
			];

			// Find current quarter
			const currentQuarter = quarters.find((q) =>
				q.months.includes(currentMonth),
			);
			const currentQuarterIndex = quarters.indexOf(currentQuarter);

			// Determine which quarter to show
			let targetQuarter = currentQuarter;

			// If after 15th of last month in quarter, show next quarter
			if (currentMonth === currentQuarter.months[2] && currentDay > 15) {
				const nextQuarterIndex = (currentQuarterIndex + 1) % 4;
				targetQuarter = quarters[nextQuarterIndex];
			}

			monthNumbers = targetQuarter.months;
		}

		// Format all months once
		return monthNumbers.map((month) => {
			const monthStr = `${currentYear}-${month.toString().padStart(2, "0")}`;
			const monthName = new Date(currentYear, month - 1, 1).toLocaleDateString(
				"lt-LT",
				{
					month: "long",
					year: "numeric",
				},
			);
			return { value: monthStr, label: monthName };
		});
	};

	// Set default month on component mount
	useEffect(() => {
		if (!isLoggedIn) return;

		const availableMonths = getAvailableMonths();
		//const quarterlyContext = getQuarterlyContext(allGoalActions, selectedMonth);
		if (availableMonths.length > 0) {
			const currentDate = new Date();
			const currentYear = currentDate.getFullYear();
			const currentMonth = currentDate.getMonth() + 1;
			const currentDay = currentDate.getDate();

			// Default to current month, or next month if after 15th
			let defaultMonth = currentMonth;
			if (currentDay > 15) {
				defaultMonth = currentMonth === 12 ? 1 : currentMonth + 1;
			}

			const defaultMonthStr = `${currentYear}-${defaultMonth
				.toString()
				.padStart(2, "0")}`;

			// Check if default month is in available months
			const isDefaultAvailable = availableMonths.some(
				(m) => m.value === defaultMonthStr,
			);

			if (isDefaultAvailable) {
				setSelectedMonth(defaultMonthStr);
			} else {
				// Use first available month
				setSelectedMonth(availableMonths[0].value);
			}
		}
	}, [isLoggedIn, monthSelectionMode]);

	// Calculate routine task hours when routine tasks change
	useEffect(() => {
		const totalHours = calculateRoutineTaskHours(allRoutineTasks);
		setRoutineTaskHours(totalHours);
	}, [allRoutineTasks]);

	// Load all data once when component mounts
	useEffect(() => {
		if (!isLoggedIn || dataLoaded) return;
		loadAllData();
	}, [isLoggedIn]);

	// Update current month goals when month or data changes
	useEffect(() => {
		if (selectedMonth && allMonthlyGoals.length >= 0) {
			const monthGoals = getMonthGoals(allMonthlyGoals, selectedMonth);
			setCurrentMonthGoals(monthGoals);
		}
	}, [selectedMonth, allMonthlyGoals]);

	// Update current month goals when month or data changes
	useEffect(() => {
		if (selectedMonth && allMonthlyGoals.length >= 0) {
			const monthGoals = getMonthGoals(allMonthlyGoals, selectedMonth);
			setCurrentMonthGoals(monthGoals);
		}
	}, [selectedMonth, allMonthlyGoals]);

	// Update TC preferences ONLY when month or TC data changes (not when monthly goals change)
	useEffect(() => {
		if (selectedMonth) {
			const tcPrefs = getTCPreferencesForMonth(allTCPreferences, selectedMonth);
			setVacationDays(tcPrefs.vacationDays);
			setHoursPerDay(tcPrefs.hoursPerDay);
		}
	}, [selectedMonth, allTCPreferences]);

	// Calculate working hours when inputs change
	useEffect(() => {
		if (selectedMonth && vacationDays >= 0 && hoursPerDay > 0) {
			calculateWorkingHoursDisplay();
		}
	}, [selectedMonth, vacationDays, hoursPerDay]);

	// Load all data from backend once
	const loadAllData = async () => {
		setLoading(true);
		setError("");

		try {
			// Load monthly goals data
			const response = await fetch(mgAjax.ajaxUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "sv_cb_mg_get_monthly_goals",
					nonce: mgAjax.nonce,
				}),
			});

			const result = await response.json();

			if (result.success) {
				console.log("Loaded monthly goals data:", result.data);
				setAllGoalActions(result.data.goal_actions || []);
				setAllMonthlyGoals(result.data.monthly_goals || []);
				setAllTCPreferences(result.data.tc_preferences || {});
				setAllRoutineTasks(result.data.routine_tasks || []);
				setAllGoalStages(result.data.goal_stages || {});
				setDataLoaded(true);
			} else {
				setError(result.data || "Error loading monthly goals data");
			}
		} catch (err) {
			setError("Failed to load monthly goals data. Please try again.");
			console.error("Load error:", err);
		} finally {
			setLoading(false);
		}
	};

	// Get all goals from other months in the same quarter
	const getOtherMonthsGoals = (allMonthlyGoals, selectedMonth) => {
		if (!selectedMonth) return [];

		const [year, month] = selectedMonth.split("-").map(Number);
		const currentQuarter = getQuarterFromMonth(month);

		// Define quarter months
		const quarterMonths = {
			Q1: [1, 2, 3],
			Q2: [4, 5, 6],
			Q3: [7, 8, 9],
			Q4: [10, 11, 12],
		};

		const currentQuarterMonths = quarterMonths[currentQuarter];
		const otherMonths = currentQuarterMonths.filter((m) => m !== month);

		// Collect all goals from other months
		const allOtherGoals = [];

		otherMonths.forEach((monthNum) => {
			const monthKey = `${year}-${monthNum.toString().padStart(2, "0")}`;
			const monthEntry = allMonthlyGoals.find(
				(entry) => entry.month === monthKey,
			);

			if (monthEntry && monthEntry.goals) {
				allOtherGoals.push(...monthEntry.goals);
			}
		});

		return allOtherGoals;
	};

	// Get quarter title with stage information
	const getQuarterTitle = (quarter, goalStages) => {
		const quarterTitles = {
			Q1: "I ketv.",
			Q2: "II ketv.",
			Q3: "III ketv.",
			Q4: "IV ketv.",
		};

		if (goalStages && goalStages[quarter]) {
			const stageData = goalStages[quarter];
			const outcomes = stageData.outcomes ? stageData.outcomes.join(" | ") : "";
			return { title: quarterTitles[quarter], outcomes: outcomes };
		}

		return { title: quarter, outcomes: "" };
	};

	// Calculate total routine task hours
	const calculateRoutineTaskHours = (routineTasks) => {
		if (!Array.isArray(routineTasks) || routineTasks.length === 0) {
			return 0;
		}

		const totalHours = routineTasks.reduce((sum, task) => {
			const hours = task.typical_hours_per_month || 0;
			return sum + hours;
		}, 0);

		return Math.round(totalHours);
	};

	const getTCPreferencesForMonth = (tcPrefs, selectedMonth) => {
		const [year, month] = selectedMonth.split("-").map(Number);
		const monthKey = `${year}_${month}`;

		// Try monthly first
		if (tcPrefs?.monthly?.[monthKey]) {
			return {
				vacationDays: tcPrefs.monthly[monthKey].vacation_days || 2,
				hoursPerDay: tcPrefs.monthly[monthKey].working_hours || 8,
			};
		}

		// Fallback to yearly (divided)
		if (tcPrefs?.yearly) {
			return {
				vacationDays: Math.round((tcPrefs.yearly.vacation_days || 24) / 12),
				hoursPerDay: tcPrefs.yearly.working_hours || 8,
			};
		}

		return { vacationDays: 2, hoursPerDay: 8 };
	};

	// Get quarterly context for selected month
	const getQuarterlyContext = (goalActions, selectedMonth) => {
		console.log("getQuarterlyContext called with:", {
			goalActions: goalActions.length,
			selectedMonth,
		});

		if (!Array.isArray(goalActions) || !selectedMonth) {
			return { quarter: "", actions: [] };
		}

		// Determine quarter from month (e.g., "2025-08" -> "Q3")
		const monthNum = parseInt(selectedMonth.split("-")[1]);
		const quarter = getQuarterFromMonth(monthNum);

		console.log("Calculated quarter:", quarter, "for month:", monthNum);

		// Filter actions by quarter - check both 'quarter' and 'area' fields
		const quarterlyActions = goalActions.filter((action) => {
			const actionQuarter = action.quarter || action.area || "";
			console.log(
				"Action quarter/area:",
				actionQuarter,
				"matches:",
				actionQuarter === quarter,
			);
			return actionQuarter === quarter;
		});

		console.log("Filtered actions:", quarterlyActions);

		return {
			quarter,
			actions: quarterlyActions,
		};
	};

	// Get goals for specific month
	const getMonthGoals = (monthlyGoals, selectedMonth) => {
		if (!Array.isArray(monthlyGoals) || !selectedMonth) {
			return [];
		}

		const monthEntry = monthlyGoals.find(
			(entry) => entry.month === selectedMonth,
		);
		return monthEntry ? monthEntry.goals || [] : [];
	};

	// Get quarter from month number
	const getQuarterFromMonth = (monthNum) => {
		if (monthNum >= 1 && monthNum <= 3) return "Q1";
		if (monthNum >= 4 && monthNum <= 6) return "Q2";
		if (monthNum >= 7 && monthNum <= 9) return "Q3";
		return "Q4";
	};

	// Calculate working hours using shared calculator
	const calculateWorkingHoursDisplay = () => {
		if (!selectedMonth) {
			setWorkingHoursDisplay("");
			return;
		}

		const [year, month] = selectedMonth.split("-").map(Number);

		try {
			const result = calculateWorkingHours({
				year,
				month,
				hoursPerDay,
				vacationDays,
			});

			setWorkingHours(result.totalWorkingHours);
			setWorkingHoursDisplay(formatWorkingHours(result));
		} catch (error) {
			console.error("Working hours calculation error:", error);
			setWorkingHoursDisplay("Ups... kalkuliatorius perkaito. Pabandyk vėliau");
		}
	};

	// Save monthly goals
	// Save monthly goals and TC preferences in one call
	const saveMonthlyGoals = async (goalsData) => {
		setSaving(true);
		setError("");

		// Update TC preferences with current values
		const [year, month] = selectedMonth.split("-").map(Number);
		const monthKey = `${year}_${month}`;

		const updatedTCPrefs = {
			...allTCPreferences,
			monthly: {
				...allTCPreferences.monthly,
				[monthKey]: {
					vacation_days: vacationDays,
					working_hours: hoursPerDay,
				},
			},
		};

		try {
			const response = await fetch(mgAjax.ajaxUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "sv_cb_mg_save_monthly_goals",
					nonce: mgAjax.nonce,
					month: selectedMonth,
					goals: JSON.stringify(goalsData),
					tc_preferences: JSON.stringify(updatedTCPrefs), // Send whole TC prefs
				}),
			});

			const result = await response.json();

			if (result.success) {
				// Update local states
				setCurrentMonthGoals(goalsData);
				setAllTCPreferences(updatedTCPrefs); // Update TC prefs state

				// Update allMonthlyGoals array
				setAllMonthlyGoals((prev) => {
					const updated = [...prev];
					const existingIndex = updated.findIndex(
						(entry) => entry.month === selectedMonth,
					);

					if (existingIndex >= 0) {
						updated[existingIndex] = {
							month: selectedMonth,
							goals: goalsData,
						};
					} else {
						updated.push({
							month: selectedMonth,
							goals: goalsData,
						});
					}

					return updated;
				});
			} else {
				setError(result.data || "Error saving monthly goals");
			}
		} catch (err) {
			setError("Failed to save monthly goals. Please try again.");
			console.error("Save error:", err);
		} finally {
			setSaving(false);
		}
	};

	// Handle month selection change
	const handleMonthChange = (month) => {
		setSelectedMonth(month);
	};

	// Handle table data changes
	const handleGoalsChange = (newGoalsData) => {
		setCurrentMonthGoals(newGoalsData);
	};

	// Handle table save
	const handleGoalsSave = () => {
		saveMonthlyGoals(currentMonthGoals);
	};

	// Editable table configuration
	const tableConfig = createSimpleListConfig("Mėnesio tikslai");
	tableConfig.emptyStateText = "Mėnesio tikslų dar nėra";
	tableConfig.emptyStateSubtext = "Paspausk + ir pridėk savo mėnesio tikslus";
	tableConfig.saveButtonText = "Išsaugoti tikslus";

	// Column definitions for goals table
	const goalColumns = [
		{
			key: "description",
			label: "Tikslas",
			type: "text",
			flex: "flex-1",
			placeholder: "Įvesk savo mėnesio tikslą...",
		},
		{
			key: "hours_allocated",
			label: "Planuojama d.h.",
			type: "number",
			flex: "flex-auto",
			min: 0,
			max: 744, // reikės naudoti state, paskaičiuosiu kiek tikslams lieka ir atimsiu su kiekvienu esamu tikslu
			defaultValue: 0,
		},
	];

	const availableMonths = getAvailableMonths();

	if (!isLoggedIn) {
		return null; // Login notice shown in PHP
	}

	// Calculate quarterly context for current selection
	const quarterlyContext = getQuarterlyContext(allGoalActions, selectedMonth);

	return (
		<div className="sv-flex sv-flex-col sv-gap-lg">
			{/* Error Display */}
			{error && (
				<div className="sv-card sv-bg-primary-light sv-border sv-border-primary sv-text-primary">
					<p className="sv-font-medium">{error}</p>
				</div>
			)}

			{/* Month Selector and Working Hours Inputs */}
			<div className="sv-card">
				<div className="sv-card__header">
					<h3 className="sv-text-xl sv-font-semibold sv-text-dark">
						Mėnesio tikslai
					</h3>
				</div>

				{/* Row 1: Inputs */}
				<div className="sv-grid sv-grid-cols-3 sv-gap-md sv-mb-md">
					<div className="sv-form__group">
						<label htmlFor="month-select" className="sv-form__label">
							Mėnuo:
						</label>
						<select
							id="month-select"
							value={selectedMonth}
							onChange={(e) => handleMonthChange(e.target.value)}
							disabled={loading}
							className="sv-form__select"
						>
							<option value="">Pasirink...</option>
							{availableMonths.map((month) => (
								<option key={month.value} value={month.value}>
									{month.label}
								</option>
							))}
						</select>
					</div>

					<div className="sv-form__group">
						<label htmlFor="vacation-days" className="sv-form__label">
							Atostogų šį mėnesį (dienomis):
						</label>
						<input
							id="vacation-days"
							type="number"
							min="0"
							max="31"
							value={vacationDays}
							onChange={(e) => {
								setVacationDays(parseInt(e.target.value) || 0);
								setShowWorkingHoursSaveButton(true);
							}}
							className="sv-form__input"
							disabled={loading}
						/>
					</div>

					<div className="sv-form__group">
						<label htmlFor="hours-per-day" className="sv-form__label">
							Darbo valandų per dieną šį mėnesį:
						</label>
						<input
							id="hours-per-day"
							type="number"
							min="1"
							max="8"
							step="0.5"
							value={hoursPerDay}
							onChange={(e) => {
								setHoursPerDay(parseFloat(e.target.value) || 8);
								setShowWorkingHoursSaveButton(true);
							}}
							className="sv-form__input"
							disabled={loading}
						/>
					</div>
				</div>

				{/* Row 2: Display calculated values with save button */}
				<div className="sv-flex sv-justify-between sv-items-center sv-text-sm sv-font-medium sv-py-sm sv-border-t sv-border-gray-200">
					<div className="sv-flex sv-flex-col sv-gap-md">
						<span className="sv-text-dark">
							Darbo valandų šį mėnesį iš viso:{" "}
							{workingHoursDisplay || "Calculating..."}
						</span>
						{routineTaskHours > 0 && (
							<>
								<span
									className={`${
										routineTaskHours > 0 &&
										workingHours > 0 &&
										routineTaskHours > workingHours
											? "sv-text-danger"
											: "sv-text-dark"
									}`}
								>
									Kasdiems užduotims: {routineTaskHours} h
								</span>
								<span className="sv-text-dark">
									Tikslams:{" "}
									{routineTaskHours > 0 &&
									workingHours > 0 &&
									routineTaskHours > workingHours
										? "panašu, kad jiems laiko šį mėnesį neturėsi ;("
										: workingHours - routineTaskHours + " h"}
								</span>
							</>
						)}
					</div>

					{/* Save button for working hours */}
					{showWorkingHoursSaveButton && (
						<button
							onClick={() => saveMonthlyGoals(currentMonthGoals)}
							className="sv-btn sv-btn--outline sv-btn--sm"
							disabled={saving || loading}
							title="Išsaugoti darbo valandų nustatymus"
						>
							{saving ? "Saugoma..." : "Išsaugoti"}
						</button>
					)}
				</div>
			</div>

			{/* Loading State */}
			{loading && (
				<div className="sv-card sv-text-center">
					<p className="sv-text-base sv-opacity-75 sv-animate-pulse">
						Kraunama...
					</p>
				</div>
			)}

			{/* Main Content */}
			{!loading && selectedMonth && (
				<div className="sv-flex sv-flex-col sv-gap-lg">
					{/* Quarterly Context */}
					{quarterlyContext && quarterlyContext.actions.length > 0 && (
						<AccordionHeader
							title={
								getQuarterTitle(quarterlyContext.quarter, allGoalStages).title
							}
							subtitle={
								getQuarterTitle(quarterlyContext.quarter, allGoalStages)
									.outcomes
							}
						>
							{/* Main Actions from goal_actions */}
							<div className="sv-mb-md">
								<div className="sv-text-sm sv-font-medium sv-text-dark sv-mb-sm">
									Pagrindiniai veiksmai:
								</div>
								<div className="quarterly-actions-container">
									{quarterlyContext.actions.map((action, index) => (
										<div key={index} className="quarterly-action-card sv-mb-sm">
											<div className="sv-flex sv-justify-between sv-items-center">
												<div className="sv-text-dark sv-font-normal sv-flex-1">
													{action.description ||
														action.responsibility ||
														"Užduotis"}
												</div>
												{action.hours_estimate && (
													<div className="sv-bg-teal sv-text-white sv-px-sm sv-py-xs sv-rounded sv-text-sm sv-font-medium sv-ml-sm">
														{action.hours_estimate.total_hours || 0}h
													</div>
												)}
											</div>
										</div>
									))}
								</div>
							</div>
							{/* All monthly goals in this quarter */}
							{allMonthlyGoals.length > 0 && (
								<div className="sv-border-t sv-border-teal sv-pt-md">
									<div className="sv-text-sm sv-font-medium sv-text-dark sv-mb-sm">
										Mėnesių tikslai:
									</div>
									{allMonthlyGoals
										.filter((monthEntry) => {
											// Filter to show only goals from current quarter
											const [year, month] = monthEntry.month
												.split("-")
												.map(Number);
											const entryQuarter = getQuarterFromMonth(month);
											return entryQuarter === quarterlyContext.quarter;
										})
										.flatMap((monthEntry) => monthEntry.goals || [])
										.map((goal, index) => (
											<div
												key={index}
												className="quarterly-action-card sv-mb-sm"
											>
												<div className="sv-flex sv-justify-between sv-items-center">
													<div className="sv-text-dark sv-font-normal sv-flex-1">
														{goal.description}
													</div>
													<div className="sv-bg-teal sv-text-white sv-px-sm sv-py-xs sv-rounded sv-text-sm sv-font-medium sv-ml-sm">
														{goal.hours_allocated || 0}h
													</div>
												</div>
											</div>
										))}
								</div>
							)}
						</AccordionHeader>
					)}

					{/* Monthly Goals Table */}
					{routineTaskHours > 0 &&
						workingHours > 0 &&
						routineTaskHours < workingHours && (
							<EditableTable
								data={currentMonthGoals}
								columns={goalColumns}
								config={tableConfig}
								onDataChange={handleGoalsChange}
								onSave={handleGoalsSave}
								blockAbbr="mg"
								dataType="monthly_goals"
								className="monthly-goals-editable-table"
							/>
						)}

					{/* Save Status */}
					{saving && (
						<div className="sv-card sv-bg-accent-light sv-border sv-border-accent sv-text-center">
							<p className="sv-text-base sv-font-medium sv-animate-pulse">
								Saving monthly goals...
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// Initialize component when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
	const blocks = document.querySelectorAll(".sv-monthly-goals-block");

	blocks.forEach((blockElement) => {
		const isLoggedIn = blockElement.dataset.isLoggedIn === "true";

		if (isLoggedIn) {
			// Create React root and render component
			const root = createRoot(blockElement);
			root.render(<MonthlyGoalsComponent blockElement={blockElement} />);
		}
	});
});
