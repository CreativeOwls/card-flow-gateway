import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/cardflow/types";

const STATUS_CLASSES: Record<LeadStatus, string> = {
  New: "bg-status-new text-status-new-foreground",
  "Followed Up": "bg-status-followup text-status-followup-foreground",
  "Demo Booked": "bg-status-demo text-status-demo-foreground",
};

interface StatusBadgeProps {
  status: LeadStatus;
  onChange: (status: LeadStatus) => void;
  className?: string;
}

export function StatusBadge({ status, onChange, className }: StatusBadgeProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            STATUS_CLASSES[status],
            className,
          )}
          aria-label={`Lead status: ${status}. Change status`}
        >
          {status}
          <ChevronDown className="size-3 opacity-70" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        onClick={(event) => event.stopPropagation()}
        className="min-w-40"
      >
        {LEAD_STATUSES.map((option) => (
          <DropdownMenuItem
            key={option}
            onSelect={() => {
              if (option !== status) onChange(option);
            }}
            className="text-sm"
          >
            {option}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
