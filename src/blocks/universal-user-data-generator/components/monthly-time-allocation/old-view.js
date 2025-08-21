/**
 * Monthly Goals Block - Main View Component
 */
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import EditableTable from "@components/EditableTable";
import {
	calculateWorkingHours,
	formatWorkingHours,
} from "@shared/utils/WorkingHoursCalc";
import AccordionHeader from "@components/AccordionHeader";

function MonthlyTimeAllocationComponent({ blockElement }) {
	const [dataLoaded, setDataLoaded] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [selectedMonth, setSelectedMonth] = useState("");
	const [saving, setSaving] = useState(false);
	const [monthlyTimeAllocation, setMonthlyTimeAllocation] = useState([]);

	// Month options generator
	const getMonthOptions = () => {
		const months = [];
		const currentDate = new Date();
		const currentYear = currentDate.getFullYear();

		// Generate 12 months: 6 months back, current month, 5 months forward
		for (let i = -6; i <= 5; i++) {
			const date = new Date(currentYear, currentDate.getMonth() + i, 1);
			const year = date.getFullYear();
			const month = date.getMonth() + 1;
			const monthKey = `${year}-${String(month).padStart(2, "0")}`;

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

			months.push({
				value: monthKey,
				label: `${year} ${monthNames[month - 1]}`,
			});
		}

		return months;
	};

	// Week calculation utilities for the selected month
	const getWeeksInMonth = (monthKey) => {
		const [year, month] = monthKey.split("-").map(Number);
		const weeks = [];

		// Get first day of month
		const firstDay = new Date(year, month - 1, 1);
		const lastDay = new Date(year, month, 0);

		// Find Monday of the first week
		let currentWeekStart = new Date(firstDay);
		currentWeekStart.setDate(
			firstDay.getDate() -
				(firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1),
		);

		let weekNumber = 1;

		while (currentWeekStart <= lastDay) {
			const weekEnd = new Date(currentWeekStart);
			weekEnd.setDate(currentWeekStart.getDate() + 6);

			// Get ISO week number
			const isoWeek = getISOWeek(currentWeekStart);

			// Format week display
			const startDate = Math.max(currentWeekStart.getDate(), 1);
			const endDate = Math.min(weekEnd.getDate(), lastDay.getDate());

			const monthNames = [
				"Jan",
				"Feb",
				"Mar",
				"Apr",
				"May",
				"Jun",
				"Jul",
				"Aug",
				"Sep",
				"Oct",
				"Nov",
				"Dec",
			];

			weeks.push({
				id: `week_${isoWeek}`,
				isoWeek: isoWeek,
				label: `${monthNames[month - 1]} ${startDate}-${endDate}`,
				weekNumber: weekNumber,
			});

			// Move to next week
			currentWeekStart.setDate(currentWeekStart.getDate() + 7);
			weekNumber++;
		}

		return weeks;
	};

	// ISO week number calculation
	const getISOWeek = (date) => {
		const tempDate = new Date(date.getTime());
		tempDate.setHours(0, 0, 0, 0);

		// Thursday in current week decides the year
		tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));

		// January 4 is always in week 1
		const week1 = new Date(tempDate.getFullYear(), 0, 4);

		// Adjust to Thursday in week 1 and count weeks from there
		return (
			1 +
			Math.round(
				((tempDate.getTime() - week1.getTime()) / 86400000 -
					3 +
					((week1.getDay() + 6) % 7)) /
					7,
			)
		);
	};
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

	// Save monthly goals and TC preferences in one call
	const saveTimeAllocation = async (timeAllocation) => {
		setSaving(true);
		setError("");

		// Update TC preferences with current values
		const [year, month] = selectedMonth.split("-").map(Number);
		const monthKey = `${year}_${month}`;

		try {
			const response = await fetch(sv_ajax_object.ajax_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "sv_cb_mta_save_monthly_time_allocation",
					nonce: sv_ajax_object.nonce,
					goals: JSON.stringify(timeAllocation),
				}),
			});

			const result = await response.json();

			if (result.success) {
				// Update local states
				setCurrentMonthGoals(goalsData);
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
	const handleTimeAllocationChange = (newTimeAllocation, changeInfo) => {
		setMonthlyTimeAllocation(newTimeAllocation);
		//calculate goals hours sum and compare it to working hours - routine tasks number
		if (changeInfo.field === "hours_allocated") {
			const totalAllocatedHours = newTimeAllocation.reduce(
				(sum, allocation) => sum + (allocation.hours_allocated || 0),
				0,
			);
			const current_goal_hours = changeInfo.newValue;

			const availableHours = workingHours - routineTaskHours;
			const remainingHours = Math.max(0, availableHours - totalAllocatedHours);

			// Set max for new/edited goals (current allocation + remaining)
			const maxForNewGoal = Math.max(0, remainingHours + current_goal_hours);
			setMaxHoursPerGoal(maxForNewGoal);
			const canAddMoreGoals = remainingHours > 0;
			setHasTimeForGoals(canAddMoreGoals);
		}
	};

	// Handle table save
	const handleTimeAllocationSave = () => {
		saveTimeAllocation(monthlyTimeAllocation);
	};

	const getTableTitle = () => {
		const currentMonth = selectedMonth.split("-");
		const monthlyStrings = {
			"01": " sausio",
			"02": " vasario",
			"03": " kovo",
			"04": " balandžio",
			"05": " gegužės",
			"06": " birželio",
			"07": " liepos",
			"08": " rugpjūčio",
			"09": " rugsėjo",
			10: " spalio",
			11: " lapkričio",
			12: " gruodžio",
		};
		return `${currentMonth[0] + monthlyStrings[currentMonth[1]]} tikslai`;
	};

	// Editable table configuration
	const tableConfig = {
		title: getTableTitle(),
		emptyStateText: "Šiam mėnesiui tikslų dar nėra",
		emptyStateSubtext: "Paspausk + ir užrašyk tikslus",
		saveButtonText: "Išsaugoti tikslus",
		allowAdd: hasTimeForGoals,
		allowRemove: true,
		showCounter: false,
	};

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
			max: maxHoursPerGoal,
			defaultValue: 0,
		},
	];

	if (!isLoggedIn) {
		return null; // Login notice shown in PHP
	}

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
				{/* <div className="sv-card__header">
					<h3 className="sv-text-xl sv-font-semibold sv-text-dark">
						Mėnesio tikslai
					</h3>
				</div> */}

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

					{/* Monthly Goals Table */}
					{dataLoaded && (
							<EditableTable
								data={monthlyTimeAllocation}
								columns={weeklyColumns}
								config={tableConfig}
								onDataChange={handleTimeAllocationChange}
								onSave={handleTimeAllocationSave}
								blockAbbr="mta"
								dataType="monthly-time-allocation"
								className="monthly-time-allocation-editable-table"
							/>
						)}

					{/* Save Status */}
					{saving && (
						<div className="sv-card sv-bg-accent-light sv-border sv-border-accent sv-text-center">
							<p className="sv-text-base sv-font-medium sv-animate-pulse">
								Saving monthly time allocation...
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
	const blocks = document.querySelectorAll(".sv-monthly-time-allocation-block");

	blocks.forEach((blockElement) => {
		const isLoggedIn = blockElement.dataset.isLoggedIn === "true";

		if (isLoggedIn) {
			// Create React root and render component
			const root = createRoot(blockElement);
			root.render(
				<MonthlyTimeAllocationComponent blockElement={blockElement} />,
			);
		}
	});
});
