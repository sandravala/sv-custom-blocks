/**
 * Frontend Time Calculator Widget
 * 
 * Renders an interactive calculator that computes available working hours
 * per year based on user inputs for year, daily working hours, and vacation days.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/#view-script
 */

import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

document.addEventListener("DOMContentLoaded", function () {
	const calculatorContainer = document.getElementById("time-calculator-widget");
	if (calculatorContainer) {
		const root = createRoot(calculatorContainer);
		root.render(<TimeCalculatorWidget />);
	}
});

function TimeCalculatorWidget() {
	// Get current year for default and range
	const currentYear = new Date().getFullYear();
	
	// State for user inputs
	const [selectedYear, setSelectedYear] = useState(currentYear);
	const [workingHours, setWorkingHours] = useState(8);
	const [vacationDays, setVacationDays] = useState(20);
	
	// State for validation errors
	const [errors, setErrors] = useState({});
	
	// State for calculation results
	const [results, setResults] = useState(null);
	
	// Generate year options (current year - 2 to current year + 5)
	const yearOptions = [];
	for (let year = currentYear - 2; year <= currentYear + 5; year++) {
		yearOptions.push(year);
	}

	// Lithuanian holidays (static dates)
	const getStaticHolidays = (year) => [
		new Date(year, 0, 1),   // Naujieji metai
		new Date(year, 1, 16),  // Lietuvos Valstybės atkūrimo diena
		new Date(year, 2, 11),  // Lietuvos Nepriklausomybės atkūrimo diena
		new Date(year, 4, 1),   // Tarptautinė darbininkų diena
		new Date(year, 5, 24),  // Joninės (Rasos)
		new Date(year, 6, 6),   // Valstybės diena
		new Date(year, 7, 15),  // Žolinė
		new Date(year, 10, 1),  // Visų šventųjų diena
		new Date(year, 10, 2),  // Mirusiųjų atminimo diena
		new Date(year, 11, 24), // Šv. Kūčios
		new Date(year, 11, 25), // Kalėdos
		new Date(year, 11, 26)  // Kalėdos (antra diena)
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
		return holidays.some(holiday => 
			holiday.getDate() === date.getDate() && 
			holiday.getMonth() === date.getMonth()
		);
	};

	// Calculate working days and hours
	const calculateWorkingTime = () => {
		// Validation
		const newErrors = {};
		
		if (!yearOptions.includes(selectedYear)) {
			newErrors.year = 'Prašome pasirinkti galiojantį metus';
		}
		
		if (workingHours < 1 || workingHours > 8) {
			newErrors.workingHours = 'Darbo valandos turi būti nuo 1 iki 8';
		}
		
		if (vacationDays < 20 || vacationDays > 50) {
			newErrors.vacationDays = 'Atostogų dienos turi būti nuo 20 iki 50';
		}

		setErrors(newErrors);

		// If there are validation errors, don't calculate
		if (Object.keys(newErrors).length > 0) {
			setResults(null);
			return;
		}

		// Calculate total days in year
		const totalDaysInYear = selectedYear % 4 === 0 ? 366 : 365;
		
		// Get holidays for the selected year
		const holidays = getAllHolidays(selectedYear);
		
		// Count working days (excluding weekends and holidays)
		let workingDaysCount = 0;
		const startDate = new Date(selectedYear, 0, 1); // January 1st
		const endDate = new Date(selectedYear, 11, 31); // December 31st
		
		for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
			if (!isWeekend(d) && !isHoliday(d, holidays)) {
				workingDaysCount++;
			}
		}
		
		// Subtract vacation days and buffer for unforeseen circumstances
		const bufferDays = 14; // Buffer for sick days, etc.
		const availableWorkingDays = Math.max(0, workingDaysCount - vacationDays - bufferDays);
		
		// Calculate total available working hours
		const totalWorkingHours = availableWorkingDays * workingHours;
		
		// Calculate monthly breakdown
		const monthlyHours = totalWorkingHours / 12;
		
		setResults({
			totalDaysInYear,
			weekendDays: 104 + (selectedYear % 4 === 0 ? 1 : 0), // Approximate weekends
			publicHolidays: holidays.length,
			vacationDays,
			bufferDays,
			workingDaysCount,
			availableWorkingDays,
			totalWorkingHours: Math.round(totalWorkingHours),
			monthlyHours: Math.round(monthlyHours),
			weeklyHours: Math.round(monthlyHours / 4)
		});
	};

	// Recalculate when inputs change
	useEffect(() => {
		calculateWorkingTime();
	}, [selectedYear, workingHours, vacationDays]);

	// Format hours display
	const formatHours = (hours) => {
		if (hours >= 1000) {
			return `${hours.toFixed(1)} h`;
		}
		return hours.toString();
	};

	return (
		<div className="time-calculator">
			<div className="time-calculator-header">
				<h3>Laiko skaičiuoklė</h3>
				<p>Apskaičiuoja galimas darbo valandas per metus</p>
			</div>

			<div className="time-calculator-form">
				<div className="form-row">
					<div className="form-group">
						<label htmlFor="year-select">Metai:</label>
						<select
							id="year-select"
							value={selectedYear}
							onChange={(e) => setSelectedYear(parseInt(e.target.value))}
							className={errors.year ? 'error' : ''}
						>
							{yearOptions.map(year => (
								<option key={year} value={year}>{year}</option>
							))}
						</select>
						{errors.year && <span className="error-message">{errors.year}</span>}
					</div>

					<div className="form-group">
						<label htmlFor="working-hours">Darbo valandų per dieną:</label>
						<input
							id="working-hours"
							type="number"
							min="1"
							max="8"
							step="0.5"
							value={workingHours}
							onChange={(e) => setWorkingHours(parseFloat(e.target.value))}
							className={errors.workingHours ? 'error' : ''}
						/>
						{errors.workingHours && <span className="error-message">{errors.workingHours}</span>}
					</div>

					<div className="form-group">
						<label htmlFor="vacation-days">Atostogų (dienomis):</label>
						<input
							id="vacation-days"
							type="number"
							min="20"
							max="50"
							value={vacationDays}
							onChange={(e) => setVacationDays(parseInt(e.target.value))}
							className={errors.vacationDays ? 'error' : ''}
						/>
						{errors.vacationDays && <span className="error-message">{errors.vacationDays}</span>}
					</div>
				</div>
			</div>

			{results && (
				<div className="time-calculator-results">

					<div className="primary-result">
						<div className="result-value">
							<span className="hours-number">{formatHours(results.totalWorkingHours)}</span>
						</div>
						<div className="result-subtitle">
							per {selectedYear} metus ({results.availableWorkingDays} darbo dienos)
						</div>
					</div>

					<div className="breakdown">
						<h5>Detalus skaičiavimas:</h5>
						<div className="breakdown-grid">
							<div className="breakdown-item">
								<span className="label">Viso {selectedYear} metais:</span>
								<span className="value">{results.totalDaysInYear}</span>
							</div>
							<div className="breakdown-item">
								<span className="label">Savaitgaliai:</span>
								<span className="value negative">-{results.weekendDays}</span>
							</div>
							<div className="breakdown-item">
								<span className="label">Šventės:</span>
								<span className="value negative">-{results.publicHolidays}</span>
							</div>
							<div className="breakdown-item">
								<span className="label">Atostogos:</span>
								<span className="value negative">-{results.vacationDays}</span>
							</div>
							<div className="breakdown-item">
								<span className="label">Rezervas (liga, kt.):</span>
								<span className="value negative">-{results.bufferDays}</span>
							</div>
							<div className="breakdown-item total">
								<span className="label">Darbo dienos:</span>
								<span className="value">{results.availableWorkingDays}</span>
							</div>
						</div>

						<div className="monthly-breakdown">
							<div className="monthly-item">
								<span className="label">Vidutiniškai per mėnesį:</span>
								<span className="value">{formatHours(results.monthlyHours)} val.</span>
							</div>
							<div className="monthly-item">
								<span className="label">Vidutiniškai per savaitę:</span>
								<span className="value">{formatHours(results.weeklyHours)} val.</span>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}