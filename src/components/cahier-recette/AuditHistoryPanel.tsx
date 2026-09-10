"use client";

import React, { useState } from "react";
import { AuditEntry } from "@/types/testBook";
import { cn } from "@/lib/utils";
import { History, ChevronDown, ChevronUp, MessageSquare, Clock, User, Tag } from "lucide-react";

interface AuditHistoryPanelProps {
  auditHistory?: AuditEntry[];
  className?: string;
}

const ACTION_COLORS: Record<string, string> = {
  "Création": "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  "Modification": "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  "Changement de statut": "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  "Résolution": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  "Réouverture": "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  "Suppression": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
};

function formatAuditDate(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export const AuditHistoryPanel: React.FC<AuditHistoryPanelProps> = ({
  auditHistory,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!auditHistory || auditHistory.length === 0) return null;

  const sorted = [...auditHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const preview = sorted[0];
  const rest = sorted.slice(1);

  return (
    <div className={cn("rounded-2xl border border-slate-200/70 dark:border-slate-800/70 overflow-hidden", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Historique des modifications
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-indigo-600 text-white">
            {auditHistory.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        )}
      </button>

      {/* Latest entry always visible */}
      <div className="px-3.5 py-2.5 bg-white/60 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800">
        <AuditEntryRow entry={preview} />
      </div>

      {/* Expanded entries */}
      {isExpanded && rest.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60">
          {rest.map((entry, i) => (
            <div key={i} className="px-3.5 py-2.5 bg-white/40 dark:bg-slate-900/20">
              <AuditEntryRow entry={entry} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AuditEntryRow: React.FC<{ entry: AuditEntry }> = ({ entry }) => {
  const colorClass = ACTION_COLORS[entry.action] || ACTION_COLORS["Modification"];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Action badge */}
        <span className={cn("px-1.5 py-0.5 rounded-md text-[9px] font-black border", colorClass)}>
          {entry.action}
        </span>
        {/* Author */}
        <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
          <User className="h-2.5 w-2.5" />
          {entry.author}
        </span>
        {/* Timestamp */}
        <span className="flex items-center gap-1 text-[9.5px] text-slate-400 dark:text-slate-500 font-medium ml-auto">
          <Clock className="h-2.5 w-2.5" />
          {formatAuditDate(entry.timestamp)}
        </span>
      </div>

      {/* Changes */}
      <p className="text-[10.5px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
        <Tag className="h-2.5 w-2.5 inline mr-1 text-slate-400" />
        {entry.changes}
      </p>

      {/* Optional remark */}
      {entry.remark && (
        <p className="flex items-start gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 italic font-medium bg-indigo-50/60 dark:bg-indigo-950/30 px-2 py-1 rounded-lg">
          <MessageSquare className="h-2.5 w-2.5 mt-0.5 shrink-0" />
          {entry.remark}
        </p>
      )}
    </div>
  );
};
