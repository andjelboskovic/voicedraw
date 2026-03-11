export interface SceneObject {
  id: string;
  label: string;
  svg: string;
  transform: { x: number; y: number; scale: number; rotate: number };
  zIndex: number;
}

export interface SceneIntent {
  action: "create" | "update" | "move" | "delete" | "clear";
  id: string;
  label: string;
  transform?: Partial<SceneObject["transform"]>;
  defs?: string;
}

export interface Scene {
  objects: Map<string, SceneObject>;
  defs: string;
}
