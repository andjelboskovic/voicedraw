import { useRef, useEffect } from "react";

interface TranscriptOverlayProps {
  transcript: string;
  interimText: string;
}

const TranscriptOverlay = ({ transcript, interimText }: TranscriptOverlayProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interimText]);

  if (!transcript && !interimText) return null;

  const sentences = transcript.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  const recentSentences = sentences.slice(-4);

  return (
    <div className="fixed bottom-6 left-6 z-20 max-w-[320px]">
      <div className="bg-white/80 backdrop-blur-md border border-border/60 rounded-2xl px-4 py-3 shadow-md">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
          Transcript
        </div>
        <div ref={scrollRef} className="max-h-[140px] overflow-y-auto space-y-1">
          {recentSentences.map((s, i) => (
            <p key={i} className="text-xs text-foreground/80 leading-relaxed">{s}</p>
          ))}
          {interimText && (
            <p className="text-xs text-muted-foreground italic leading-relaxed">{interimText}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranscriptOverlay;
