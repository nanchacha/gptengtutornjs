'use client';
import React, { useState, useRef } from 'react';

export default function HomePage() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [recording, setRecording] = useState(false);

  const recognitionRef = useRef(null);
  // 최신 transcript를 저장할 Ref
  const currentTranscriptRef = useRef('');

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
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setRecording(true);
      console.log('녹음 시작');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('onresult - 인식 결과:', transcript);
      // state 업데이트 + Ref 동시 저장
      setPrompt(transcript);
      currentTranscriptRef.current = transcript;
    };

    recognition.onerror = (e) => {
      console.error('녹음 에러:', e.error);
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
      console.log('녹음 종료(onend)');
      // 여기서 Ref에 있는 transcript를 사용
      const finalTranscript = currentTranscriptRef.current;
      if (finalTranscript.trim()) {
        callChatGPT(finalTranscript);
      } else {
        console.log('No recognized text, skip callChatGPT.');
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      console.log('Stop Recording → recognition.stop()');
    }
  };

  const callChatGPT = async (spokenText) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: spokenText }),
      });
      if (!res.ok) {
        const errMsg = await res.text();
        console.error('API Error:', errMsg);
        throw new Error(errMsg);
      }
      const data = await res.json();
      setResponse(data.response);
      speakText(data.response);
    } catch (error) {
      console.error('Error calling ChatGPT:', error);
      alert('ChatGPT API 호출 중 오류가 발생했습니다.');
    }
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) {
      alert('이 브라우저는 음성 출력을 지원하지 않습니다.');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
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
            말하기 시작하기 버튼
          </button>
        ) : (
          <button
            className="bg-red-500 text-white px-4 py-2 rounded mr-2 hover:bg-red-600"
            onClick={stopRecording}
          >
           그만 말하기 버튼
          </button>
        )}
      </div>
      <div className="mb-4">
        <strong>Response from ChatGPT:</strong>
        <div className="border border-gray-300 p-4 min-h-[100px] mt-2">
          {response}
        </div>
      </div>
    </div>
  );
}
