import { Mic, MicOff, Loader2, Square } from "lucide-react";

interface VoiceIndicatorProps {
  isListening: boolean;
  isProcessing: boolean;
  onToggle: () => void;
}

const VoiceIndicator = ({ isListening, isProcessing, onToggle }: VoiceIndicatorProps) => {
  return (
    <div className="fixed bottom-6 right-6 z-20 flex flex-col items-center gap-2">
      {isListening && (
        <span className="text-[10px] text-muted-foreground font-medium bg-white/80 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
          Tap to stop
        </span>
      )}
      <button
        onClick={onToggle}
        className="w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg"
        style={{
          background: isListening
            ? "linear-gradient(135deg, hsl(30, 90%, 50%), hsl(20, 85%, 42%))"
            : "hsl(0, 0%, 85%)",
        }}
      >
        {isProcessing ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : isListening ? (
          <div className="relative flex items-center justify-center">
            <div className="absolute w-14 h-14 rounded-full voice-pulse bg-amber-400/30" />
            <Square className="w-5 h-5 text-white fill-white" />
          </div>
        ) : (
          <MicOff className="w-6 h-6 text-white/70" />
        )}
      </button>
    </div>
  );
};

export default VoiceIndicator;
