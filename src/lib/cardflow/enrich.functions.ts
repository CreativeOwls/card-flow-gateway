import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { enrichSite } from "./enrich.server";

export const enrichFromWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        url: z.string().url().max(2000),
        personHint: z.string().max(200).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => enrichSite(data.url, data.personHint));
