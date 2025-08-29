/**
 * Frontend Time Calculator Widget
 *
 * Renders an interactive calculator that computes available working hours
 * per year or month based on user inputs.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/#view-script
 */

import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

document.addEventListener("DOMContentLoaded", function () {
	const calculatorContainer = document.getElementById("time-calculator-widget");
	if (calculatorContainer) {
		const root = createRoot(calculatorContainer);
		// Get calculation mode from the data attribute set by PHP
		const calculationMode =
			calculatorContainer.getAttribute("data-calculation-mode") || "yearly";
		root.render(<TimeCalculatorWidget calculationMode={calculationMode} />);
	}
});

function TimeCalculatorWidget({ calculationMode }) {
	// Get current year and month for defaults
	const currentYear = new Date().getFullYear();
	const currentMonth = new Date().getMonth() + 1; // 1-based month

	// State for user inputs
	const [selectedYear, setSelectedYear] = useState(currentYear);
	const [selectedMonth, setSelectedMonth] = useState(currentMonth);
	const [workingHours, setWorkingHours] = useState(8);
	const [vacationDays, setVacationDays] = useState(
		calculationMode === "yearly" ? 20 : 2,
	); // User sets own monthly numbers

	// State for validation errors
	const [errors, setErrors] = useState({});

	// State for calculation results
	const [results, setResults] = useState(null);

	// State for user data loading
	const [userDataLoaded, setUserDataLoaded] = useState(false);

	// Generate year options (current year - 2 to current year + 5)
	const yearOptions = [];
	for (let year = currentYear - 2; year <= currentYear + 5; year++) {
		yearOptions.push(year);
	}

	// Month options
	const monthOptions = [
		{ value: 1, label: "Sausis" },
		{ value: 2, label: "Vasaris" },
		{ value: 3, label: "Kovas" },
		{ value: 4, label: "Balandis" },
		{ value: 5, label: "Gegužė" },
		{ value: 6, label: "Birželis" },
		{ value: 7, label: "Liepa" },
		{ value: 8, label: "Rugpjūtis" },
		{ value: 9, label: "Rugsėjis" },
		{ value: 10, label: "Spalis" },
		{ value: 11, label: "Lapkritis" },
		{ value: 12, label: "Gruodis" },
	];

	// Load user preferences on component mount
	useEffect(() => {
		loadUserPreferences();
	}, []);

	// Calculate total days in period (for input validation)
	const getTotalDaysInPeriod = () => {
		if (calculationMode === "yearly") {
			return selectedYear % 4 === 0 ? 366 : 365; // Leap year check
		} else {
			// Days in selected month
			return new Date(selectedYear, selectedMonth, 0).getDate();
		}
	};

	// Load user preferences from WordPress user meta
	const loadUserPreferences = async () => {
		try {
			if (typeof window.tcCalculatorAjax !== "undefined") {
				const response = await fetch(window.tcCalculatorAjax.ajaxUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: new URLSearchParams({
						action: "tc_get_user_preferences",
						nonce: window.tcCalculatorAjax.nonce,
						calculation_mode: calculationMode,
						year: selectedYear,
						month: selectedMonth,
					}),
				});

				const data = await response.json();

				if (data.success && data.data) {
					const prefs = data.data;

					// Load working hours and vacation days
					if (prefs.working_hours) {
						setWorkingHours(parseFloat(prefs.working_hours));
					}

					if (prefs.vacation_days) {
						setVacationDays(parseInt(prefs.vacation_days));
					}
				}
			}
		} catch (error) {
			console.warn("Could not load user preferences:", error);
		} finally {
			setUserDataLoaded(true);
		}
	};

	// Save user preferences to WordPress user meta
	const saveUserPreferences = async (year, month, hours, vacation) => {
		try {
			if (typeof window.tcCalculatorAjax !== "undefined") {
				const params = {
					action: "tc_save_user_preferences",
					nonce: window.tcCalculatorAjax.nonce,
					year: year,
					working_hours: hours,
					calculation_mode: calculationMode,
				};

				// Save month if in monthly mode
				if (calculationMode === "monthly") {
					params.month = month;
					params.vacation_days_monthly = vacation;
					params.working_hours_monthly = hours;
				} else {
					params.vacation_days_yearly = vacation;
					params.working_hours_yearly = hours;
				}

				await fetch(window.tcCalculatorAjax.ajaxUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: new URLSearchParams(params),
				});
			}
		} catch (error) {
			console.warn("Could not save user preferences:", error);
		}
	};

	// Lithuanian holidays (static dates)
	const getStaticHolidays = (year) => [
		new Date(year, 0, 1), // Naujieji metai
		new Date(year, 1, 16), // Lietuvos Valstybės atkūrimo diena
		new Date(year, 2, 11), // Lietuvos Nepriklausomybės atkūrimo diena
		new Date(year, 4, 1), // Tarptautinė darbininkų diena
		new Date(year, 5, 24), // Joninės (Rasos)
		new Date(year, 6, 6), // Valstybės diena
		new Date(year, 7, 15), // Žolinė
		new Date(year, 10, 1), // Visų šventųjų diena
		new Date(year, 10, 2), // Mirusiųjų atminimo diena
		new Date(year, 11, 24), // Šv. Kūčios
		new Date(year, 11, 25), // Kalėdos
		new Date(year, 11, 26), // Kalėdos (antra diena)
	];

	// Calculate Easter Monday for given year
	const calculateEasterMonday = (year) => {
		const a = year % 19;
		const b = Math.floor(year / 100);
		const c = year % 100;
		const d = Math.floor(b / 4);
		const e = b % 4;
		const f = Math.floor((b + 8) / 25);
		const g = Math.floor((b - f + 1) / 3);
		const h = (19 * a + b - d - g + 15) % 30;
		const i = Math.floor(c / 4);
		const k = c % 4;
		const l = (32 + 2 * e + 2 * i - h - k) % 7;
		const m = Math.floor((a + 11 * h + 22 * l) / 451);
		const month = Math.floor((h + l - 7 * m + 114) / 31);
		const day = ((h + l - 7 * m + 114) % 31) + 1;

		const easterSunday = new Date(year, month - 1, day);
		const easterMonday = new Date(easterSunday);
		easterMonday.setDate(easterSunday.getDate() + 1);

		return easterMonday;
	};

	// Get all holidays for a given year
	const getAllHolidays = (year) => {
		const holidays = getStaticHolidays(year);
		holidays.push(calculateEasterMonday(year));
		return holidays;
	};

	// Check if a date is a weekend (Saturday or Sunday)
	const isWeekend = (date) => {
		const day = date.getDay();
		return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
	};

	// Check if a date is a holiday
	const isHoliday = (date, holidays) => {
		return holidays.some(
			(holiday) =>
				holiday.getDate() === date.getDate() &&
				holiday.getMonth() === date.getMonth(),
		);
	};

	// Helper function to get total working days in a year
	const getAllYearWorkingDays = (year, holidays) => {
		const startDate = new Date(year, 0, 1);
		const endDate = new Date(year, 11, 31);
		let workingDays = 0;

		for (
			let d = new Date(startDate);
			d <= endDate;
			d.setDate(d.getDate() + 1)
		) {
			if (!isWeekend(d) && !isHoliday(d, holidays)) {
				workingDays++;
			}
		}

		return workingDays;
	};

	// Calculate working days and hours
	const calculateWorkingTime = () => {
		// Validation
		const newErrors = {};

		if (!yearOptions.includes(selectedYear)) {
			newErrors.year = "Prašome pasirinkti galiojantį metus";
		}

		if (
			calculationMode === "monthly" &&
			(selectedMonth < 1 || selectedMonth > 12)
		) {
			newErrors.month = "Prašome pasirinkti galiojantį mėnesį";
		}

		if (workingHours < 1 || workingHours > 8) {
			newErrors.workingHours = "Darbo valandos turi būti nuo 1 iki 8";
		}

		const maxVacation = getTotalDaysInPeriod(); // Max vacation days based on the period
		const minVacation = calculationMode === "yearly" ? 20 : 0; // Min 0 days vacation per month

		if (vacationDays < minVacation || vacationDays > maxVacation) {
			newErrors.vacationDays = `Atostogų dienos turi būti nuo ${minVacation} iki ${maxVacation}`;
		}

		setErrors(newErrors);

		// If there are validation errors, don't calculate
		if (Object.keys(newErrors).length > 0) {
			setResults(null);
			return;
		}

		// Save user preferences
		if (userDataLoaded) {
			saveUserPreferences(
				selectedYear,
				selectedMonth,
				workingHours,
				vacationDays,
			);
		}

		// Get holidays for the selected year
		const holidays = getAllHolidays(selectedYear);

		let startDate, endDate, periodName;

		if (calculationMode === "yearly") {
			startDate = new Date(selectedYear, 0, 1); // January 1st
			endDate = new Date(selectedYear, 11, 31); // December 31st
			periodName = `per ${selectedYear} metus`;
		} else {
			startDate = new Date(selectedYear, selectedMonth - 1, 1); // First day of month
			endDate = new Date(selectedYear, selectedMonth, 0); // Last day of month
			const monthName =
				monthOptions.find((m) => m.value === selectedMonth)?.label || "";
			periodName = `${selectedYear} ${monthName}`;
		}

		// Count working days (excluding weekends and holidays)
		let workingDaysCount = 0;

		for (
			let d = new Date(startDate);
			d <= endDate;
			d.setDate(d.getDate() + 1)
		) {
			if (!isWeekend(d) && !isHoliday(d, holidays)) {
				workingDaysCount++;
			}
		}

		// Calculate buffer days (always proportional from 14 annual days)
		let bufferDaysUsed;
		if (calculationMode === "yearly") {
			bufferDaysUsed = 14; // Full 14 days for yearly
		} else {
			// Proportional allocation for monthly - calculate precise partial days
			const totalYearWorkingDays = getAllYearWorkingDays(
				selectedYear,
				holidays,
			);
			const monthProportion = workingDaysCount / totalYearWorkingDays;
			bufferDaysUsed = 14 * monthProportion; // Keep as decimal for precision
		}

		// User sets their own vacation days (no proportional calculation)
		const vacationDaysUsed = vacationDays;

		// Calculate available working days
		const availableWorkingDays = Math.max(
			0,
			workingDaysCount - vacationDaysUsed - bufferDaysUsed,
		);

		// Calculate total available working hours
		const totalWorkingHours = availableWorkingDays * workingHours;

		// Count total days in period
		const totalDaysInPeriod =
			Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

		// Count weekends in period
		let weekendDays = 0;
		for (
			let d = new Date(startDate);
			d <= endDate;
			d.setDate(d.getDate() + 1)
		) {
			if (isWeekend(d)) {
				weekendDays++;
			}
		}

		// Count holidays in period
		let holidaysInPeriod = 0;
		for (
			let d = new Date(startDate);
			d <= endDate;
			d.setDate(d.getDate() + 1)
		) {
			if (isHoliday(d, holidays)) {
				holidaysInPeriod++;
			}
		}

		// Calculate breakdown values
		let monthlyHours, weeklyHours;
		if (calculationMode === "yearly") {
			monthlyHours = totalWorkingHours / 12;
			weeklyHours = monthlyHours / 4;
		} else {
			// For monthly view, show weekly average within that month
			const weeksInMonth = Math.ceil(totalDaysInPeriod / 7);
			weeklyHours = totalWorkingHours / weeksInMonth;
			monthlyHours = totalWorkingHours; // This month's total
		}

		setResults({
			calculationMode,
			periodName,
			totalDaysInPeriod,
			weekendDays,
			holidaysInPeriod,
			vacationDaysUsed,
			bufferDaysUsed: Math.round(bufferDaysUsed * 10) / 10, // Round to 1 decimal for display
			workingDaysCount,
			availableWorkingDays: Math.round(availableWorkingDays * 10) / 10, // Round to 1 decimal
			totalWorkingHours: Math.round(totalWorkingHours),
			monthlyHours: Math.round(monthlyHours),
			weeklyHours: Math.round(weeklyHours),
		});
	};

	// Recalculate when inputs change (but only after user data is loaded)
	useEffect(() => {
		if (userDataLoaded) {
			calculateWorkingTime();
		}
	}, [
		selectedYear,
		selectedMonth,
		workingHours,
		vacationDays,
		calculationMode,
		userDataLoaded,
	]);

	// Load preferences when month changes (for monthly mode)
	useEffect(() => {
		if (userDataLoaded && calculationMode === "monthly") {
			loadUserPreferences();
		}
	}, [selectedMonth]);

	// Format hours display
	const formatHours = (hours) => {
		if (hours >= 1000) {
			return `${hours.toFixed(1)} h`;
		}
		return hours + " h";
	};

	// Don't render until user data is loaded
	if (!userDataLoaded) {
		return (
			<div className="sv-table-loading">
				<div className="sv-table-loader"></div>
			</div>
		);
	}

	return (
		<div className="time-calculator">
			<div className="time-calculator-header">
				<h3>Laiko skaičiuoklė</h3>
				<p>
					{calculationMode === "yearly"
						? "Apskaičiuoja galimas darbo valandas per metus"
						: "Apskaičiuoja galimas darbo valandas per mėnesį"}
				</p>
			</div>

			<div className="time-calculator-form">
				<div className="form-row">
					<div className="form-group">
						<label htmlFor="year-select">Metai:</label>
						<select
							id="year-select"
							value={selectedYear}
							onChange={(e) => setSelectedYear(parseInt(e.target.value))}
							className={errors.year ? "error" : ""}
						>
							{yearOptions.map((year) => (
								<option key={year} value={year}>
									{year}
								</option>
							))}
						</select>
						{errors.year && (
							<span className="error-message">{errors.year}</span>
						)}
					</div>

					{calculationMode === "monthly" && (
						<div className="form-group">
							<label htmlFor="month-select">Mėnuo:</label>
							<select
								id="month-select"
								value={selectedMonth}
								onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
								className={errors.month ? "error" : ""}
							>
								{monthOptions.map((month) => (
									<option key={month.value} value={month.value}>
										{month.label}
									</option>
								))}
							</select>
							{errors.month && (
								<span className="error-message">{errors.month}</span>
							)}
						</div>
					)}

					<div className="form-group">
						<label htmlFor="working-hours">
							{calculationMode === "yearly"
								? "Darbo valandų per dieną:"
								: "Darbo valandų per dieną (šį mėnesį):"}
						</label>
						<input
							id="working-hours"
							type="number"
							min="1"
							max="8"
							step="0.5"
							value={workingHours}
							onChange={(e) => setWorkingHours(parseFloat(e.target.value))}
							className={errors.workingHours ? "error" : ""}
							placeholder={
								calculationMode === "monthly" ? "Vidutiniškai: 8h" : ""
							}
						/>
						{errors.workingHours && (
							<span className="error-message">{errors.workingHours}</span>
						)}
					</div>

					<div className="form-group">
						<label htmlFor="vacation-days">
							{calculationMode === "yearly"
								? "Atostogų (dienomis per metus):"
								: "Atostogų (dienomis per mėnesį):"}
						</label>
						<input
							id="vacation-days"
							type="number"
							min={calculationMode === "yearly" ? 20 : 0}
							max={results?.totalDaysInPeriod || getTotalDaysInPeriod()}
							value={vacationDays}
							onChange={(e) => setVacationDays(parseInt(e.target.value))}
							className={errors.vacationDays ? "error" : ""}
							placeholder={
								calculationMode === "monthly"
									? `Vidutiniškai: ${Math.round(20 / 12)}`
									: ""
							}
						/>
						{errors.vacationDays && (
							<span className="error-message">{errors.vacationDays}</span>
						)}
					</div>
				</div>
			</div>

			{results && (
				<div className="time-calculator-results">
					<div className="primary-result">
						<div className="result-value">
							<span className="hours-number">
								{formatHours(results.totalWorkingHours)}
							</span>
						</div>
						<div className="result-subtitle">
							{results.periodName} ({results.availableWorkingDays} darbo dienos)
						</div>
					</div>

					<div className="breakdown">
						<h5>Detalus skaičiavimas:</h5>
						<div className="breakdown-grid">
							<div className="breakdown-item">
								<span className="label">
									Viso {calculationMode === "yearly" ? "metais" : "mėnesyje"}:
								</span>
								<span className="value">{results.totalDaysInPeriod}</span>
							</div>
							<div className="breakdown-item">
								<span className="label">Savaitgaliai:</span>
								<span className="value negative">-{results.weekendDays}</span>
							</div>
							<div className="breakdown-item">
								<span className="label">Šventės:</span>
								<span className="value negative">
									-{results.holidaysInPeriod}
								</span>
							</div>
							<div className="breakdown-item">
								<span className="label">Atostogos:</span>
								<span className="value negative">
									-{results.vacationDaysUsed}
								</span>
							</div>
							<div className="breakdown-item">
								<span className="label">Rezervas (liga, kt.):</span>
								<span className="value negative">
									-{results.bufferDaysUsed}
								</span>
							</div>
							<div className="breakdown-item total">
								<span className="label">Darbo dienos:</span>
								<span className="value">{results.availableWorkingDays}</span>
							</div>
						</div>

						<div className="monthly-breakdown">
							{calculationMode === "yearly" ? (
								<>
									<div className="monthly-item">
										<span className="label">Vidutiniškai per mėnesį:</span>
										<span className="value">
											{formatHours(results.monthlyHours)}
										</span>
									</div>
									<div className="monthly-item">
										<span className="label">Vidutiniškai per savaitę:</span>
										<span className="value">
											{formatHours(results.weeklyHours)}
										</span>
									</div>
								</>
							) : (
								<div className="monthly-item">
									<span className="label">Vidutiniškai per savaitę:</span>
									<span className="value">
										{formatHours(results.weeklyHours)}
									</span>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
