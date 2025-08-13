/**
 * Quarter Goals Generator - Frontend JavaScript
 * Following existing React pattern from routine tasks
 */

import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

document.addEventListener("DOMContentLoaded", function () {
	renderQuarterGoals();
});

function renderQuarterGoals() {
	const containers = document.querySelectorAll("#quarter-goals-generator");
	
	containers.forEach(container => {
		const displayOptions = JSON.parse(container.dataset.displayOptions || '{}');
		const configOptions = JSON.parse(container.dataset.configOptions || '{}');
		const isLoggedIn = container.dataset.isLoggedIn === 'true';
		
		const root = createRoot(container);
		root.render(
			<QuarterGoalsGenerator 
				displayOptions={displayOptions}
				configOptions={configOptions}
				isLoggedIn={isLoggedIn}
			/>
		);
	});
}

function QuarterGoalsGenerator({ displayOptions, configOptions, isLoggedIn }) {
	const [formData, setFormData] = useState({
		currentSituation: "",
	});

	const [loading, setLoading] = useState(false);
	const [loadingSaved, setLoadingSaved] = useState(isLoggedIn); // Only load if logged in
	const [error, setError] = useState("");
	const [goalData, setGoalData] = useState(null);

	// Load saved data on component mount (only if logged in)
	useEffect(() => {
		if (isLoggedIn) {
			loadSavedData();
		}
	}, [isLoggedIn]);

	const loadSavedData = async () => {
		try {
			const response = await fetch(sv_ajax_object.ajax_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "load_quarter_goals",
					nonce: sv_ajax_object.nonce,
					assistant_id: configOptions.assistant_id
				}),
			});

			const result = await response.json();

			if (result.success && result.data && result.data.response_data) {
				setGoalData(result.data.response_data);
				if (result.data.input_data) {
					setFormData({
						currentSituation: result.data.input_data.current_situation || "",
					});
				}
			}
		} catch (err) {
			console.error("Error loading saved data:", err);
		} finally {
			setLoadingSaved(false);
		}
	};

	const handleInputChange = (field, value) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!configOptions.assistant_id) {
			setError("OpenAI Assistant ID not configured. Contact admin.");
			return;
		}

		// Get smart goal from specific element
		const smartGoalElement = document.getElementById("smart-goal-sentence");
		const smartGoal = smartGoalElement ? smartGoalElement.textContent.trim() : "";

		if (!smartGoal) {
			setError("Smart goal not found. Please ensure you have completed the SMART goal section first.");
			return;
		}

		setLoading(true);
		setError("");

		try {
			const response = await fetch(sv_ajax_object.ajax_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "generate_quarter_goals",
					nonce: sv_ajax_object.nonce,
					smart_goal: smartGoal,
					current_situation: formData.currentSituation,
					assistant_id: configOptions.assistant_id,
				}),
			});

			const result = await response.json();

			if (result.success) {
				setGoalData(result.data);
				setError("");
			} else {
				setError(result.message || "Error generating quarter goals");
				console.log("Error details:", result);
			}
		} catch (err) {
			setError("An error occurred. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const resetForm = () => {
		setGoalData(null);
		setFormData({ currentSituation: "" });
		setError("");
	};

	if (loadingSaved) {
		return (
			<div className="loading-message">
				<p>Loading data...</p>
			</div>
		);
	}

	if (!isLoggedIn) {
		return (
			<div className="login-required">
				<h4>Login Required</h4>
				<p>You must be logged in to use this tool.</p>
				<p>
					<a href="/wp-login.php">Login</a> or{" "}
					<a href="/wp-login.php?action=register">Register</a>
				</p>
			</div>
		);
	}

	return (
		<div className="quarter-goals-container">
			{!goalData ? (
				// Form Section
				!loading ? (
					<div className="quarter-goals-form-section">
						<h3>Generate Your Quarter Goals</h3>
						<form onSubmit={handleSubmit} className="quarter-goals-form">
							<div className="form-group">
								<label htmlFor="current-situation">
									Current situation description (optional):
								</label>
								<textarea
									id="current-situation"
									value={formData.currentSituation}
									onChange={(e) => handleInputChange("currentSituation", e.target.value)}
									placeholder="Describe your current situation, available resources, budget constraints, team size, etc."
									rows="4"
								/>
								<small>Your SMART goal will be automatically retrieved from the previous section.</small>
							</div>

							{error && <div className="error-message">{error}</div>}

							<button type="submit" className="generate-button">
								Generate Quarter Goals
							</button>
						</form>
					</div>
				) : (
					// Loading Animation (matching routine tasks style)
					<div className="ai-blob" style={{ "--ai-size": "220px" }}>
						<span className="ai-blob__orb" />
						<span className="ai-blob__orb ai-blob__orb--slow" />
						<span className="ai-blob__text">Generating quarter goals…</span>
					</div>
				)
			) : (
				// Results Section
				<div className="quarter-goals-results">
					<div className="results-header">
						<h3>Your Quarter Goals Plan</h3>
						<button onClick={resetForm} className="edit-button">
							Generate New Goals
						</button>
					</div>

					<div className="quarter-goals-content">
						{/* Render sections based on display options */}
						{displayOptions.show_smart_goal && goalData.smart_goal && (
							<QuarterSection title="SMART Goal">
								<p>{goalData.smart_goal}</p>
							</QuarterSection>
						)}

						{displayOptions.show_timeframe && goalData.timeframe && (
							<QuarterSection title="Timeframe">
								<p><strong>Start:</strong> {goalData.timeframe.start}</p>
								<p><strong>End:</strong> {goalData.timeframe.end}</p>
							</QuarterSection>
						)}

						{displayOptions.show_assumptions && goalData.assumptions && (
							<QuarterSection title="Assumptions">
								<ul>
									{goalData.assumptions.map((assumption, index) => (
										<li key={index}>{assumption}</li>
									))}
								</ul>
							</QuarterSection>
						)}

						{displayOptions.show_resources && goalData.required_resources && (
							<QuarterSection title="Required Resources">
								<div className="resources-list">
									{goalData.required_resources.map((resource, index) => (
										<div key={index} className="resource-item">
											<span className="resource-name">{resource.resource}</span>
											<span className={`resource-status status-${resource.status.replace(/\s+/g, '-').toLowerCase()}`}>
												{resource.status}
											</span>
										</div>
									))}
								</div>
							</QuarterSection>
						)}

						{displayOptions.show_risks && goalData.risks && (
							<QuarterSection title="Risks & Mitigations">
								<div className="risks-list">
									{goalData.risks.map((risk, index) => (
										<div key={index} className="risk-item">
											<div className="risk-header">
												<h5>{risk.risk}</h5>
												<div className="risk-indicators">
													<span className={`impact impact-${risk.impact}`}>
														Impact: {risk.impact}
													</span>
													<span className={`likelihood likelihood-${risk.likelihood}`}>
														Likelihood: {risk.likelihood}
													</span>
												</div>
											</div>
											<div className="risk-mitigation">
												<strong>Mitigation:</strong> {risk.mitigation}
											</div>
										</div>
									))}
								</div>
							</QuarterSection>
						)}

						{displayOptions.show_kpis && goalData.kpi_summary && (
							<QuarterSection title="Key Performance Indicators">
								<div className="kpi-list">
									{goalData.kpi_summary.map((kpi, index) => (
										<div key={index} className="kpi-item">
											<h5>{kpi.kpi}</h5>
											<p>{kpi.explanation}</p>
										</div>
									))}
								</div>
							</QuarterSection>
						)}

						{displayOptions.show_stages && goalData.stages && (
							<QuarterSection title="Quarterly Stages">
								<div className="stages-list">
									{Object.entries(goalData.stages).map(([quarter, stage]) => (
										<div key={quarter} className="stage-item">
											<h5>{quarter}</h5>
											<div className="stage-content">
												<div><strong>Goal:</strong> {stage.intermediate_goal}</div>
												<div>
													<strong>Outcomes:</strong>
													<ul>
														{stage.outcomes.map((outcome, index) => (
															<li key={index}>{outcome}</li>
														))}
													</ul>
												</div>
												<div>
													<strong>KPIs:</strong>
													<ul>
														{stage.kpis.map((kpi, index) => (
															<li key={index}>{kpi}</li>
														))}
													</ul>
												</div>
											</div>
										</div>
									))}
								</div>
							</QuarterSection>
						)}

						{displayOptions.show_actions && goalData.actions && (
							<ActionsSection 
								actions={goalData.actions}
								configOptions={configOptions}
								setGoalData={setGoalData}
							/>
						)}

						{displayOptions.show_totals && goalData.totals && (
							<QuarterSection title="Time Investment Summary">
								<div className="totals-content">
									<div className="total-item">
										<span className="total-label">Base Hours:</span>
										<span className="total-value">{goalData.totals.base}</span>
									</div>
									<div className="total-item">
										<span className="total-label">Buffer Hours:</span>
										<span className="total-value">{goalData.totals.buffer}</span>
									</div>
									<div className="total-item total-final">
										<span className="total-label">Total Hours (with buffer):</span>
										<span className="total-value">{goalData.totals.with_buffer}</span>
									</div>
								</div>
							</QuarterSection>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

// Helper Components
function QuarterSection({ title, children }) {
	return (
		<div className="quarter-section">
			<h4>{title}</h4>
			<div className="section-content">
				{children}
			</div>
		</div>
	);
}

function ActionsSection({ actions, configOptions, setGoalData }) {
	const [editingActions, setEditingActions] = useState({});

	const groupedActions = configOptions.group_actions_by_quarter
		? groupActionsByQuarter(actions)
		: { 'All Actions': actions };

	const handleSaveActions = async (quarter) => {
		const actionsToSave = editingActions[quarter];
		if (!actionsToSave) return;

		// You'll implement this AJAX call
		console.log('Saving actions for', quarter, actionsToSave);
		
		// Clear editing state
		setEditingActions(prev => ({
			...prev,
			[quarter]: null
		}));
	};

	const updateAction = (quarter, actionIndex, field, value) => {
		setEditingActions(prev => {
			const quarterActions = prev[quarter] || [...(groupedActions[quarter] || [])];
			const updatedActions = [...quarterActions];
			updatedActions[actionIndex] = {
				...updatedActions[actionIndex],
				[field]: value
			};
			
			return {
				...prev,
				[quarter]: updatedActions
			};
		});
	};

	const deleteAction = (quarter, actionIndex) => {
		if (!confirm('Are you sure you want to delete this action?')) return;
		
		setEditingActions(prev => {
			const quarterActions = prev[quarter] || [...(groupedActions[quarter] || [])];
			const updatedActions = quarterActions.filter((_, index) => index !== actionIndex);
			
			return {
				...prev,
				[quarter]: updatedActions
			};
		});
	};

	const addAction = (quarter) => {
		const newAction = {
			area: quarter,
			description: 'New action item',
			hours_estimate: {
				base_hours: 5,
				buffer_pct: 0.2,
				total_hours: 6
			},
			dependencies: []
		};

		setEditingActions(prev => {
			const quarterActions = prev[quarter] || [...(groupedActions[quarter] || [])];
			
			return {
				...prev,
				[quarter]: [...quarterActions, newAction]
			};
		});
	};

	return (
		<QuarterSection title="Action Items">
			<div className="actions-content">
				{Object.entries(groupedActions).map(([quarter, quarterActions]) => {
					const isEditing = editingActions[quarter];
					const actionsToShow = isEditing || quarterActions;

					return (
						<div key={quarter} className="quarter-actions">
							{configOptions.group_actions_by_quarter && <h5>{quarter}</h5>}
							
							<div className="actions-list">
								{actionsToShow.map((action, index) => (
									<ActionItem
										key={index}
										action={action}
										actionIndex={index}
										quarter={quarter}
										isEditing={!!isEditing}
										configOptions={configOptions}
										onUpdateAction={updateAction}
										onDeleteAction={deleteAction}
									/>
								))}
							</div>

							{configOptions.allow_editing && (
								<div className="action-controls">
									<button 
										onClick={() => addAction(quarter)}
										className="add-action-btn"
									>
										Add Action {configOptions.group_actions_by_quarter ? `to ${quarter}` : ''}
									</button>
									
									{isEditing && (
										<button 
											onClick={() => handleSaveActions(quarter)}
											className="save-actions-btn"
										>
											Save Changes
										</button>
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</QuarterSection>
	);
}

function ActionItem({ action, actionIndex, quarter, isEditing, configOptions, onUpdateAction, onDeleteAction }) {
	if (!configOptions.allow_editing) {
		return (
			<div className="action-item">
				<div className="action-content">
					<span className="action-description">{action.description}</span>
					<span className="action-hours">{action.hours_estimate.total_hours} hours</span>
				</div>
				{action.dependencies && action.dependencies.length > 0 && (
					<div className="action-dependencies">
						<small><strong>Dependencies:</strong> {action.dependencies.join(', ')}</small>
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="action-item">
			<div className="action-content">
				<input
					type="text"
					value={action.description}
					onChange={(e) => onUpdateAction(quarter, actionIndex, 'description', e.target.value)}
					className="action-description-input"
					placeholder="Action description"
				/>
				
				<div className="action-hours">
					<input
						type="number"
						value={action.hours_estimate.total_hours}
						onChange={(e) => onUpdateAction(quarter, actionIndex, 'hours_estimate', {
							...action.hours_estimate,
							total_hours: parseInt(e.target.value) || 0
						})}
						className="action-hours-input"
						min="0"
					/>
					<span className="hours-label">hours</span>
				</div>

				<button
					onClick={() => onDeleteAction(quarter, actionIndex)}
					className="delete-action-btn"
					title="Delete action"
				>
					×
				</button>
			</div>

			{action.dependencies && action.dependencies.length > 0 && (
				<div className="action-dependencies">
					<small><strong>Dependencies:</strong> {action.dependencies.join(', ')}</small>
				</div>
			)}
		</div>
	);
}

// Helper function
function groupActionsByQuarter(actions) {
	const grouped = { Q1: [], Q2: [], Q3: [], Q4: [] };
	actions.forEach(action => {
		if (grouped[action.area]) {
			grouped[action.area].push(action);
		}
	});
	return grouped;
}