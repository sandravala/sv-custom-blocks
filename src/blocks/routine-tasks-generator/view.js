/**
 * Use this file for JavaScript code that you want to run in the front-end
 * on posts/pages that contain this block.
 */

import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

document.addEventListener("DOMContentLoaded", function () {
	renderForm();
});

function renderForm() {
	const routineDiv = document
		.getElementById("routine-tasks-generator")
		.getElementsByClassName("input-container")[0];
	const routineContainer = document.getElementById("routine-tasks-generator");
	const assistantId = routineContainer.getAttribute("data-assistant-id");
	const root = createRoot(routineDiv);
	root.render(<RoutineTasksGenerator assistantId={assistantId} />);
}

function RoutineTasksGenerator({ assistantId }) {
	const [formData, setFormData] = useState({
		activityArea: "",
		jobTitle: "",
		additionalInfo: "",
		responsibilityLevel: ""
	});
	
	const [loading, setLoading] = useState(false);
	const [loadingSaved, setLoadingSaved] = useState(true);
	const [error, setError] = useState("");
	const [tasksData, setTasksData] = useState(null);
	const [editableTasks, setEditableTasks] = useState([]);
	const [editingTasks, setEditingTasks] = useState(new Set());
	const [saving, setSaving] = useState(false);
	const [isLoggedIn, setIsLoggedIn] = useState(false);

	// Load saved data on component mount
	useEffect(() => {
		if (assistantId) {
			loadSavedData();
		} else {
			setLoadingSaved(false);
		}
	}, [assistantId]);

	const loadSavedData = async () => {
		try {
			const response = await fetch(sv_ajax_object.ajax_url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					action: 'load_routine_tasks',
					nonce: sv_ajax_object.nonce,
					assistant_id: assistantId
				})
			});

			const result = await response.json();
			
			if (result.success) {
				setIsLoggedIn(true);
				if (result.data && result.data.input_data && result.data.response_data) {
					// Convert snake_case to camelCase for form fields
					const inputData = result.data.input_data;
					setFormData({
						activityArea: inputData.activity_area || "",
						jobTitle: inputData.job_title || "",
						additionalInfo: inputData.additional_info || "",
						responsibilityLevel: inputData.responsibility_level || ""
					});
					// Show saved response data
					setTasksData(result.data.response_data);
					// Set editable tasks from saved data
					if (result.data.response_data.responsibilities_table) {
						setEditableTasks(result.data.response_data.responsibilities_table.map((task, index) => ({
							id: index,
							responsibility: task.responsibility,
							typical_hours_per_month: task.typical_hours_per_month
						})));
					}
				}
			} else {
				// User not logged in or other error
				setIsLoggedIn(false);
			}
		} catch (err) {
			console.error('Error loading saved data:', err);
			setIsLoggedIn(false);
		} finally {
			setLoadingSaved(false);
		}
	};

	const handleInputChange = (field, value) => {
		setFormData(prev => ({
			...prev,
			[field]: value
		}));
	};

	const handleTaskChange = (taskId, field, value) => {
		setEditableTasks(prev => 
			prev.map(task => {
				if (task.id === taskId) {
					if (field === 'weekly_hours') {
						// Convert weekly hours to monthly when saving
						const weeklyHours = parseFloat(value) || 0;
						const monthlyHours = (weeklyHours * 4.33);
						return { ...task, typical_hours_per_month: monthlyHours };
					} else {
						return { ...task, [field]: value };
					}
				}
				return task;
			})
		);
	};

	const toggleEditMode = (taskId) => {
		setEditingTasks(prev => {
			const newSet = new Set(prev);
			if (newSet.has(taskId)) {
				newSet.delete(taskId);
			} else {
				newSet.add(taskId);
			}
			return newSet;
		});
	};

	const addNewTask = () => {
		const newId = Math.max(...editableTasks.map(t => t.id), -1) + 1;
		const newTask = {
			id: newId,
			responsibility: 'Nauja užduotis',
			typical_hours_per_month: 0
		};
		setEditableTasks(prev => [...prev, newTask]);
		// Automatically enter edit mode for new task
		setEditingTasks(prev => new Set([...prev, newId]));
	};

	const removeTask = (taskId) => {
		setEditableTasks(prev => prev.filter(task => task.id !== taskId));
		setEditingTasks(prev => {
			const newSet = new Set(prev);
			newSet.delete(taskId);
			return newSet;
		});
	};

	const saveTaskChanges = async () => {
		if (!assistantId || editableTasks.length === 0) return;

		setSaving(true);
		try {
			const response = await fetch(sv_ajax_object.ajax_url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					action: 'save_task_changes',
					nonce: sv_ajax_object.nonce,
					assistant_id: assistantId,
					tasks: JSON.stringify(editableTasks)
				})
			});

			const result = await response.json();
			if (!result.success) {
				console.error('Failed to save task changes:', result.data?.message);
			}
		} catch (err) {
			console.error('Error saving task changes:', err);
		} finally {
			setSaving(false);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		
		if (!formData.activityArea || !formData.jobTitle) {
			setError("Prašome užpildyti visus privalomų laukus");
			return;
		}

		if (!assistantId) {
			setError("OpenAI Assistant ID nenustatytas. Susisiekite su administratoriumi.");
			return;
		}

		setLoading(true);
		setError("");

		try {
			const response = await fetch(sv_ajax_object.ajax_url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					action: 'generate_routine_tasks',
					nonce: sv_ajax_object.nonce,
					assistant_id: assistantId,
					activity_area: formData.activityArea,
					job_title: formData.jobTitle,
					additional_info: formData.additionalInfo,
					responsibility_level: formData.responsibilityLevel
				})
			});

			const result = await response.json();
			
			if (result.success) {
				setTasksData(result.data);
				// Set editable tasks from new generated data
				if (result.data.responsibilities_table) {
					setEditableTasks(result.data.responsibilities_table.map((task, index) => ({
						id: index,
						responsibility: task.responsibility,
						typical_hours_per_month: task.typical_hours_per_month
					})));
				}
				setError("");
			} else {
				setError(result.data.message || 'Įvyko klaida generuojant užduotis');
			}
		} catch (err) {
			setError('Įvyko klaida. Bandykite dar kartą.');
		} finally {
			setLoading(false);
		}
	};

	if (loadingSaved) {
		return (
			<div className="loading-message">
				<p>Kraunami duomenys...</p>
			</div>
		);
	}

	if (!isLoggedIn) {
		return (
			<div className="login-required">
				<h4>Prisijungimas reikalingas</h4>
				<p>Turite būti prisijungę, kad galėtumėte naudoti šį įrankį.</p>
				<p><a href="/wp-login.php">Prisijungti</a> arba <a href="/wp-login.php?action=register">Registruotis</a></p>
			</div>
		);
	}

	return (
		<>
			{editableTasks.length === 0 && (
				<form onSubmit={handleSubmit} className="routine-tasks-form">
				<div className="form-group">
					<label htmlFor="activity-area">Veiklos sritis *</label>
					<textarea
						id="activity-area"
						value={formData.activityArea}
						onChange={(e) => handleInputChange('activityArea', e.target.value)}
						placeholder="Detaliai aprašykite savo veiklos sritį (pvz., komunikacija, edukacija, vadovavimas)"
						required
					/>
				</div>

				<div className="form-group">
					<label htmlFor="job-title">Pareigos *</label>
					<input
						type="text"
						id="job-title"
						value={formData.jobTitle}
						onChange={(e) => handleInputChange('jobTitle', e.target.value)}
						placeholder="Pareigos ir lygis (pvz., projektų vadovas, specialistas, jaunesnysis)"
						required
					/>
				</div>

				<div className="form-group">
					<label htmlFor="additional-info">Papildoma informacija</label>
					<textarea
						id="additional-info"
						value={formData.additionalInfo}
						onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
						placeholder="Konkrečios užduotys ar procesai, kuriuose dalyvavate"
					/>
				</div>

				<div className="form-group">
					<label htmlFor="responsibility-level">Atsakomybės lygis</label>
					<select
						id="responsibility-level"
						value={formData.responsibilityLevel}
						onChange={(e) => handleInputChange('responsibilityLevel', e.target.value)}
					>
						<option value="">Pasirinkite...</option>
						<option value="full_responsibility">Atsakingas už visą procesą</option>
						<option value="partial_responsibility">Dalyvauju procese / padėdu</option>
						<option value="team_lead">Vadovauju komandai</option>
						<option value="individual_contributor">Individualus vykdytojas</option>
					</select>
				</div>

				{error && <div className="error-message">{error}</div>}

				<button type="submit" disabled={loading} className="generate-btn">
					{loading ? 'Generuojama...' : 'Generuoti užduotis'}
				</button>
			</form>
			)}

			{editableTasks.length > 0 && (
				<div className="tasks-result">
					<h3>Užduočių sąrašas</h3>
					
					<div className="responsibilities-table">
						
						<table>
							<thead>
								<tr>
									<th>Atsakomybė</th>
									<th>Val./sav.</th>
									<th>Val./mėn.</th>
									<th>Veiksmai</th>
								</tr>
							</thead>
							<tbody>
								{editableTasks.map((task) => {
									const weeklyHours = (task.typical_hours_per_month / 4.33);
									const isEditing = editingTasks.has(task.id);
									
									return (
										<tr key={task.id}>
											<td>
												{isEditing ? (
													<input
														type="text"
														value={task.responsibility}
														onChange={(e) => handleTaskChange(task.id, 'responsibility', e.target.value)}
														className="task-input responsibility-input"
													/>
												) : (
													<span className="task-display">{task.responsibility}</span>
												)}
											</td>
											<td>
												{isEditing ? (
													<input
														type="number"
														value={weeklyHours.toFixed(1)}
														onChange={(e) => handleTaskChange(task.id, 'weekly_hours', e.target.value)}
														className="task-input hours-input"
														min="0"
														step="0.5"
													/>
												) : (
													<span className="hours-display">{weeklyHours.toFixed(1)}</span>
												)}
											</td>
											<td className="monthly-hours">{task.typical_hours_per_month.toFixed(1)}</td>
											<td>
												<div className="action-buttons">
													<button
														type="button"
														onClick={() => toggleEditMode(task.id)}
														className={`edit-task-btn ${isEditing ? 'save-mode' : 'edit-mode'}`}
														title={isEditing ? 'Išsaugoti' : 'Redaguoti'}
													>
														{isEditing ? '✓' : '✏️'}
													</button>
													<button
														type="button"
														onClick={() => removeTask(task.id)}
														className="remove-task-btn"
														title="Pašalinti užduotį"
													>
														×
													</button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
							<tfoot>
								<tr className="total-row">
									<td><strong>Iš viso:</strong></td>
									<td><strong>
										{(editableTasks.reduce((sum, task) => 
											sum + task.typical_hours_per_month, 0
										) / 4.33).toFixed(1)} val./sav.
									</strong></td>
									<td><strong>
										{editableTasks.reduce((sum, task) => 
											sum + task.typical_hours_per_month, 0
										).toFixed(1)} val./mėn.
									</strong></td>
									<td></td>
								</tr>
							</tfoot>
						</table>
						
						<div className="table-controls-bottom">
							<button type="button" onClick={addNewTask} className="add-task-btn">
								+ Pridėti užduotį
							</button>
							<button 
								type="button" 
								onClick={saveTaskChanges} 
								className="save-changes-btn"
								disabled={saving}
							>
								{saving ? 'Saugoma...' : 'Saugoti pakeitimus'}
							</button>
						</div>
					</div>
					
					{tasksData.responsibility_coverage_note && (
						<div className="coverage-note">
							<h4>Pastabos</h4>
							<p>{tasksData.responsibility_coverage_note}</p>
						</div>
					)}
				</div>
			)}
		</>
	);
}