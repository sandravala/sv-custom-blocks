/**
 * Use this file for JavaScript code that you want to run in the front-end
 * on posts/pages that contain this block.
 *
 * When this file is defined as the value of the `viewScript` property
 * in `block.json` it will be enqueued on the front end of the site.
 *
 * Example:
 *
 * ```js
 * {
 *   "viewScript": "file:./view.js"
 * }
 * ```
 *
 * If you're not making any changes to this file because your project doesn't need any
 * JavaScript running in the front-end, then you should delete this file and remove
 * the `viewScript` property from `block.json`.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/#view-script
 */

import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import quiz from './assets/data/quizData.json';
import answer from './assets/data/quizAnswer.json';
import loaderGif from './assets/img/calculating-puzzled.gif';


document.addEventListener('DOMContentLoaded', function () {
    renderForm();
});

function renderForm() {
    const quizDiv = document.getElementById('planner-personality-type-quiz').getElementsByClassName('qa-container')[0];
    const root = createRoot(quizDiv);
    root.render(<QuizRender />);
}

function QuizRender() {

    const c = document.cookie
    .split("; ")
    .find((row) => row.startsWith('productivityType='));

    const cookieSet = () => {
        
        if (c) {
            console.log('cookie found');
            console.log(quizData.length);
            return quizData.length;
        } else {
            console.log('cookie not found');
            return 0;
        }
    };

    const isFirstRender = useRef(true);
    const [quizData, setQuizData] = useState(quiz);

    const [quizAnswer, setQuizAnswer] = useState(answer);


    const imgFolder = require.context('./assets/img/', true, /\.(png|jpe?g|webp|svg)$/);
    const [typeImg, setTypeImg] = useState(() => {
        // Ensure `c` is defined and has the expected structure
        if (c && c.includes('=')) {
            const value = c.split('=')[1]?.toLowerCase(); // Safely get the value after '='
            return imgFolder(`./type-img/${value}.webp`).default;
        }
        return null; // Fallback in case `c` is undefined or invalid
    });
    const [typeMeme, setTypeMeme] = useState(() => {
        // Ensure `c` is defined and has the expected structure
        if (c && c.includes('=')) {
            const value = c.split('=')[1]?.toLowerCase(); // Safely get the value after '='
            return imgFolder(`./type-meme/${value}_meme.webp`).default;
        }
        return null; // Fallback in case `c` is undefined or invalid
    });
    const [emailSent, setEmailSent] = useState(false);
    const [sending, setSending] = useState(false);
    const [emailError, setEmailError] = useState(false);
    const points = [
        "100% ne aš",
        "Nepanašu į mane",
        "Gaaaal kartais",
        "Skamba panašiai",
        "100% AŠ!"
    ];

    const tieBreakerQuestions = [
        {
            question: 'Kai turi išspręsti svarbų klausimą, kaip renkiesi ieškoti sprendimo?',
            answers: [
                { text: 'Man patinka pasitarti su kolegomis ir kartu aptarti galimus sprendimus.', letter: 'E' },
                { text: 'Mėgstu ramiai apmąstyti galimus sprendimus vienumoje, prieš pasidalinant su kitais.', letter: 'I' }
            ]
        },
        {
            question: 'Kaip geriau planuoti ilgalaikį projektą?',
            answers: [
                { text: 'Pasikliauti konkrečiais faktais, ankstesne patirtimi ir sudaryti reikalingų žingsnių planą.', letter: 'S' },
                { text: 'Pradėti nuo vizijos kūrimo ir ieškoti, kaip galima būtų tą viziją įgyvendinti (pageidautina - kūrybiškai).', letter: 'N' }
            ]
        },
        {
            question: 'Kaip geriau įvertinti komandos nario veiklą?',
            answers: [
                { text: 'Pagal objektyvius rezultatus ir veiklos efektyvumą.', letter: 'T' },
                { text: 'Atsižvelgiant į įdėtas pastangas ir tai, kaip vertinimas paveiks jo tolesnę motyvaciją.', letter: 'F' }
            ]
        },
        {
            question: 'Kaip vertini nenumatytus pasikeitimus (projektuose, užduotyse, planuose)?',
            answers: [
                { text: 'Stengiuosi laikytis pirminio plano ir kiek įmanoma vengti pasikeitimų.', letter: 'J' },
                { text: 'Lengvai prisitaikau prie pasikeitimų ir dažnai randu naujų būdų veiksmingai išspręsti situacijas.', letter: 'P' }
            ]
        }
    ];

    const [subscriberData, setSubscriberData] = useState({
        'email': '',
        'name': ''
    });

    const [errors, setErrors] = useState({
        'email': false,
        'name': false
    });

    const [currentQuestion, setCurrentQuestion] = useState(cookieSet());
    const [currentVariant, setCurrentVariant] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({
        'E': [0, 0],
        'I': [0, 0],
        'S': [0, 0],
        'N': [0, 0],
        'T': [0, 0],
        'F': [0, 0],
        'J': [0, 0],
        'P': [0, 0]
    }); // To track selected answers for each question

    const pairs = [
        { key1: 'E', key2: 'I', index: 0 },
        { key1: 'S', key2: 'N', index: 1 },
        { key1: 'T', key2: 'F', index: 2 },
        { key1: 'J', key2: 'P', index: 3 }
    ];

    const [dichotomy, setDichotomy] = useState([
        '',
        '',
        '',
        ''
    ]);
    const [tieBreak, setTieBreak] = useState([]);
    const [currentTieBreakQuestion, setCurrentTieBreakQuestion] = useState(0);
    const [showResultContainer, setShowResultContainer] = useState(cookieSet() > 0);
    const [type, setType] = useState(() => {

        if (c && c.includes('=')) {
            return c.split("=")[1]
        }
        return '';
    });
    const [isChecked, setIsChecked] = useState(true);
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);
    const [firstRadioClicked, setFirstRadioClicked] = useState(false);

    const checkHandler = () => {
        setIsChecked(!isChecked);
    }

    const getQuestionSet = (index) => {
        if (quizData[index]) {
            return quizData[index]['answers'].reduce((acc, answer) => {
                // Add each letter as a key with an initial value of 0
                acc[answer.letter] = 0;
                return acc;
            }, {});
        }
        return {};
    }

    const [questionsAnswered, setQuestionsAnswered] = useState({ ...getQuestionSet(currentQuestion) });
    // Update the button's disabled state whenever the checkbox state changes
    useEffect(() => {
        setIsButtonDisabled(!isChecked);
    }, [isChecked]);

    const handleChange = (answerLetter, points, variantIndex) => {
        // Track first radio button click (async, no waiting)
        if (!firstRadioClicked) {
            setFirstRadioClicked(true);
            jQuery(document).ready(function ($) {
                $.ajax({
                    url: sv_ajax_object.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'record_quiz_stat',
                        nonce: sv_ajax_object.nonce,
                        stat_type: 'first_radio_clicks'
                    },
                    async: true
                });
            });
        }

        setSelectedAnswers((prevAnswers) => {
            const [sum] = prevAnswers[answerLetter]; // Destructure the sum from the array
            return {
                ...prevAnswers,
                [answerLetter]: [sum, points] // Update only passedNumber, keep sum unchanged
            };
        });

        setQuestionsAnswered((prevQuestionsAnswered) => {
            const updatedQuestionsAnswered = {
                ...prevQuestionsAnswered,
                [answerLetter]: points,
            };


            // Set the current variant based on the updated state
            setCurrentVariant(
                Object.values(updatedQuestionsAnswered).findIndex((answer) => answer === 0)
            );

            return updatedQuestionsAnswered; // Return the updated state
        });


    };

    const tieBreakChange = (questionIndex, answerLetter) => {
        setDichotomy((prevDichotomy) => {
            // Create a copy of the array
            const updatedDichotomy = [...prevDichotomy];

            // Update the specific index with the new value
            updatedDichotomy[questionIndex] = answerLetter;

            // Return the updated array
            return updatedDichotomy;
        });
        setCurrentTieBreakQuestion(currentTieBreakQuestion + 1);
    };

    useEffect(() => {
        const activeElement = document.querySelector('.variant.active');
        if (activeElement) {
            activeElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }

    }, [tieBreak, currentVariant, currentQuestion, currentTieBreakQuestion, questionsAnswered]);

    // Function to move to the next question
    const handleNextQuestion = () => {


        setSelectedAnswers((prevAnswers) => {
            const updatedAnswers = { ...prevAnswers };

            // Iterate over each letter and update the sums
            Object.keys(updatedAnswers).forEach((letter) => {
                updatedAnswers[letter][0] += updatedAnswers[letter][1]; // Add current points to the sum
                updatedAnswers[letter][1] = 0; // Reset current points to 0 for the next question
            });

            // Tie-breaker logic
            if (currentQuestion === quizData.length - 1) {

                pairs.forEach(({ key1, key2, index }) => {
                    if (updatedAnswers[key1][0] === updatedAnswers[key2][0]) {
                        setTieBreak((prevTieBreak) => [...prevTieBreak, index]);
                    } else {

                        setDichotomy((prevDichotomy) => {
                            const updatedDichotomy = [...prevDichotomy];
                            updatedDichotomy[index] = updatedAnswers[key1][0] > updatedAnswers[key2][0] ? key1 : key2;

                            return updatedDichotomy;
                        })
                    }
                });


            }

            return updatedAnswers;
        });
        setCurrentQuestion(currentQuestion + 1);
        setCurrentVariant(0);
        setQuestionsAnswered({ ...getQuestionSet(currentQuestion + 1) });
    };

    useEffect(() => {

        if (isFirstRender.current) {
            isFirstRender.current = false; // Mark the initial render as done
            return; // Exit early to skip the effect on the initial render
        }



        if (Object.values(dichotomy).find((letter) => letter === '') === undefined) {
            const typeString = dichotomy.reduce((prev, current) => prev + current, '');
            const imgPath = imgFolder(`./type-img/${typeString.toLowerCase()}.webp`);
            const imgUrl = typeof imgPath === 'object' ? imgPath.default : imgPath; // Ensure it's a string URL
            const memePath = imgFolder(`./type-meme/${typeString.toLowerCase()}_meme.webp`);
            const memeUrl = typeof memePath === 'object' ? memePath.default : memePath; // Ensure it's a string URL
            setTypeImg(imgUrl);
            setTypeMeme(memeUrl);
            setType(typeString);
            setTieBreak([]);
        } else {
            console.log('dichotomy not full');
            console.log(dichotomy);
            
            // if (tieBreak.length > 0) {
            //     return;
            // }

            // pairs.forEach(({ key1, key2, index }) => {

            //     if (dichotomy[index] === '') {
            //         setTieBreak((prevTieBreak) => [...prevTieBreak, index]);
            //     }
            // });
        }
    }, [dichotomy]);

    const showResult = () => {
        // Track show answer button click (async, no waiting)
        jQuery(document).ready(function ($) {
            $.ajax({
                url: sv_ajax_object.ajax_url,
                type: 'POST',
                data: {
                    action: 'record_quiz_stat',
                    nonce: sv_ajax_object.nonce,
                    stat_type: 'show_answer_clicks'
                },
                async: true
            });
        });

        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 7);
        document.cookie = `productivityType=${dichotomy.reduce((prev, current) => prev + current, '')}; expires=${expirationDate.toUTCString()}; SameSite=Strict; path=/`;
        console.log(type);
        console.log(dichotomy);
        setShowResultContainer(!showResultContainer);

    };

    const getSubscriberName = (name) => {
        if (validateName(name)) {
            setErrors((prevErrors) => {
                return {
                    ...prevErrors,
                    ['name']: false
                }
            });
            setSubscriberData((prevSubscriberData) => {
                const newSubscriberData = {
                    ...prevSubscriberData,
                    ['name']: name
                }
                return newSubscriberData;
            });
        } else {
            setErrors((prevErrors) => {
                return {
                    ...prevErrors,
                    ['name']: true
                }
            });
        }
    }

    const getSubscriberEmail = (email) => {

        if (validateEmail(email)) {
            setErrors((prevErrors) => {
                return {
                    ...prevErrors,
                    ['email']: false
                }
            });
            setSubscriberData((prevSubscriberData) => {
                const newSubscriberData = {
                    ...prevSubscriberData,
                    ['email']: email
                }
                return newSubscriberData;
            });
        } else {
            setErrors((prevErrors) => {
                return {
                    ...prevErrors,
                    ['email']: true
                }
            });
        }
    }

    const sendEmail = () => {
        // Track send email button click (async, no waiting)
        jQuery(document).ready(function ($) {
            $.ajax({
                url: sv_ajax_object.ajax_url,
                type: 'POST',
                data: {
                    action: 'record_quiz_stat',
                    nonce: sv_ajax_object.nonce,
                    stat_type: 'send_email_clicks'
                },
                async: true
            });
        });

        if (!validateEmail(subscriberData.email) || !validateName(subscriberData.name)) {
            if (!validateName(subscriberData.name)) {
                setErrors((prevErrors) => {
                    return {
                        ...prevErrors,
                        ['name']: true
                    }
                });
            };

            if (!validateEmail(subscriberData.email)) {
                setErrors((prevErrors) => {
                    return {
                        ...prevErrors,
                        ['email']: true
                    }
                });
            };

            return;
        }

        setSending(true);
        const dichotomyToSend = type.toLowerCase();

        const dataToSend = {
            type: dichotomyToSend,
            email: subscriberData.email,
            name: subscriberData.name
        };

        if (isChecked) {
            dataToSend['subscribe'] = 'yes';
        }

        jQuery(document).ready(function ($) {

            $.ajax({
                url: sv_ajax_object.ajax_url, // AJAX URL passed from PHP
                type: 'POST',
                data: {
                    action: 'send_personality_type_by_email', // Action name
                    nonce: sv_ajax_object.nonce,     // Nonce for security
                    data: dataToSend
                },
                success: function (response) {
                    if (response.success) {
                        setEmailSent(true);
                    } else {
                        setEmailSent(false);
                        setSending(false);
                        setEmailError(true);
                        console.log(response.data);
                    }
                },
                error: function () {
                    setEmailSent(false);
                    setSending(false);
                    setEmailError(true);
                    console.log('An error occurred.');
                },
            });
            ;
        });

    };

    const validateEmail = (email) => {

        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email.trim());
    };

    const validateName = (name) => {
        // Trim the input to remove extra spaces
        const trimmedName = name.trim();

        // Check if the length is less than 2
        if (trimmedName.length < 2) {
            return false;
        }

        // Regular expression to allow only letters, spaces, hyphens, and apostrophes
        const nameRegex = /^[a-zA-ZĄČĘĖĮŠŲŪŽąčęėįšųūž\s'-]+$/;

        // Validate against the regular expression
        if (!nameRegex.test(trimmedName)) {
            return false;
        }

        // Check for potential script injection (disallowing `<`, `>`, and `&`)
        if (/[\<\>\/\\\&]/.test(trimmedName)) {
            return false;
        }

        return true;  // If all checks pass, the name is valid
    }


    return (

        <>

            {quizData[currentQuestion] && quizData[currentQuestion].answers.map((answer, answerIndex) => (
                <div className={`variant ${currentVariant === answerIndex ? 'active' : 'inactive'}`} id={`variant-${answer.letter}`} key={`variant-${answer.letter}`}>
                    <p key={`q-${answer.letter}`} style={{ textAlign: 'center' }} data-dichotomy={answer.letter}>
                        {answer.text}
                    </p>
                    <div key={`slider-${answer.letter}`} className="choice-slider">
                        {points.map((point, pointIndex) => {
                            const points = pointIndex + 1;
                            return (<>
                                <input
                                    type="radio"
                                    className="choice-input"
                                    name={`points-${answer.letter}`}
                                    id={`points-${answer.letter}-${points}`}
                                    value={points}
                                    onChange={() => handleChange(answer.letter, points, answerIndex)}
                                    checked={selectedAnswers[answer.letter][1] === points}
                                    required
                                    key={`points-${answer.letter}`}
                                />
                                <label
                                    htmlFor={`points-${answer.letter}-${points}`}
                                    className="choice-label"
                                    data-points={point}
                                    key={`label-${answer.letter}-${points}`}
                                ></label>
                            </>)
                        })}
                        <div className="points-pos" id={`points-pos-${answer.letter}`}></div>
                    </div>
                </div>

            ))}

            {tieBreak.length > 0 && tieBreak.map((q, index) => {

                return (
                    <div id="tie-break" key={index}>
                        <div className={`variant ${currentTieBreakQuestion !== index ? 'inactive' : 'active'}`}>
                            <p>{tieBreakerQuestions[q].question}</p>
                            {tieBreakerQuestions[q].answers.map((a, idx) => (
                                <div className='tie-break-control'>
                                    <input
                                        type="radio"
                                        name={`radio-${q}`}
                                        id={`radio-${q}-${a.letter}`}
                                        value={a.letter}
                                        onChange={() => tieBreakChange(q, a.letter)}
                                    />
                                    <label className="tie-break-lbl" key={idx} htmlFor={`radio-${q}-${a.letter}`} >{a.text}</label>
                                </div>

                            ))}
                        </div>
                    </div>
                );
            })}

            <div>
                <img style={{ display: !tieBreak.length > 0 && !quizData[currentQuestion] && Object.values(dichotomy).find((letter) => letter === '') === undefined && !showResultContainer ? 'block' : 'none' }} src={loaderGif} alt="calculating..." />
            </div>

            {typeImg && <img style={{ display: 'none' }} className='type-img' src={typeImg}></img>}

            {showResultContainer &&
                <>
                    <div className='result-container'>
                        {!type || !quizAnswer[type] ? (
                            <div>
                                <p>Skaičiuojamas rezultatas...</p>
                                <p>Jei puslapis automatiškai neatsinaujino, atnaujinkite rankiniu būdu</p>
                            </div>
                            
                        ) : (
                            <div className='productivity-type'>
                                <h2 className='type-name-general'>Tavo produktyvumo tipas:</h2>
                                <h2 className='type-name-name'><strong>{quizAnswer[type]["name"]}</strong></h2>
                                <p className='type-one-liner'>{quizAnswer[type]["oneLiner"]}</p>
                                <img className='type-img' src={typeImg} alt="Type Image" />
                                {quizAnswer[type]["description"].map((p, index) => (
                                    <p key={index}>{p}</p>
                                ))}
                                <h3>Tavo stiprybės:</h3>
                                <ul>
                                    {quizAnswer[type]["strength"].map((p, index) => (
                                        <li key={index}>{p}</li>
                                    ))}
                                </ul>
                                <img className='type-meme' src={typeMeme} alt="Meme Image" />
                                <h3>Tavo silpnybės:</h3>
                                <ul>
                                    {quizAnswer[type]["weakness"].map((p, index) => (
                                        <li key={index}>{p}</li>
                                    ))}
                                </ul>

                                <h3>Į ką atkreipti dėmesį:</h3>
                            </div>
                        )}
                        <div className='productivity-overlay'></div>
                    </div>

                    {!emailSent && (
                        <>
                            <div className='contact-form'>
                                <div>
                                    <strong>UPS!</strong>Apie tavo produktyvumo tipą dar tiek galima papasakoti, bet man baisu, kas 12GM svetainė gali neatlaikyti tokio informacijos kiekio 😅
                                    <br />
                                    <strong>Žinai ką? Padarykime paprasčiau:</strong> įvesk savo el. paštą ir atsiųsiu tau išsamų aprašymą PDF formatu, kuriame:
                                    <br />
                                    <ul>
                                        <li>Sužinosi dar daugiau apie savo elgesio modelius</li>
                                        <li>Gausi konkrečių patarimų, kaip keisti savo elgesį, kad taptum produktyvesnis</li>
                                        <li>O kituose laiškuose atkeliaus ir tau asmeniškai pritaikytas gidas, kuris padės tai įgyvendinti praktiškai</li>
                                    </ul>
                                </div>
                                <input
                                    type="text"
                                    id="subscribe-name"
                                    onChange={(event) => getSubscriberName(event.target.value)}
                                    defaultValue="vardas"
                                    className={`${errors.name ? 'error' : ''}`}
                                />
                                <span className={`error ${errors.name ? '' : 'hidden'}`}>nurodyk savo vardą</span>
                                <input
                                    type="email"
                                    id="subscribe-email"
                                    onChange={(event) => getSubscriberEmail(event.target.value)}
                                    defaultValue='email@gmail.com'
                                    className={`${errors.name ? 'error' : ''}`}
                                />
                                <span className={`error ${errors.email ? '' : 'hidden'}`}>nurodyk savo el. paštą</span>
                                <div className="checkbox-container">
                                    <input
                                        type="checkbox"
                                        id="subscribe"
                                        checked={isChecked}
                                        onChange={checkHandler}
                                    ></input>
                                    <label htmlFor="subscribe">sutinku prenumeruoti 12GM naujienlaiškį</label>
                                </div>
                            </div>
                            <button
                                type="button"
                                id="send-email-button"
                                className={`send-email-button ${false ? '' : ''}`}
                                onClick={sendEmail}
                                disabled={isButtonDisabled}
                            >
                                {sending ? 'Siunčiama...' : 'Noriu visos tiesos apie savo tipą!'}
                                {sending && <div className="loader" id='loader'></div>}
                            </button>
                        </>
                    )}
                    {emailSent && !emailError && (
                        <div className='email-sent'>Puiku! Pasitikrink el. paštą (jei nerandi laiško, peržiūrėk ir spam aplanką)</div>
                    )}
                    {emailError && (
                        <div className='email-sent error' id='email-sent-error'>
                            Laiško siuntimas nepavyko. Parašyk sandra@12gm.lt ir atsiųsiu rankiniu būdu.
                        </div>
                    )}
                </>
            }

            {!showResultContainer &&
                <>
                    <div className={`progress-bar-container ${Object.values(dichotomy).find((letter) => letter === '') === undefined ? 'hidden' : ''}`}><progress max={quizData.length + tieBreak.length} value={currentQuestion + currentTieBreakQuestion}></progress></div>

                    <button
                        type="button"
                        id="next-question-button"
                        className={`next-question-button ${Object.values(questionsAnswered).find((answer) => answer === 0) === undefined ? 'variant active' : ''} ${!quizData[currentQuestion] || Object.values(questionsAnswered).find((answer) => answer === 0) !== undefined ? 'hidden' : ''}`}
                        onClick={handleNextQuestion}
                    >
                        Toliau
                    </button>
                    <button
                        type="button"
                        id="show-answer-button"
                        className={`show-answer-button ${!quizData[currentQuestion] && Object.values(dichotomy).find((letter) => letter === '') === undefined ? '' : 'hidden'} ${Object.values(dichotomy).find((letter) => letter === '') === undefined ? 'variant active pulse' : ''}`}
                        onClick={showResult}
                    >noriu greičiau pamatyti rezultatą!
                    </button>
                </>
            }
        </>
    );
};