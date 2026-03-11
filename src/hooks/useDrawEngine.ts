import { useState, useRef, useCallback, useEffect } from "react";
import { streamTranscript } from "@/lib/claude";
import { createEmptyScene, applyIntent, sceneToContext } from "@/lib/sceneGraph";
import type { Scene, SceneIntent } from "@/types/scene";

const DEBOUNCE_MS = 1200;

export function useDrawEngine(transcript: string) {
  const [scene, setScene] = useState<Scene>(createEmptyScene);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [streamingIntent, setStreamingIntent] = useState<SceneIntent | null>(null);
  const [streamingSvg, setStreamingSvg] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastProcessedRef = useRef("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sceneRef = useRef<Scene>(scene);
  const activeRef = useRef(false);
  const pendingRef = useRef<string | null>(null);

  // Keep ref in sync so callbacks always read latest scene
  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  const processTranscript = useCallback(async (text: string) => {
    // If a stream is active, queue this request instead of aborting mid-stream
    if (activeRef.current) {
      pendingRef.current = text;
      return;
    }

    // Abort any previous (shouldn't happen, but safety)
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;
    activeRef.current = true;

    setIsProcessing(true);
    setError(null);
    setStreamingSvg("");
    setStreamingId(null);
    setStreamingIntent(null);

    try {
      const context = sceneToContext(sceneRef.current);

      const result = await streamTranscript(
        text,
        context,
        (intent) => {
          setStreamingIntent(intent);

          if (intent.action === "move" || intent.action === "delete" || intent.action === "clear") {
            setScene((prev) => applyIntent(prev, intent));
          } else {
            setStreamingId(intent.id);
          }
        },
        (svgSoFar) => {
          setStreamingSvg(svgSoFar);
        },
        controller.signal
      );

      // Stream complete — commit
      if (result.intent) {
        if (result.intent.action === "create" || result.intent.action === "update") {
          setScene((prev) => applyIntent(prev, result.intent!, result.svg));
        }
      } else if (result.svg) {
        // Fallback: legacy raw SVG
        setScene((prev) => {
          const fallbackIntent: SceneIntent = {
            action: "create",
            id: "scene_1",
            label: "full scene",
            transform: { x: 500, y: 350, scale: 1, rotate: 0 },
          };
          const cleared = applyIntent(prev, { action: "clear", id: "_", label: "_" });
          return applyIntent(cleared, fallbackIntent, result.svg);
        });
      }

      lastProcessedRef.current = text;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to process");
    } finally {
      activeRef.current = false;
      if (abortRef.current === controller) {
        setIsProcessing(false);
        setStreamingId(null);
        setStreamingIntent(null);
        setStreamingSvg("");
      }

      // Process queued request if any
      const pending = pendingRef.current;
      if (pending && pending !== lastProcessedRef.current) {
        pendingRef.current = null;
        processTranscript(pending);
      }
    }
  }, []);

  useEffect(() => {
    if (!transcript || transcript === lastProcessedRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      processTranscript(transcript);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [transcript, processTranscript]);

  return { scene, streamingId, streamingIntent, streamingSvg, isProcessing, error };
}
