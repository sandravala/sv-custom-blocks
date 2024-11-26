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


document.addEventListener('DOMContentLoaded', function () {
        renderForm();
});


function renderForm() {
    const quizDiv = document.getElementById('planner-personality-type-quiz').getElementsByClassName('qa-container')[0];
    const root = createRoot(quizDiv);
    root.render(<QuizRender />);
}

function QuizRender() {

    const quizData = [
            {
                question: '',
                answers: [
                    { text: 'Geriausia dieną pradėti peržiūrėjus darbų sąrašą ir detaliai suplanavus darbotvarkę.', letter: 'J' },
                    { text: 'Nenumatyti pasikeitimai planuose - teigiamas dalykas, nes suteikia galimybę patyrinėti naujas kryptis ir galimybes.', letter: 'N' },
                    { text: 'Kilus problemai darbe, svarbu atsižvelgti  į komandos narių poreikius ir siekti sprendimo, kuris būtų priimtinas visiems.', letter: 'F' },
                    // { text: 'Vertinu galimybę dirbti vienumoje ir apgalvoti sprendimus ramioje aplinkoje.', letter: 'I' },
                    // { text: 'Mėgstu bendrauti ir dalintis idėjomis su kitais žmonėmis (komandos nariais ir pan.).', letter: 'E' },
                    { text: 'Mane dirbti labiausiai motyvuoja praktinė užduoties nauda ir apčiuopiami darbo rezultatai.', letter: 'S' },
                ]
            }
        ];


    //const [quizData, setQuizData] = useState(quiz);    
   
    const [quizAnswer, setQuizAnswer] = useState(answer);
    
    const imgFolder = require.context('./assets/img/', true, /\.(png|jpe?g|webp|svg)$/);
    const [typeImg, setTypeImg] = useState(null);
    const [typeMeme, setTypeMeme] = useState(null);
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
        'email' : '',
        'name': ''
    });

    const [errors, setErrors] = useState({
        'email' : false,
        'name' : false
    });

    const [currentQuestion, setCurrentQuestion] = useState(0);
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

    

    const [dichotomy, setDichotomy] = useState([
        '',
        '',
        '',
        ''
    ]);
    const [tieBreak, setTieBreak] = useState([]);
    const [currentTieBreakQuestion, setCurrentTieBreakQuestion] = useState(0);
    const [showResultContainer, setShowResultContainer] = useState(false);
    const [type, setType] = useState('');
    const [isChecked, setIsChecked] = useState(true);
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const checkHandler = () => {
    setIsChecked(!isChecked);
  }

  const getQuestionSet = (index) => {
    if(quizData[index]) {
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
                const pairs = [
                    { key1: 'E', key2: 'I', index: 0 },
                    { key1: 'S', key2: 'N', index: 1 },
                    { key1: 'T', key2: 'F', index: 2 },
                    { key1: 'J', key2: 'P', index: 3 }
                ];

                pairs.forEach(({ key1, key2, index }) => {
                    if (updatedAnswers[key1][0] === updatedAnswers[key2][0]) {
                        setTieBreak((prevTieBreak) => [...prevTieBreak, index]);
                    } else {
                        
                        setDichotomy((prevDichotomy) => {
                            const updatedDichotomy = prevDichotomy;
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
        setQuestionsAnswered({...getQuestionSet(currentQuestion+1)});

        if (currentQuestion === quizData.length - 1) {
            console.log('end of quiz');
            console.log(currentTieBreakQuestion);
            
            // Handle end of quiz logic
            // 
        }
    };

    const showResult = () => {
        //show partial result
        const typeString = dichotomy.reduce((prev, current) => prev + current, '');

        const imgPath = imgFolder(`./type-img/${typeString.toLowerCase()}.webp`);
        const imgUrl = typeof imgPath === 'object' ? imgPath.default : imgPath; // Ensure it's a string URL
        const memePath = imgFolder(`./type-meme/${typeString.toLowerCase()}_meme.webp`);
        const memeUrl = typeof memePath === 'object' ? memePath.default : memePath; // Ensure it's a string URL
        setTypeImg(imgUrl);
        setTypeMeme(memeUrl);
        setType(typeString);
        setTieBreak([]);
        setShowResultContainer(!showResultContainer);
        const dichotomyToSend = dichotomy.reduce((prev, current) => prev + current, ''); 

    };

    const getSubscriberName = (name) => {
        console.log(name);
        if(validateName(name)) {
            setErrors((prevErrors) => {
                return {
                    ...prevErrors,
                    ['name'] : false
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
                    ['name'] : true
                }
            });
        }
    }

    const getSubscriberEmail = (email) => {
        
        if(validateEmail(email)) {
            setErrors((prevErrors) => {
                return {
                    ...prevErrors,
                    ['email'] : false
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
                    ['email'] : true
                }
            });
        }
    }

    const sendEmail = () => {

        const dichotomyToSend = type.toLowerCase(); 


        jQuery(document).ready(function ($) {
                   
                $.ajax({
                    url: sv_ajax_object.ajax_url, // AJAX URL passed from PHP
                    type: 'POST',
                    data: {
                        action: 'send_personality_type_by_email', // Action name
                        nonce: sv_ajax_object.nonce,     // Nonce for security
                        data: {type: dichotomyToSend, email: subscriberData.email, name: subscriberData.name}               // Data to send
                    },
                    success: function (response) {
                        if (response.success) {
                            console.log('Response: ');
                            console.log(response.data.message); // Show the response
                        } else {
                            console.log('Error: ');
                            console.log(response.data);
                        }
                    },
                    error: function () {
                        console.log('An error occurred.');
                    },
                });
            ;
        });

    };

    const validateEmail = (email) => {

        // Test for the minimum length the email can be
        if (email.trim().length < 6) {
            return false;
        }
    
        // Test for an @ character after the first position
        if (email.indexOf('@', 1) < 0) {
            return false;
        }
    
        // Split out the local and domain parts
        const parts = email.split('@', 2);
    
        // LOCAL PART
        // Test for invalid characters
        if (!parts[0].match(/^[a-zA-Z0-9!#$%&'*+\/=?^_`{|}~\.-]+$/)) {
            return false;
        }
    
        // DOMAIN PART
        // Test for sequences of periods
        if (parts[1].match(/\.{2,}/)) {
            return false;
        }
    
        const domain = parts[1];
        // Split the domain into subs
        const subs = domain.split('.');
        if (subs.length < 2) {
            return false;
        }
    
        const subsLen = subs.length;
        for (let i = 0; i < subsLen; i++) {
            // Test for invalid characters
            if (!subs[i].match(/^[a-z0-9-]+$/i)) {
                return false;
            }
        }
    
        return true;
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
                <p style={{ textAlign: 'center' }} data-dichotomy={answer.letter}>
                    {answer.text}
                </p>
                <div className="choice-slider">
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
                            />
                            <label
                                htmlFor={`points-${answer.letter}-${points}`}
                                className="choice-label"
                                data-points={point}
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

                {showResultContainer && 
                <>
                    <div className='result-container'>
                        <div className='productivity-type'>
                        <h2 className='type-name-general'>Tavo produktyvumo tipas:</h2>
                        <h2 className='type-name-name'><strong>{quizAnswer[type]["name"]}</strong></h2>
                            <p className='type-one-liner'>{quizAnswer[type]["oneLiner"]}</p>
                            <img className='type-img' src={typeImg}></img>
                            {quizAnswer[type]["description"].map((p) => { return <p>{p}</p> })}
                            <h3>Tavo stiprybės:</h3>
                            <ul>
                                {quizAnswer[type]["strength"].map((p) => { return <li>{p}</li> })}
                            </ul>
                            <img className='type-meme' src={typeMeme}></img>
                            <h3>Tavo silpnybės:</h3>
                            <ul>
                                {quizAnswer[type]["weakness"].map((p) => { return <li>{p}</li> })}
                            </ul>

                            <h3>Į ką atkreipti dėmesį:</h3>

                        </div>
                        <div className='productivity-overlay'></div>
                    </div>
                    <div className='contact-form'>
                        <input
                            type="text"
                            id="subscribe-name"
                            onChange={(event) => getSubscriberName(event.target.value)}
                            defaultValue="vardas"
                            className={`${errors.name ? 'error' : ''}`}
                        />
                        <span className={`error ${errors.name ? '' : 'hidden'}`}>nurodykite savo vardą</span>
                        <input
                            type="email"
                            id="subscribe-email"
                            onChange={(event) => getSubscriberEmail(event.target.value)}
                            defaultValue='el. paštas'
                            className={`${errors.name ? 'error' : ''}`}
                        />
                         <span className={`error ${errors.email ? '' : 'hidden'}`}>nurodykite savo el. paštą</span>
                        <div className="checkbox-container">
                            <input 
                            type="checkbox" 
                            id="subscribe" 
                            checked={isChecked}
                            onChange={checkHandler}
                            ></input>
                            <label for="subscribe">sutinku prenumeruoti 12GM naujienlaiškį</label>
                        </div>
                    </div>
                    <button
                        type="button"
                        id="send-email-button"
                        className={`send-email-button ${false ? '' : ''}`}
                        onClick={sendEmail}
                        disabled={isButtonDisabled}
                    >
                        noriu gauti išsamią ataskaitą!
                    </button>
                </>
                }

                {!showResultContainer &&
                <>
                <div className="progress-bar-container"><progress max={quizData.length + tieBreak.length} value={currentQuestion + currentTieBreakQuestion}></progress></div>
                
                    <button
                        type="button"
                        id="next-question-button"
                        className={`next-question-button ${Object.values(questionsAnswered).find((answer) => answer === 0) === undefined ? 'variant active' : ''} ${!quizData[currentQuestion] || Object.values(questionsAnswered).find((answer) => answer === 0) !== undefined ? 'hidden' : ''}`}
                        onClick={handleNextQuestion}
                    >
                        Toliau {currentQuestion / quizData.length}%
                    </button>
                    <button
                        type="button"
                        id="show-answer-button"
                        className={`show-answer-button ${!quizData[currentQuestion] && Object.values(dichotomy).find((letter) => letter === '') === undefined ? '' : 'hidden'} ${Object.values(dichotomy).find((letter) => letter === '') === undefined ? 'variant active' : ''}`}
                        onClick={showResult}
                    >rodyti rezultatą
                    </button>
                </>
                }
        </>
    );
};