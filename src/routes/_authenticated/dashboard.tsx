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
    <div className="app-shell min-h-screen overflow-x-hidden">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              CF
            </span>
            <span className="truncate text-base font-semibold tracking-tight">CardFlow</span>
          </div>

          <span className="hidden rounded-full border border-border px-3 py-1 text-xs text-muted-foreground lg:inline">
            Total Leads: {leads.length} | Follow-ups Ready: {followUpsReady}
          </span>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setScanOpen(true)}
              aria-label="Scan business card"
            >
              <ScanLine className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Scan Business Card</span>
              <span className="sm:hidden">Scan</span>
            </Button>

            {/* Desktop actions */}
            <div className="hidden items-center gap-2 md:flex">
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
            </div>

            {/* Mobile menu */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="size-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="app-shell w-[85vw] max-w-sm">
                <SheetHeader>
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-3 px-4 pb-8">
                  <p className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
                    Total Leads: {leads.length}
                    <br />
                    Follow-ups Ready: {followUpsReady}
                  </p>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      toggle();
                    }}
                  >
                    {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    {dark ? "Light theme" : "Dark theme"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      downloadCsv(filtered);
                      setMenuOpen(false);
                    }}
                  >
                    <Download className="size-4" aria-hidden="true" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setMenuOpen(false);
                      void handleSignOut();
                    }}
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    Sign out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Lead pipeline</h1>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground md:text-base">
            Every card you scan lands here, enriched and ready for a follow-up email.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:max-w-xs">
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

          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
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
        </div>

        {/* Mobile: stacked cards */}
        <div className="space-y-3 md:hidden">
          {leadsQuery.isLoading ? (
            <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Loading your pipeline…
            </p>
          ) : filtered.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No leads match those filters yet. Scan a card to get started.
            </p>
          ) : (
            filtered.map((lead) => (
              <article
                key={lead.id}
                className="space-y-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initialsOf(lead.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{lead.fullName || "Unnamed lead"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[lead.jobTitle, lead.company].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </div>

                {lead.email || lead.phone ? (
                  <div className="space-y-1 text-sm">
                    {lead.email ? (
                      <p className="truncate text-muted-foreground">{lead.email}</p>
                    ) : null}
                    {lead.phone ? (
                      <p className="truncate text-muted-foreground">{lead.phone}</p>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3">
                  <StatusBadge
                    status={lead.status}
                    onChange={(status) => handlePatch(lead.id, { status })}
                    className="w-fit"
                  />
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => setSelectedId(lead.id)}
                  >
                    View &amp; Send Follow-up
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
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
