import jsQR from "jsqr";

interface QrContact {
  fullName: string;
  jobTitle: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image."));
    image.src = dataUrl;
  });
}

type Crop = { sx: number; sy: number; sw: number; sh: number };

function crops(width: number, height: number): Crop[] {
  const halfW = width / 2;
  const halfH = height / 2;
  return [
    { sx: 0, sy: 0, sw: width, sh: height },
    { sx: 0, sy: 0, sw: halfW, sh: halfH },
    { sx: halfW, sy: 0, sw: halfW, sh: halfH },
    { sx: 0, sy: halfH, sw: halfW, sh: halfH },
    { sx: halfW, sy: halfH, sw: halfW, sh: halfH },
    { sx: width * 0.25, sy: height * 0.25, sw: halfW, sh: halfH },
  ];
}

function scanRegion(
  image: HTMLImageElement,
  crop: Crop,
  targetWidth: number,
): string | null {
  const scale = Math.min(1, targetWidth / crop.sw);
  const width = Math.max(1, Math.round(crop.sw * scale));
  const height = Math.max(1, Math.round(crop.sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  const result =
    jsQR(data, width, height, { inversionAttempts: "attemptBoth" }) ??
    jsQR(data, width, height, { inversionAttempts: "invertFirst" });

  return result?.data?.trim() || null;
}

/** Decodes a QR code from an image data URL. Browser-only. */
export async function decodeQrFromImage(dataUrl: string): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const image = await loadImage(dataUrl);

  const Detector = (
    window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => {
        detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
      };
    }
  ).BarcodeDetector;

  if (Detector) {
    try {
      const detector = new Detector({ formats: ["qr_code"] });
      const found = await detector.detect(image);
      const value = found?.[0]?.rawValue?.trim();
      if (value) return value;
    } catch {
      // Fall through to jsQR.
    }
  }

  for (const targetWidth of [1600, 1000, 640]) {
    for (const crop of crops(image.naturalWidth, image.naturalHeight)) {
      const value = scanRegion(image, crop, targetWidth);
      if (value) return value;
    }
  }

  return null;
}

/** Normalizes raw QR text into an https URL when it contains one. */
export function qrPayloadToUrl(payload: string): string | null {
  const raw = payload.trim().replace(/^URL:/i, "").trim();
  if (!raw) return null;

  const match = raw.match(/https?:\/\/[^\s"'<>]+/i);
  if (match?.[0]) return match[0];

  const bare = raw.match(/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?$/i);
  if (bare?.[0]) return `https://${bare[0].replace(/^www\./i, "")}`;

  return null;
}

function emptyContact(): QrContact {
  return {
    fullName: "",
    jobTitle: "",
    company: "",
    email: "",
    phone: "",
    website: "",
    address: "",
  };
}

function parseVCard(payload: string): QrContact {
  const contact = emptyContact();
  const lines = payload.split(/\r?\n/);

  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).toUpperCase();
    const value = line.slice(separator + 1).trim();
    if (!value) continue;

    if (key.startsWith("FN")) contact.fullName ||= value;
    else if (key.startsWith("N") && !key.startsWith("NOTE") && !key.startsWith("NICK")) {
      const parts = value.split(";").filter(Boolean);
      contact.fullName ||= [parts[1], parts[0]].filter(Boolean).join(" ").trim();
    } else if (key.startsWith("TITLE") || key.startsWith("ROLE")) contact.jobTitle ||= value;
    else if (key.startsWith("ORG")) contact.company ||= value.split(";")[0]?.trim() ?? value;
    else if (key.startsWith("EMAIL")) contact.email ||= value;
    else if (key.startsWith("TEL")) contact.phone ||= value;
    else if (key.startsWith("URL")) contact.website ||= value;
    else if (key.startsWith("ADR")) {
      contact.address ||= value.split(";").filter(Boolean).join(", ");
    }
  }

  return contact;
}

function parseMeCard(payload: string): QrContact {
  const contact = emptyContact();
  const body = payload.replace(/^MECARD:/i, "").replace(/;;\s*$/, "");

  for (const segment of body.split(";")) {
    const separator = segment.indexOf(":");
    if (separator === -1) continue;
    const key = segment.slice(0, separator).toUpperCase();
    const value = segment.slice(separator + 1).trim();
    if (!value) continue;

    if (key === "N") {
      const parts = value.split(",").filter(Boolean);
      contact.fullName ||= [parts[1], parts[0]].filter(Boolean).join(" ").trim();
    } else if (key === "TEL") contact.phone ||= value;
    else if (key === "EMAIL") contact.email ||= value;
    else if (key === "ORG") contact.company ||= value;
    else if (key === "URL") contact.website ||= value;
    else if (key === "ADR") contact.address ||= value.split(",").filter(Boolean).join(", ");
    else if (key === "TITLE") contact.jobTitle ||= value;
  }

  return contact;
}

/** Parses vCard / MECARD QR payloads. Returns null for anything else. */
export function parseQrContact(payload: string): QrContact | null {
  const raw = payload.trim();
  if (/^BEGIN:VCARD/i.test(raw)) return parseVCard(raw);
  if (/^MECARD:/i.test(raw)) return parseMeCard(raw);
  return null;
}

export type { QrContact };
