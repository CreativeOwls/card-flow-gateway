import { enrichFromWebsite } from "./enrich.functions";
import { generateFollowUpEmail } from "./email";
import { decodeQrFromImage, parseQrContact, qrPayloadToUrl } from "./qr";
import { scanBusinessCard } from "./scan.functions";
import type { ExtractedCard } from "./types";

export const SCAN_STEPS = [
  "Uploading card image",
  "Reading QR code",
  "Extracting contact fields",
  "Researching linked website",
  "Mapping company details",
  "Drafting follow-up email",
] as const;

export type ScanStep = (typeof SCAN_STEPS)[number];

export interface ExtractOptions {
  onStep?: ((step: ScanStep) => void) | undefined;
  excludeEmails?: string[] | undefined;
}

function emptyCard(): ExtractedCard {
  return {
    fullName: "",
    jobTitle: "",
    company: "",
    email: "",
    phone: "",
    website: "",
    linkedinUrl: "",
    address: "",
    companySummary: "",
    suggestedEmailDraft: "",
  };
}

function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return qrPayloadToUrl(trimmed);
}

export async function extractCardData(
  input: { imageDataUrl: string; fileName?: string },
  opts: ExtractOptions = {},
): Promise<ExtractedCard> {
  const step = (label: ScanStep) => opts.onStep?.(label);
  const excluded = new Set((opts.excludeEmails ?? []).map((email) => email.toLowerCase()));

  step("Uploading card image");

  step("Reading QR code");
  let qrPayload: string | null = null;
  try {
    qrPayload = await decodeQrFromImage(input.imageDataUrl);
  } catch {
    qrPayload = null;
  }
  const qrContact = qrPayload ? parseQrContact(qrPayload) : null;

  step("Extracting contact fields");
  const card = emptyCard();
  try {
    const scanned = await scanBusinessCard({ data: { imageDataUrl: input.imageDataUrl } });
    Object.assign(card, scanned);
  } catch (error) {
    if (!qrPayload) throw error;
  }

  // QR data is exact — it wins over OCR guesses.
  if (qrContact) {
    for (const [key, value] of Object.entries(qrContact)) {
      if (value) (card as unknown as Record<string, string>)[key] = value;
    }
  }

  const targetUrl =
    (qrContact?.website ? normalizeUrl(qrContact.website) : null) ??
    (qrPayload ? qrPayloadToUrl(qrPayload) : null) ??
    normalizeUrl(card.website);

  if (targetUrl) {
    step("Researching linked website");
    try {
      const site = await enrichFromWebsite({
        data: { url: targetUrl, personHint: card.fullName || undefined },
      });

      step("Mapping company details");
      card.website ||= site.url;
      card.fullName ||= site.fullName;
      card.jobTitle ||= site.jobTitle;
      card.company ||= site.company;
      card.phone ||= site.phone;
      card.address ||= site.address;
      card.linkedinUrl ||= site.linkedinUrl;
      if (site.email && !excluded.has(site.email.toLowerCase())) card.email ||= site.email;
      if (site.summary) card.companySummary = site.summary;
    } catch {
      // Enrichment is best-effort.
    }
  }

  if (!card.fullName && !card.email && !card.company) {
    throw new Error(
      qrPayload
        ? "We found a QR code but couldn't get any usable contact details from it. Try a clearer photo of the card front."
        : "We couldn't read that card. Try again with better lighting and the whole card in frame.",
    );
  }

  step("Drafting follow-up email");
  card.suggestedEmailDraft = generateFollowUpEmail(card, "Casual");

  return card;
}
