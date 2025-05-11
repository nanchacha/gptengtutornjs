'use client';

import React, { useState, useRef, useEffect } from 'react';

export default function HomePage() {
  const [imageUrl, setImageUrl] = useState(null); // 이미지 상태 추가
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [recording, setRecording] = useState(false);

  const recognitionRef = useRef(null);
  const transcriptRef = useRef(''); // 최신 transcript 관리
  const isAPICalledRef = useRef(false); // API 호출 여부 추적

  // Unsplash API로 이미지 가져오기
  async function fetchImageFromUnsplash(keyword) {
    const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || 'YOUR_UNSPLASH_ACCESS_KEY'; // 환경변수 권장
    if (!accessKey || accessKey === 'YOUR_UNSPLASH_ACCESS_KEY') return null;
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&client_id=${accessKey}`
      );
      const data = await res.json();
      return data.results?.[0]?.urls?.small || null;
    } catch (e) {
      return null;
    }
  }

  // 프롬프트가 바뀔 때마다 이미지 검색
  useEffect(() => {
    if (prompt.trim()) {
      fetchImageFromUnsplash(prompt).then(setImageUrl);
    } else {
      setImageUrl(null);
    }
  }, [prompt]);

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
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setRecording(true);
      isAPICalledRef.current = false; // 녹음 시작 시 API 호출 플래그 초기화
      console.log('녹음 시작');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('인식 결과:', transcript);

      transcriptRef.current = transcript; // Ref에 저장
      setPrompt(transcript); // UI 업데이트

      // API가 호출되지 않은 경우에만 호출
      if (!isAPICalledRef.current) {
        isAPICalledRef.current = true; // 호출 상태 업데이트
        callChatGPT(transcript);
      }
    };

    recognition.onerror = (e) => {
      console.error('녹음 에러:', e.error);
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
      console.log('녹음 종료(onend)');

      // onresult에서 API가 호출되지 않은 경우에만 호출
      if (!isAPICalledRef.current) {
        const finalPrompt = transcriptRef.current.trim();
        if (finalPrompt) {
          isAPICalledRef.current = true;
          callChatGPT(finalPrompt);
        } else {
          console.log('No transcript detected, skipping API call.');
        }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  /**
   * 2) Stop Recording: 명시적으로 녹음을 중지
   */
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    console.log('Stop Recording clicked');
  };

  /**
   * 3) ChatGPT API 호출
   */
  const callChatGPT = async (spokenText) => {
    if (!spokenText.trim()) {
      alert('질문(프롬프트)을 입력하거나 음성으로 말해보세요.');
      return;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: spokenText }),
      });

      if (!res.ok) {
        console.error('API Error:', await res.text());
        throw new Error('API request failed');
      }

      const data = await res.json();
      setResponse(data.response);

      // 추가 TTS 호출 (ElevenLabs 등)
      await speakWithElevenLabs(data.response);
    } catch (error) {
      console.error('Error calling ChatGPT:', error);
      alert('ChatGPT API 호출 중 오류가 발생했습니다.');
    }
  };

  /**
   * 4) ElevenLabs TTS 호출 + 클라이언트에서 재생
   */
  const speakWithElevenLabs = async (text) => {
    try {
      const API_KEY = 'sk_17872d1609034ac592a45fb422081edefd9d42496ca03115'; // 실제 API 키
      const VOICE_ID = 'cgSgspJ2msm6clMCkdW9'; // ElevenLabs 목소리 ID

      const ttsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
        {
          method: 'POST',
          headers: {
            accept: 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': API_KEY,
          },
          body: JSON.stringify({
            text: text,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        }
      );

      if (!ttsResponse.ok) {
        console.error('ElevenLabs TTS Error:', await ttsResponse.text());
        throw new Error('Failed to fetch TTS audio from ElevenLabs');
      }

      const audioArrayBuffer = await ttsResponse.arrayBuffer();
      const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audio.play();
    } catch (err) {
      console.error('speakWithElevenLabs error:', err);
      alert('ElevenLabs 음성 재생 실패');
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4">
      {/* 이미지 표시 영역 */}
      <div
        style={{
          width: 300,
          height: 200,
          border: '1px solid #ccc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          background: '#f9f9f9',
        }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="Related visual" style={{ maxWidth: '100%', maxHeight: '100%' }} />
        ) : (
          <span style={{ color: '#aaa' }}>선생님이 생각하는 이미지를 검색하는 중</span>
        )}
      </div>
      <h1 className="text-2xl font-bold mb-4">
        ChatGPT English Speaking Demo (with ElevenLabs)
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
    </div>
  );
}
