import { useCallback } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useDrawEngine } from "@/hooks/useDrawEngine";
import DrawCanvas from "./DrawCanvas";
import VoiceIndicator from "./VoiceIndicator";
import TranscriptOverlay from "./TranscriptOverlay";
import { Pencil } from "lucide-react";

const VoiceDrawApp = () => {
  const { transcript, interimText, isListening, start, stop, error: speechError } =
    useSpeechRecognition();
  const { scene, streamingId, streamingIntent, streamingSvg, isProcessing, error: drawError } =
    useDrawEngine(transcript);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  const error = speechError || drawError;
  const hasObjects = scene.objects.size > 0;

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border/60 bg-white/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(30, 90%, 50%), hsl(20, 85%, 42%))" }}
          >
            <Pencil className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">VoiceDraw</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {isProcessing && <span className="animate-pulse">Drawing...</span>}
        </div>
      </header>

      {/* Canvas */}
      <main className="flex-1 relative">
        {!hasObjects && !isListening && !isProcessing ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/60 flex items-center justify-center">
                <Pencil className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">Speak to draw</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tap the mic and describe what you want to see
                </p>
                <p className="text-xs text-muted-foreground/60 mt-2">
                  Try: "Draw a house with a tree next to it"
                </p>
              </div>
            </div>
          </div>
        ) : (
          <DrawCanvas
            scene={scene}
            streamingId={streamingId}
            streamingIntent={streamingIntent}
            streamingSvg={streamingSvg}
            isProcessing={isProcessing}
          />
        )}

        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2 rounded-xl shadow-sm">
            {error}
          </div>
        )}
      </main>

      {/* Overlays */}
      <TranscriptOverlay transcript={transcript} interimText={interimText} />
      <VoiceIndicator
        isListening={isListening}
        isProcessing={isProcessing}
        onToggle={toggleListening}
      />
    </div>
  );
};

export default VoiceDrawApp;
