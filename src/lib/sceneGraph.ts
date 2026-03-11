import type { Scene, SceneIntent, SceneObject } from "@/types/scene";

const DEFAULT_TRANSFORM = { x: 500, y: 350, scale: 1, rotate: 0 };

export function createEmptyScene(): Scene {
  return { objects: new Map(), defs: "" };
}

export function applyIntent(scene: Scene, intent: SceneIntent, svg?: string): Scene {
  const next: Scene = {
    objects: new Map(scene.objects),
    defs: intent.defs ?? scene.defs,
  };

  switch (intent.action) {
    case "create": {
      const existing = next.objects.get(intent.id);
      if (existing) {
        // ID collision — treat as update
        next.objects.set(intent.id, {
          ...existing,
          label: intent.label || existing.label,
          svg: svg ?? existing.svg,
          transform: { ...existing.transform, ...intent.transform },
        });
      } else {
        next.objects.set(intent.id, {
          id: intent.id,
          label: intent.label,
          svg: svg ?? "",
          transform: { ...DEFAULT_TRANSFORM, ...intent.transform },
          zIndex: next.objects.size,
        });
      }
      break;
    }

    case "update": {
      const obj = next.objects.get(intent.id);
      if (obj) {
        next.objects.set(intent.id, {
          ...obj,
          label: intent.label || obj.label,
          svg: svg ?? obj.svg,
          transform: intent.transform ? { ...obj.transform, ...intent.transform } : obj.transform,
        });
      } else {
        // ID not found — treat as create
        next.objects.set(intent.id, {
          id: intent.id,
          label: intent.label,
          svg: svg ?? "",
          transform: { ...DEFAULT_TRANSFORM, ...intent.transform },
          zIndex: next.objects.size,
        });
      }
      break;
    }

    case "move": {
      const obj = next.objects.get(intent.id);
      if (obj && intent.transform) {
        next.objects.set(intent.id, {
          ...obj,
          transform: { ...obj.transform, ...intent.transform },
        });
      }
      break;
    }

    case "delete": {
      next.objects.delete(intent.id);
      break;
    }

    case "clear": {
      next.objects.clear();
      next.defs = "";
      break;
    }
  }

  return next;
}

export function sceneToContext(scene: Scene): string {
  if (scene.objects.size === 0) return "";

  const lines: string[] = ["[SCENE]"];
  for (const obj of scene.objects.values()) {
    const t = obj.transform;
    lines.push(`${obj.id}: ${obj.label} (x:${t.x}, y:${t.y}, scale:${t.scale}, rotate:${t.rotate})`);
  }
  lines.push("[/SCENE]");
  return lines.join("\n");
}
