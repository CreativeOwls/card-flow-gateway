import type { EmailTone, ExtractedCard } from "./types";

type CardLike = Pick<
  ExtractedCard,
  "fullName" | "jobTitle" | "company" | "companySummary"
>;

export function firstNameOf(card: Pick<ExtractedCard, "fullName">): string {
  const first = (card.fullName || "").trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : "there";
}

function companyFocus(card: CardLike): string {
  const summary = (card.companySummary || "").trim();
  if (!summary) {
    return `${card.company || "your team"} is tackling some interesting problems`;
  }
  return summary.replace(/[.\s]+$/, "").toLowerCase();
}

export function generateFollowUpEmail(card: CardLike, tone: EmailTone): string {
  const name = firstNameOf(card);
  const focus = companyFocus(card);
  const company = card.company || "your team";
  const title = card.jobTitle || "your role";

  if (tone === "Executive") {
    return [
      `Dear ${name},`,
      "",
      `It was a pleasure meeting you at DevFest 2026 and hearing your perspective as ${title} at ${company}.`,
      `Given that ${focus}, I believe there is a strong strategic fit between our teams.`,
      `Would you be open to a 30-minute call in the coming weeks to explore it properly?`,
    ].join("\n");
  }

  if (tone === "Direct Pitch") {
    return [
      `Hi ${name},`,
      "",
      `Great to meet you at DevFest 2026 — we help companies like ${company} move faster on exactly the problem you described, where ${focus}.`,
      `Most teams we work with see measurable results within a quarter.`,
      `Can I grab a 15-minute demo slot with you this week?`,
    ].join("\n");
  }

  return [
    `Hi ${name},`,
    "",
    `Really enjoyed our chat at DevFest 2026 today.`,
    `It stuck with me that ${focus} — that's a space I'd love to dig into with you.`,
    `Any chance you have 20 minutes next week for a quick call?`,
  ].join("\n");
}

export function emailSubject(card: Pick<ExtractedCard, "fullName">): string {
  return `Great meeting you at DevFest 2026, ${firstNameOf(card)}`;
}

export function gmailComposeUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to,
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
