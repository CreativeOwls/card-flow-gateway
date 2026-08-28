import { chatJson, parseJsonObject, str } from "./ai.server";
import type { ExtractedCard } from "./types";

export const MAX_IMAGE_CHARS = 8 * 1024 * 1024;
export const IMAGE_DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp|heic|heif);base64,/i;

const SYSTEM_PROMPT = [
  "You transcribe business cards.",
  "Transcribe ONLY text that is actually visible in the image.",
  "Never invent, guess, autocomplete or correct names, emails, phone numbers or URLs.",
  "If a field is not visible on the card, return an empty string for it.",
  "Preserve the original spelling, diacritics and capitalization exactly as printed.",
  "companySummary must be one short factual sentence inferred only from what is on the card; return an empty string if the card gives no clue about what the company does.",
  "Respond with JSON only.",
].join(" ");

export type ScannedCard = Omit<ExtractedCard, "suggestedEmailDraft">;

export async function scanCardImage(imageDataUrl: string): Promise<ScannedCard> {
  const raw = await chatJson(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: 'Return JSON matching {"fullName","jobTitle","company","email","phone","website","linkedinUrl","address","companySummary"} using only text visible on this business card.',
          },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    "Card scan",
  );

  const parsed = parseJsonObject(raw);

  return {
    fullName: str(parsed["fullName"]),
    jobTitle: str(parsed["jobTitle"]),
    company: str(parsed["company"]),
    email: str(parsed["email"]),
    phone: str(parsed["phone"]),
    website: str(parsed["website"]),
    linkedinUrl: str(parsed["linkedinUrl"]),
    address: str(parsed["address"]),
    companySummary: str(parsed["companySummary"]),
  };
}
