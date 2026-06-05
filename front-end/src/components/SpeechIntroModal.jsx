// SpeechIntroModal.jsx - 김민규 작성
import React, { useState } from 'react';

const questions = [
  { key: 'name', label: '이름을 입력하세요' },
  { key: 'birth', label: '출생년도를 입력하세요 (예: 1995)' },
  { key: 'hometown', label: '고향을 입력하세요' }
];

export default function SpeechIntroModal({ onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const handleNext = () => {
    if (step < questions.length - 1) setStep(step + 1);
    else onComplete(answers);
  };

  return (
    <div className="modal">
      <h2>자기소개</h2>
      <label>{questions[step].label}</label>
      <input
        type="text"
        value={answers[questions[step].key] || ''}
        onChange={e =>
          setAnswers({ ...answers, [questions[step].key]: e.target.value })
        }
      />
      <button onClick={handleNext}>
        {step < questions.length - 1 ? '다음' : '완료'}
      </button>
    </div>
  );
}