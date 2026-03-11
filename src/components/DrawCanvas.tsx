import { useRef, useEffect, memo } from "react";
import { motion } from "framer-motion";
import type { Scene, SceneObject, SceneIntent } from "@/types/scene";

interface DrawCanvasProps {
  scene: Scene;
  streamingId: string | null;
  streamingIntent: SceneIntent | null;
  streamingSvg: string;
  isProcessing: boolean;
}

const ObjectRenderer = memo(({ svg }: { svg: string }) => {
  const gRef = useRef<SVGGElement>(null);
  const lastValidRef = useRef("");

  useEffect(() => {
    if (!gRef.current || !svg) return;
    try {
      gRef.current.innerHTML = svg;
      lastValidRef.current = svg;
    } catch {
      if (lastValidRef.current) {
        gRef.current.innerHTML = lastValidRef.current;
      }
    }
  }, [svg]);

  return <g ref={gRef} />;
});

ObjectRenderer.displayName = "ObjectRenderer";

const skeletonDots = [
  { cx: 350, cy: 300, r: 60, delay: 0 },
  { cx: 550, cy: 280, r: 45, delay: 0.25 },
  { cx: 700, cy: 350, r: 55, delay: 0.5 },
  { cx: 450, cy: 420, r: 35, delay: 0.75 },
];

const DrawCanvas = ({ scene, streamingId, streamingIntent, streamingSvg, isProcessing }: DrawCanvasProps) => {
  const hasObjects = scene.objects.size > 0 || streamingId !== null;
  const showSkeleton = isProcessing && !hasObjects;

  // Sort objects by zIndex
  const sortedObjects = Array.from(scene.objects.values()).sort(
    (a, b) => a.zIndex - b.zIndex
  );

  // Check if we're creating a brand new object (not yet in scene)
  const isNewCreate =
    streamingId !== null &&
    streamingIntent?.action === "create" &&
    !scene.objects.has(streamingId);

  return (
    <div className="w-full h-full relative">
      <svg
        viewBox="0 0 1000 700"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid dots background */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <circle cx="25" cy="25" r="1" fill="hsl(45, 17%, 85%)" />
          </pattern>
        </defs>
        <rect width="1000" height="700" fill="url(#grid)" />

        {/* Skeleton while first render loads */}
        {showSkeleton && (
          <g>
            {skeletonDots.map((s, i) => (
              <motion.circle
                key={`skel-${i}`}
                cx={s.cx}
                cy={s.cy}
                r={s.r}
                fill="hsl(45, 17%, 91%)"
                stroke="hsl(45, 17%, 85%)"
                strokeWidth={2}
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [0.9, 1.05, 0.9],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: s.delay,
                  ease: "easeInOut" as const,
                }}
              />
            ))}
            <motion.text
              x={500}
              y={530}
              textAnchor="middle"
              fontSize={14}
              fontFamily="Inter, system-ui, sans-serif"
              fill="hsl(60, 1%, 55%)"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Drawing...
            </motion.text>
          </g>
        )}

        {/* Committed scene objects */}
        {sortedObjects.map((obj: SceneObject) => {
          const t = obj.transform;
          const isStreaming = streamingId === obj.id;
          return (
            <g
              key={obj.id}
              transform={`translate(${t.x - 200 * t.scale},${t.y - 150 * t.scale}) scale(${t.scale}) rotate(${t.rotate})`}
              style={{
                transition: "transform 0.3s ease",
                opacity: isStreaming ? 0.7 : 1,
              }}
            >
              <ObjectRenderer svg={isStreaming ? streamingSvg : obj.svg} />
            </g>
          );
        })}

        {/* New object being created (not yet in scene map) */}
        {isNewCreate && streamingIntent && (
          <g
            transform={`translate(${(streamingIntent.transform?.x ?? 500) - 200 * (streamingIntent.transform?.scale ?? 1)},${(streamingIntent.transform?.y ?? 350) - 150 * (streamingIntent.transform?.scale ?? 1)}) scale(${streamingIntent.transform?.scale ?? 1}) rotate(${streamingIntent.transform?.rotate ?? 0})`}
            style={{ opacity: 0.7, transition: "transform 0.3s ease" }}
          >
            <ObjectRenderer svg={streamingSvg} />
          </g>
        )}
      </svg>
    </div>
  );
};

export default DrawCanvas;
