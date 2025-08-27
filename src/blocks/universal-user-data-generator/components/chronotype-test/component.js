// Chronotype Test Component - Quiz Functionality
// src/blocks/universal-user-data-generator/components/chronotype-test/component.js

import React, { useState, useEffect } from "react";
import EnergyFlowComponent from "@components/EnergyFlowComponent";

export default function ChronotypeTestComponent({
	blockId,
	isLoggedIn,
	ajaxObject,
	componentName,
}) {
	// Quiz data


	// State management
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState({
        1: 5,
        2: 5, 
        3: 5,
        4: 5,
        5: 5,
        6: 5,
        7: 1,
        8: 1,
        9: 1,
        10: 1,
        11: 1,
        12: 1,
        13: 1,
        14: 1,
        15: 1,
        16: 1,
        17: 1,
        18: 1,
        19: 1
    });
	const [showResult, setShowResult] = useState(false);
    const [typeData, setTypeData] = useState({});

	// Get current question
	const currentQuestion = quizData[currentQuestionIndex];
	const isLastQuestion = currentQuestionIndex === quizData.length - 1;
	const isFirstQuestion = currentQuestionIndex === 0;

    useEffect(() => {
        calculateResult();
        setShowResult(true);
    }, [componentName])
	// Handle answer selection
	const handleAnswerSelect = (questionId, answerScore) => {
		setAnswers((prev) => ({
			...prev,
			[questionId]: answerScore,
		}));
	};

	// Navigation functions
	const goToNextQuestion = () => {
		if (isLastQuestion) {
			// If last question, show result
			setShowResult(true);
		} else {
			setCurrentQuestionIndex((prev) => prev + 1);
		}
	};

	const goToPreviousQuestion = () => {
		if (!isFirstQuestion) {
			setCurrentQuestionIndex((prev) => prev - 1);
		}
	};

    const saveResult = async(typeData) => {
        try {
			const response = await fetch(ajaxObject.ajax_url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "udg_save_modified_data",
					nonce: ajaxObject.nonce,
					data: JSON.stringify({ chronotype: typeData }),
					save_to_meta: JSON.stringify({
						chronotype: "chronotype",
					}),
				}),
			});

			const result = await response.json();

			if (result.success) {
				// Optionally reload data to see saved state
				// loadComponentData();
			} else {
				console.error("❌ Save failed:", result.data?.message);
			}
		} catch (err) {
			console.error("❌ Network error while saving:", err);
		}
    }

	// Calculate result
	const calculateResult = () => {
		const totalScore = Object.values(answers).reduce(
			(sum, score) => sum + score,
			0,
		);

		const matchedType = Object.entries(resultData).reduce((found, [key, item]) => {
			if (totalScore >= item.score_range[0] && totalScore <= item.score_range[1]) {
				return { ...item, pdfFile: getPdfUrl(`${key}.pdf`) };
			}
			return found;
		}, null);

		setTypeData(matchedType);
        saveResult(matchedType);

        setShowResult(true);
	};

	// Replace the getPdfUrl function with this:
	const getPdfUrl = (pdfFile) => {
		try {
			// Use webpack's require.context for dynamic loading
			const pdfFolder = __webpack_require__(
				"./src/blocks/universal-user-data-generator/components/chronotype-test sync recursive \\.pdf$",
			);
			return pdfFolder(`./${pdfFile}`)["default"];
		} catch (error) {
			console.error("PDF file not found:", pdfFile);
            console.log(error);
			// Fallback to static path if dynamic loading fails
			return `/wp-content/plugins/sv-custom-blocks/build/blocks/universal-user-data-generator/components/chronotype-test/${pdfFile}`;
		}
	};

	// Reset quiz
	const resetQuiz = () => {
		setCurrentQuestionIndex(0);
		setAnswers({});
		setShowResult(false);
	};

	// Check if current question is answered
	const isCurrentQuestionAnswered = answers[currentQuestion?.id] !== undefined;

	return (
		<div className="chronotype-test-component">
			<div className="sv-card">
				{/* <h3>Chronotipo klausimynas</h3> */}

				{!showResult ? (
					<div className="quiz-container">
						{/* Progress indicator */}
						<div className="quiz-progress sv-mb-md">
							<p className="sv-text-sm sv-opacity-75">
								{currentQuestionIndex + 1} klausimas iš {quizData.length}
							</p>
							<div className="progress-bar sv-bg-gray-light sv-rounded">
								<div
									className="progress-fill sv-bg-primary sv-rounded"
									style={{
										width: `${
											((currentQuestionIndex + 1) / quizData.length) * 100
										}%`,
									}}
								></div>
							</div>
						</div>

						{/* Current question */}
						<div className="question-block sv-mb-lg">
							<h4 className="sv-mb-md">{currentQuestion.question}</h4>
							<div className="answers-container">
								{currentQuestion.answers.map((answer, index) => (
									<label
										key={index}
										className="answer-option sv-flex sv-items-center sv-mb-sm sv-cursor-pointer"
									>
										<input
											type="radio"
											name={`question-${currentQuestion.id}`}
											value={answer.score}
											checked={answers[currentQuestion.id] === answer.score}
											onChange={() =>
												handleAnswerSelect(currentQuestion.id, answer.score)
											}
											className="sv-mr-sm"
										/>
										<span>{answer.text}</span>
									</label>
								))}
							</div>
						</div>

						{/* Navigation buttons */}
						<div className="quiz-navigation sv-flex sv-justify-between">
							<button
								onClick={goToPreviousQuestion}
								disabled={isFirstQuestion}
								className="sv-btn sv-btn-secondary"
							>
								← Atgal
							</button>

							{isCurrentQuestionAnswered && isLastQuestion ? (
								<button
									onClick={calculateResult}
									className="sv-btn sv-btn-primary"
								>
									Parodyti rezultatą
								</button>
							) : (
								<button
									onClick={goToNextQuestion}
									className="sv-btn sv-btn-primary"
								>
									Toliau →
								</button>
							)}
						</div>
					</div>
				) : (
					<div className="result-container">
						<div className="sv-card sv-bg-accent-light">
							<h4>Tavo chronotipas:</h4>
							<h3 className="sv-text-primary">{typeData.name}</h3>
							<p>{typeData.summary}</p>
							<ul>
								{typeData.key_tips.map((tip, i) => {
									return <li key={"key_tip_" + i}>{tip}</li>;
								})}
							</ul>
							<EnergyFlowComponent chronotypeData={typeData}
					className="sv-mb-lg" />
							<a
								href={typeData.pdfFile}
								target="_blank"
								rel="noopener noreferrer"
								className="sv-btn sv-btn-primary"
								download
							>
								Atsisiųsti išsamų gidą produktyvumui pagal chronotipą
								(PDF)
							</a>
							{/* <button 
								onClick={resetQuiz}
								className="sv-btn sv-btn-secondary sv-mt-sm"
							>
								Pakartoti testą
							</button> */}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

	const quizData = [
		{
			id: 1,
			question:
				"Kokiu laiku atsikeltum, jei galėtum laisvai planuoti savo dieną?",
			answers: [
				{ text: "5:00 – 7:00", score: 5 },
				{ text: "7:00 – 8:30", score: 4 },
				{ text: "8:30 – 10:00", score: 3 },
				{ text: "10:00–12:00", score: 2 },
				{ text: "po 12:00", score: 1 },
			],
		},
		{
			id: 2,
			question:
				"Kokiu laiku eitum miegoti, jei galėtum laisvai planuoti vakarą?",
			answers: [
				{ text: "20:00 – 21:00", score: 5 },
				{ text: "21:00 – 22:15", score: 4 },
				{ text: "22:15 – 00:30", score: 3 },
				{ text: "00:30 – 2:00", score: 2 },
				{ text: "po 2:00", score: 1 },
			],
		},
		{
			id: 3,
			question:
				"Jei yra nustatytas konkretus laikas, kada turi keltis ryte, ar dažnai esi priklausoma:s nuo žadintuvo?",
			answers: [
				{ text: "Visada", score: 1 },
				{ text: "Dažnai", score: 2 },
				{ text: "Kartais", score: 3 },
				{ text: "Retai", score: 4 },
				{ text: "Niekada", score: 5 },
			],
		},
		{
			id: 4,
			question: "Kaip lengva tau atsikelti ryte?",
			answers: [
				{ text: "Labai lengva", score: 5 },
				{ text: "Lengva", score: 4 },
				{ text: "Nei lengva, nei sunku", score: 3 },
				{ text: "Sunku", score: 2 },
				{ text: "Labai sunku", score: 1 },
			],
		},
		{
			id: 5,
			question:
				"Kiek budri:us jautiesi per pirmąjį pusvalandį nuo pabudimo ryte?",
			answers: [
				{ text: "Labai budrus", score: 5 },
				{ text: "Budrus", score: 4 },
				{ text: "Nei budrus, nei mieguistas", score: 3 },
				{ text: "Mieguistas", score: 2 },
				{ text: "Labai mieguistas", score: 1 },
			],
		},
		{
			id: 6,
			question:
				"Kiek alkana:s jautiesi per pirmąjį pusvalandį nuo pabudimo ryte?",
			answers: [
				{ text: "Labai alkanas", score: 5 },
				{ text: "Alkanas", score: 4 },
				{ text: "Nei alkanas, nei sotus", score: 3 },
				{ text: "Nealkanas", score: 2 },
				{ text: "Visiškai nealkanas", score: 1 },
			],
		},
		{
			id: 7,
			question: "Kaip jautiesi per pirmąjį pusvalandį nuo pabudimo ryte?",
			answers: [
				{ text: "Labai gerai", score: 5 },
				{ text: "Gerai", score: 4 },
				{ text: "Vidutiniškai", score: 3 },
				{ text: "Blogai", score: 2 },
				{ text: "Labai blogai", score: 1 },
			],
		},
		{
			id: 8,
			question:
				"Jei kitą dieną neturėtum jokių įsipareigojimų, kokiu laiku eitum miegoti, palyginti su įprastu miego laiku?",
			answers: [
				{ text: "Gerokai anksčiau", score: 5 },
				{ text: "Šiek tiek anksčiau", score: 4 },
				{ text: "Kaip įprastai", score: 3 },
				{ text: "Šiek tiek vėliau", score: 2 },
				{ text: "Gerokai vėliau", score: 1 },
			],
		},
		{
			id: 9,
			question:
				"Nusprendei užsiimti fiziniais pratimais. Draugas pasiūlė tai daryti vieną valandą per dieną. Atsižvelgiant tik į savo vidinę „nuojautą“ dėl paros laiko, kada norėtum mankštintis?",
			answers: [
				{ text: "8:00–10:00", score: 5 },
				{ text: "10:00–13:00", score: 4 },
				{ text: "13:00–17:00", score: 3 },
				{ text: "17:00–19:00", score: 2 },
				{ text: "po 19:00", score: 1 },
			],
		},
		{
			id: 10,
			question:
				"Ketini atlikti testą, kuris truks 2 valandas. Gali laisvai pasirinkti laiką. Kurį pasirinktum?",
			answers: [
				{ text: "8:00–10:00", score: 5 },
				{ text: "11:00–13:00", score: 4 },
				{ text: "14:00–16:00", score: 3 },
				{ text: "17:00–19:00", score: 2 },
				{ text: "po 19:00", score: 1 },
			],
		},
		{
			id: 11,
			question:
				"Jei atsigultum į lovą 23.00 val. vakaro, kiek būtum pavargusi:ęs?",
			answers: [
				{ text: "Labai pavargęs", score: 1 },
				{ text: "Pavargęs", score: 2 },
				{ text: "Nei pavargęs, nei budrus", score: 3 },
				{ text: "Budrus", score: 4 },
				{ text: "Labai budrus", score: 5 },
			],
		},
		{
			id: 12,
			question:
				"Dėl tam tikrų priežasčių nuėjai miegoti keliomis valandomis vėliau nei įprastai, tačiau kitą rytą keltis kokiu nors konkrečiu laiku nereikia. Kurį iš toliau nurodytų veiksmų greičiausiai atliksi?",
			answers: [
				{ text: "Atsikelsiu įprastu laiku", score: 5 },
				{ text: "Šiek tiek vėliau", score: 3 },
				{ text: "Gerokai vėliau", score: 1 },
			],
		},
		{
			id: 13,
			question:
				"Vieną naktį turi nemiegoti nuo 4.00 iki 6.00 val. ryto. Dieną neturėsi jokių įsipareigojimų. Kuris iš toliau pateiktų variantų geriausiai atitinka tai, kaip jaustumeis?",
			answers: [
				{ text: "Būsiu puikios formos", score: 1 },
				{ text: "Vidutiniškai", score: 3 },
				{ text: "Visiškai nedarbingas", score: 5 },
			],
		},
		{
			id: 14,
			question:
				"Jei nuo 7:00 val. ryto turėtum 2 valandas dirbti sunkų fizinį darbą, kaip manai, kaip jaustumeisi?",
			answers: [
				{ text: "Puikiai", score: 5 },
				{ text: "Gerai", score: 4 },
				{ text: "Vidutiniškai", score: 3 },
				{ text: "Blogai", score: 2 },
				{ text: "Labai blogai", score: 1 },
			],
		},
		{
			id: 15,
			question:
				"Jei turėtum dirbti 2 valandas sunkaus fizinio darbo nuo 23:00 iki 1:00 val. nakties, kaip manai, kaip jaustumeisi?",
			answers: [
				{ text: "Puikiai", score: 1 },
				{ text: "Gerai", score: 2 },
				{ text: "Vidutiniškai", score: 3 },
				{ text: "Blogai", score: 4 },
				{ text: "Labai blogai", score: 5 },
			],
		},
		{
			id: 16,
			question:
				"Vieną vakarą esi viena:s namuose ir neturi jokių įsipareigojimų. Eini miegoti įprastu laiku. Jei žadintuvas neskambėtų, kokiu laiku atsikeltum kitą rytą?",
			answers: [
				{ text: "Prieš 6:30", score: 5 },
				{ text: "6:30–7:45", score: 4 },
				{ text: "7:45–9:45", score: 3 },
				{ text: "9:45–11:00", score: 2 },
				{ text: "po 11:00", score: 1 },
			],
		},
		{
			id: 17,
			question:
				"Laikai 2 valandų trukmės egzaminą, kurio metu reikia susikaupti. Gali laisvai pasirinkti laiką. Kurį laiką pasirinktum?",
			answers: [
				{ text: "8:00–10:00", score: 5 },
				{ text: "11:00–13:00", score: 4 },
				{ text: "14:00–16:00", score: 3 },
				{ text: "17:00–19:00", score: 2 },
				{ text: "po 19:00", score: 1 },
			],
		},
		{
			id: 18,
			question:
				"Tarkime, kad gali visiškai laisvai pasirinkti, kada pradėti dirbti. Kurį variantą pasirinktum?",
			answers: [
				{ text: "5:00–8:00", score: 5 },
				{ text: "8:00–9:00", score: 4 },
				{ text: "9:00–10:00", score: 3 },
				{ text: "10:00–11:00", score: 2 },
				{ text: "po 11:00", score: 1 },
			],
		},
		{
			id: 19,
			question: "Kuriuo vakaro metu jauti nuovargį ir dėl to tau reikia miego?",
			answers: [
				{ text: "Prieš 21:00", score: 5 },
				{ text: "21:00–22:15", score: 4 },
				{ text: "22:15–00:30", score: 3 },
				{ text: "00:30–2:00", score: 2 },
				{ text: "po 2:00", score: 1 },
			],
		},
	];

	const resultData = {
  morning_strong: {
    name: "ryškus rytinis",
    score_range: [70, 86],
    peak_hours: [6, 7, 8, 9, 10, 11, 12, 13],
    productive_hours: 6,
    summary:
      "Tavo energija pasiekia aukščiausią lygį rytais. Po pietų produktyvumas krenta - jei tik galim, geriau planuok 6 produktyvias valandas ryte, nei 10 po pietų. Saugok rytinį laiką svarbiems darbams.",
    key_tips: [
      "Svarbiausius darbus planuok 6:00-12:00",
      "Po 15:00 jokių naujų projektų",
      "6 produktyvios valandos geriau nei 10 vidutinių",
    ],
    ideal_tasks_timing: {
      creative_work: [6, 7, 8],
      important_meetings: [9, 10],
      routine_admin: [11, 12],
    },
    energy_levels: {
      high: [6, 7, 8, 9, 10, 11],
      medium: [12, 13, 14],
      low: [15, 16, 17, 18, 19, 20, 21],
    },
    task_windows: {
      creative: [6, 7, 8],
      analytical: [6, 7, 8, 9, 10],
      meetings: [9, 10],
      admin: [11, 12],
      communication: [9, 10, 11],
    },
    avoid_after: 15,
    morning_difficulty: "very_easy",
    evening_capability: "very_poor",
  },

  morning_moderate: {
    name: "vidutiniškai rytinis",
    score_range: [59, 69],
    peak_hours: [9, 10, 11, 12],
    productive_hours: 7,
    summary:
      "Puikiai tinka standartiniam darbo ritmui. Leisk sau įsivažiuoti į dieną, tada maksimaliai išnaudok 9:00-15:00 langą. Sklandus startas ir produktyvi popietė.",
    key_tips: [
      "Duok sau laiko prabusti ir įsivažiuoti 7:30-9:00",
      "Aukso valandos: 9:00-13:00",
      "Susitikimus planuok 12:00-15:00",
    ],
    ideal_tasks_timing: {
      creative_work: [9, 10, 11],
      important_meetings: [12, 13, 14],
      routine_admin: [13, 14, 15, 16],
    },
    energy_levels: {
      high: [9, 10, 11, 12, 13, 14],
      medium: [8, 15, 16],
      low: [17, 18, 19, 20, 21],
    },
    task_windows: {
      creative: [9, 10, 11],
      analytical: [9, 10, 11, 12, 13, 14],
      meetings: [12, 13, 14],
      admin: [13, 14, 15, 16],
      communication: [9, 10, 11, 12, 13, 14, 15],
    },
    avoid_after: 17,
    morning_difficulty: "easy_with_warmup",
    evening_capability: "moderate",
  },

  intermediate: {
    name: "tarpinis",
    score_range: [42, 58],
    peak_hours: [10, 11, 12, 13, 14],
    productive_hours: 7,
    summary:
      "Turi didžiausią prisitaikymo galimybę, bet reikia aiškios struktūros. 3 darbo blokai su pertraukomis - tavo sėkmės formulė. Svarbu atsižvelgti į savo energijos svyravimus.",
    key_tips: [
      "Pasidaryk 3 aiškius darbo blokus",
      "Klausyk savo energijos svyravimų ir signalų",
      "Strategiškai išnaudok pertraukėles",
    ],
    ideal_tasks_timing: {
      creative_work: [10, 11, 13, 14], // 09:30-11:30,13:00-15:00
      important_meetings: [12, 15], // 11:30-13:00,15:00-16:00
      routine_admin: [9, 16, 17], // 08:30-09:30,16:00-17:30
    },
    energy_levels: {
      high: [10, 11, 12, 13, 14],
      medium: [9, 15, 16, 17],
      low: [18, 19, 20, 21],
    },
    task_windows: {
      creative: [10, 11, 13, 14], // 09:30-11:30,13:00-15:00
      analytical: [10, 11, 12, 13, 14],
      meetings: [12, 15], // 11:30-13:00,15:00-16:00
      admin: [9, 16, 17], // 08:30-09:30,16:00-17:30
      communication: [10, 11, 12, 13, 14, 15, 16],
    },
    avoid_after: 18,
    morning_difficulty: "moderate",
    evening_capability: "moderate",
  },

  evening_moderate: {
    name: "vidutiniškai vakarinis",
    score_range: [31, 41],
    peak_hours: [14, 15, 16, 17, 18],
    productive_hours: 6,
    summary:
      "Lėti rytai, bet stipri popietė. Nespausk savęs sudėtingoms užduotims rytais - vietoj to pasiruošk išnaudoti savo energijos piką 14:00-18:30. Griežtai nustok dirbti 19:00.",
    key_tips: [
      "Priimk lėtą įsivažiavimą rytais - tai ne trūkumas",
      "Visi svarbūs darbai 14:00-18:30",
      "Griežtai sustok 19:00",
    ],
    ideal_tasks_timing: {
      creative_work: [14, 15, 16, 17],
      important_meetings: [13, 17, 18], // 12:30-14:00,16:30-18:30
      routine_admin: [11, 12],
    },
    energy_levels: {
      high: [14, 15, 16, 17, 18],
      medium: [11, 12, 13],
      low: [9, 10, 19, 20, 21],
    },
    task_windows: {
      creative: [14, 15, 16, 17],
      analytical: [14, 15, 16, 17, 18],
      meetings: [13, 17, 18], // 12:30-14:00,16:30-18:30
      admin: [11, 12],
      communication: [14, 15, 16, 17, 18],
    },
    avoid_after: 19,
    morning_difficulty: "difficult",
    evening_capability: "excellent",
  },

  evening_strong: {
    name: "ryškus vakarinis",
    score_range: [16, 30],
    peak_hours: [15, 16, 17, 18, 19, 20],
    productive_hours: 6,
    summary:
      "Tavo energija aukščiausią lygį pasiekia vakare. Rytai sunkūs - naudok juos pasiruošimui, o svarbiausius darbus daryk 15:00-21:00. Jei tik gali - nesprausk savęs į pernelyg ankstyvą grafiką.",
    key_tips: [
      "Saugok vakarines valandas svarbiausiems projektams",
      "Rytais daryk tik lengvus, rutininius darbus",
      "Griežtai sustok 22:00 - kitaip sugadinsi rytdienos produktyvumą",
    ],
    ideal_tasks_timing: {
      creative_work: [15, 16, 17, 18, 19, 20],
      important_meetings: [16, 17, 18, 19],
      routine_admin: [11, 12],
    },
    energy_levels: {
      high: [15, 16, 17, 18, 19, 20],
      medium: [11, 12, 13, 14],
      low: [9, 10, 21],
    },
    task_windows: {
      creative: [15, 16, 17, 18, 19, 20],
      analytical: [15, 16, 17, 18, 19, 20],
      meetings: [16, 17, 18, 19],
      admin: [11, 12],
      communication: [15, 16, 17, 18, 19],
    },
    avoid_after: 22,
    morning_difficulty: "very_difficult",
    evening_capability: "exceptional",
  },
};
