import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { sendGmailMessage } from "./gmail.server";

export const sendGmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        to: z.string().email(),
        subject: z.string().max(400),
        body: z.string().max(20000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => sendGmailMessage(data.to, data.subject, data.body));
