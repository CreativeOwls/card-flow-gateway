import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { IMAGE_DATA_URL_RE, MAX_IMAGE_CHARS, scanCardImage } from "./scan.server";

export const scanBusinessCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        imageDataUrl: z
          .string()
          .max(MAX_IMAGE_CHARS, "That image is too large — try a smaller photo.")
          .regex(IMAGE_DATA_URL_RE, "Unsupported image format."),
      })
      .parse(data),
  )
  .handler(async ({ data }) => scanCardImage(data.imageDataUrl));
