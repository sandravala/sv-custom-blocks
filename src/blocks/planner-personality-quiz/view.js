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


document.addEventListener('DOMContentLoaded', function () {

        renderForm();

});


function renderForm() {
    const quizDiv = document.getElementById('planner-personality-type-quiz').getElementsByClassName('qa-container')[0];
    const root = createRoot(quizDiv);
    root.render(<QuizRender />);
}

function QuizRender() {

    // const quizData = [
    //     {
    //         question: 'Kaip paprastai pradedi savo darbo dieną?',
    //         answers: [
    //             { text: 'Peržiūriu darbų sąrašą ir detaliai suplanuoju savo dieną.', letter: 'J' },
    //             { text: 'Pradedu dirbti su tuo, kas iškyla, ir einu su srovėmis.', letter: 'P' },
    //             { text: 'Ieškau naujų idėjų ir įkvėpimo, prieš pradedant užduotis.', letter: 'N' },
    //             { text: 'Sutelkiu dėmesį į vieną konkrečią užduotį, kurią reikia atlikti pirmiausia.', letter: 'S' }
    //         ]
    //     },
    //     {
    //         question: 'Kaip reaguoji į netikėtus pokyčius savo tvarkaraštyje?',
    //         answers: [
    //             { text: 'Prisitaikau prie plano pakeitimų, bet man sunku keisti įprastą rutiną.', letter: 'J' },
    //             { text: 'Sveikinu pokyčius ir lengvai prisitaikau, dažnai klestėdamas naujose situacijose.', letter: 'P' },
    //             { text: 'Matau tai kaip galimybę tyrinėti naujas kryptis ir galimybes.', letter: 'N' },
    //             { text: 'Stengiuosi kuo mažiau trikdyti planą ir išlaikyti kuo daugiau pirminio plano.', letter: 'S' }
    //         ]
    //     },
    //     {
    //         question: 'Kaip tau patinka dirbti su projektais?',
    //         answers: [
    //             { text: 'Mėgstu turėti aiškų, žingsnis po žingsnio planą ir griežtai jo laikytis.', letter: 'J' },
    //             { text: 'Man patinka lankstumas ir prisitaikymas prie situacijos eigos.', letter: 'P' },
    //             { text: 'Pradedu smegenų šturmu ir išbandau kelis metodus, prieš pasirinkdamas tinkamiausią.', letter: 'N' },
    //             { text: 'Rimtuosi į praktinius metodus ir naudoju patikrintus procesus.', letter: 'S' }
    //         ]
    //     },
    //     {
    //         question: 'Kaip tvarkaisi su terminais?',
    //         answers: [
    //             { text: 'Planuoju iš anksto ir laikui dar nepraėjus atlikau užduotis.', letter: 'J' },
    //             { text: 'Dažnai dirbu iki pat termino pabaigos, bet vis tiek atlieku kokybišką darbą.', letter: 'P' },
    //             { text: 'Matau terminus kaip lankstus ir labiau susitelkiu į kūrybiškumą ir kokybę nei į griežtą laiką.', letter: 'N' },
    //             { text: 'Naudoju terminus, kad paskirstyčiau laiką ir užtikrinčiau, kad užduotys būtų atliktos kruopščiai.', letter: 'S' }
    //         ]
    //     },
    //     {
    //         question: 'Kaip vertini komandinius darbus ir bendradarbiavimą?',
    //         answers: [
    //             { text: 'Mėgstu organizuoti ir paskirstyti užduotis, kad viskas būtų atlikta efektyviai.', letter: 'EJ' },
    //             { text: 'Teikiu pirmenybę smegenų šturmui, kur kiekvienas gali laisvai prisidėti.', letter: 'EN' },
    //             { text: 'Man labiausiai patinka dirbti savarankiškai, bet bendradarbiauju, kai reikia.', letter: 'IJ' },
    //             { text: 'Geriausiai dirbu struktūrizuotoje komandoje, kur aiškiai apibrėžti vaidmenys ir atsakomybės.', letter: 'IS' }
    //         ]
    //     },
    //     {
    //         question: 'Kas tave motyvuoja atlikti užduotį?',
    //         answers: [
    //             { text: 'Pasiekti galutinį tikslą ir išbraukti jį iš sąrašo.', letter: 'J' },
    //             { text: 'Galimybė atrasti naujų idėjų ir sprendimų.', letter: 'N' },
    //             { text: 'Praktinė nauda ir apčiuopiami darbo rezultatai.', letter: 'S' },
    //             { text: 'Galimybė prisitaikyti ir keisti planus, kai to reikia.', letter: 'P' }
    //         ]
    //     },
    //     {
    //         question: 'Kaip atsigauni po ilgos darbo dienos?',
    //         answers: [
    //             { text: 'Man patinka ramios, apmąstymo veiklos, kaip skaitymas ar meditacija.', letter: 'I' },
    //             { text: 'Mėgstu bendrauti arba užsiimti aktyviais pomėgiais.', letter: 'E' },
    //             { text: 'Mėgstu užsiimti kūrybine veikla arba atrasti naują hobį.', letter: 'N' },
    //             { text: 'Man patinka įprasti, ramūs ritualai, kaip TV žiūrėjimas ar maisto gaminimas.', letter: 'S' }
    //         ]
    //     },
    //     {
    //         question: 'Kaip elgiesi su konfliktu komandos aplinkoje?',
    //         answers: [
    //             { text: 'Stengiuosi tarpininkauti ir rasti kompromisą.', letter: 'F' },
    //             { text: 'Sprendžiu problemą tiesiogiai ir ieškau logiško sprendimo.', letter: 'T' },
    //             { text: 'Stengiuosi vengti konflikto ir tikiuosi, kad jis išsispręs savaime.', letter: 'I' },
    //             { text: 'Jaučiu nusivylimą, bet nekalbu, nebent tai tikrai būtina.', letter: 'S' }
    //         ]
    //     },
    //     {
    //         question: 'Kaip sprendi problemas?',
    //         answers: [
    //             { text: 'Surinkau visus faktus ir logiškai analizuoju, kad rasti sprendimą.', letter: 'T' },
    //             { text: 'Pasitikiu savo intuicija ir ieškau modelių arba įžvalgų, kurios nėra akivaizdžios.', letter: 'N' },
    //             { text: 'Atsižvelgiu į žmonių poreikius ir siekiu sprendimo, kuris tinka visiems.', letter: 'F' },
    //             { text: 'Rimtuosi į patikrintus metodus, kurie veikė praeityje.', letter: 'S' }
    //         ]
    //     },
    //     {
    //         question: 'Kaip prioritetuoji užduotis?',
    //         answers: [
    //             { text: 'Nustatau prioritetus pagal terminus ir svarbą, laikydamasis griežto grafiko.', letter: 'J' },
    //             { text: 'Dirbu su tuo, kas man tuo metu įdomiausia, ir keičiu prioritetus pagal poreikį.', letter: 'P' },
    //             { text: 'Rinkiuosi užduotis, kurios dera su ilgalaike vizija ir tikslais.', letter: 'N' },
    //             { text: 'Imuosi užduočių pagal jų tiesioginę praktinę naudą.', letter: 'S' }
    //         ]
    //     },
    //     {
    //         question: 'Kaip tau patinka komunikuoti savo idėjas?',
    //         answers: [
    //             { text: 'Mėgstu jas atvirai aptarti su grupe.', letter: 'E' },
    //             { text: 'Labiau mėgstu apmąstyti ir pasidalinti raštu.', letter: 'I' }
    //         ]
    //     },
    //     {
    //         question: 'Kaip vertini projekto sėkmę?',
    //         answers: [
    //             { text: 'Pagal pasiektą efektyvumą ir rezultatus.', letter: 'T' },
    //             { text: 'Pagal žmonių, dalyvavusių projekte, pasitenkinimą ir gerovę.', letter: 'F' }
    //         ]
    //     }
    // ];

    const quizData = [
        {
            question: '',
            answers: [
                { text: 'Geriausia, kai galiu dieną pradėti peržiūrėjus darbų sąrašą ir detaliai suplanavus darbotvarkę.', letter: 'J' },
                { text: 'Pradedant ar jau vykdant projektą, man svarbu užtikrinti, kad rezultatai ir sprendimai atitiktų visų susijusių šalių poreikius.', letter: 'F' },
                { text: 'Mane motyvuoja praktinė užduoties nauda ir apčiuopiami darbo rezultatai.', letter: 'S' },
                { text: 'Kilus konfliktui darbe, problemą imuosi spręsti tiesiogiai ir visų pirma ieškau logiškiausio varianto.', letter: 'T' },
                { text: 'Atėjus idėjai, man geriausia ją pirmiau apmąstyti vienumoje ir tuomet su kitais  pasidalinti raštu.', letter: 'I' }
            ]
        },
        // {
        //     question: '',
        //     answers: [
        //         { text: 'Kad išlaikyčiau motyvaciją, man svarbus lankstumas - galimybė prisitaikyti ir keisti planus, kai to reikia.', letter: 'P' },
        //         { text: 'Iškilus konfliktui komandoje, stengiuosi tarpininkauti ir padėti rasti kompromisą.', letter: 'F' },
        //         { text: 'Kai turiu daug darbo, labiausiai dėmesį sutelkiu į kylančias situacijas ir prioritetus nustatau pagal tai, kas tuo metu svarbiausia.', letter: 'T' },
        //         { text: 'Man svarbu dirbant kiek įmanoma labiau laikytis pirminio plano.', letter: 'S' },
        //         { text: 'Man kur kas svarbiau pasiekti aukštą kūrybiškumo lygį ir geriausią įmanomą rezultatą, nei griežtai laikytis nustatytų terminų.', letter: 'N' }
        //     ]
        // },
        // {
        //     question: '',
        //     answers: [
        //         { text: 'Kilus problemai, man geriausia neišradinėti dviračio ir naudoti patikrintus metodus, kurie veikė praeityje.', letter: 'S' },
        //         { text: 'Darbe / komandoje konfliktų kilti neturėtų. Manau, kad kiekvienas turėtų išsispręsti savo problemas asmeniškai.', letter: 'I' },
        //         { text: 'Džiaugiuosi, kai nenumatyti pasikeitimai planuose man atneša galimybę patyrinėti naujas kryptis ir galimybes.', letter: 'N' },
        //         { text: 'Stengiuosi darbų nepradėti, kol neaptariu ir nesuderinu veiksmai su klientais / kolegomis.', letter: 'E' },
        //         { text: 'Projekto sėkmę vertinu labiausiai pagal tai, kiek jis išpildo suinteresuotų šalių pasitenkinimą ir gerovę.', letter: 'F' }
        //     ]
        // },
        // {
        //     question: '',
        //     answers: [
        //         { text: 'Man geriausia dieną pradėti nuo naujausių užduočių / užklausų ir dirbant atsižvelgti į tolesnę įvykių eigą.', letter: 'P' },
        //         { text: 'Mėgstu dalintis inovatyviomis idėjomis, kurios skatina kūrybiškumą ir naujas kryptis darbe.', letter: 'N' },
        //         { text: 'Mėgstu bendrauti ir dalintis idėjomis su kitais komandos nariais.', letter: 'E' },
        //         { text: 'Kai turiu pasirinkti, ką iš daugybės užduočių atlikti pirmiausiai, renkuosi pagal jų tiesioginę praktinę naudą.', letter: 'S' },
        //         { text: 'Vertinu galimybę dirbti savarankiškai ir apgalvoti sprendimus ramioje aplinkoje.', letter: 'I' }
        //     ]
        // },
        // {
        //     question: '',
        //     answers: [
        //         { text: 'Kilus nenumatytai problemai mano įgyvendinamame projekte, pirmiausiai surenku visus faktus ir jais remiantis ieškau logiškiausio sprendimo.', letter: 'T' },
        //         { text: 'Savo užduotis planuoju iš anksto ir jas užbaigiu dažnai dar gerokai prieš galutinį terminą.', letter: 'J' },
        //         { text: 'Pasikeitimai darbotvarkėje ar planuose man ne trukdo, o padeda atrasti naujų galimybių!', letter: 'P' },
        //         { text: 'Kilus konfliktinei situacijai darbe, svarbu visiems aktyviai ją aptarti ir išreikšti savo nuomonę.', letter: 'E' },
        //         { text: 'Kai darbo daug, svarbu prioritetą teikti užduotims, kurios atitinka ilgalaikę viziją ir tikslus.', letter: 'N' },

        //     ]
        // },
        // {
        //     question: '',
        //     answers: [
        //         { text: 'Kilus nenumatytai problemai, nedelsiant ieškau greito ir efektyvaus sprendimo, kuris iš karto galėtų būti pritaikytas.', letter: 'P' },
        //         { text: 'Labiau mėgstu dirbti savarankiškai ir pasidalinti rezultatais su komanda vėliau.', letter: 'I' },
        //         { text: 'Man svarbu, kad dirbant komandoje visi galėtų laisvai dalintis idėjomis ir prisidėti prie bendro rezultato.', letter: 'N' },
        //         { text: 'Geriausia motyvacija - pasiekti norimą tikslą ir užduotį išbraukti iš sąrašo.', letter: 'J' }, 
        //         { text: 'Geriausiai pailsiu, kai galiu pabendrauti arba užsiimti aktyviais pomėgiais.', letter: 'E' },

        //     ]
        // },
        // {
        //     question: '',
        //     answers: [
        //         { text: 'Svarbu dieną pradėti sutelkiant dėmesį į tą užduotį, kurią reikia atlikti pirmiausia.', letter: 'S' },
        //         { text: 'Kalbant apie naujas idėjas darbe, svarbiau atsižvelgti į galimybę sklandžiai ir efektyviai jas pritaikyti, o ne į jų kūrybiškumą.', letter: 'T' },
        //         { text: 'Projekto sėkmė tiesiogiai priklauso nuo to, kiek projekto įgyvendinimo metu gebama laikytis pirminio plano ir tvarkos.', letter: 'J' },
        //         { text: 'Kilus problemai darbe, svarbu atsižvelgti  į komandos narių poreikius ir siekti sprendimo, kuris būtų priimtinas visiems.', letter: 'F' },
        //         { text: 'Projekto sėkmę vertinu pagal tai, kaip lengvai jis buvo įgyvendintas ir kokių trukdžių buvo išvengta.', letter: 'P' }
        //     ]
        // },
        // {
        //     question: '',
        //     answers: [
        //         { text: 'Man motyvacijos stueikia žinojimas, kad mano darbas padeda kitiems ir prisideda prie bendros gerovės.', letter: 'F' },
        //         { text: 'Po ilgos darbo dienos pailsėti man padeda rami veikla, tokia, kaip skaitymas ar meditacija.', letter: 'I' },
        //         { text: 'Kilus naujoms idėjoms, geriausia jas atvirai aptarti su komanda / klientais.', letter: 'E' },
        //         { text: 'Kai turiu padaryti daug, pirmiausiai nustatau prioritetus pagal terminus ir svarbą, ir griežtai laikausi sudaryto grafiko.', letter: 'J' },
        //         { text: 'Projekto sėkmę geriausia vertinti pagal veiksmų efektyvumą ir pasiektus rezultatus.', letter: 'T' }
        //     ]
        // }
    ];

    const points = [
        "100% ne aš",
        "Nepanašu į mane",
        "Gaaaal kartais",
        "Skamba panašiai",
        "100% AŠ!"
    ];

    const tieBreakerQuestions = [
        {
            question: 'Kai turi svarbią užduotį atlikti, kaip renkiesi spręsti problemas?',
            answers: [
                { text: 'Man patinka pasitarti su kolegomis ir kartu aptarti galimus sprendimus.', letter: 'E' },
                { text: 'Mėgstu ramiai apmąstyti galimus sprendimus vienumoje, prieš pasidalinant su kitais.', letter: 'I' }
            ]
        },
        {
            question: 'Kaip planuoji ilgalaikį projektą?',
            answers: [
                { text: 'Labiau pasikliauju konkrečiais faktais, ankstesne patirtimi ir žingsnių planu.', letter: 'S' },
                { text: 'Pradedu nuo vizijos kūrimo ir ieškau naujų galimybių bei kūrybiškų sprendimų.', letter: 'N' }
            ]
        },
        {
            question: 'Kaip priimi sprendimą dėl komandos nario veiklos?',
            answers: [
                { text: 'Vertinu pagal objektyvius rezultatus ir veiklos efektyvumą.', letter: 'T' },
                { text: 'Atsižvelgiu į komandos nario pastangas ir kaip tai paveiks jo motyvaciją bei jausmus.', letter: 'F' }
            ]
        },
        {
            question: 'Kaip tvarkaisi su pasikeitimais projekte?',
            answers: [
                { text: 'Stengiuosi laikytis pirminio plano ir kiek įmanoma išvengti pakeitimų.', letter: 'J' },
                { text: 'Lengvai prisitaikau prie pakeitimų ir dažnai randu naujų būdų veiksmingai išspręsti situacijas.', letter: 'P' }
            ]
        }
    ];

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
    
    const handleChange = (answerLetter, points, variantIndex) => {
        setSelectedAnswers((prevAnswers) => {
            const [sum] = prevAnswers[answerLetter]; // Destructure the sum from the array
            return {
                ...prevAnswers,
                [answerLetter]: [sum, points] // Update only passedNumber, keep sum unchanged
            };
        });
        setCurrentVariant((prevVariant) => 
            variantIndex < currentVariant ? currentVariant : (prevVariant + 1) >= quizData[currentQuestion].answers.length ? currentVariant : prevVariant + 1
        );

        // const element = document.getElementById(`variant-${answerLetter}`);
        //     if (element) {
        //     element.scrollIntoView( true, {
        //         behavior: 'smooth',
        //         block: 'center',
        //     });
        //     }

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

    // // Function to move to the next question
    // const handleNextQuestion = () => {
    //     setSelectedAnswers((prevAnswers) => {
    //     const updatedAnswers = { ...prevAnswers };
        
    //         // Iterate over each letter and update the sums
    //         Object.keys(updatedAnswers).forEach((letter) => {
    //             updatedAnswers[letter][0] += updatedAnswers[letter][1]; // Add current points to the sum
    //             updatedAnswers[letter][1] = 0; // Reset current points to 0 for the next question
    //         });
        
    //     return updatedAnswers;
    //     });
        
    //     if (currentQuestion < quizData.length - 1) {
    //         setCurrentQuestion(currentQuestion + 1);
    //         setCurrentVariant(0);
    //         const element = document.getElementsByClassName('variant active')[0];
    //         if (element) {
    //         element.scrollIntoView( true, {
    //             behavior: 'smooth',
    //             block: 'center',
    //         });
    //         }

    //     } else {
    //         setCurrentQuestion(currentQuestion + 1);
    //         setCurrentVariant(0);
    //         const pairs = [
    //             { key1: 'E', key2: 'I', index: 0 },
    //             { key1: 'S', key2: 'N', index: 1 },
    //             { key1: 'T', key2: 'F', index: 2 },
    //             { key1: 'J', key2: 'P', index: 3 }
    //           ];

    //           pairs.forEach(({ key1, key2, index }) => {


    //           if (selectedAnswers[key1][0] === selectedAnswers[key2][0]) {
    //             setTieBreak((prevTieBreak) => [ ...prevTieBreak, index]);

    //           }

    //           });

             

    //         // Handle end of quiz logic, maybe show results or reset the quiz

    //     }
    // };

    const activeElementRef = useRef(null);

    useEffect(() => {
        if (activeElementRef.current) {
            activeElementRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start', 
            });
        }
    }, [tieBreak, currentVariant, currentQuestion, currentTieBreakQuestion]);


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

        if (currentQuestion === quizData.length - 1) {
            console.log('end of quiz');
            console.log(currentTieBreakQuestion);
            
            // Handle end of quiz logic, maybe show results or reset the quiz
            // 
        }
    };

    const showResult = () => {
        //show partial result

        setTieBreak([]);
        setShowResultContainer(!showResultContainer);
        

    };

    const sendEmail = () => {

        //ajax with dichotomy and email users

    };


    return (

        
        <>

            {quizData[currentQuestion] && quizData[currentQuestion].answers.map((answer, answerIndex) => (
                <div className={`variant ${currentVariant !== answerIndex ? 'inactive' : 'active'}`} id={`variant-${answer.letter}`} ref={currentVariant !== answerIndex ? activeElementRef : null}>
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
                    <div id="tie-break" key={index} ref={index === currentTieBreakQuestion ? activeElementRef : null}>
                    <p>{tieBreakerQuestions[q].question}</p>
                    
                    {tieBreakerQuestions[q].answers.map((a, idx) => (
                        <div class="tie-break-control">
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
                );
                })}

                {showResultContainer && 
                    <div>
                        rezultatas
                    </div>

                }
            


            <button
                type="button"
                id="next-question-button"
                className={`next-question-button ${quizData[currentQuestion] && currentVariant + 1 >= quizData[currentQuestion].answers.length ? '' : 'hidden'}`}
                onClick={handleNextQuestion}
            >
                Next Question
            </button>
            <button
                type="button"
                id="show-answer-button"
                className={`show-answer-button ${!quizData[currentQuestion] ? '' : 'hidden'}`}
                onClick={showResult}
            >
                show answer
            </button>
            <button
                type="button"
                id="send-email-button"
                className={`send-email-button ${false ? '' : 'hidden'}`}
                onClick={sendEmail}
            >
                send email
            </button>
        </>
    );
};




const question = `<div class="qa">
                    <div class="question-container">
                        <h1 class="question">klausimo tekstas</h1>
                    </div>

                        <div class="variant" id="variant-<?php echo esc_attr($letter); ?>">
                            <p style="text-align: center;" data-dichotomy="<?php echo esc_attr($letter); ?>">
                                <?php echo esc_html($text); ?>
                            </p>
                            <div class="choice-slider">
                                <?php
                                foreach ($points as $i => $value) {
                                    $i += 1; // Increment for unique input id
                                ?>
                                    <input type="radio" class="choice-input" name="points-<?php echo esc_attr($key); ?>" id="points-<?php echo esc_attr($key); ?>-<?php echo esc_attr($i); ?>" value="<?php echo esc_attr($i); ?>" required>
                                    <label for="points-<?php echo esc_attr($key); ?>-<?php echo esc_attr($i); ?>" class="choice-label" data-points="<?php echo esc_attr($value); ?>"></label>
                                <?php } ?>
                                <div class="points-pos" id="points-pos-<?php echo esc_attr($key); ?>"></div>
                            </div>
                        </div>
                    <?php } ?>
                    <button type="button" class="next-question-button" style="display:none;">Next Question</button>
                    </div>`;


// document.addEventListener('DOMContentLoaded', function () {
//     const allQuestions = document.querySelectorAll('.qa');
//     let currentQuestionIndex = 0;
//     let currentVariantIndex = 0;



//     // Enable scrolling through variants
//     document.querySelectorAll('.choice-input').forEach((input, index) => {
//         input.addEventListener('click', function () {
//             currentVariantIndex++;
//             // Check if it is the last variant in the current question
//             if (currentVariantIndex < currentVariants.length) {
//                 // Scroll to the next variant
//                 currentVariants[currentVariantIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
//             } else {
//                 // Enable the "Next Question" button
//                 const nextButton = allQuestions[currentQuestionIndex].querySelector('.next-question-button');
//                 nextButton.style.display = 'inline-block';
//                 nextButton.addEventListener('click', function () {
//                     // Hide current question
//                     allQuestions[currentQuestionIndex].classList.remove('qa-active');
//                     allQuestions[currentQuestionIndex].classList.add('qa-hidden');
                    
//                     // Show next question
//                     currentQuestionIndex++;
//                     if (currentQuestionIndex < allQuestions.length) {
//                         allQuestions[currentQuestionIndex].classList.remove('qa-hidden');
//                         allQuestions[currentQuestionIndex].classList.add('qa-active');
//                         currentVariantIndex = 0; // Reset variant index for the new question
//                         const nextVariants = allQuestions[currentQuestionIndex].querySelectorAll('.variant');
//                         nextVariants[currentVariantIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
//                     } else {
//                         // If no more questions, show submit button
//                         document.querySelector('.submit-button').style.display = 'inline-block';
//                     }
//                 });
//             }
//         });
//     });
// });
