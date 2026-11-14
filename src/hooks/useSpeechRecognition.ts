import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseSpeechRecognitionOptions {
  onTranscriptChange?: (text: string) => void;
  lang?: string;
  continuous?: boolean;
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
  startListening: (initialText?: string) => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const { lang = 'en-US', continuous = false, onTranscriptChange } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const textAtStartRef = useRef<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore cleanup abort errors
        }
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(
    (initialText: string = '') => {
      if (typeof window === 'undefined') return;

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setError("Voice input isn't supported on this browser. You can still type your message.");
        return;
      }

      if (isListening) {
        stopListening();
        return;
      }

      setError(null);
      textAtStartRef.current = initialText.trim();

      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = continuous;
        recognition.interimResults = true;
        recognition.lang = navigator.language || lang;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let sessionTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            sessionTranscript += event.results[i][0].transcript;
          }

          if (sessionTranscript) {
            const combined = textAtStartRef.current
              ? `${textAtStartRef.current} ${sessionTranscript.trim()}`
              : sessionTranscript.trim();

            setTranscript(combined);
            if (onTranscriptChange) {
              onTranscriptChange(combined);
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition notice:', event.error);
          setIsListening(false);

          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            setError('Microphone access was denied. Please allow microphone permissions in your browser.');
          } else if (event.error === 'no-speech') {
            // Silently complete without error
          } else {
            setError('Voice input error. You can continue typing your message.');
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.warn('Could not start speech recognition:', err);
        setIsListening(false);
        setError('Could not start microphone. You can type your message.');
      }
    },
    [isListening, continuous, lang, onTranscriptChange, stopListening]
  );

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
    textAtStartRef.current = '';
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
