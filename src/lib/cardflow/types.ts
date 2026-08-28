export type LeadStatus = "New" | "Followed Up" | "Demo Booked";

export const LEAD_STATUSES: LeadStatus[] = ["New", "Followed Up", "Demo Booked"];

export type EmailTone = "Casual" | "Executive" | "Direct Pitch";

export const EMAIL_TONES: EmailTone[] = ["Casual", "Executive", "Direct Pitch"];

export interface ExtractedCard {
  fullName: string;
  jobTitle: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  linkedinUrl: string;
  address: string;
  companySummary: string;
  suggestedEmailDraft: string;
}

export interface Lead extends ExtractedCard {
  id: string;
  status: LeadStatus;
  /** Data URL or remote URL of the original business card photo. */
  cardImageUrl?: string | undefined;
  capturedAt: string;
}
