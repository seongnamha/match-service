import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// Interfaces for type safety
interface IQuestion {
    question: string;
    options: string[];
}

interface IResult {
    title: string;
    strengths: string;
    weaknesses: string;
    mainWeakness: string;
    summary: string;
    score: number;
    emoji: string;
    animal: string;
}

const App = () => {
    const [screen, setScreen] = useState('onboarding'); // onboarding, gender, age, quiz, loading, results, error
    const [gender, setGender] = useState('');
    const [age, setAge] = useState('');
    const [questions, setQuestions] = useState<IQuestion[]>([]);
    const [answers, setAnswers] = useState<number[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [result, setResult] = useState<IResult | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState('');

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const handleStart = () => setScreen('gender');

    const handleStartQuiz = async () => {
        setError('');
        setLoadingMessage('당신을 위한 질문을 만들고 있어요...');
        setScreen('loading');

        try {
            const prompt = `당신은 심리학 박사입니다. ${age} ${gender === 'male' ? '남성' : '여성'}의 연애 스타일에 맞춰진, 그들의 공감을 살 수 있는 10개의 짧은 객관식 질문을 만들어 주세요. 질문은 해당 연령대와 성별의 관심사와 고민을 현실적으로 반영해야 합니다. 각 질문에는 5개의 선택지가 있어야 합니다. 질문은 한국어로 하고, JSON 형식의 문자열 배열로 반환해 주세요. 각 객체는 "question"과 5개의 문자열을 담은 "options" 배열을 포함해야 합니다. 예: [{"question": "...", "options": ["...", "...", "...","...","..."]}, ...]`;
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING },
                                options: {
                                    type: Type.ARRAY,
                                    items: { type: Type.STRING }
                                }
                            },
                            required: ["question", "options"]
                        }
                    }
                }
            });
            const generatedQuestions: IQuestion[] = JSON.parse(response.text);
            setQuestions(generatedQuestions);
            setAnswers(new Array(generatedQuestions.length).fill(-1)); // -1 for unanswered
            setCurrentQuestionIndex(0);
            setScreen('quiz');
        } catch (err) {
            setError('질문을 생성하는 데 실패했습니다. 잠시 후 다시 시도해 주세요.');
            setScreen('error');
            console.error(err);
        }
    };

    const handleAnswerSelect = (optionIndex: number) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = optionIndex;
        setAnswers(newAnswers);

        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
            } else {
                 const adMessages = [
                    "AI가 당신의 매력을 분석하는 중... 이 시간은 우주적 지혜와 (가상의) 광고주가 함께 제공합니다! 🚀",
                    "결과를 계산하는 중... 잠깐! 이 멋진 (상상속의) 광고 보고 가실게요! 😉",
                    "당신의 미래를 예측하고 있습니다... 잠시 후 가상의 광고가 끝나면 결과가 표시됩니다. 채널 고정! 📺"
                ];
                setLoadingMessage(adMessages[Math.floor(Math.random() * adMessages.length)]);
                setScreen('loading');
                analyzeAnswers();
            }
        }, 400); // Short delay for visual feedback
    };

    const analyzeAnswers = async () => {
        try {
            const qaPairs = questions.map((q, i) => `질문: ${q.question}\n선택한 답변: ${q.options[answers[i]]}`).join('\n\n');
            const prompt = `당신은 유머러스하고 재치있는 심리학 박사이자, 때로는 뼈아픈 조언을 하는 코미디언입니다. ${age} ${gender === 'male' ? '남성' : '여성'} 사용자가 다음 질문에 이렇게 답했습니다:\n\n${qaPairs}\n\n이 답변들을 바탕으로, 사용자의 연애 매력을 분석해 주세요. 분석 내용은 다음과 같은 JSON 형식으로 반환해야 합니다:\n- "title": 사용자의 성격 유형에 대한 재치있는 제목\n- "strengths": 장점을 매우 유머러스하고 과장되게 칭찬하는 내용 (100자 내외)\n- "weaknesses": 단점을 코미디언이 청중에게 말하듯, 웃기면서도 정곡을 찌르는 말투로 지적하는 내용. 예를 들어, '그렇게 해서 연애를 할 수 있겠어요?' 같은 느낌으로 작성 (100자 내외)\n- "mainWeakness": 단점의 핵심을 나타내는 한두 단어의 키워드 (예: '결정장애', '짠돌이 기질')\n- "summary": 전체적인 연애 스타일에 대한 코믹하고 유쾌한 총평 (300자 내외)\n- "score": '이성에게 사랑받는 정도'를 100점 만점의 점수로 평가\n- "emoji": 사용자의 분위기를 나타내는 이모지 하나\n- "animal": 사용자의 성격과 가장 닮은 동물 하나\n\n전체 결과를 {"title": "...", "strengths": "...", "weaknesses": "...", "mainWeakness": "...", "summary": "...", "score": ..., "emoji": "...", "animal": "..."} 형식의 JSON 객체로 반환해 주세요.`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            strengths: { type: Type.STRING },
                            weaknesses: { type: Type.STRING },
                            mainWeakness: { type: Type.STRING },
                            summary: { type: Type.STRING },
                            score: { type: Type.INTEGER },
                            emoji: { type: Type.STRING },
                            animal: { type: Type.STRING }
                        },
                        required: ["title", "strengths", "weaknesses", "mainWeakness", "summary", "score", "emoji", "animal"]
                    }
                }
            });
            const resultData = JSON.parse(response.text);
            setResult(resultData);
            setScreen('results');
        } catch (err) {
            setError('결과를 분석하는 데 실패했습니다. 잠시 후 다시 시도해 주세요.');
            setScreen('error');
            console.error(err);
        }
    };
    
    const handleReset = () => {
        setScreen('onboarding');
        setGender('');
        setAge('');
        setQuestions([]);
        setAnswers([]);
        setCurrentQuestionIndex(0);
        setResult(null);
        setError('');
        setLoadingMessage('');
    };

    const ageRanges = ["10대", "20대", "30대", "40대", "50대", "60대 이상"];


    const renderScreen = () => {
        switch (screen) {
            case 'onboarding':
                return (
                    <div className="container">
                        <h1 className="fun-title">당신의 매력도는 몇점?</h1>
                        <h1>네온 러브 테스트</h1>
                        <p>10가지 질문으로 당신의 숨겨진 연애 매력을 알려드려요.</p>
                        <p><strong>주의:</strong> 이 테스트는 재미를 위한 것이며, 과학적인 근거는 없습니다.</p>
                        <button className="pink" onClick={handleStart}>테스트 시작</button>
                    </div>
                );
            case 'gender':
                return (
                    <div className="container">
                        <h2>당신의 성별은?</h2>
                        <div className="demographics-group">
                             <div className="button-group">
                                <button onClick={() => { setGender('male'); setScreen('age'); }}>남성</button>
                                <button onClick={() => { setGender('female'); setScreen('age'); }}>여성</button>
                             </div>
                        </div>
                    </div>
                );
            case 'age':
                return (
                    <div className="container">
                         <h2>당신의 나이대는?</h2>
                         <div className="demographics-group">
                            <h3 className="selection-display">{gender === 'male' ? '남성' : '여성'}</h3>
                             <div className="button-group">
                                {ageRanges.map(ageRange => (
                                    <button key={ageRange} className={age === ageRange ? 'selected' : ''} onClick={() => setAge(ageRange)}>{ageRange}</button>
                                ))}
                             </div>
                        </div>
                        <button className="pink" onClick={handleStartQuiz} disabled={!age}>
                            퀴즈 시작하기
                        </button>
                    </div>
                );
            case 'quiz':
                return (
                    <div className="container">
                        <div className="progress-bar-container">
                            <div className="progress-bar" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}></div>
                        </div>
                        <h2>질문 {currentQuestionIndex + 1}</h2>
                        <p>{questions[currentQuestionIndex]?.question}</p>
                        <div className="options-grid">
                            {questions[currentQuestionIndex]?.options.map((option, index) => (
                                <button 
                                    key={index}
                                    className={`option-button ${answers[currentQuestionIndex] === index ? 'selected' : ''}`}
                                    onClick={() => handleAnswerSelect(index)}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 'loading':
                return (
                    <div className="container">
                        <div className="loader"></div>
                        <p style={{whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '1.1rem'}}>{loadingMessage}</p>
                    </div>
                );
            case 'results':
                if (!result) return null;
                return (
                    <div className="container">
                         <h1>{result.title} {result.emoji}</h1>
                         <div className="result-score-container">
                            <p>이성에게 사랑받는 정도</p>
                            <p className="result-score">{result.score}점</p>
                        </div>
                        <p style={{marginBottom: '30px'}}>당신과 닮은 동물은 바로... <strong>{result.animal}!</strong></p>

                         <div className="result-card">
                            <h3>⭐ 당신의 장점</h3>
                            <p>{result.strengths}</p>
                         </div>
                         <div className="result-card">
                            <h3>🤔 당신의 단점 ({result.mainWeakness})</h3>
                            <p>{result.weaknesses}</p>
                         </div>
                         <div className="result-card">
                            <h3>✍️ 총평</h3>
                            <p>{result.summary}</p>
                         </div>

                        <div className="button-group" style={{marginTop: '30px'}}>
                            <button className="pink" onClick={handleReset}>다시하기</button>
                        </div>
                    </div>
                );
             case 'error':
                return (
                    <div className="container">
                        <h2>오류 발생</h2>
                        <p>{error}</p>
                        <button className="pink" onClick={handleReset}>다시 시도하기</button>
                    </div>
                );
            default:
                return null;
        }
    };

    return <>{renderScreen()}</>;
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);