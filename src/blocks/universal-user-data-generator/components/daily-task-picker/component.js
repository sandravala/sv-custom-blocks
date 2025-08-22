import React, { useState, useEffect, useCallback } from "react";
import { debounce, set } from "lodash";
import AccordionHeader from "@components/AccordionHeader";
import DatePicker, { registerLocale } from 'react-datepicker';
import lt from 'date-fns/locale/lt';
import { getISOWeek, getYear } from 'date-fns';

const DailyTaskPickerComponent = ({
	isLoggedIn,
	blockId,
	ajaxObject,
	onDataChange,
}) => {
	registerLocale("lt", lt);
	// State management
	const [selectedDate, setSelectedDate] = useState(getTodayString());
	const [weeklyData, setWeeklyData] = useState(null);
	const [currentWeekInfo, setCurrentWeekInfo] = useState(null);
	const [availableTodos, setAvailableTodos] = useState([]);
	const [scheduledTodos, setScheduledTodos] = useState([]);
	const [chronotypeData, setChronotypeData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [loadedData, setLoadedData] = useState({});
	const metaKeysConfig = {
		monthly_allocation: "monthly_time_allocation",
		chronotype: "chronotype",
	};

	// Unplanned task form
	const [showUnplannedForm, setShowUnplannedForm] = useState(false);
	const [unplannedTask, setUnplannedTask] = useState({ name: "", hours: 1 });

	// Get today's date string
	function getTodayString() {
		return new Date().toISOString().split("T")[0];
	}

	// Get week info from date
	const getWeekInfoFromDate = (dateString) => {
		const date = new Date(dateString);
		const year = date.getFullYear();

		// Get week number (ISO week)
  const weekNumber = getISOWeek(date);
        

		return {
			year: year.toString(),
			weekKey: `week_${weekNumber}`,
			weekNumber: weekNumber,
		};
	};

	// Load component data
	const loadComponentData = async () => {
		if (!isLoggedIn) return;

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
				const data = result.data.user_data;
				console.log("Loaded data:", data);
				setLoadedData(data || {});
				// Set monthly allocation data

				setLoading(false);
			} else {
				setError(result.data?.message || "Klaida kraunant duomenis");
				setLoading(false);
			}
		} catch (err) {
			console.error("Data load error:", err);
			setError("Nepavyko prisijungti prie serverio");
			setLoading(false);
		}
	};

	// Process weekly data for selected date
	const processWeeklyData = (allocations, dateString) => {
		const weekInfo = getWeekInfoFromDate(dateString);
		const yearData = allocations?.[weekInfo.year];
		const weekData = yearData?.[weekInfo.weekKey];

		setCurrentWeekInfo(weekInfo);
		setWeeklyData(weekData);

		if (weekData?.tasks) {
			// Get available todos (uncompleted, not scheduled)
			const available = [];
			const scheduled = [];

			weekData.tasks.forEach((task) => {
				task.todo?.forEach((todo) => {
					if (!todo.completed) {
						if (todo.scheduledDate === dateString) {
							scheduled.push({
								...todo,
								parentTask: task.task,
								taskType: task.type,
							});
						} else if (!todo.scheduledDate) {
							available.push({
								...todo,
								parentTask: task.task,
								taskType: task.type,
								taskIndex: weekData.tasks.indexOf(task),
								todoIndex: task.todo.indexOf(todo),
							});
						}
					}
				});
			});

			setAvailableTodos(available);
			setScheduledTodos(scheduled);
		} else {
			setAvailableTodos([]);
			setScheduledTodos([]);
		}
	};

	// Debounced save function
	const debouncedSave = useCallback(
		debounce(async (updatedAllocations) => {
			try {
				await fetch(udg_ajax_object.ajaxUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: new URLSearchParams({
						action: "udg_save_modified_data",
						nonce: udg_ajax_object.nonce,
						data: JSON.stringify({ monthly_allocation: updatedAllocations }),
						save_to_meta: JSON.stringify({
							monthly_allocation: "monthly_time_allocation",
						}),
					}),
				});
			} catch (err) {
				console.error("Save error:", err);
			}
		}, 1000),
		[],
	);

	// Schedule todo for today
	const scheduleTodo = (todo) => {
		if (!weeklyData) return;

		// Create updated weekly data
		const updatedWeekData = { ...weeklyData };
		const task = updatedWeekData.tasks[todo.taskIndex];
		task.todo[todo.todoIndex] = {
			...task.todo[todo.todoIndex],
			scheduledDate: selectedDate,
		};

		// Update allocations and save
		const updatedAllocations = {
			monthly_allocation: {
				...(loadedData.monthly_allocation?.monthly_allocation || {}),
				[currentWeekInfo.year]: {
					...(loadedData.monthly_allocation?.monthly_allocation?.[
						currentWeekInfo.year
					] || {}),
					[currentWeekInfo.weekKey]: updatedWeekData,
				},
			},
		};

		setWeeklyData(updatedWeekData);
		processWeeklyData(updatedAllocations, selectedDate);
		debouncedSave(updatedAllocations);
	};

	// Add unplanned todo
	const addUnplannedTodo = () => {
		if (!unplannedTask.name.trim() || !weeklyData) return;

		const updatedWeekData = { ...weeklyData };

		// Find or create NEPLANINIAI DARBAI task
		let unplannedTaskIndex = updatedWeekData.tasks.findIndex(
			(task) => task.task === "NEPLANINIAI DARBAI",
		);

		if (unplannedTaskIndex === -1) {
			// Create new unplanned task container
			updatedWeekData.tasks.push({
				task: "NEPLANINIAI DARBAI",
				hours: 0,
				type: "unplanned",
				todo: [],
			});
			unplannedTaskIndex = updatedWeekData.tasks.length - 1;
		}

		// Add new todo
		const newTodo = {
			id: `unplanned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			todo: unplannedTask.name,
			completed: false,
			taskHours: parseFloat(unplannedTask.hours),
			scheduledDate: selectedDate,
			source: "unplanned",
		};

		updatedWeekData.tasks[unplannedTaskIndex].todo.push(newTodo);

		// Update total hours for unplanned task
		updatedWeekData.tasks[unplannedTaskIndex].hours = updatedWeekData.tasks[
			unplannedTaskIndex
		].todo.reduce((sum, todo) => sum + (todo.taskHours || 0), 0);

		// Save and update state
		const updatedAllocations = {
			monthly_allocation: {
				...(loadedData.monthly_allocation?.monthly_allocation || {}),
				[currentWeekInfo.year]: {
					...(loadedData.monthly_allocation?.monthly_allocation?.[
						currentWeekInfo.year
					] || {}),
					[currentWeekInfo.weekKey]: updatedWeekData,
				},
			},
		};

		setWeeklyData(updatedWeekData);
		processWeeklyData(updatedAllocations, selectedDate);
		debouncedSave(updatedAllocations);

		// Reset form
		setUnplannedTask({ name: "", hours: 1 });
		setShowUnplannedForm(false);
	};

	// Toggle todo completion
	const toggleTodoCompletion = (todoId) => {
		if (!weeklyData) return;

		const updatedWeekData = { ...weeklyData };

		// Find and update the todo
		updatedWeekData.tasks.forEach((task) => {
			task.todo?.forEach((todo) => {
				if (todo.id === todoId) {
					todo.completed = !todo.completed;
				}
			});
		});

		// Save and update
		const updatedAllocations = {
			monthly_allocation: {
				...(loadedData.monthly_allocation?.monthly_allocation || {}),
				[currentWeekInfo.year]: {
					...(loadedData.monthly_allocation?.monthly_allocation?.[
						currentWeekInfo.year
					] || {}),
					[currentWeekInfo.weekKey]: updatedWeekData,
				},
			},
		};

		setWeeklyData(updatedWeekData);
		processWeeklyData(updatedAllocations, selectedDate);
		debouncedSave(updatedAllocations);
	};

	// Remove scheduled todo
	const removeScheduledTodo = (todoId) => {
		if (!weeklyData) return;

		const updatedWeekData = { ...weeklyData };

		// Find and remove scheduledDate
		updatedWeekData.tasks.forEach((task) => {
			task.todo?.forEach((todo) => {
				if (todo.id === todoId) {
					delete todo.scheduledDate;
				}
			});
		});

		// Save and update
		const updatedAllocations = {
			monthly_allocation: {
				...(loadedData.monthly_allocation?.monthly_allocation || {}),
				[currentWeekInfo.year]: {
					...(loadedData.monthly_allocation?.monthly_allocation?.[
						currentWeekInfo.year
					] || {}),
					[currentWeekInfo.weekKey]: updatedWeekData,
				},
			},
		};

		setWeeklyData(updatedWeekData);
		processWeeklyData(updatedAllocations, selectedDate);
		debouncedSave(updatedAllocations);
	};

	// Trigger AI suggestions
	const triggerAISuggestions = () => {
		// Set sessionStorage trigger
		sessionStorage.setItem(
			"aiBlockTrigger",
			JSON.stringify({
				date: selectedDate,
				timestamp: Date.now(),
			}),
		);

		// Dispatch event for AI block
		window.dispatchEvent(
			new CustomEvent("showAIBlock", {
				detail: { date: selectedDate },
			}),
		);
	};

	// Load data on mount and date change
	useEffect(() => {
		if (isLoggedIn) {
			loadComponentData();
		}
	}, [isLoggedIn]);

	useEffect(() => {
		if (loadedData.monthly_allocation) {
			const allocations = loadedData.monthly_allocation;
			processWeeklyData(allocations, selectedDate);
		}
	}, [selectedDate, loadedData.monthly_allocation]);

	// Handle date change
	const handleDateChange = (newDate) => {
		setSelectedDate(newDate);
	};

	const formatDateDisplay = (dateString) => {
		const date = new Date(dateString);
		const day = date.getDate();
		const month = date.getMonth() + 1;
		const year = date.getFullYear();

		return `${day}.${month}.${year}`;
		// or return `${day}/${month}/${year}`;
		// or return `${year}-${month}-${day}`;
	};

	const toggleDatePicker = () => {
		const datePicker = document.getElementById("selected-date");
		//datePicker.classList.contains("hidden") ? datePicker.classList.remove("hidden") : datePicker.classList.add("hidden");
		if (datePicker && !datePicker.classList.contains("hidden")) {
			datePicker.showPicker();
		}
	};

	if (loading) {
		return (
			<div className="daily-task-picker-loading">
				<p>Kraunami duomenys...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="daily-task-picker-error">
				<p>Klaida: {error}</p>
				<button onClick={loadComponentData}>Bandyti dar kartą</button>
			</div>
		);
	}

	return (
		<div className="daily-task-picker-component">
			{/* Energy Flow Context */}
			<AccordionHeader
				title="📊 Šiandienos energijos srautas"
				initialOpen={false}
			>
				<h3 className="sv-text-lg sv-font-semibold sv-mb-md sv-text-center">
					📊 Šiandienos energijos srautas
				</h3>

				{/* Energy Flow Chart */}
				<div className="energy-flow-chart">
					<div className="time-labels">
						<span>9 val</span>
						<span>12 val</span>
						<span>15 val</span>
						<span>18 val</span>
						<span>21 val</span>
					</div>
					<div className="energy-bars">
						<div
							className="energy-bar high"
							data-tooltip="9-11 val • 🧠 Gilioji veikla"
						></div>
						<div
							className="energy-bar high"
							data-tooltip="10-12 val • 🧠 Kūryba"
						></div>
						<div
							className="energy-bar medium"
							data-tooltip="12-13 val • 🍽️ Pietūs"
						></div>
						<div
							className="energy-bar medium"
							data-tooltip="13-15 val • 🔄 Admin darbai"
						></div>
						<div
							className="energy-bar medium"
							data-tooltip="15-16 val • 🔄 Susitikimai"
						></div>
						<div
							className="energy-bar low"
							data-tooltip="16-18 val • 💤 Lengvi darbai"
						></div>
						<div
							className="energy-bar low"
							data-tooltip="18-20 val • 💤 Planavimas"
						></div>
					</div>
				</div>

				{/* Context Summary */}
				<div className="context-summary">
					<div className="theme-day">
						<span className="theme-icon">🎯</span>
						<span className="theme-text">
							Šiandienos tema: <strong>Produktyvumo planavimas</strong>
						</span>
					</div>
					<div className="recommendations">
						<span className="rec-label">Geriausiai tinka:</span>
						<span className="rec-high">Gilioji veikla (9-11 val)</span>
						<span className="rec-medium">Admin darbai (13-16 val)</span>
						<span className="rec-low">Planavimas (18-20 val)</span>
					</div>
				</div>
			</AccordionHeader>

			{/* Add Tasks Section */}
			<div className="sv-card sv-mb-lg">
				<h3 className="sv-text-lg sv-font-semibold sv-mb-md">
					📝 Pridėti šiandienai
				</h3>

				{/* Weekly Task Pills */}
				{availableTodos.length > 0 ? (
					<div className="quick-add-section sv-mb-md">
						<p className="sv-text-sm sv-mb-sm" style={{ color: "#64748b" }}>
							📋 Iš savaitės sąrašo:
						</p>
						<div className="quick-add-pills">
							{availableTodos.slice(0, 6).map((todo) => (
								<div
									key={todo.id}
									className="quick-add-pill"
									onClick={() => scheduleTodo(todo)}
								>
									+ {todo.todo}{" "}
									<span className="task-hours">({todo.taskHours}h)</span>
								</div>
							))}
							{availableTodos.length > 6 && (
								<div className="quick-add-pill more-pill">
									Dar {availableTodos.length - 6}...
								</div>
							)}
						</div>
					</div>
				) : (
					<div className="no-weekly-tasks sv-mb-md">
						<p className="sv-text-sm" style={{ color: "#64748b" }}>
							📋 Savaitės sąraše nėra neatliktų užduočių
						</p>
					</div>
				)}

				{/* Unplanned Task Section */}
				<div className="unplanned-section">
					{!showUnplannedForm ? (
						<button
							className="unplanned-btn"
							onClick={() => setShowUnplannedForm(true)}
						>
							+ Pridėti neplanuotą užduotį
						</button>
					) : (
						<div className="unplanned-form">
							<div className="unplanned-form-content">
								<h4>Pridėti neplanuotą užduotį</h4>
								<div className="form-row">
									<input
										type="text"
										className="unplanned-task-input"
										placeholder="Užduoties pavadinimas..."
										value={unplannedTask.name}
										onChange={(e) =>
											setUnplannedTask({
												...unplannedTask,
												name: e.target.value,
											})
										}
										onKeyPress={(e) => e.key === "Enter" && addUnplannedTodo()}
									/>
									<input
										type="number"
										className="unplanned-hours-input"
										placeholder="Valandos"
										min="0.25"
										max="8"
										step="0.25"
										value={unplannedTask.hours}
										onChange={(e) =>
											setUnplannedTask({
												...unplannedTask,
												hours: e.target.value,
											})
										}
										onKeyPress={(e) => e.key === "Enter" && addUnplannedTodo()}
									/>
								</div>
								<div className="form-actions">
									<button
										className="cancel-btn"
										onClick={() => {
											setShowUnplannedForm(false);
											setUnplannedTask({ name: "", hours: 1 });
										}}
									>
										Atšaukti
									</button>
									<button
										className="add-btn"
										onClick={addUnplannedTodo}
										disabled={!unplannedTask.name.trim()}
									>
										Pridėti užduotį
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Today's Tasks List */}
			<div className="sv-card">
				<div className="tasks-list-header">
					<h3 className="sv-text-lg sv-font-semibold">Dienos užduotys</h3>
<div className="date-picker-container" >
					<DatePicker
						selected={new Date(selectedDate)}
						onChange={(date) =>
							handleDateChange(date.toISOString().split("T")[0])
						}
						locale="lt"
						dateFormat="yyyy-MM-dd"
						className="date-picker-input"
					/>
                    </div>
					{scheduledTodos.length > 0 && (
						<button
							className="ai-suggestions-btn"
							onClick={triggerAISuggestions}
						>
							🤖 Gauti AI dienotvarkės pasiūlymus
						</button>
					)}
				</div>

				{/* Task List */}
				{scheduledTodos.length > 0 ? (
					<div className="task-list">
						{scheduledTodos.map((todo) => (
							<div key={todo.id} className="task-item">
								<input
									type="checkbox"
									className="task-checkbox"
									checked={todo.completed}
									onChange={() => toggleTodoCompletion(todo.id)}
								/>
								<div className="task-content">
									<div className="task-text">
										{todo.todo}{" "}
										<span className="task-duration">({todo.taskHours}h)</span>
									</div>
									<div className="task-context">
										{todo.parentTask} •{" "}
										{todo.taskType === "routine"
											? "Rutinos"
											: "Mėnesio tikslas"}
									</div>
								</div>
								<button
									className="task-remove"
									onClick={() => removeScheduledTodo(todo.id)}
									title="Pašalinti iš šiandienos"
								>
									×
								</button>
							</div>
						))}
					</div>
				) : (
					<div className="empty-state">
						<div className="empty-state-icon">📝</div>
						<p>Šiandienai dar nepridėta užduočių.</p>
						<p style={{ fontSize: "14px", marginTop: "8px" }}>
							Pasirinkite iš savaitės sąrašo arba pridėkite neplanuotą užduotį!
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default DailyTaskPickerComponent;
