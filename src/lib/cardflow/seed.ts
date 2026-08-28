import { generateFollowUpEmail } from "./email";
import type { ExtractedCard, LeadStatus } from "./types";

interface SeedSpec extends Omit<ExtractedCard, "suggestedEmailDraft"> {
  status: LeadStatus;
  hoursAgo: number;
}

const SEED_SPECS: SeedSpec[] = [
  {
    fullName: "Elena Rostova",
    jobTitle: "VP Product",
    company: "CloudScale",
    email: "elena.rostova@cloudscale.io",
    phone: "+1 (415) 555-0142",
    website: "https://cloudscale.io",
    linkedinUrl: "https://www.linkedin.com/in/elenarostova",
    address: "525 Market St, San Francisco, CA",
    companySummary:
      "CloudScale builds autoscaling infrastructure that keeps cloud workloads fast without over-provisioning.",
    status: "Demo Booked",
    hoursAgo: 6,
  },
  {
    fullName: "Marcus Vance",
    jobTitle: "Founder & CEO",
    company: "SynthAI",
    email: "marcus@synthai.dev",
    phone: "+1 (206) 555-0188",
    website: "https://synthai.dev",
    linkedinUrl: "https://www.linkedin.com/in/marcusvance",
    address: "1201 Second Ave, Seattle, WA",
    companySummary:
      "SynthAI generates synthetic training data so machine learning teams can ship models without privacy risk.",
    status: "New",
    hoursAgo: 28,
  },
  {
    fullName: "Priya Raghavan",
    jobTitle: "Head of Revenue Operations",
    company: "Northwind Labs",
    email: "priya.raghavan@northwindlabs.com",
    phone: "+44 20 7946 0231",
    website: "https://northwindlabs.com",
    linkedinUrl: "https://www.linkedin.com/in/priyaraghavan",
    address: "18 Finsbury Circus, London, UK",
    companySummary:
      "Northwind Labs turns scattered B2B sales data into revenue intelligence that forecasts pipeline accurately.",
    status: "Followed Up",
    hoursAgo: 76,
  },
  {
    fullName: "Tobias Lindqvist",
    jobTitle: "Director of Engineering",
    company: "Verity Payments",
    email: "tobias.lindqvist@veritypayments.se",
    phone: "+46 8 555 01 77",
    website: "https://veritypayments.se",
    linkedinUrl: "https://www.linkedin.com/in/tobiaslindqvist",
    address: "Regeringsgatan 29, Stockholm, Sweden",
    companySummary:
      "Verity Payments settles cross-border card transactions in real time while screening them for fraud.",
    status: "New",
    hoursAgo: 140,
  },
];

export interface SeedLead extends ExtractedCard {
  status: LeadStatus;
  capturedAt: string;
}

/** Built lazily so no work happens at module scope. */
export function buildSeedLeads(now: number = Date.now()): SeedLead[] {
  return SEED_SPECS.map(({ status, hoursAgo, ...card }) => ({
    ...card,
    suggestedEmailDraft: generateFollowUpEmail(card, "Casual"),
    status,
    capturedAt: new Date(now - hoursAgo * 60 * 60 * 1000).toISOString(),
  }));
}
