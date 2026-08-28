import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, LogOut, Moon, ScanLine, Search, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { LeadDrawer } from "@/components/cardflow/LeadDrawer";
import { ScanDialog } from "@/components/cardflow/ScanDialog";
import { StatusBadge } from "@/components/cardflow/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { copyText } from "@/lib/cardflow/clipboard";
import { downloadCsv } from "@/lib/cardflow/csv";
import { createLead, listLeads, updateLead } from "@/lib/cardflow/leads.functions";
import { LEAD_STATUSES, type ExtractedCard, type Lead } from "@/lib/cardflow/types";
import { supabase } from "@/integrations/supabase/client";

const TITLE = "Lead pipeline — CardFlow";
const DESCRIPTION =
  "Scan DevFest 2026 business cards, enrich them automatically, and send follow-up emails from one CardFlow pipeline.";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type StatusFilter = "All" | Lead["status"];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cardflow-theme");
    setDark(stored === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    return () => document.documentElement.classList.remove("dark");
  }, [dark]);

  const toggle = () => {
    setDark((previous) => {
      const next = !previous;
      localStorage.setItem("cardflow-theme", next ? "dark" : "light");
      return next;
    });
  };

  return { dark, toggle };
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { dark, toggle } = useTheme();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [scanOpen, setScanOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const leadsQuery = useQuery({
    queryKey: ["leads"],
    queryFn: () => listLeads(),
  });

  const leads = leadsQuery.data ?? [];

  const setCache = (next: Lead[]) => queryClient.setQueryData(["leads"], next);

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; patch: Partial<Lead> }) => updateLead({ data: input }),
    onMutate: ({ id, patch }) => {
      const previous = queryClient.getQueryData<Lead[]>(["leads"]) ?? [];
      setCache(previous.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) setCache(context.previous);
      toast.error(error instanceof Error ? error.message : "Could not save that change.");
    },
    onSuccess: (saved) => {
      const current = queryClient.getQueryData<Lead[]>(["leads"]) ?? [];
      setCache(current.map((lead) => (lead.id === saved.id ? saved : lead)));
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: Partial<Lead>) => createLead({ data: input }),
    onSuccess: (created) => {
      const current = queryClient.getQueryData<Lead[]>(["leads"]) ?? [];
      setCache([created, ...current]);
      setSelectedId(created.id);
      toast.success(`${created.fullName || "Lead"} added to your pipeline.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save that lead.");
    },
  });

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter !== "All" && lead.status !== statusFilter) return false;
      if (!needle) return true;
      return [lead.fullName, lead.company, lead.jobTitle, lead.email]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [leads, search, statusFilter]);

  const followUpsReady = leads.filter((lead) => lead.status !== "Demo Booked").length;
  const selected = leads.find((lead) => lead.id === selectedId) ?? null;

  const handlePatch = (id: string, patch: Partial<Lead>) => updateMutation.mutate({ id, patch });

  const handleScanned = (card: ExtractedCard, imageDataUrl: string) => {
    createMutation.mutate({ ...card, status: "New", cardImageUrl: imageDataUrl });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/", replace: true });
  };

  const copyCell = async (value: string, label: string) => {
    if (!value) return;
    const ok = await copyText(value);
    if (ok) toast.success(`${label} copied.`);
  };

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              CF
            </span>
            <span className="text-base font-semibold tracking-tight">CardFlow</span>
          </div>

          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            Total Leads: {leads.length} | Follow-ups Ready: {followUpsReady}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => downloadCsv(filtered)}
            >
              <Download className="size-4" aria-hidden="true" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setScanOpen(true)}>
              <ScanLine className="size-4" aria-hidden="true" />
              Scan Business Card
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Lead pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Every card you scan lands here, enriched and ready for a follow-up email.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, company, title, email"
              className="pl-9"
              aria-label="Search leads"
            />
          </div>

          <Tabs
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <TabsList>
              <TabsTrigger value="All">All</TabsTrigger>
              {LEAD_STATUSES.map((status) => (
                <TabsTrigger key={status} value={status}>
                  {status}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead className="hidden md:table-cell">Company</TableHead>
                <TableHead className="hidden lg:table-cell">Reach out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leadsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Loading your pipeline…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No leads match those filters yet. Scan a card to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(lead.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initialsOf(lead.fullName)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{lead.fullName || "Unnamed lead"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {lead.jobTitle || "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="truncate font-medium">{lead.company || "—"}</p>
                      {lead.website ? (
                        <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <button
                        type="button"
                        className="block max-w-52 truncate text-sm hover:underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          void copyCell(lead.email, "Email");
                        }}
                      >
                        {lead.email || "—"}
                      </button>
                      <button
                        type="button"
                        className="block max-w-52 truncate text-xs text-muted-foreground hover:underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          void copyCell(lead.phone, "Phone");
                        }}
                      >
                        {lead.phone || "—"}
                      </button>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={lead.status}
                        onChange={(status) => handlePatch(lead.id, { status })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(lead.id);
                        }}
                      >
                        View &amp; Send Follow-up
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      <ScanDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onScanned={handleScanned}
        excludeEmails={leads.map((lead) => lead.email).filter(Boolean)}
      />

      <LeadDrawer
        lead={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        onPatch={handlePatch}
      />
    </div>
  );
}
