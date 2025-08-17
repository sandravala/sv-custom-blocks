/**
 * Quarterly Goals Generator - Frontend JavaScript
 * Updated to handle login status from render.php
 */

import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import EditableTable from "@components/EditableTable";
import FormRenderer from "@components/FormRenderer";

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
	});

	const [formData, setFormData] = useState({
		smart_goal: "",
		current_situation: "",
	});

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
		}

	];

	const tableConfig = {
		title: "Mano SMART tikslas",
		allowEditing: true,
		allowAddRemove: true,
		grouped: true,
		groupBy: "area",
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
        label: 'VISO',
        position: 'bottom',
        fields: {
            description: 'iš viso:',
            hours_estimate: 'sum'
        }
	}
	};

	const formConfig = {
		title: "", // Form header title (optional)
		submitButtonText: "Generuoti", // Submit button text
		successMessage: "Thank you!", // Message shown after successful submission
		showRequiredNote: false, // Show "Fields marked with * are required"
		submittingText: "Produktyvumo robotas dirba...", // kas rodoma ai blob'e
		submitAnotherResponseText: "DI asistento pagalba",
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

	// Load saved data on component mount (only if logged in)
	useEffect(() => {
		if (
			isLoggedIn &&
			((useResponsesApi && blockId) || (!useResponsesApi && assistantId))
		) {
			loadSavedData();
		}
	}, [isLoggedIn, assistantId, blockId, useResponsesApi]);

	const loadSavedData = async () => {
		//JSON.stringify(["meta_key1", "meta_key2"]); - čia kokių ieškoti meta keys vartotojo meta
		try {

			const params = {
				action: "load_saved_data",
				nonce: ajaxObject.nonce,
				meta_keys: JSON.stringify(["smart_goal", ...Object.keys(saveToMeta)]),
			};


			const response = await fetch(ajaxObject.ajax_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams(params),
			});

			const result = await response.json();

			if (result.success) {
				setFormData({ ...formData, ...result.data.input_data });
				//iterate through each action and replace hours_estimate object with hours_estimate property whose value is inside hours_estimate object, total_hours
				let total_hours = 0;
				const actions = result.data.user_data.goal_actions.map((action, index) => {
					// replace hours_estimate object with total_hours property if hours_estimate is an object
					if (typeof action.hours_estimate === "object") {
						action.hours_estimate = action.hours_estimate.total_hours;
					}
					total_hours += action.hours_estimate;
					// add id to action, but include action.area (as quarter) and each different quarter action counter resets
					// each different quarter action gets its own counter
					// e.g. area: Q1, actions: 1, 2, etc. area: Q2, actions: start at 1 again
					// const quarterActions = actions.filter((a) => a.area === action.area);
					// action.id = `action-${quarterActions.length + 1}-${action.area}`;
					// flatten action.dependencies array to string
					action.dependencies = Array.isArray(action.dependencies)
						? action.dependencies.join(", ")
						: action.dependencies;
					return action;
				});

				console.log("actions:", actions);
				setGoalData({actions: actions});

				console.log("Loaded saved data:", result.data.user_data);
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

	const handleTableChange = (field, value) => {
		console.log("handleTableChange called with field:", field, "value:", value);
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
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

		console.log("Submitting form data:", userInput);
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
				console.log("result.data:", result.data);

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


				// setGoalData({
				// 	smart_goal_sentence: result.data.smart_goal_sentence || "",
				// 	resources_sentence: result.data.resources_sentence || "",
				// });
				setError("");
			} else {
				setError(result.data.message || "Įvyko klaida generuojant tikslą");
				console.log(result.data.data.toString());
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
		console.log("handleDataSave called with data:", data, "metaKey:", metaKey);

		setGoalData(data);
		setError("");

		const updatedGoalActions = {actions: data}

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
				console.log(result.data);
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
			<div className="loading-message">
				<p>Kraunami duomenys...</p>
			</div>
		);
	}

	// Show login required message if not logged in
	if (!isLoggedIn) {
		return (
			<div className="login-required">
				<h4>Prisijungimas reikalingas</h4>
				<p>Turite būti prisijungę, kad galėtumėte naudoti šį įrankį.</p>
				<p>
					<a href="/wp-login.php">Prisijungti</a> arba{" "}
					<a href="/wp-login.php?action=register">Registruotis</a>
				</p>
			</div>
		);
	}

	return (
		<>
			{submitted && (
				<div className="sv-ai-generator-submission-success"></div>
			)}
			{loadingSaved && (
				<FormRenderer
					fields={formFields}
					initialData={formData}
					config={formConfig}
					wasSubmitted={false}
					onSubmit={handleSubmit}
					blockAbbr="smart_goal"
					dataType="inputs"
				/>
			)}
			{/* Results Section */}
			{!loading && (
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
			)}
		</>
	);
}
