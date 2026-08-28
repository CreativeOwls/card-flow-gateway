import type { Lead } from "./types";

const COLUMNS: Array<{ key: keyof Lead; label: string }> = [
  { key: "fullName", label: "Full name" },
  { key: "jobTitle", label: "Job title" },
  { key: "company", label: "Company" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "website", label: "Website" },
  { key: "linkedinUrl", label: "LinkedIn" },
  { key: "address", label: "Address" },
  { key: "companySummary", label: "Company summary" },
  { key: "status", label: "Status" },
  { key: "capturedAt", label: "Captured at" },
];

function escapeCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function leadsToCsv(leads: Lead[]): string {
  const header = COLUMNS.map((column) => escapeCell(column.label)).join(",");
  const rows = leads.map((lead) =>
    COLUMNS.map((column) => escapeCell(lead[column.key])).join(","),
  );
  return [header, ...rows].join("\r\n");
}

export function downloadCsv(leads: Lead[], fileName = "cardflow-leads.csv"): void {
  if (typeof document === "undefined") return;

  const blob = new Blob([leadsToCsv(leads)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
