import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, FileSpreadsheet } from "lucide-react";
import { TestBookMetadata } from "@/types/testBook";

interface TestBookCoverCardProps {
  metadata: TestBookMetadata;
  onExportPDF: () => void;
  onExportExcel: () => void;
}

export const TestBookCoverCard: React.FC<TestBookCoverCardProps> = ({
  metadata,
  onExportPDF,
  onExportExcel
}) => {
  return (
    <Card className="border-none shadow-md bg-white dark:bg-slate-900 rounded-2xl p-6">
      <div className="max-w-3xl space-y-6">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Fiche Signalétique & Métadonnées du Projet
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Informations administratives et environnement de recette pour RegTools
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Projet</span>
            <p className="text-sm font-black text-slate-800 dark:text-white">{metadata.project}</p>
          </div>

          <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Éditeur / Organisation</span>
            <p className="text-sm font-black text-slate-800 dark:text-white">{metadata.editor}</p>
          </div>

          <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">URL Applicative</span>
            <p className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 break-all">{metadata.url}</p>
          </div>

          <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Environnement</span>
            <p className="text-sm font-black text-slate-800 dark:text-white">{metadata.environment}</p>
          </div>

          <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Date d'Homologation</span>
            <p className="text-sm font-black text-slate-800 dark:text-white">{metadata.generationDate}</p>
          </div>

          <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Équipe de Test</span>
            <p className="text-sm font-black text-slate-800 dark:text-white">{metadata.tester}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <Button onClick={onExportPDF} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold gap-2">
            <Printer className="h-4 w-4" />
            Générer le Document Complet Certifié (PDF)
          </Button>
          <Button variant="outline" onClick={onExportExcel} className="rounded-xl text-xs font-bold gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Télécharger le Cahier en Excel
          </Button>
        </div>
      </div>
    </Card>
  );
};
