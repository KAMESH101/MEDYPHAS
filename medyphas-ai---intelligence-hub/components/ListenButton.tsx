import React, { useEffect, useRef, useState } from 'react';
import { api, ReportLanguage } from '../services/api';

const SPEECH_LANG: Record<ReportLanguage, string> = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN' };

// Once the server says TTS isn't available, go straight to browser speech for this session.
let serverTtsUnavailable = false;

interface ListenButtonProps {
    text: string;
    language: ReportLanguage;
}

/** Reads text aloud: Gemini TTS via the backend, falling back to the browser's speechSynthesis. */
export const ListenButton: React.FC<ListenButtonProps> = ({ text, language }) => {
    const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
    const [note, setNote] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const stop = () => {
        audioRef.current?.pause();
        audioRef.current = null;
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        setState('idle');
    };

    useEffect(() => stop, [text, language]);

    const speakInBrowser = () => {
        if (!('speechSynthesis' in window)) {
            setNote('Read-aloud is not supported in this browser.');
            setState('idle');
            return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = SPEECH_LANG[language];
        const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(language));
        if (voice) utterance.voice = voice;
        else if (language !== 'en') setNote('Your device may not have a voice for this language.');
        utterance.onend = () => setState('idle');
        utterance.onerror = () => setState('idle');
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        setState('playing');
    };

    const listen = async () => {
        if (state !== 'idle') {
            stop();
            return;
        }
        setNote(null);
        if (serverTtsUnavailable) {
            speakInBrowser();
            return;
        }
        setState('loading');
        try {
            const blob = await api.speak(text, language);
            const audio = new Audio(URL.createObjectURL(blob));
            audioRef.current = audio;
            audio.onended = () => setState('idle');
            await audio.play();
            setState('playing');
        } catch {
            serverTtsUnavailable = true;
            speakInBrowser();
        }
    };

    return (
        <div className="inline-flex flex-col items-start gap-1">
            <button
                onClick={listen}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg hover:bg-indigo-700 transition-colors"
                aria-label={state === 'idle' ? 'Listen to the explanation' : 'Stop reading'}
            >
                <span className={`material-symbols-outlined ${state === 'loading' ? 'animate-spin' : ''}`}>
                    {state === 'loading' ? 'progress_activity' : state === 'playing' ? 'stop_circle' : 'volume_up'}
                </span>
                {state === 'playing' ? 'Stop' : 'Listen'}
            </button>
            {note && <span className="text-xs text-slate-500">{note}</span>}
        </div>
    );
};
