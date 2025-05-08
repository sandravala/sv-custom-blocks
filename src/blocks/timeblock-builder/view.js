import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import TaskBlock from "./taskBlock";

document.addEventListener("DOMContentLoaded", function () {
	const container = document.getElementById("timeblock-builder-container");
	if (!container) return;

	const root = createRoot(container);
	root.render(<ScheduleBuilder />);
});

const ScheduleBuilder = () => {
	// Add styles for drag-and-drop visual feedback
	useEffect(() => {
		const style = document.createElement("style");
		style.textContent = `
    .drag-over {
      background-color: rgba(59, 130, 246, 0.1);
      border: 2px dashed #3b82f6 !important;
    }
    .drag-over-block {
      background-color: rgba(59, 130, 246, 0.1);
      border: 2px dashed #3b82f6 !important;
      opacity: 0.8;
    }
  `;
		document.head.appendChild(style);
		return () => document.head.removeChild(style);
	}, []);

	// Predefined processes with colors
	const processes = [
		{
			id: "marketingas",
			name: "Marketingas ir pardavimai",
			color: "process-7",
		},
		{ id: "gamyba", name: "Gamyba", color: "process-4" },
		{
			id: "klientuAptarnavimas",
			name: "Klientų aptarnavimas",
			color: "process-2",
		},
		{ id: "logistika", name: "Logistika", color: "process-3" },
		{ id: "versloValdymas", name: "Verslo valdymas", color: "process-1" },
		{ id: "hr", name: "HR", color: "process-5" },
		{ id: "it", name: "IT", color: "process-6" },
	];

	// Task blocks - these are the original blocks with total hours
	const [taskBlocks, setTaskBlocks] = useState([
		{
			id: 1,
			title: "Turinio planavimas",
			hours: 4,
			process: "marketingas",
			totalHours: 4,
		},
		{
			id: 2,
			title: "Konsultacija",
			hours: 2,
			process: "gamyba",
			totalHours: 2,
		},
		{
			id: 3,
			title: "Klientų užklausų atsakymas",
			hours: 6,
			process: "klientuAptarnavimas",
			totalHours: 6,
		},
		{
			id: 4,
			title: "Naujų video įrašų įkėlimas",
			hours: 1,
			process: "logistika",
			totalHours: 1,
		},
		{
			id: 5,
			title: "Marketingo strategijos peržiūra",
			hours: 3,
			process: "versloValdymas",
			totalHours: 3,
		},
		{
			id: 6,
			title: "Marketingo akademijos mokymai",
			hours: 2,
			process: "hr",
			totalHours: 2,
		},
		{
			id: 7,
			title: "Svetainės atnaujinimas",
			hours: 20,
			process: "it",
			totalHours: 20,
		},
	]);

	const [editingTask, setEditingTask] = useState(null);

	// Schedule blocks - these are instances of task blocks placed on specific days
	const [scheduleBlocks, setScheduleBlocks] = useState([]);

	// Days of the week
	const days = [
		"Pirmadienis",
		"Antradienis",
		"Trečiadienis",
		"Ketvirtadienis",
		"Penktadienis",
	];

	// Track which block is being dragged
	const [draggedBlock, setDraggedBlock] = useState(null);
	// Track if we're trying to create an alternative
	const [creatingAlternative, setCreatingAlternative] = useState(false);
	// Track the target block for an alternative
	const [alternativeTarget, setAlternativeTarget] = useState(null);

	// New task block form
	const [showForm, setShowForm] = useState(false);
	const defaultProcess = processes[0].id;
	const [newTaskBlock, setNewTaskBlock] = useState({
		title: "",
		hours: 1,
		process: defaultProcess,
	});

	// Block being edited
	const [editingBlock, setEditingBlock] = useState(null);

	// Load data from localStorage on component mount
	useEffect(() => {
		try {
			const savedTaskBlocks = localStorage.getItem("taskBlocks");
			const savedScheduleBlocks = localStorage.getItem("scheduleBlocks");

			if (savedTaskBlocks) {
				setTaskBlocks(JSON.parse(savedTaskBlocks));
			}

			if (savedScheduleBlocks) {
				setScheduleBlocks(JSON.parse(savedScheduleBlocks));
			}
		} catch (error) {
			console.error("Error loading data from localStorage:", error);
		}
	}, []);

	// Save data to localStorage when it changes
	useEffect(() => {
		try {
			localStorage.setItem("taskBlocks", JSON.stringify(taskBlocks));
		} catch (error) {
			console.error("Error saving taskBlocks to localStorage:", error);
		}
	}, [taskBlocks]);

	useEffect(() => {
		try {
			localStorage.setItem("scheduleBlocks", JSON.stringify(scheduleBlocks));
		} catch (error) {
			console.error("Error saving scheduleBlocks to localStorage:", error);
		}
	}, [scheduleBlocks]);

	// Handle block deletion - this also needs to handle alternatives
	const handleDeleteScheduleBlock = (id) => {
		const blockToDelete = scheduleBlocks.find((block) => block.id === id);

		if (!blockToDelete) {
			return;
		}

		// Check if it's a primary block with alternatives
		if (blockToDelete.day?.endsWith("-3")) {
			// If it's a primary block (without alternativeGroupId)
			if (!blockToDelete.alternativeGroupId) {
				// Find alternatives that point to this block
				const alternatives = scheduleBlocks.filter(
					(block) => block.alternativeGroupId === blockToDelete.id,
				);

				if (alternatives.length > 0) {
					// Promote the first alternative to primary
					const newPrimary = { ...alternatives[0] };
					delete newPrimary.alternativeGroupId;

					// Update other alternatives to point to the new primary
					const otherAlternatives = alternatives.slice(1);
					const updatedBlocks = scheduleBlocks
						.filter((block) => block.id !== id && block.id !== newPrimary.id)
						.map((block) => {
							if (otherAlternatives.some((alt) => alt.id === block.id)) {
								return { ...block, alternativeGroupId: newPrimary.id };
							}
							return block;
						});

					setScheduleBlocks([...updatedBlocks, newPrimary]);
					return;
				}
			}
		}

		// Simple deletion for other cases
		const updatedBlocks = scheduleBlocks.filter((block) => block.id !== id);
		setScheduleBlocks(updatedBlocks);

		// Update process hours summary after deletion
		setTimeout(() => {
			const { processHours, rowHours } = getProcessHours();
			// Process hours summary is updated via state, no need to do anything else
		}, 0);
	};

	// Calculate used hours for each task
	const getTaskUsedHours = (taskId) => {
		return scheduleBlocks
			.filter((block) => block.taskId === taskId)
			.reduce((sum, block) => sum + block.hours, 0);
	};

	// Calculate remaining hours for a task
	const getTaskRemainingHours = (taskId) => {
		const task = taskBlocks.find((task) => task.id === taskId);
		if (!task) return 0;

		const used = getTaskUsedHours(taskId);
		return task.totalHours - used;
	};

	// Calculate hours per process and row
	const getProcessHours = () => {
		// Initialize with 0 hours
		const processHours = {};
		const rowHours = {
			row1: 0, // Svarbu
			row2: 0, // Turi būti padaryta
			row3: 0, // Ne kiekvieną savaitę
		};

		// Initialize process hours
		processes.forEach((process) => {
			processHours[process.id] = 0;
		});

		// Sum up scheduled hours by process and row
		scheduleBlocks.forEach((block) => {
			// Add to process total
			if (processHours[block.process] !== undefined) {
				processHours[block.process] += block.hours;
			}

			// Add to row total
			if (block.day) {
				if (block.day.endsWith("-1")) rowHours.row1 += block.hours;
				else if (block.day.endsWith("-2")) rowHours.row2 += block.hours;
				else if (block.day.endsWith("-3")) rowHours.row3 += block.hours;
			}
		});

		return { processHours, rowHours };
	};

	// Get process color by ID
	const getProcessColor = (processId) => {
		const process = processes.find((p) => p.id === processId);
		return process ? process.color : "bg-gray-200";
	};

	// Get process name by ID
	const getProcessName = (processId) => {
		const process = processes.find((p) => p.id === processId);
		return process ? process.name : "Nenumatyta";
	};

	// Handle creating a new task block
	const handleCreateTaskBlock = () => {
		if (newTaskBlock.title && newTaskBlock.hours > 0) {
			const taskToAdd = {
				id: Date.now(),
				title: newTaskBlock.title,
				hours: parseFloat(newTaskBlock.hours),
				process: newTaskBlock.process,
				totalHours: parseFloat(newTaskBlock.hours),
			};

			setTaskBlocks([...taskBlocks, taskToAdd]);
			setNewTaskBlock({ title: "", hours: 1, process: defaultProcess });
			setShowForm(false);
		}
	};

	// Handle drag start for a task block
	const handleTaskDragStart = (e, task) => {
		const remainingHours = getTaskRemainingHours(task.id);
		if (remainingHours <= 0) {
			e.preventDefault();
			return; // Prevent dragging if no hours left
		}

		// Create a new schedule block based on the task
		const scheduleBlock = {
			taskId: task.id,
			title: task.title,
			hours: Math.min(remainingHours, task.hours), // Use either remaining hours or default task hours, whichever is smaller
			process: task.process,
		};

		e.dataTransfer.setData("text/plain", JSON.stringify(scheduleBlock));
		setDraggedBlock(scheduleBlock);
		e.dataTransfer.effectAllowed = "copy";
	};

	// Handle drag start for a schedule block (moving it)
	const handleScheduleDragStart = (e, block) => {
		e.dataTransfer.setData("text/plain", JSON.stringify(block));
		setDraggedBlock(block);
		e.dataTransfer.effectAllowed = "move";
	};

	// Handle drag over a block in the third row to create alternative
	const handleDragOverBlock = (e, existingBlock) => {
		// Only allow alternatives in row 3
		if (!existingBlock.day.endsWith("-3")) return;

		// Only allow alternatives on primary blocks (not on alternatives)
		if (existingBlock.alternativeGroupId) return;

		e.preventDefault();
		e.stopPropagation();

		// Add visual feedback
		e.currentTarget.classList.add("drag-over-block");

		setCreatingAlternative(true);
		setAlternativeTarget(existingBlock);
	};

	// Handle drop
	const handleDrop = (e, day, existingBlock = null) => {
		e.preventDefault();
		e.stopPropagation();

		// Reset visual feedback
		document.querySelectorAll(".drag-over, .drag-over-block").forEach((el) => {
			el.classList.remove("drag-over");
			el.classList.remove("drag-over-block");
		});

		let blockToUse = draggedBlock;

		// Fallback if block not found in state
		if (!blockToUse) {
			try {
				const jsonData = e.dataTransfer.getData("text/plain");
				if (jsonData?.trim()) {
					blockToUse = JSON.parse(jsonData);
				}
			} catch (err) {
				console.error("Error parsing drag data:", err);
			}
		}

		if (!blockToUse) return;

		const isDirectDropOnBlock = !!existingBlock;
		const isInRow3 = day.endsWith("-3");

		// 1. Drop directly on another block in row 3 → create alternative
		if (isDirectDropOnBlock && isInRow3) {
			if (
				blockToUse.id === existingBlock.id ||
				blockToUse.alternativeGroupId === existingBlock.id
			) {
				return; // prevent invalid alternative linking
			}

			const newAlt = {
				id: Date.now(),
				taskId: blockToUse.taskId || null,
				title: blockToUse.title,
				hours: Math.min(blockToUse.hours, existingBlock.hours),
				process: blockToUse.process,
				day: existingBlock.day,
				alternativeGroupId: existingBlock.id,
			};

			const filtered = scheduleBlocks.filter((b) => b.id !== blockToUse.id);
			setScheduleBlocks([...filtered, newAlt]);
			setDraggedBlock(null);
			return;
		}

		// 2. Drop in cell (row 1/2/3) → move or add block normally
		if (blockToUse.id) {
			const moved = {
				...blockToUse,
				day,
				alternativeGroupId: undefined, // clear if it's being treated as a normal block now
			};
			const filtered = scheduleBlocks.filter((b) => b.id !== blockToUse.id);
			setScheduleBlocks([...filtered, moved]);
		} else {
			const added = {
				id: Date.now(),
				taskId: blockToUse.taskId || null,
				title: blockToUse.title,
				hours: blockToUse.hours,
				process: blockToUse.process,
				day,
			};
			setScheduleBlocks([...scheduleBlocks, added]);
		}

		setDraggedBlock(null);
	};

	// Handle drag over
	const handleDragOver = (e) => {
		e.preventDefault();

		if (!e.currentTarget.classList.contains("drag-over")) {
			e.currentTarget.classList.add("drag-over");
		}
	};

	// Handle drag end - ensure all states are cleaned up
	const handleDragEnd = () => {
		// Clear all drag-related states
		setDraggedBlock(null);
		setCreatingAlternative(false);
		setAlternativeTarget(null);

		// Remove visual feedback
		document.querySelectorAll(".drag-over, .drag-over-block").forEach((el) => {
			el.classList.remove("drag-over");
			el.classList.remove("drag-over-block");
		});
	};

	// Start editing a schedule block
	const handleStartEdit = (block) => {
		// Make a clean copy to prevent reference issues
		setEditingBlock(JSON.parse(JSON.stringify(block)));

		// Cancel any ongoing drag operation
		setDraggedBlock(null);
		setCreatingAlternative(false);
		setAlternativeTarget(null);

		// Clean up any visual feedback
		document.querySelectorAll(".drag-over, .drag-over-block").forEach((el) => {
			el.classList.remove("drag-over");
			el.classList.remove("drag-over-block");
		});
	};

	// Save edited schedule block
	const handleSaveBlockEdit = () => {
		if (!editingBlock) return;

		// Check if this is a task-based block or a direct schedule block
		if (editingBlock.taskId) {
			const task = taskBlocks.find((t) => t.id === editingBlock.taskId);
			if (!task) return;

			// Calculate current used hours excluding this block
			const otherBlocksHours = scheduleBlocks
				.filter(
					(block) =>
						block.taskId === editingBlock.taskId &&
						block.id !== editingBlock.id,
				)
				.reduce((sum, block) => sum + block.hours, 0);

			// Calculate available hours
			const availableHours = task.totalHours - otherBlocksHours;

			// Validate new hours
			const newHours = parseFloat(editingBlock.hours) || 0;
			if (newHours <= 0) {
				alert("Valandų turi būti daugiau nei 0");
				return;
			}

			if (newHours > availableHours) {
				alert(
					`Nėra tiek valandų likusių šiai užduočiai. Liko laiko: ${availableHours.toFixed(
						1,
					)} h.`,
				);
				return;
			}
		} else {
			// For direct schedule blocks, just validate hours > 0
			const newHours = parseFloat(editingBlock.hours) || 0;
			if (newHours <= 0) {
				alert("Valandų turi būti daugiau už 0");
				return;
			}
		}

		// Check if this is part of an alternative group
		if (editingBlock.alternativeGroupId) {
			// This is an alternative - check if we need to update hours of all blocks in the group
			const primaryBlock = scheduleBlocks.find(
				(b) => b.id === editingBlock.alternativeGroupId,
			);
			const alternatives = scheduleBlocks.filter(
				(b) => b.alternativeGroupId === editingBlock.alternativeGroupId,
			);

			// If it's in row 3, alternatives can have same or fewer hours than primary
			if (editingBlock.day?.endsWith("-3")) {
				// If updating an alternative, set hours based on rules
				if (primaryBlock) {
					// Update primary block hours
					if (primaryBlock.id === editingBlock.id) {
						// We're updating the primary block
						const newHours = parseFloat(editingBlock.hours);

						// Get all alternatives for this primary
						const alternatives = scheduleBlocks.filter(
							(block) => block.alternativeGroupId === editingBlock.id,
						);

						if (alternatives.length > 0) {
							// Check if any alternative has more hours than the new primary hours
							const alternativesWithMoreHours = alternatives.filter(
								(alt) => alt.hours > newHours,
							);

							if (alternativesWithMoreHours.length > 0) {
								// Ask user if they want to update all alternatives
								if (
									confirm(
										`Some alternatives have more hours than your new value (${newHours}). Update all alternatives to match?`,
									)
								) {
									// Update all alternatives to the new primary hours
									const updatedBlocks = scheduleBlocks.map((block) => {
										if (block.alternativeGroupId === editingBlock.id) {
											return { ...block, hours: newHours };
										} else if (block.id === editingBlock.id) {
											return {
												...block,
												hours: newHours,
												title: editingBlock.title,
											};
										}
										return block;
									});

									setScheduleBlocks(updatedBlocks);
									setEditingBlock(null);
									return;
								} else {
									// Keep primary's new hours but don't change alternatives
									const updatedBlocks = scheduleBlocks.map((block) => {
										if (block.id === editingBlock.id) {
											return {
												...block,
												hours: newHours,
												title: editingBlock.title,
											};
										}
										return block;
									});

									setScheduleBlocks(updatedBlocks);
									setEditingBlock(null);
									return;
								}
							} else {
								// No alternatives have more hours, just update primary
								const updatedBlocks = scheduleBlocks.map((block) => {
									if (block.id === editingBlock.id) {
										return {
											...block,
											hours: newHours,
											title: editingBlock.title,
										};
									}
									return block;
								});

								setScheduleBlocks(updatedBlocks);
								setEditingBlock(null);
								return;
							}
						} else {
							// No alternatives, just update the primary
							const updatedBlocks = scheduleBlocks.map((block) => {
								if (block.id === editingBlock.id) {
									return {
										...block,
										hours: newHours,
										title: editingBlock.title,
									};
								}
								return block;
							});

							setScheduleBlocks(updatedBlocks);
							setEditingBlock(null);
							return;
						}
					} else {
						// We're updating an alternative
						const newHours = parseFloat(editingBlock.hours);

						// Check if hours are valid (can't be more than primary)
						if (newHours > primaryBlock.hours) {
							alert(
								`Alternative hours cannot exceed primary task hours (${primaryBlock.hours} hours)`,
							);
							return;
						}

						// Update just this alternative
						const updatedBlocks = scheduleBlocks.map((block) => {
							if (block.id === editingBlock.id) {
								return { ...block, hours: newHours, title: editingBlock.title };
							}
							return block;
						});

						setScheduleBlocks(updatedBlocks);
						setEditingBlock(null);
						return;
					}
				}
			}
		}

		// Update the block normally
		const updatedScheduleBlocks = scheduleBlocks.map((block) =>
			block.id === editingBlock.id
				? {
						...block,
						hours: parseFloat(editingBlock.hours),
						title: editingBlock.title,
				  }
				: block,
		);

		setScheduleBlocks(updatedScheduleBlocks);
		setEditingBlock(null);

		// Force update the process hours summary
		setTimeout(() => {
			// This triggers a re-calculation of process hours
			const { processHours, rowHours } = getProcessHours();
		}, 0);
	};

	// Cancel editing
	const handleCancelEdit = () => {
		setEditingBlock(null);
	};

	// Delete a task block - will also delete all associated schedule blocks
	const handleDeleteTaskBlock = (id) => {
		if (scheduleBlocks.some((block) => block.taskId === id)) {
			if (
				!window.confirm(
					"Ištrynus užduotį taip pat bus ištrinti visi žemiau suplanuoti šios užduoties laiko blokai. Ar tikrai tęsiame?",
				)
			) {
				return;
			}
		}

		setTaskBlocks(taskBlocks.filter((task) => task.id !== id));
		setScheduleBlocks(scheduleBlocks.filter((block) => block.taskId !== id));
	};

	// Clear all schedule blocks
	const handleClearSchedule = () => {
		if (
			window.confirm(
				"Ar tikrai nori ištrinti visus suplanuotus laiko blokus? Undo funkcijos nėra :)",
			)
		) {
			setScheduleBlocks([]);
		}
	};

	// Reset all data
	const handleResetAll = () => {
		if (
			window.confirm(
				"Ar tikrai nori ištrinti viską? Tai ištrins visas užduotis ir suplanuotus blokus. Undo funkcijos nėra :)",
			)
		) {
			localStorage.removeItem("taskBlocks");
			localStorage.removeItem("scheduleBlocks");

			// Reset to defaults
			setTaskBlocks([]);

			setScheduleBlocks([]);
		}
	};

	// Process hour summary
	const { processHours, rowHours } = getProcessHours();
	const totalAvailable = taskBlocks.reduce((sum, t) => sum + t.totalHours, 0);
	const totalScheduled = scheduleBlocks.reduce((sum, b) => sum + b.hours, 0);
	return (
		<div className="w-full max-w-6xl mx-auto p-4 bg-white rounded-lg shadow">
			<div className="flex justify-center items-center mb-6">
				<div>
					<div className="mb-4 text-2xl" style={{ color: "#ff5e31" }}>
						Iš viso užduočių per savaitę yra{" "}
						<span className="font-medium">{totalAvailable.toFixed(1)} h</span> ,
						suplanuota{" "}
						<span className="font-medium">{totalScheduled.toFixed(1)} h</span>
					</div>
				</div>
			</div>
			<div className="grid grid-cols-3 gap-3 mt-3">
				<div className="flex flex-wrap gap-5 p-3 rounded shadow">
					<div className="font-medium" style={{ marginRight: "2rem" }}>
						Svarbios užduotys:{" "}
					</div>
					<div className="font-bold">{rowHours.row1.toFixed(2)} h</div>
				</div>
				<div className="flex flex-wrap gap-5 p-3 rounded shadow">
					<div className="font-medium" style={{ marginRight: "2rem" }}>
						Kitos užduotys:{" "}
					</div>
					<div className="font-bold">{rowHours.row2.toFixed(1)} h</div>
				</div>
				<div className="flex flex-wrap gap-5 p-3 rounded shadow">
					<div className="font-medium" style={{ marginRight: "2rem" }}>
						Ne kiekvieną savaitę
					</div>
					<div className="font-bold">{rowHours.row3.toFixed(1)} h</div>
				</div>
			</div>
			{/* Process hours summary */}
			<div className="mb-6">
				<h3 className="text-lg font-semibold mb-3">
					Procesų / valandų suvestinė
				</h3>
				<div className="grid grid-cols-2 md:grid-cols-7 gap-3">
					{processes.map((process) => {
						const used = processHours[process.id] || 0;
						const total = taskBlocks
							.filter((task) => task.process === process.id)
							.reduce((sum, task) => sum + task.totalHours, 0);
						const percentUsed = total > 0 ? (used / total) * 100 : 0;

						return (
							<div
								key={process.id}
								className={`${total > 0 ? process.color : ""} process-card ${
									process.id
								}`}
							>
								<div className="process-card-content">
									<div className="font-medium text-sm">{process.name}</div>
									<div className="flex justify-between items-center">
										<div className="text-sm font-bold">{used.toFixed(1)} h</div>
										<div className="text-sm">iš {total.toFixed(1)}</div>
									</div>
								</div>
								<div className="progress-container">
									<div
										className="process-progress-bar"
										style={{ width: `${percentUsed}%` }}
									></div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Task blocks section */}
			<div className="mb-6">
				<div className="flex justify-between items-center mb-3">
					<h3
						className="text-lg font-semibold"
						style={{ marginTop: "0", textTransform: "uppercase" }}
					>
						Visos užduotys
					</h3>
					{!showForm && (
						<button
							onClick={() => setShowForm(!showForm)}
							className="button add-task"
						>
							Pridėti užduotį
						</button>
					)}
				</div>

				{/* New task form */}
				{showForm && (
          
					<div className="task-edit-modal mb-4 p-4 border rounded">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
							{/* Task Name */}
							<div>
								<label className="block text-sm font-medium mb-1">
									Užduoties pavadinimas
								</label>
								<input
									type="text"
									className="w-full px-3 py-2 border rounded"
									value={newTaskBlock.title}
									onChange={(e) =>
										setNewTaskBlock({ ...newTaskBlock, title: e.target.value })
									}
								/>
							</div>
							{/* Allocated Hours */}
							<div>
								<label className="block text-sm font-medium mb-1">
									Trukmė, h
								</label>
								<input
									type="number"
									min="0.25"
									step="0.25"
									className="w-full px-3 py-2 border rounded"
									value={newTaskBlock.hours}
									onChange={(e) =>
										setNewTaskBlock({
											...newTaskBlock,
											hours: parseFloat(e.target.value) || 0,
										})
									}
								/>
							</div>
							{/* Process Select */}
							<div>
								<label className="block text-sm font-medium mb-1">
									Procesas
								</label>
								<select
									className="w-full px-3 py-2 border rounded"
									value={newTaskBlock.process}
									onChange={(e) =>
										setNewTaskBlock({
											...newTaskBlock,
											process: e.target.value,
										})
									}
								>
									{processes.map((p) => (
										<option key={p.id} value={p.id}>
											{p.name}
										</option>
									))}
								</select>
							</div>
						</div>
						<button
							onClick={handleCreateTaskBlock}
							disabled={!newTaskBlock.title || newTaskBlock.hours <= 0}
							className="button add-task"
						>
							Išsaugoti
						</button>
						<button
							onClick={() => setShowForm(!showForm)}
							className="button cancel"
						>
							Atšaukti
						</button>
					</div>
				)}

				{editingTask && (
					<>
						<div className="fixed inset-0 bg-white-50 z-40" />
						<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
							<div className="task-edit-modal bg-white rounded-lg p-6 max-w-md w-full">
								<h3 className="text-lg font-semibold mb-4">
									Koreguoti užduotį
								</h3>
								<div className="space-y-4">
									<label className="block text-sm font-medium">
										Pavadinimas
									</label>
									<input
										className="w-full px-3 py-2 border rounded"
										value={editingTask.title}
										onChange={(e) =>
											setEditingTask({ ...editingTask, title: e.target.value })
										}
									/>

									<label className="block text-sm font-medium">Laikas, h</label>
									<input
										type="number"
										min="0.25"
										step="0.25"
										className="w-full px-3 py-2 border rounded"
										value={editingTask.hours}
										onChange={(e) =>
											setEditingTask({
												...editingTask,
												hours: parseFloat(e.target.value) || 0,
											})
										}
									/>

									<label className="block text-sm font-medium">Procesas</label>
									<select
										className="w-full px-3 py-2 border rounded"
										value={editingTask.process}
										onChange={(e) =>
											setEditingTask({
												...editingTask,
												process: e.target.value,
											})
										}
									>
										{processes.map((p) => (
											<option key={p.id} value={p.id}>
												{p.name}
											</option>
										))}
									</select>
								</div>

								<div className="mt-4 flex justify-end space-x-2">
									<button
										className="button cancel"
										onClick={() => setEditingTask(null)}
									>
										Atšaukti
									</button>
									<button
										className="button add-task"
										onClick={() => {
											setTaskBlocks((ts) =>
												ts.map((t) => {
													if (t.id !== editingTask.id) return t;
													return {
														...editingTask,
														totalHours: editingTask.hours, // sync totalHours
													};
												}),
											);
											setEditingTask(null);
										}}
									>
										Išsaugoti
									</button>
								</div>
							</div>
						</div>
					</>
				)}

				{/* Task blocks - draggable */}
				<div className="flex flex-wrap gap-5 mb-6">
					{taskBlocks.map((task) => {
						const remainingHours = getTaskRemainingHours(task.id);

						// Don't display tasks with 0 hours remaining
						if (remainingHours <= 0) return null;

						return (
							<TaskBlock
								key={task.id}
								id={task.id}
								taskTitle={task.title}
								remainingHours={getTaskRemainingHours(task.id)}
								processColor={getProcessColor(task.process)}
								processName={getProcessName(task.process)}
								onDragStart={(e) => handleTaskDragStart(e, task)}
								onDragEnd={handleDragEnd}
								onClick={() => setEditingTask(task)}
								onDelete={() => handleDeleteTaskBlock(task.id)}
								style={{ minWidth: "200px" }}
							/>
						);
					})}
				</div>
			</div>

			{/* Schedule grid */}
			<div className="mb-4">
				<div className="flex justify-between items-center mb-6">
					<h3 className="text-lg font-semibold mb-3">Savaitės planas</h3>
					<div className="space-x-2" style={{ textAlign: "right" }}>
						<button
							onClick={handleClearSchedule}
							className="button delete-schedule"
						>
							Išvalyti savaitės planą
						</button>
						<button onClick={handleResetAll} className="button delete-schedule">
							Ištrinti viską
						</button>
					</div>
				</div>
				<div className="overflow-x-auto">
					<table className="min-w-full border">
						<thead>
							<tr>
								<th className="border p-2 bg-gray-50 w-20"></th>
								{days.map((day) => (
									<th key={day} className="border p-2 bg-gray-100">
										{day}
										{(() => {
											// Calculate regular hours (rows 1-2)
											const regularHours = scheduleBlocks
												.filter(
													(block) =>
														block.day === `${day}-1` ||
														block.day === `${day}-2`,
												)
												.reduce((sum, block) => sum + block.hours, 0);

											// For row 3, only count one block per alternative group
											const row3Blocks = scheduleBlocks.filter(
												(block) => block.day === `${day}-3`,
											);

											// Get unique group IDs
											const processedGroups = new Set();
											let alternatingHours = 0;

											row3Blocks.forEach((block) => {
												const groupId = block.alternativeGroupId || block.id;

												// Only count the first block in each group
												if (!processedGroups.has(groupId)) {
													alternatingHours += block.hours;
													processedGroups.add(groupId);
												}
											});

											// Total is regular hours plus alternating hours
											const dayTotal = regularHours + alternatingHours;

											if (dayTotal > 0) {
												return (
													<span className="ml-2 text-sm font-normal">
														({dayTotal.toFixed(1)} h)
													</span>
												);
											}
											return null;
										})()}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{/* Row 1: Svarbu (Important) - limited to 4 hours */}
							<tr>
								<td className="border p-2 font-medium">Svarbu</td>
								{days.map((day) => {
									const dayAndRow = `${day}-1`;
									const rowBlocks = scheduleBlocks.filter(
										(block) => block.day === dayAndRow,
									);
									const totalHours = rowBlocks.reduce(
										(sum, block) => sum + block.hours,
										0,
									);

									return (
										<td
											key={dayAndRow}
											className="border p-2 align-top h-32"
											onDragOver={(e) => totalHours < 4 && handleDragOver(e)}
											onDrop={(e) => handleDrop(e, dayAndRow)}
											onDragEnter={(e) =>
												totalHours < 4 &&
												e.currentTarget.classList.add("bg-red-100")
											}
											onDragLeave={(e) =>
												e.currentTarget.classList.remove("bg-red-100")
											}
										>
											<div className="min-h-full">
												{totalHours >= 4 && (
													<div className="text-xs text-red-500 mb-1">
														Limitas: 4 h (jau priplanuota:{" "}
														{totalHours.toFixed(1)})
													</div>
												)}
												{rowBlocks
													.sort((a, b) => b.hours - a.hours)
													.map((block) => (
														<TaskBlock
															key={block.id}
															id={block.id}
															blockTitle={block.title}
															taskTitle={
																block.taskId
																	? taskBlocks.find(
																			(task) => task.id === block.taskId,
																	  )?.title
																	: block.title
															}
															processName={getProcessName(block.process)}
															hours={block.hours}
															processColor={getProcessColor(block.process)}
															onDragStart={(e) =>
																handleScheduleDragStart(e, block)
															}
															onDragEnd={handleDragEnd}
															onClick={() => handleStartEdit(block)}
															onDelete={() =>
																handleDeleteScheduleBlock(block.id)
															}
															style={{ minWidth: "200px" }}
														/>
													))}
											</div>
										</td>
									);
								})}
							</tr>

							{/* Row 2: Turi būti padaryta (Must be done) */}
							<tr>
								<td className="border p-2 font-medium">Turi būti padaryta</td>
								{days.map((day) => {
									const dayAndRow = `${day}-2`;
									return (
										<td
											key={dayAndRow}
											className="border p-2 align-top h-32"
											onDragOver={handleDragOver}
											onDrop={(e) => handleDrop(e, dayAndRow)}
											onDragEnter={(e) =>
												e.currentTarget.classList.add("bg-blue-100")
											}
											onDragLeave={(e) =>
												e.currentTarget.classList.remove("bg-blue-100")
											}
										>
											<div className="min-h-full">
												{scheduleBlocks
													.filter((block) => block.day === dayAndRow)
													.sort((a, b) => b.hours - a.hours)
													.map((block) => (
														<TaskBlock
															key={block.id}
															id={block.id}
															blockTitle={block.title}
															taskTitle={
																block.taskId
																	? taskBlocks.find(
																			(task) => task.id === block.taskId,
																	  )?.title
																	: block.title
															}
															hours={block.hours}
															processName={getProcessName(block.process)}
															processColor={getProcessColor(block.process)}
															onDragStart={(e) =>
																handleScheduleDragStart(e, block)
															}
															onDragEnd={handleDragEnd}
															onClick={() => handleStartEdit(block)}
															onDelete={() =>
																handleDeleteScheduleBlock(block.id)
															}
															style={{ minWidth: "200px" }}
														/>
													))}
											</div>
										</td>
									);
								})}
							</tr>

							{/* Row 3: Ne kiekvieną savaitę (Not every week) - with multiple alternatives */}
							<tr>
								<td className="border p-2 font-medium">Ne kiekvieną savaitę</td>
								{days.map((day) => {
									const dayAndRow = `${day}-3`;
									const rowBlocks = scheduleBlocks.filter(
										(block) => block.day === dayAndRow,
									);

									// Group blocks by their alternativeGroupId
									const groups = {};

									// First, add all primary blocks (those without alternativeGroupId)
									rowBlocks
										.filter((block) => !block.alternativeGroupId)
										.forEach((block) => {
											groups[block.id] = [block];
										});

									// Then add alternative blocks to their groups
									rowBlocks
										.filter((block) => block.alternativeGroupId)
										.forEach((block) => {
											if (groups[block.alternativeGroupId]) {
												groups[block.alternativeGroupId].push(block);
											} else {
												// If primary doesn't exist, create a group for this alternative
												groups[block.alternativeGroupId] = [block];
											}
										});

									return (
										<td
											key={dayAndRow}
											className="border p-2 align-top h-32 ne-kiekviena-savaite-cell"
											onDragOver={(e) => {
												e.preventDefault();
												e.currentTarget.classList.add("bg-green-100");
											}}
											onDragLeave={(e) => {
												e.currentTarget.classList.remove("bg-green-100");
											}}
											onDrop={(e) => handleDrop(e, dayAndRow)}
										>
											<div className="min-h-full">
												{Object.keys(groups).map((groupId) => (
													<div
														key={groupId}
														className="mb-3 pb-3 border-b border-green-200"
													>
														{/* Primary task */}
														<div className="mb-1">
															{groups[groupId][0] && (
																<TaskBlock
																	key={groups[groupId][0].id}
																	id={groups[groupId][0].id}
																	blockTitle={groups[groupId][0].title}
																	taskTitle={
																		groups[groupId][0].title.taskId
																			? taskBlocks.find(
																					(task) =>
																						task.id ===
																						groups[groupId][0].title.taskId,
																			  )?.title
																			: groups[groupId][0].title
																	}
																	hours={groups[groupId][0].hours}
																	processName={getProcessName(
																		groups[groupId][0].process,
																	)}
																	processColor={getProcessColor(
																		groups[groupId][0].process,
																	)}
																	onDragStart={(e) =>
																		handleScheduleDragStart(
																			e,
																			groups[groupId][0],
																		)
																	}
																	onDragEnd={handleDragEnd}
																	onDrop={(e) =>
																		handleDrop(
																			e,
																			groups[groupId][0].day,
																			groups[groupId][0],
																		)
																	}
																	onDragOver={(e) => e.preventDefault()}
																	onClick={() =>
																		handleStartEdit(groups[groupId][0])
																	}
																	onDelete={() =>
																		handleDeleteScheduleBlock(
																			groups[groupId][0].id,
																		)
																	}
																	style={{
																		minHeight: "fit-content",
																		position: "relative",
																		zIndex: "1",
																	}}
																/>
															)}
														</div>

														{/* Alternative tasks */}
														{groups[groupId].length > 1 && (
															<div
																className="pl-4 border-l-2 border-green-200"
																style={{ marginTop: "-10px" }}
															>
																{groups[groupId]
																	.slice(1)
																	.map((block, index) => (
																		<TaskBlock
																			key={block.id}
																			id={block.id}
																			blockTitle={block.title}
																			taskTitle={
																				block.title.taskId
																					? taskBlocks.find(
																							(task) =>
																								task.id === block.title.taskId,
																					  )?.title
																					: block.title
																			}
																			hours={block.hours}
																			processName={getProcessName(
																				block.process,
																			)}
																			processColor={getProcessColor(
																				block.process,
																			)}
																			onDragStart={(e) =>
																				handleScheduleDragStart(e, block)
																			}
																			onDragEnd={handleDragEnd}
																			onDrop={(e) =>
																				handleDrop(
																					e,
																					groups[groupId][0].day,
																					groups[groupId][0],
																				)
																			}
																			onClick={() => handleStartEdit(block)}
																			onDelete={() =>
																				handleDeleteScheduleBlock(block.id)
																			}
																			style={{
																				minHeight: "fit-content",
																				position: "relative",
																				zIndex: groups[groupId].length - index,
																				marginTop: index === 0 ? "5px" : "-8px",
																			}}
																		/>
																	))}
															</div>
														)}
													</div>
												))}

												{Object.keys(groups).length === 0 && (
													<div className="text-center text-gray-500 p-2"></div>
												)}
											</div>
										</td>
									);
								})}
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			{/* Edit schedule block modal */}
			{editingBlock && (
				<>
					<div className="fixed inset-0 bg-white-50 z-40" />
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
						<div className="task-edit-modal bg-white rounded-lg p-6 max-w-md w-full">
							<h3 className="text-lg font-semibold mb-4">
								Koreguojamas laiko blokas
							</h3>
							<div className="space-y-4">
								{editingBlock.taskId && (
									<>
										<p
											className="text-sm text-gray-600 mt-1"
											style={{ margin: "6px", color: "var(--primary)" }}
										>
											Užduotis:{" "}
											{
												taskBlocks.find((t) => t.id === editingBlock.taskId)
													?.title
											}{" "}
										</p>
										<p
											className="text-sm text-gray-600 mt-1"
											style={{ margin: "6px", color: "var(--primary)" }}
										>
											{" "}
											Procesas:{" "}
											{
												processes.find(
													(p) =>
														p.id ===
														taskBlocks.find((t) => t.id === editingBlock.taskId)
															?.process,
												)?.name
											}
										</p>
									</>
								)}
								<div>
									<label className="block text-sm font-medium mb-1">
										Laiko bloko pavadinimas (galima nurodyti jau konkrečią
										užduotį ar jos rezultatą šiai savaitei)
									</label>
									<input
										type="text"
										className="w-full px-3 py-2 border rounded"
										value={editingBlock.title}
										onChange={(e) =>
											setEditingBlock({
												...editingBlock,
												title: e.target.value,
											})
										}
									/>
								</div>
								<div>
									<label className="block text-sm font-medium mb-1">darbo laikas, h</label>
									<input
										type="number"
										min="0.25"
										step="0.25"
										className="w-full px-3 py-2 border rounded"
										value={editingBlock.hours}
										onChange={(e) =>
											setEditingBlock({
												...editingBlock,
												hours: parseFloat(e.target.value) || 0,
											})
										}
									/>
								</div>
								<div className="flex justify-end space-x-2 pt-2">
									<button onClick={handleCancelEdit} className="button cancel">
										Atšaukti
									</button>
									<button onClick={handleSaveBlockEdit} className="button">
										Išsaugoti
									</button>
								</div>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default ScheduleBuilder;
