import { LEAD_STATUSES, type Lead, type LeadStatus } from "./types";

export interface LeadRow {
  id: string;
  full_name: string;
  job_title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  linkedin_url: string;
  address: string;
  company_summary: string;
  suggested_email_draft: string;
  status: string;
  card_image_url: string | null;
  captured_at: string;
}

export const LEAD_COLUMNS =
  "id, full_name, job_title, company, email, phone, website, linkedin_url, address, company_summary, suggested_email_draft, status, card_image_url, captured_at";

function coerceStatus(value: string | null | undefined): LeadStatus {
  return LEAD_STATUSES.includes(value as LeadStatus) ? (value as LeadStatus) : "New";
}

export function rowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    fullName: row.full_name ?? "",
    jobTitle: row.job_title ?? "",
    company: row.company ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    website: row.website ?? "",
    linkedinUrl: row.linkedin_url ?? "",
    address: row.address ?? "",
    companySummary: row.company_summary ?? "",
    suggestedEmailDraft: row.suggested_email_draft ?? "",
    status: coerceStatus(row.status),
    cardImageUrl: row.card_image_url ?? undefined,
    capturedAt: row.captured_at,
  };
}

const FIELD_TO_COLUMN: Record<string, string> = {
  fullName: "full_name",
  jobTitle: "job_title",
  company: "company",
  email: "email",
  phone: "phone",
  website: "website",
  linkedinUrl: "linkedin_url",
  address: "address",
  companySummary: "company_summary",
  suggestedEmailDraft: "suggested_email_draft",
  status: "status",
  capturedAt: "captured_at",
};

export function leadToRow(lead: Partial<Lead>): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  for (const [field, column] of Object.entries(FIELD_TO_COLUMN)) {
    const value = (lead as Record<string, unknown>)[field];
    if (value !== undefined) row[column] = value;
  }

  if (lead.cardImageUrl !== undefined) {
    row["card_image_url"] = lead.cardImageUrl === "" ? null : lead.cardImageUrl;
  }

  return row;
}
