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
	const smartGoalDiv = document
		.getElementById("smart-goal-generator")
		.getElementsByClassName("input-container")[0];
	const smartGoalContainer = document.getElementById("smart-goal-generator");
	const assistantId = smartGoalContainer.getAttribute("data-assistant-id");
	const root = createRoot(smartGoalDiv);
	root.render(<SmartGoalGenerator assistantId={assistantId} />);
}

function SmartGoalGenerator({ assistantId }) {
	const [formData, setFormData] = useState({
		specific: "",
		measurable: "",
		achievable: "",
		relevant: "",
		timeBound: "",
	});

	const [loading, setLoading] = useState(false);
	const [loadingSaved, setLoadingSaved] = useState(true);
	const [error, setError] = useState("");
	const [goalData, setGoalData] = useState({
		smart_goal_sentence: "",
		resources_sentence: "",
	});

	const [saving, setSaving] = useState(false);
	const [isLoggedIn, setIsLoggedIn] = useState(false);

	const [smartQuestions, setSmartQuestions] = useState({
		specific: [
			"Apibrėžk, ką nori pasiekti",
			"Apibūdink veiksmą ir rezultatą, t.y. atsakyk: Ką tiksliai nori pasiekti? Pavyzdys: Išmokti programuoti Python kalba",
		],
		measurable: [
			"Kaip žinosi, kad pavyko ir matuosi progresą?",
			"Apibrėžia kriterijus ir rodiklius. Pavyzdys: Sukursiu mini web aplikaciją su duomenų baze",
		],
		achievable: [
			"Ar gali tai padaryti?",
			'Ar šis tikslas yra pasiekiamas? Apibrėžia galimybes ir išteklius. Atsako: "Ar turiu viską, ko reikia?" Pavyzdys: "Turiu kompiuterį, 2 val./dieną laiko ir galiu mokytis internetu"',
		],
		relevant: [
			"Kodėl TAU tai yra SVARBU?",
			'Apibrėžia motyvaciją ir prasmę. Atsako: "Kodėl man to reikia?" Pavyzdys: "Noriu pakeisti karjerą ir tapti programuotoju"',
		],
	});

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
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "load_smart_goals",
					nonce: sv_ajax_object.nonce,
					assistant_id: assistantId,
				}),
			});

			const result = await response.json();

			if (result.success) {
				setIsLoggedIn(true);
				console.log("Loaded saved data:", result.data);
				if (result.data && result.data.input_data) {
					// Convert snake_case to camelCase for form fields
					const inputData = result.data.input_data;
					setFormData({
						specific: inputData.specific || "",
						measurable: inputData.measurable || "",
						achievable: inputData.achievable || "",
						relevant: inputData.relevant || "",
						timeBound: inputData.time_bound || "",
					});
					// setGoalData(
					// 	result.data.response_data
					// );
					if (result.data.response_data) {
						setGoalData({
							smart_goal_sentence:
								result.data.response_data.smart_goal_sentence || "",
							resources_sentence:
								result.data.response_data.resources_sentence || "",
						});
					}
				}
			} else {
				// User not logged in or other error
				setIsLoggedIn(false);
			}
		} catch (err) {
			console.error("Error loading saved data:", err);
			setIsLoggedIn(false);
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

		if (
			!formData.specific ||
			!formData.measurable ||
			!formData.achievable ||
			!formData.relevant
		) {
			setError("Prašome užpildyti visus privalomus laukus");
			return;
		}

		if (!assistantId) {
			setError(
				"OpenAI Assistant ID nenustatytas. Susisiekite su administratoriumi.",
			);
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
					action: "generate_smart_goals",
					nonce: sv_ajax_object.nonce,
					assistant_id: assistantId,
					specific: formData.specific,
					measurable: formData.measurable,
					achievable: formData.achievable,
					relevant: formData.relevant,
					time_bound: "this year",
				}),
			});

			const result = await response.json();

			if (result.success) {
				console.log("Generated SMART goal:", result.data);
				setGoalData({
					smart_goal_sentence: result.data.smart_goal_sentence || "",
					resources_sentence: result.data.resources_sentence || "",
				});
				setError("");
			} else {
				setError(result.data.message || "Įvyko klaida generuojant tikslą");
			}
		} catch (err) {
			setError("Įvyko klaida. Bandykite dar kartą.");
			//setError(err.message || "Įvyko Įvyko klaida. Bandykite dar kartą.");
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
				<p>
					<a href="/wp-login.php">Prisijungti</a> arba{" "}
					<a href="/wp-login.php?action=register">Registruotis</a>
				</p>
			</div>
		);
	}

	return (
		<>
			{goalData.smart_goal_sentence.length === 0 &&
				(!loading ? (
					<form onSubmit={handleSubmit} className="smart-goal-form">
						{Object.keys(smartQuestions).map((key) => (
							<div className="form-group" key={key}>
								<label htmlFor={key}>{smartQuestions[key][0]}</label>
								<textarea
									id={key}
									value={formData[key]}
									onChange={(e) => handleInputChange(key, e.target.value)}
									placeholder={smartQuestions[key][1]}
									required
								/>
							</div>
						))}
						{error && <div className="error-message">{error}</div>}

						<button type="submit" disabled={loading} className="generate-btn">
							Generuoti SMART tikslą
						</button>
					</form>
				) : (
					<div className="ai-blob" style={{ "--ai-size": "220px" }}>
						<span className="ai-blob__orb" />
						<span className="ai-blob__orb ai-blob__orb--slow" />
						<span className="ai-blob__text">Generuoja…</span>
					</div>
				))}

					<div className="ai-blob" style={{ "--ai-size": "350px" }}>
						<span className="ai-blob__orb" />
						<span className="ai-blob__orb ai-blob__orb--slow" />
						<span className="ai-blob__text">Generuoja…</span>
					</div>
			{goalData.smart_goal_sentence.length > 0 && (
				<div>
					<h4>Tavo SMART tikslas</h4>
					<p>{goalData.smart_goal_sentence}</p>
					{goalData.resources_sentence && (
						<div>
							<h5>Papildomos rekomendacijos iš produktyvumo roboto:</h5>
							<p>{goalData.resources_sentence}</p>
						</div>
					)}
				</div>
			)}
		</>
	);
}
