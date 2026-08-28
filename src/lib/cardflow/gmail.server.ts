const GMAIL_SEND_URL =
  "https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send";

function base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildRawMessage(to: string, subject: string, body: string): string {
  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
  ];
  return base64Url(`${headers.join("\r\n")}\r\n\r\n${body}`);
}

export async function sendGmailMessage(
  to: string,
  subject: string,
  body: string,
): Promise<{ id: string }> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_MAIL_API_KEY"];

  if (!lovableKey || !connectionKey) {
    throw new Error("Gmail isn't connected for this project yet.");
  }

  const response = await fetch(GMAIL_SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
    },
    body: JSON.stringify({ raw: buildRawMessage(to, subject, body) }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[gmail] send failed", response.status, detail.slice(0, 500));
    if (response.status === 401 || response.status === 403) {
      throw new Error("Gmail rejected the request — reconnect the Gmail connector and try again.");
    }
    throw new Error(`Could not send the email (${response.status}).`);
  }

  const payload = (await response.json().catch(() => ({}))) as { id?: string };
  return { id: payload.id ?? "" };
}
