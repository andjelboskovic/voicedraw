import { useState, useRef, useCallback, useEffect } from "react";

interface UseSpeechRecognitionReturn {
  transcript: string;
  interimText: string;
  isListening: boolean;
  isBrowserSupported: boolean;
  start: () => void;
  stop: () => void;
  error: string | null;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const wantListeningRef = useRef(false);

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const isBrowserSupported = !!SpeechRecognition;

  const createRecognition = useCallback(() => {
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        setTranscript((prev) => prev + final);
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      setError(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      if (wantListeningRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch {
            // Already started, ignore
          }
        }, 100);
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, [SpeechRecognition]);

  const start = useCallback(() => {
    if (!isBrowserSupported) {
      setError("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }
    setError(null);
    wantListeningRef.current = true;

    if (!recognitionRef.current) {
      recognitionRef.current = createRecognition();
    }
    try {
      recognitionRef.current?.start();
      setIsListening(true);
    } catch {
      // Already started
    }
  }, [isBrowserSupported, createRecognition]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText("");
  }, []);

  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  return { transcript, interimText, isListening, isBrowserSupported, start, stop, error };
}
