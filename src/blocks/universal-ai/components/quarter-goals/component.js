/**
 * Quarterly Goals Generator - Frontend JavaScript
 * Updated to handle login status from render.php
 */

import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import EditableTable from "@components/EditableTable";
import FormRenderer from "@components/FormRenderer";
import AccordionHeader from "@components/AccordionHeader";

export default function QuarterlyGoalsComponent({
	blockId,
	postId,
	assistantId,
	useResponsesApi,
	isLoggedIn,
	ajaxObject,
	componentName,
	canUseAiAgain,
}) {
	// Create schema name
	const schemaName = String(componentName)
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, "_");

	const saveToMeta = {
		goal_assumptions: "assumptions",
		goal_required_resources: "required_resources",
		goal_risks: "risks",
		goal_stages: "stages",
		goal_actions: "actions",
	};

	const [loading, setLoading] = useState(false);
	const [loadingSaved, setLoadingSaved] = useState(false); // Only load if logged in
	const [inputDataLoaded, setInputDataLoaded] = useState(false);
	const [error, setError] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [goalData, setGoalData] = useState({
		actions: [],
		assumptions: [],
		required_resources: [],
		risks: [],
		stages: [],
	});

	const [formData, setFormData] = useState({
		smart_goal: "",
		current_situation: "",
	});

	const [groupSubtitles, setGroupSubtitles] = useState({});

	const quarterlyGoalsColumns = [
		{
			key: "description",
			label: "Tarpiniai tikslai / veiksmai",
			type: "textarea",
			flex: "flex-4",
			placeholder: "",
			rows: 1,
		},
		{
			key: "hours_estimate",
			label: "Numatoma trukmė, d/h",
			type: "number",
			flex: "flex-1",
			placeholder: "",
		},
	];

	const tableConfig = {
		title: "",
		allowEditing: true,
		allowAddRemove: true,
		grouped: true,
		groupBy: "area",
		groupSubtitle: groupSubtitles,
		showActions: true,
		actionsLabel: "Veiksmai",
		showCounter: false,
		emptyStateText: "Dar nėra ketvirtinių tikslų!",
		emptyStateSubtext:
			"Paprašyk DI asistento pagalbos (forma viršuje), ir tarpiniai tikslai bus sugeneruoti",
		saveButtonText: "Išsaugoti",
		editButtonText: "✎",
		deleteConfirmText: "Ar tikrai nori ištrinti šį veiksmą?",
		showTotals: true,
		totalsConfig: {
			label: "VISO",
			position: "bottom",
			fields: {
				description: "iš viso:",
				hours_estimate: "sum",
			},
		},
	};

	const formConfig = {
		title: "", // Form header title (optional)
		submitButtonText: "Generuoti", // Submit button text
		successMessage: "Thank you!", // Message shown after successful submission
		showRequiredNote: false, // Show "Fields marked with * are required"
		submittingText: "DI asistentas dirba...", // kas rodoma ai blob'e
		submitAnotherResponseText:
			"Paprašyk, kad DI asistentas sugeneruotų naujus tarpinius tikslus",
		canSubmitAnotherResponse: true, // Allow submitting another response
	};

	const formFields = [
		{
			name: "current_situation",
			label: "Esama situacija",
			type: "textarea",
			placeholder:
				"Aprašyk esamą situaciją kuo išsamiau: kokius išteklius turi, kokie yra apribojimai, ką jau galbūt atlikai ir pan. - kuo aiškiau apibūdinsi, tuo geresnius tarpinius tikslus asistentas pasiūlys.",
			required: false,
			rows: 3,
			key: "current_situation",
		},
	];

	const quarterTitles = {
		Q1: "I ketv.",
		Q2: "II ketv.",
		Q3: "III ketv.",
		Q4: "IV ketv.",
	};

	// Load saved data on component mount (only if logged in)
	useEffect(() => {
		if (
			isLoggedIn &&
			((useResponsesApi && blockId) || (!useResponsesApi && assistantId))
		) {
			loadSavedData();
		}
	}, [isLoggedIn, assistantId, blockId, useResponsesApi]);

	useEffect(() => {
		// Only process if we have stages data
		if (goalData.stages && Object.keys(goalData.stages).length > 0) {
			// Build complete object in one operation
			const subtitles = Object.entries(goalData.stages).reduce(
				(acc, [quarter, data]) => {
					const quarterTitle = quarterTitles[quarter];
					const outcomes = data.outcomes ? data.outcomes.join(" | ") : "";
					acc[quarterTitle] = outcomes;
					return acc;
				},
				{},
			);

			setGroupSubtitles(subtitles);
		}
	}, [goalData.stages]); // Only depend on the actual data

	const getQuarterInfo = (area) => {
		// Check if area is already a quarter key (Q1, Q2, etc.)
		if (quarterTitles[area]) {
			return {
				key: area,
				title: quarterTitles[area],
			};
		}

		const areaSubstring = area.replace(" ketv: ", " ketv.");

		// Check if area is already a formatted title
		const foundKey = Object.entries(quarterTitles).find(([key, title]) =>
			title.includes(areaSubstring),
		);
		if (foundKey) {
			return {
				key: foundKey[0],
				title: foundKey[1],
			};
		}

		// Fallback - area doesn't match known patterns
		return {
			key: area,
			title: area,
		};
	};

	const formatActionItems = (actions) => {
		let total_hours = 0;

		// Create a counter for each group/area
		const groupCounters = {};

		return actions.map((action, index) => {
			// replace hours_estimate object with total_hours property if hours_estimate is an object
			if (typeof action.hours_estimate === "object") {
				action.hours_estimate = action.hours_estimate.total_hours;
			}
			total_hours += action.hours_estimate;
			action.dependencies = Array.isArray(action.dependencies)
				? action.dependencies.join(", ")
				: action.dependencies;

			// Get the original area before transformation (Q1, Q2, Q3, Q4)
			const quarterMeta = getQuarterInfo(action.area);
			action.quarter = quarterMeta.key;

			action.area = quarterMeta.title;

			// Initialize counter for this group if it doesn't exist
			if (!groupCounters[quarterMeta.key]) {
				groupCounters[quarterMeta.key] = 0;
			}

			// Increment counter for this group
			groupCounters[quarterMeta.key]++;

			// Set ID based on group and position within group
			action.id = `${quarterMeta.key}_action_${groupCounters[quarterMeta.key]}`;

			return action;
		});
	};
	const loadSavedData = async () => {
		//JSON.stringify(["meta_key1", "meta_key2"]); - čia kokių ieškoti meta keys vartotojo meta
		try {
			const params = {
				action: "load_saved_data",
				nonce: ajaxObject.nonce,
				meta_keys: JSON.stringify(["smart_goal", ...Object.keys(saveToMeta)]),
				can_use_ai_again: canUseAiAgain,
			};

			// Use appropriate parameter based on API type
			if (useResponsesApi) params.block_id = blockId;
			else params.assistant_id = assistantId;

			const response = await fetch(ajaxObject.ajax_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams(params),
			});

			const result = await response.json();

			if (result.success) {
				setFormData((prev) => ({ ...prev, ...result.data.input_data }));

				const actions = formatActionItems(result.data.user_data.goal_actions);

				setGoalData({
					actions: actions,
					assumptions: result.data.user_data.goal_assumptions,
					required_resources: result.data.user_data.goal_required_resources,
					risks: result.data.user_data.goal_risks,
					stages: result.data.user_data.goal_stages,
				});
			} else {
				// Error loading data (could be no data exists, which is fine)
				console.log("No saved data found or error:", result.data?.message);
			}
		} catch (err) {
			console.error("Error loading saved data:", err);
			console.log(err);
		} finally {
			setLoadingSaved(true);
		}
	};

	const handleTableChange = (tableData) => {
		const sortedData = tableData.sort((a, b) => {
			const quarterOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
			return quarterOrder[a.quarter] - quarterOrder[b.quarter];
		});
		//update goal data actions value
		setGoalData((prev) => ({ ...prev, actions: sortedData }));
	};

	const handleSubmit = async (inputData, saveKey) => {
		if (!formData.smart_goal) {
			setError("Tu dar nesuformulavai tikslo pagal SMART metodiką!");
			return;
		}

		if (useResponsesApi && !blockId) {
			setError("Block configuration not found. Please refresh the page.");
			return;
		} else if (!useResponsesApi && !assistantId) {
			setError(
				"OpenAI Assistant ID nenustatytas. Susisiekite su administratoriumi.",
			);
			return;
		}

		setLoading(true);
		setError("");

		const userInput = {
			...formData,
			...inputData,
		};

		try {
			const params = {
				action: "generate_ai_data",
				nonce: ajaxObject.nonce,
				form_data: JSON.stringify(userInput),
				schema_name: schemaName,
				save_to_meta: JSON.stringify(saveToMeta),
				use_responses_api: useResponsesApi,
			};

			// Use appropriate parameter based on API type
			if (useResponsesApi) {
				params.block_id = blockId;
			} else {
				params.assistant_id = assistantId;
			}

			const response = await fetch(ajaxObject.ajax_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams(params),
			});

			const result = await response.json();

			if (result.success) {
				setSubmitted(true);

				const resultExample = {
					meta: {
						version: "1.0",
						skill_level_assumption: "vidutinis",
						default_buffer_pct: 0.2,
						locale: "lt-LT",
					},
					year: 2023,
					smart_goal:
						"Aš noriu užbaigti projektą X per du mėnesius, nes tai pagerins mano karjeros galimybes ir leis įgyti naujų įgūdžių, kuratoriu akivaizdoje.",
					timeframe: {
						start: "2023-01-01",
						end: "2023-12-31",
					},
					assumptions: [
						"Projektas X jau pradėtas ir yra apibrėžtas pagrindinis tikslas.",
						"Turimas bendradarbiavimas su kuratoriumi jau per pirmąjį mėnesį.",
						"Reikalingi ištekliai, pavyzdžiui, programinė įranga, yra įsigyti.",
					],
					required_resources: [
						{
							resource: "Programinė įranga",
							status: "turima",
						},
						{
							resource: "Kompiuterinė įranga",
							status: "turima",
						},
						{
							resource: "Konsultacijų sesijos su kuratoriumi",
							status: "reikia įsigyti",
						},
						{
							resource: "Laikinų darbuotojų pagalba",
							status: "reikia įsigyti",
						},
						{
							resource: "Projektų valdymo programinė įranga",
							status: "reikia sukurti",
						},
					],
					risks: [
						{
							risk: "Nepakankamas laikas projektui užbaigti.",
							impact: "aukšta",
							likelihood: "vidutinė",
							mitigation:
								"Efektyviai planuoti laiko sąnaudas ir prioritizuoti užduotis.",
						},
						{
							risk: "Kuratoriaus pasikeitimas per projektą.",
							impact: "vidutinė",
							likelihood: "maža",
							mitigation: "Pasirengti naujo kuratoriaus įtraukimo planą.",
						},
						{
							risk: "Technologijų problemos dėl kurios kils vėlavimai.",
							impact: "vidutinė",
							likelihood: "vidutinė",
							mitigation: "Sukurti atsarginius technologinių sprendimų planus.",
						},
					],
					kpi_summary: [
						{
							kpi: "Projekto X užbaigimo laikas",
							explanation:
								"Svarbu siekiant pagrindinio SMART tikslo užbaigti projektą per du mėnesius.",
						},
					],
					stages: {
						Q1: {
							intermediate_goal:
								"Sukurti projekto X veiksmų planą ir užtikrinti resursus.",
							outcomes: [
								"Veiksmų planas patvirtintas kuratoriaus.",
								"Visi reikalingi resursai yra prieinami.",
								"Kuratoriaus konsultacijų grafikas nustatytas.",
							],
							kpis: ["Veiksmų plano sukūrimo laikas"],
						},
						Q2: {
							intermediate_goal:
								"Pradėti įgyvendinti projektą X pagal nustatytą veiksmų planą.",
							outcomes: [
								"Projekto X įgyvendinimas pradėtas laiku.",
								"Pirmieji projekto etapai užbaigti kaip planuota.",
								"Gauti pirmi atsiliepimai iš kuratoriaus.",
							],
							kpis: ["Projekto X įgyvendinimo pradžios laikas"],
						},
						Q3: {
							intermediate_goal:
								"Įgyvendinti didžiausią projekto X dalį ir užtikrinti veiksmų tęstinumą.",
							outcomes: [
								"75% projekto X darbų užbaigta.",
								"Suplanuoti paskutiniai žingsniai projekto pabaigimui.",
								"Reguliarūs atnaujinimai su kuratoriumi.",
							],
							kpis: ["Projekto X užbaigimo tempas"],
						},
						Q4: {
							intermediate_goal:
								"Sėkmingai užbaigti projektą X ir pristatyti rezultatus.",
							outcomes: [
								"Projektas X užbaigtas laiku.",
								"Gautas teigiamas kuratoriaus įvertinimas.",
								"Įgyti planuoti nauji įgūdžiai.",
							],
							kpis: ["Projekto X sėkmingos pabaigos vertinimas"],
						},
					},
					actions: [
						{
							area: "Q1",
							description: "Parengti detalų veiksmų planą projektui X.",
							dependencies: [],
							hours_estimate: {
								base_hours: 40,
								buffer_pct: 0.2,
								total_hours: 48,
							},
						},
						{
							area: "Q1",
							description: "Užtikrinti visų reikalingų resursų prieinamumą.",
							dependencies: [],
							hours_estimate: {
								base_hours: 25,
								buffer_pct: 0.2,
								total_hours: 30,
							},
						},
						{
							area: "Q1",
							description: "Sudaryti konsultacijų grafiką su kuratoriumi.",
							dependencies: [],
							hours_estimate: {
								base_hours: 10,
								buffer_pct: 0.2,
								total_hours: 12,
							},
						},
						{
							area: "Q2",
							description: "Pradėti projekto X įgyvendinimą.",
							dependencies: ["Veiksmų planas patvirtintas"],
							hours_estimate: {
								base_hours: 80,
								buffer_pct: 0.2,
								total_hours: 96,
							},
						},
						{
							area: "Q2",
							description:
								"Pirmųjų projekto etapų įgyvendinimas ir įvertinimas.",
							dependencies: [],
							hours_estimate: {
								base_hours: 60,
								buffer_pct: 0.2,
								total_hours: 72,
							},
						},
						{
							area: "Q3",
							description: "Įgyvendinti likusią projekto X dalį.",
							dependencies: ["Pirmieji etapai užbaigti"],
							hours_estimate: {
								base_hours: 120,
								buffer_pct: 0.2,
								total_hours: 144,
							},
						},
						{
							area: "Q4",
							description:
								"Užbaigti projektą X ir pristatyti rezultatus kuratoriui.",
							dependencies: ["95% projekto užbaigta"],
							hours_estimate: {
								base_hours: 40,
								buffer_pct: 0.2,
								total_hours: 48,
							},
						},
					],
					totals: {
						base: 375,
						buffer: 75,
						with_buffer: 450,
					},
				};

				const actionsFormatted = formatActionItems(result.data.actions);
				setGoalData({
					actions: actionsFormatted,
					assumptions: result.data.assumptions,
					required_resources: result.data.required_resources,
					risks: result.data.risks,
					stages: result.data.stages,
				});
				setError("");
			} else {
				setError(result.data.message || "Įvyko klaida generuojant tikslą");
			}
		} catch (err) {
			setError("Įvyko klaida. Bandykite dar kartą.");
		} finally {
			setLoading(false);
			// after few seconds set submitted to false again
			setTimeout(() => {
				setSubmitted(false);
			}, 3000);
		}
	};

	const handleDataSave = async (data, metaKey) => {
		setGoalData((prev) => ({ ...prev, actions: data }));
		setError("");

		const updatedGoalActions = { actions: data };

		try {
			const response = await fetch(ajaxObject.ajax_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "save_modified_data",
					nonce: ajaxObject.nonce,
					data: JSON.stringify(updatedGoalActions),
					save_to_meta: JSON.stringify(saveToMeta),
				}),
			});

			const result = await response.json();

			if (result.success) {
				// Data saved successfully
			} else {
				setError(result.data.message || "Įvyko klaida išsaugant tikslą");
			}
		} catch (err) {
			setError("Įvyko klaida. Bandykite dar kartą.");
		} finally {
		}
	};

	// Show loading while checking saved data
	if (!loadingSaved) {
		return (
			<div className="sv-table-loading">
				<div className="sv-table-loader"></div>
			</div>
		);
	}

	// Show login required message if not logged in
	if (!isLoggedIn) {
		return (
			<div className="login-required">
				<h4>Prisijungimas reikalingas</h4>
				<p>Turi prisijungti, kad galėtum naudoti šį įrankį.</p>
				<p>
					<a href="/wp-login.php">Prisijungti</a> arba{" "}
					<a href="/wp-login.php?action=register">Registruotis</a>
				</p>
			</div>
		);
	}

	return (
		<>
			{submitted && <div className="sv-ai-generator-submission-success"></div>}
			{formData.smart_goal.length > 0 && (
				<div style={{ padding: "20px 24px" }}>
					<h4
						style={{
							fontSize: "18px",
							fontWeight: 600,
							color: "#1a0640 !important",
						}}
					>
						{" "}
						Tikslas:{" "}
					</h4>
					<p style={{ margin: 0 }}>{formData.smart_goal}</p>
				</div>
			)}
			{loadingSaved && (
				<FormRenderer
					fields={formFields}
					initialData={formData}
					config={formConfig}
					wasSubmitted={goalData.actions.length > 0}
					onSubmit={handleSubmit}
					blockAbbr="smart_goal"
					dataType="inputs"
				/>
			)}
			{/* Results Section */}
			{!loading && (
				<>
					<EditableTable
						data={goalData.actions}
						columns={quarterlyGoalsColumns}
						config={tableConfig}
						onDataChange={handleTableChange}
						onSave={handleDataSave}
						blockAbbr="goal_q"
						dataType="goals_q_collection"
						className="goal-q-table"
					/>
					<AccordionHeader title="Papildoma informacija, aktuali tarpiniams tikslams">
						{/* Put any content here */}
						{goalData.assumptions.length > 0 && (
							<>
								<h5>Prielaidos: </h5>
								<ul>
									{goalData.assumptions.map((item, index) => (
										<li key={index}>{item}</li>
									))}
								</ul>
							</>
						)}
						{goalData.required_resources.length > 0 && (
							<>
								<h5>Tikslui pasiekti reikalingi ištekliai: </h5>
								<ul>
									{goalData.required_resources.map((item, index) => (
										<li key={index}>{item.resource}</li>
									))}
									<li key="other_resources">
										Ir (galbūt) kiti, čia neįvardinti ištekliai... (rekomenduoju
										papildomai įvertinti ir savarankiškai){" "}
									</li>
								</ul>
							</>
						)}
						{goalData.risks.length > 0 && (
							<div style={{ color: "red" }}>
								<h5 style={{ color: "red" }}>Galimi rizikos veiksniai: </h5>
								<ul>
									{goalData.risks.map((item, index) => (
										<li key={index}>
											{item.risk}
											<br></br> Rekomendacija rizikos valdymui:{" "}
											{item.mitigation}
										</li>
									))}
								</ul>
							</div>
						)}
					</AccordionHeader>
				</>
			)}
		</>
	);
}
