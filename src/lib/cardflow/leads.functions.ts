import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  createLeadForUser,
  deleteLeadForUser,
  listLeadsForUser,
  updateLeadForUser,
} from "./leads.server";
import { parseLeadInsert, parseLeadUpdate } from "./leadSchemas";
import type { Lead } from "./types";

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listLeadsForUser(context.supabase, context.userId));

export const createLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => parseLeadInsert(data))
  .handler(async ({ data, context }) =>
    createLeadForUser(context.supabase, context.userId, data as Partial<Lead>),
  );

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => parseLeadUpdate(data))
  .handler(async ({ data, context }) =>
    updateLeadForUser(context.supabase, context.userId, data.id, data.patch as Partial<Lead>),
  );

export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) =>
    deleteLeadForUser(context.supabase, context.userId, data.id),
  );
