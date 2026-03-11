import { SYSTEM_PROMPT } from "./systemPrompt";
import type { SceneIntent } from "@/types/scene";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SEPARATOR = "---SVG---";

function cleanSvg(raw: string): string {
  let text = raw;
  text = text.replace(/^```(?:svg|xml|html)?\n?/, "").replace(/\n?```$/, "");
  text = text.replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "");
  return text.trim();
}

function parseIntent(raw: string): SceneIntent | null {
  try {
    const parsed = JSON.parse(raw.trim());
    if (parsed && parsed.action && parsed.id) {
      return parsed as SceneIntent;
    }
  } catch {
    // not valid JSON
  }
  return null;
}

export async function streamTranscript(
  transcript: string,
  sceneContext: string,
  onIntent: (intent: SceneIntent) => void,
  onSvgChunk: (svgSoFar: string) => void,
  signal?: AbortSignal
): Promise<{ intent: SceneIntent | null; svg: string }> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/draw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({
      transcript,
      sceneContext,
      systemPrompt: SYSTEM_PROMPT,
      model: "claude-sonnet-4-5-20241022",
      maxTokens: 3000,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Draw API error: ${response.status} ${text}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let sseBuffer = "";
  let intentFired = false;
  let intent: SceneIntent | null = null;
  let svgStartIndex = -1;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    sseBuffer += decoder.decode(value, { stream: true });
    const lines = sseBuffer.split("\n");
    sseBuffer = lines.pop()!;

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") continue;
      accumulated += payload;
    }

    // Phase 1: Look for separator to split preamble from SVG
    if (!intentFired) {
      const sepIdx = accumulated.indexOf(SEPARATOR);
      if (sepIdx !== -1) {
        // Found separator — parse preamble
        const preamble = accumulated.slice(0, sepIdx).trim();
        intent = parseIntent(preamble);
        if (intent) {
          onIntent(intent);
          intentFired = true;
          svgStartIndex = sepIdx + SEPARATOR.length;
        }
      }
    }

    // Phase 2: Stream SVG chunks with tag-boundary buffering
    if (intentFired && svgStartIndex !== -1) {
      const svgPortion = accumulated.slice(svgStartIndex);
      const lastClose = svgPortion.lastIndexOf(">");
      if (lastClose !== -1) {
        onSvgChunk(cleanSvg(svgPortion.slice(0, lastClose + 1)));
      }
    }
  }

  // Stream ended — handle cases
  if (!intentFired) {
    // Try parsing entire response as JSON preamble (move/delete/clear — no SVG phase)
    intent = parseIntent(accumulated);
    if (intent) {
      onIntent(intent);
      return { intent, svg: "" };
    }

    // Fallback: no valid preamble found — treat as legacy raw SVG (full scene replacement)
    return { intent: null, svg: cleanSvg(accumulated) };
  }

  // Normal completion: return intent + final SVG
  const finalSvg = svgStartIndex !== -1
    ? cleanSvg(accumulated.slice(svgStartIndex))
    : "";

  return { intent, svg: finalSvg };
}
