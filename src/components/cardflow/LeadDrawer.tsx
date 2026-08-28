import { Copy, Download, ExternalLink, Mail, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/cardflow/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { copyText } from "@/lib/cardflow/clipboard";
import { downloadCsv } from "@/lib/cardflow/csv";
import { emailSubject, generateFollowUpEmail, gmailComposeUrl } from "@/lib/cardflow/email";
import { sendGmail } from "@/lib/cardflow/gmail.functions";
import { EMAIL_TONES, type EmailTone, type Lead, type LeadStatus } from "@/lib/cardflow/types";

interface LeadDrawerProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatch: (id: string, patch: Partial<Lead>) => void;
  onDelete: (id: string) => void;
}

const FIELDS: Array<{ key: keyof Lead; label: string; type?: string }> = [
  { key: "fullName", label: "Full name" },
  { key: "jobTitle", label: "Job title" },
  { key: "company", label: "Company" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone" },
  { key: "website", label: "Website" },
  { key: "linkedinUrl", label: "LinkedIn" },
  { key: "address", label: "Address" },
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function LeadDrawer({ lead, open, onOpenChange, onPatch, onDelete }: LeadDrawerProps) {
  const [tone, setTone] = useState<EmailTone>("Casual");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!lead) return;
    setTone("Casual");
    setBody(lead.suggestedEmailDraft || generateFollowUpEmail(lead, "Casual"));
  }, [lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const subject = useMemo(() => (lead ? emailSubject(lead) : ""), [lead]);

  if (!lead) return null;

  const patch = (next: Partial<Lead>) => onPatch(lead.id, next);

  const markFollowedUp = () => {
    if (lead.status === "New") patch({ status: "Followed Up" });
  };

  const handleToneChange = (nextTone: EmailTone) => {
    setTone(nextTone);
    const draft = generateFollowUpEmail(lead, nextTone);
    setBody(draft);
    patch({ suggestedEmailDraft: draft });
  };

  const handleSend = async () => {
    if (!lead.email) {
      toast.error("This lead has no email address yet.");
      return;
    }
    setSending(true);
    try {
      await sendGmail({ data: { to: lead.email, subject, body } });
      markFollowedUp();
      toast.success(`Follow-up sent to ${lead.email}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send that email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="app-shell w-full max-w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initialsOf(lead.fullName)}
            </span>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-left">
                {lead.fullName || "Unnamed lead"}
              </SheetTitle>
              <SheetDescription className="truncate text-left">
                {[lead.jobTitle, lead.company].filter(Boolean).join(" · ") || "No title on file"}
              </SheetDescription>
            </div>
          </div>
          <StatusBadge
            status={lead.status}
            onChange={(status: LeadStatus) => patch({ status })}
            className="w-fit"
          />
        </SheetHeader>

        <div className="space-y-5 px-4 pb-10 sm:space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Card photo</h3>
            {lead.cardImageUrl ? (
              <img
                src={lead.cardImageUrl}
                alt={`Business card for ${lead.fullName || "this lead"}`}
                loading="lazy"
                className="aspect-[16/10] w-full rounded-lg border border-border object-cover"
              />
            ) : (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No card photo stored for this lead.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium">Extracted details</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={`lead-${field.key}`} className="text-xs text-muted-foreground">
                    {field.label}
                  </Label>
                  <Input
                    id={`lead-${field.key}`}
                    type={field.type ?? "text"}
                    defaultValue={String(lead[field.key] ?? "")}
                    onChange={(event) => patch({ [field.key]: event.target.value } as Partial<Lead>)}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2 rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium">AI company summary</h3>
            <p className="text-sm text-muted-foreground">
              {lead.companySummary || "No summary yet — scan or enrich this lead to generate one."}
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium">Follow-up email</h3>
            <Tabs value={tone} onValueChange={(value) => handleToneChange(value as EmailTone)}>
              <TabsList>
                {EMAIL_TONES.map((option) => (
                  <TabsTrigger key={option} value={option}>
                    {option}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="space-y-1.5">
              <Label htmlFor="lead-subject" className="text-xs text-muted-foreground">
                Subject
              </Label>
              <Input id="lead-subject" value={subject} readOnly />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lead-body" className="text-xs text-muted-foreground">
                Body
              </Label>
              <Textarea
                id="lead-body"
                rows={10}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onBlur={() => patch({ suggestedEmailDraft: body })}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={handleSend} disabled={sending} className="w-full gap-2">
                <Send className="size-4" aria-hidden="true" />
                {sending ? "Sending…" : "Send with Gmail"}
              </Button>
              <Button
                variant="secondary"
                className="w-full gap-2"
                onClick={() => {
                  window.open(gmailComposeUrl(lead.email, subject, body), "_blank", "noopener");
                  markFollowedUp();
                }}
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                Open in Gmail
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={async () => {
                  const ok = await copyText(`${subject}\n\n${body}`);
                  if (ok) toast.success("Email copied to clipboard.");
                  else toast.error("Could not copy the email.");
                }}
              >
                <Copy className="size-4" aria-hidden="true" />
                Copy email
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() =>
                  downloadCsv(
                    [lead],
                    `cardflow-${(lead.fullName || "lead").toLowerCase().replace(/\s+/g, "-")}.csv`,
                  )
                }
              >
                <Download className="size-4" aria-hidden="true" />
                Export to CSV
              </Button>
            </div>

            {!lead.email ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="size-3.5" aria-hidden="true" />
                Add an email address to enable sending.
              </p>
            ) : null}
          </section>

          <section className="border-t border-border pt-5">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full gap-2">
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete lead
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="app-shell">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {lead.fullName || "This lead"} will be permanently removed from your pipeline.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(lead.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
