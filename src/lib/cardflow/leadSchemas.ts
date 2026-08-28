import { z } from "zod";

import { LEAD_STATUSES } from "./types";

/** Cards stored as data URLs get dropped above this size instead of rejected. */
export const MAX_CARD_IMAGE_CHARS = 1_500_000;

const text = (max = 4000) => z.string().max(max).default("");

export const leadFields = z.object({
  fullName: text(),
  jobTitle: text(),
  company: text(),
  email: text(),
  phone: text(),
  website: text(),
  linkedinUrl: text(),
  address: text(),
  companySummary: text(),
  suggestedEmailDraft: text(8000),
  status: z.enum(LEAD_STATUSES as [string, ...string[]]).optional(),
  cardImageUrl: z.string().optional(),
  capturedAt: z.string().optional(),
});

export type LeadFieldsInput = z.input<typeof leadFields>;

function dropOversizedImage<T extends { cardImageUrl?: string }>(payload: T): T {
  if (payload.cardImageUrl && payload.cardImageUrl.length > MAX_CARD_IMAGE_CHARS) {
    return { ...payload, cardImageUrl: "" };
  }
  return payload;
}

export function parseLeadInsert(input: unknown) {
  const parsed = leadFields.parse(input);
  return dropOversizedImage(parsed);
}

export const leadUpdateSchema = z.object({
  id: z.string().uuid(),
  patch: leadFields.partial(),
});

export function parseLeadUpdate(input: unknown) {
  const parsed = leadUpdateSchema.parse(input);
  return { id: parsed.id, patch: dropOversizedImage(parsed.patch) };
}
