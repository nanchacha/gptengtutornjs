'use client';

import React, { useState, useRef } from 'react';

export default function HomePage() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [recording, setRecording] = useState(false);

  const recognitionRef = useRef(null);

  /**
   * 1) 브라우저 음성 인식 (STT)
   */
  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // 영어 인식

    recognition.onstart = () => {
      setRecording(true);
      console.log('녹음 시작');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('인식 결과:', transcript);
      setPrompt(transcript);
    };

    recognition.onend = () => {
      setRecording(false);
      console.log('녹음 종료');
    };

    recognition.onerror = (event) => {
      console.error('녹음 에러:', event.error);
      setRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  /**
   * 2) "Stop Recording" 시 자동으로 ChatGPT API 호출
   */
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setRecording(false);
      callChatGPT(); // 음성 인식이 끝난 후 API 호출
    }
  };

  /**
   * 3) ChatGPT API 호출
   */
  const callChatGPT = async () => {
    if (!prompt.trim()) {
      alert('질문(프롬프트)을 입력하거나 음성으로 말해보세요.');
      return;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        console.error('API Error:', await res.text());
        throw new Error('API request failed');
      }

      const data = await res.json();
      setResponse(data.response);

      // 자동 음성 출력
      speakText(data.response);
    } catch (error) {
      console.error('Error calling ChatGPT:', error);
      alert('ChatGPT API 호출 중 오류가 발생했습니다.');
    }
  };

  /**
   * 4) 브라우저 음성 출력 (TTS)
   */
  const speakText = (text) => {
    if (!window.speechSynthesis) {
      alert('이 브라우저는 음성 출력을 지원하지 않습니다.');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // 영어 음성
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        ChatGPT English Speaking Demo (Next.js 13 + Tailwind)
      </h1>
      <div className="mb-4">
        <textarea
          rows={3}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="마이크를 사용하거나 직접 입력해보세요."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>
      <div className="mb-4">
        {!recording ? (
          <button
            className="bg-green-500 text-white px-4 py-2 rounded mr-2 hover:bg-green-600"
            onClick={startRecording}
          >
            Start Recording
          </button>
        ) : (
          <button
            className="bg-red-500 text-white px-4 py-2 rounded mr-2 hover:bg-red-600"
            onClick={stopRecording}
          >
            Stop Recording
          </button>
        )}
      </div>
      <div className="mb-4">
        <strong>Response from ChatGPT:</strong>
        <div className="border border-gray-300 p-4 min-h-[100px] mt-2">
          {response}
        </div>
      </div>
      {/* Speak Response 버튼 제거 */}
    </div>
  );
}
