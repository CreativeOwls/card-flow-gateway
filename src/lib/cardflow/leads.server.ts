import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

import { LEAD_COLUMNS, leadToRow, rowToLead, type LeadRow } from "./leadMapping";
import { buildSeedLeads } from "./seed";
import type { Lead } from "./types";

type Client = SupabaseClient<Database>;
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

function fail(context: string, message: string): never {
  throw new Error(`${context}: ${message}`);
}

/** Lists the user's leads, seeding demo data on a first, empty visit. */
export async function listLeadsForUser(supabase: Client, userId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("user_id", userId)
    .order("captured_at", { ascending: false });

  if (error) fail("Could not load leads", error.message);

  const rows = (data ?? []) as unknown as LeadRow[];
  if (rows.length > 0) return rows.map(rowToLead);

  const seedRows = buildSeedLeads().map(
    (seed) => ({ ...leadToRow(seed), user_id: userId }) as LeadInsert,
  );

  const { data: seeded, error: seedError } = await supabase
    .from("leads")
    .insert(seedRows)
    .select(LEAD_COLUMNS);

  if (seedError || !seeded) return [];

  return (seeded as unknown as LeadRow[])
    .map(rowToLead)
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}

export async function createLeadForUser(
  supabase: Client,
  userId: string,
  fields: Partial<Lead>,
): Promise<Lead> {
  const insert = { ...leadToRow(fields), user_id: userId } as LeadInsert;

  const { data, error } = await supabase
    .from("leads")
    .insert(insert)
    .select(LEAD_COLUMNS)
    .single();

  if (error || !data) fail("Could not save lead", error?.message ?? "no row returned");

  return rowToLead(data as unknown as LeadRow);
}

export async function updateLeadForUser(
  supabase: Client,
  userId: string,
  id: string,
  patch: Partial<Lead>,
): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .update(leadToRow(patch) as LeadUpdate)
    .eq("id", id)
    .eq("user_id", userId)
    .select(LEAD_COLUMNS)
    .single();

  if (error || !data) fail("Could not update lead", error?.message ?? "lead not found");

  return rowToLead(data as unknown as LeadRow);
}

export async function deleteLeadForUser(
  supabase: Client,
  userId: string,
  id: string,
): Promise<{ id: string }> {
  const { error } = await supabase.from("leads").delete().eq("id", id).eq("user_id", userId);

  if (error) fail("Could not delete lead", error.message);

  return { id };
}
