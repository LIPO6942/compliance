"use client";

import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TestCase, Anomaly, AuditEntry } from "@/types/testBook";
import { cn } from "@/lib/utils";
import { History, User, Clock, Tag, MessageSquare, FileText, AlertTriangle } from "lucide-react";

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCases: TestCase[];
  anomalies: Anomaly[];
}

interface AuditRow extends AuditEntry {
  sourceId: string;
  sourceType: "test" | "anomalie";
  sourceTitle?: string;
}

const ACTION_COLORS: Record<string, string> = {
  "Création": "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  "Modification": "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  "Changement de statut": "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  "Résolution": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  "Réouverture": "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800",
};

function fmtDate(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
      + " à "
      + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  testCases,
  anomalies,
}) => {
  const allEntries = useMemo<AuditRow[]>(() => {
    const rows: AuditRow[] = [];
    testCases.forEach((tc) => {
      (tc.auditHistory || []).forEach((entry) => {
        rows.push({ ...entry, sourceId: tc.id, sourceType: "test", sourceTitle: tc.title });
      });
    });
    anomalies.forEach((ano) => {
      (ano.auditHistory || []).forEach((entry) => {
        rows.push({ ...entry, sourceId: ano.id, sourceType: "anomalie", sourceTitle: ano.description?.slice(0, 60) });
      });
    });
    return rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [testCases, anomalies]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <History className="h-5 w-5" />
            </div>
            Journal des modifications
            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white">
              {allEntries.length} entrée{allEntries.length !== 1 ? "s" : ""}
            </span>
          </DialogTitle>
        </DialogHeader>

        {allEntries.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">Aucune modification enregistrée</p>
            <p className="text-xs mt-1">Les modifications futures apparaîtront ici.</p>
          </div>
        ) : (
          <div className="space-y-2 pt-3">
            {allEntries.map((entry, i) => {
              const colorClass = ACTION_COLORS[entry.action] || ACTION_COLORS["Modification"];
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3 space-y-2"
                >
                  {/* Header row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Source badge */}
                    <span className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black border",
                      entry.sourceType === "test"
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                        : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                    )}>
                      {entry.sourceType === "test"
                        ? <FileText className="h-2.5 w-2.5" />
                        : <AlertTriangle className="h-2.5 w-2.5" />}
                      {entry.sourceId}
                    </span>

                    {/* Action badge */}
                    <span className={cn("px-1.5 py-0.5 rounded-md text-[9px] font-black border", colorClass)}>
                      {entry.action}
                    </span>

                    {/* Author */}
                    <span className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-300 font-bold">
                      <User className="h-2.5 w-2.5 text-slate-400" />
                      {entry.author}
                    </span>

                    {/* Timestamp */}
                    <span className="flex items-center gap-1 text-[9.5px] text-slate-400 dark:text-slate-500 font-medium ml-auto">
                      <Clock className="h-2.5 w-2.5" />
                      {fmtDate(entry.timestamp)}
                    </span>
                  </div>

                  {/* Source title */}
                  {entry.sourceTitle && (
                    <p className="text-[10px] text-slate-400 italic truncate pl-0.5">
                      {entry.sourceTitle}
                    </p>
                  )}

                  {/* Changes */}
                  <p className="text-[10.5px] text-slate-700 dark:text-slate-200 font-medium leading-relaxed flex items-start gap-1">
                    <Tag className="h-2.5 w-2.5 mt-0.5 text-slate-400 shrink-0" />
                    {entry.changes}
                  </p>

                  {/* Remark */}
                  {entry.remark && (
                    <p className="flex items-start gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 italic font-medium bg-indigo-50/60 dark:bg-indigo-950/30 px-2 py-1 rounded-lg">
                      <MessageSquare className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                      {entry.remark}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
