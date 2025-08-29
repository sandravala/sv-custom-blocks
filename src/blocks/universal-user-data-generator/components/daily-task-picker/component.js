import React, { useState, useEffect, useCallback } from "react";
import { debounce, set } from "lodash";
import AccordionHeader from "@components/AccordionHeader";
import EnergyFlowComponent from "@components/EnergyFlowComponent";
import DatePicker, { registerLocale } from "react-datepicker";
import lt from "date-fns/locale/lt";
import { getISOWeek, getYear } from "date-fns";

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
	const [isDirty, setIsDirty] = useState(false);
	const [scheduledTodos, setScheduledTodos] = useState([]);
	const [chronotypeData, setChronotypeData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [loadedData, setLoadedData] = useState({});
	const [monthlyAllocation, setMonthlyAllocation] = useState({});
	const metaKeysConfig = {
		monthly_allocation: "monthly_time_allocation",
		chronotype: "chronotype",
	};

	// Unplanned task form
	const [showUnplannedForm, setShowUnplannedForm] = useState(false);
	const [unplannedTodo, setUnplannedTodo] = useState({
		todo: "",
		taskHours: 0,
		source: "unplanned",
	});

	// Load data on mount and date change
	useEffect(() => {
		if (isLoggedIn) {
			loadComponentData();
		}
	}, [isLoggedIn]);

	useEffect(() => {
		if (loadedData.monthly_allocation) {
			const allocations = loadedData.monthly_allocation;
			const weekInfo = getWeekInfoFromDate(selectedDate);
			const yearData = allocations?.[weekInfo.year];
			const weekData = yearData?.[weekInfo.weekKey];

			setCurrentWeekInfo(weekInfo);
			setWeeklyData(weekData);
		}
		if (loadedData.chronotype) {
			setChronotypeData(loadedData.chronotype);
		}
	}, [selectedDate, loadedData]);

	useEffect(() => {
		if (weeklyData && currentWeekInfo && isDirty) {
			debouncedSave(weeklyData, currentWeekInfo, loadedData.monthly_allocation);
		}
	}, [isDirty]);

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

	// Debounced save function
	const debouncedSave = useCallback(
		debounce(async (weeklyData, currentWeekInfo, allocation) => {
			const monthlyAllocation = { ...allocation };
			monthlyAllocation[currentWeekInfo.year] = {
				...allocation[currentWeekInfo.year], // Previous year data
				[currentWeekInfo.weekKey]: weeklyData,
			};

			const updatedAllocations = { monthly_allocation: monthlyAllocation };
			try {
				await fetch(ajaxObject.ajax_url, {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: new URLSearchParams({
						action: "udg_save_modified_data",
						nonce: ajaxObject.nonce,
						data: JSON.stringify(updatedAllocations),
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
	const scheduleTodo = (taskIndex, todoIndex) => {
		if (!weeklyData) return;
		// Create updated weekly data
		const updatedWeekData = { ...weeklyData };

		updatedWeekData.tasks[taskIndex].todo[todoIndex].scheduledDate =
			selectedDate;

		setLoadedData((prevData) => ({
			...prevData,
			monthly_allocation: {
				...(prevData.monthly_allocation || {}),
				[currentWeekInfo.year]: {
					...(prevData.monthly_allocation?.[currentWeekInfo.year] || {}),
					[currentWeekInfo.weekKey]: updatedWeekData,
				},
			},
		}));

		setWeeklyData(updatedWeekData);
		setIsDirty(true);
		//debouncedSave(updatedAllocations);
	};

	// Add unplanned todo
	const addUnplannedTodo = () => {
		if (!unplannedTodo.todo.trim() || !weeklyData) return;

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
			...unplannedTodo,
			id: `unplanned_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
		};

		updatedWeekData.tasks[unplannedTaskIndex].todo.push(newTodo);

		// Update total hours for unplanned task
		updatedWeekData.tasks[unplannedTaskIndex].hours = updatedWeekData.tasks[
			unplannedTaskIndex
		].todo.reduce((sum, todo) => sum + (todo.taskHours || 0), 0);

		setWeeklyData(updatedWeekData);
		setIsDirty(true);
		//debouncedSave(updatedAllocations);

		// Reset form
		setUnplannedTodo({ todo: "", taskHours: 1, source: "unplanned" });
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

		setWeeklyData(updatedWeekData);
		setIsDirty(true);
		//debouncedSave(updatedAllocations);
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

		setWeeklyData(updatedWeekData);
		setIsDirty(true);
		//debouncedSave(updatedAllocations);
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

	// Handle date change
	const handleDateChange = (newDate) => {
		setSelectedDate(newDate);
	};

	if (loading) {
		return (
			<div className="daily-task-picker-loading">
				<div className="sv-table-loading">
			<div className="sv-table-loader"></div>
		</div>
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

			{chronotypeData && (
				<EnergyFlowComponent
					chronotypeData={chronotypeData}
					className="sv-mb-lg"
				/>
			)}

			{/* Add Tasks Section */}
			<div className="sv-card sv-mb-lg">
				{/* Weekly Task Pills */}
				{weeklyData &&
				weeklyData.tasks?.flatMap((task) =>
					task.todo?.filter((todo) => !todo.completed && !todo.scheduledDate),
				).length > 0 ? (
					<div className="quick-add-section sv-mb-md">
						<p className="sv-text-sm sv-mb-sm" style={{ color: "#64748b" }}>
							Iš savaitės sąrašo:
						</p>
						<div className="quick-add-pills">
							{weeklyData.tasks.flatMap((task, taskIndex) =>
								task.todo
									?.filter((todo) => !todo.completed && !todo.scheduledDate)
									.slice(0, 6)
									.map((todo, todoIndex) => (
										<div
											key={todo.id}
											className="quick-add-pill"
											onClick={() => scheduleTodo(taskIndex, todoIndex)}
										>
											+ {todo.todo}{" "}
											<span className="task-hours">({todo.taskHours}h)</span>
										</div>
									)),
							)}
						</div>
					</div>
				) : (
					<div className="no-weekly-tasks sv-mb-md">
						<p className="sv-text-sm" style={{ color: "#64748b" }}>
							Šios savaitės sąraše užduočių nėra
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
										value={unplannedTodo.todo}
										onChange={(e) =>
											setUnplannedTodo({
												...unplannedTodo,
												todo: e.target.value,
											})
										}
									/>
									<input
										type="number"
										className="unplanned-hours-input"
										placeholder="Valandos"
										min="0.25"
										max="8"
										step="0.25"
										value={unplannedTodo.taskHours}
										onChange={(e) =>
											setUnplannedTodo({
												...unplannedTodo,
												taskHours: e.target.value,
											})
										}
									/>
								</div>
								<div className="form-actions">
									<button
										className="cancel-btn"
										onClick={() => {
											setShowUnplannedForm(false);
											setUnplannedTodo({ todo: "", taskHours: 1 });
										}}
									>
										Atšaukti
									</button>
									<button
										className="add-btn"
										onClick={addUnplannedTodo}
										disabled={!unplannedTodo.todo.trim()}
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
					<div className="date-picker-container">
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
					{/* {weeklyData &&
						weeklyData.tasks?.flatMap((task) =>
							task.todo?.filter((todo) => todo.scheduledDate),
						).length > 0 && (
							<button
								className="ai-suggestions-btn"
								onClick={triggerAISuggestions}
							>
							Gauti AI dienotvarkės pasiūlymus
							</button>
						)} */}
				</div>

				{/* Task List */}
				{weeklyData?.tasks?.some((task) =>
					task.todo?.some((todo) => todo.scheduledDate === selectedDate),
				) ? (
					<div className="task-list">
						{weeklyData.tasks.map((task) =>
							task.todo
								?.filter((todo) => todo.scheduledDate === selectedDate)
								.map((todo) => (
									<div key={todo.id} className="task-item">
										<input
											type="checkbox"
											className="task-checkbox"
											checked={todo.completed}
											onChange={() => toggleTodoCompletion(todo.id)} // Use todo.id instead
										/>
										<div className="task-content">
											<div className="task-text">
												{todo.todo}{" "}
												<span className="task-duration">
													({todo.taskHours}h)
												</span>
											</div>
											<div className="task-context">
												{task.task} •{" "}
												{task.type === "routine"
													? "Rutininė"
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
								)),
						)}
					</div>
				) : (
					<div className="empty-state">
						<div className="empty-state-icon">📝</div>
						<p>Šiandienai dar nepridėta užduočių.</p>
						<p style={{ fontSize: "14px", marginTop: "8px" }}>
							Pasirink iš savaitės sąrašo arba pridėk neplanuotą užduotį!
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default DailyTaskPickerComponent;
