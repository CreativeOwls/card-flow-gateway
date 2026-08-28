import { chatJson, parseJsonObject, str } from "./ai.server";

const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape";

export interface EnrichResult {
  url: string;
  title: string;
  summary: string;
  linkedinUrl: string;
  fullName: string;
  jobTitle: string;
  company: string;
  email: string;
  phone: string;
  address: string;
}

const PRIVATE_HOST_RE =
  /^(localhost|127\.|0\.0\.0\.0|\[?::1\]?|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i;

export function assertPublicUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("That doesn't look like a valid website address.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https websites can be researched.");
  }

  const host = parsed.hostname.toLowerCase();
  if (PRIVATE_HOST_RE.test(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("That address is not publicly reachable.");
  }

  return parsed.toString();
}

interface ScrapeDoc {
  markdown?: string;
  summary?: string;
  links?: string[];
  metadata?: { title?: string; description?: string; sourceURL?: string };
}

async function scrape(url: string): Promise<ScrapeDoc> {
  const apiKey = process.env["FIRECRAWL_API_KEY"];
  if (!apiKey) throw new Error("Website research is not configured for this project.");

  const response = await fetch(FIRECRAWL_SCRAPE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "summary", "links"],
      onlyMainContent: true,
    }),
  });

  if (response.status === 402) {
    throw new Error("Website research credits are exhausted.");
  }
  if (response.status === 429) {
    throw new Error("Website research is rate limited — try again in a moment.");
  }
  if (!response.ok) {
    throw new Error(`Website research failed (${response.status}).`);
  }

  const payload = (await response.json()) as ScrapeDoc & { data?: ScrapeDoc };
  return payload.data ?? payload;
}

const SYSTEM_PROMPT = [
  "You extract contact and company facts from the text of one web page.",
  "Use ONLY the provided page content. Never invent, guess or complete any value.",
  "If a value is not present in the content, return an empty string.",
  "If a person hint is given, prefer that person's details over any other person mentioned on the page.",
  "summary must be one short factual sentence about what the company does.",
  "Respond with JSON only.",
].join(" ");

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export async function enrichSite(url: string, personHint?: string): Promise<EnrichResult> {
  const safeUrl = assertPublicUrl(url);
  const doc = await scrape(safeUrl);

  const markdown = str(doc.markdown);
  const title = str(doc.metadata?.title);
  const sourceUrl = str(doc.metadata?.sourceURL) || safeUrl;
  const pageSummary = str(doc.summary) || str(doc.metadata?.description);

  const links = Array.isArray(doc.links) ? doc.links : [];
  const linkedinUrl =
    links.find((link) => /linkedin\.com\/company\//i.test(link)) ??
    links.find((link) => /linkedin\.com\/in\//i.test(link)) ??
    "";

  let ai = {
    fullName: "",
    jobTitle: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    summary: "",
  };

  if (markdown) {
    try {
      const raw = await chatJson(
        [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              `Page title: ${title || "(unknown)"}`,
              `Page URL: ${sourceUrl}`,
              `Person hint: ${personHint?.trim() || "(none)"}`,
              "",
              "Page content:",
              truncate(markdown, 12000),
              "",
              'Return JSON matching {"fullName","jobTitle","company","email","phone","address","summary"}.',
            ].join("\n"),
          },
        ],
        "Website research",
      );

      const parsed = parseJsonObject(raw);
      ai = {
        fullName: str(parsed["fullName"]),
        jobTitle: str(parsed["jobTitle"]),
        company: str(parsed["company"]),
        email: str(parsed["email"]),
        phone: str(parsed["phone"]),
        address: str(parsed["address"]),
        summary: str(parsed["summary"]),
      };
    } catch {
      // Best effort only — enrichment never blocks a scan.
    }
  }

  return {
    url: sourceUrl,
    title,
    summary: truncate(ai.summary || pageSummary, 600),
    linkedinUrl,
    fullName: ai.fullName,
    jobTitle: ai.jobTitle,
    company: ai.company,
    email: ai.email,
    phone: ai.phone,
    address: ai.address,
  };
}
