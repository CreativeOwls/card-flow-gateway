const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const AI_MODEL = "google/gemini-3.7-flash";

export interface ChatMessage {
  role: "system" | "user";
  content: unknown;
}

/** Calls the Lovable AI Gateway and returns the raw assistant text. */
export async function chatJson(messages: ChatMessage[], label: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this project.");

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (response.status === 429) {
    throw new Error("Too many requests right now — please wait a moment and try again.");
  }
  if (response.status === 402) {
    throw new Error("AI credits are exhausted. Add credits in Lovable to keep scanning.");
  }
  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}).`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return payload.choices?.[0]?.message?.content ?? "";
}

/** Pulls a JSON object out of a model response, tolerating code fences. */
export function parseJsonObject(raw: string): Record<string, unknown> {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) return {};
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

export function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
