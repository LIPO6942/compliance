"use client";

import React, { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

// Normalization helper
const normalizeKey = (val: any): string => {
  if (val === undefined || val === null) return "";
  let str = String(val).trim();
  
  // Remove trailing ".0" if it's an Excel float formatting of an integer
  if (str.endsWith(".0")) {
    str = str.slice(0, -2);
  }
  
  // Remove leading zeros
  return str.replace(/^0+(?!$)/, '');
};

// Footer row detection helper
const isFooterRow = (row: any): boolean => {
  if (!row) return true;
  return Object.values(row).some(val => {
    if (val === undefined || val === null) return false;
    const str = String(val).toLowerCase().trim();
    
    // Matches "12285 ligne(s) exécutée(s)", "ligne(s) selectionnee(s)", etc.
    return /ligne.*(exécu|execu|sélec|selec|trai)/i.test(str) || 
           /exécutée|executee|sélectionnée|selectionnee|traitée|traitee/i.test(str);
  });
};

// Column auto-detect helper
const autoDetectCol = (cols: string[], possibleNames: string[]): string => {
  for (const col of cols) {
    const lower = String(col).toLowerCase().trim();
    if (possibleNames.includes(lower)) return col;
  }
  for (const col of cols) {
    const lower = String(col).toLowerCase().trim();
    for (const target of possibleNames) {
      if (lower.includes(target)) return col;
    }
  }
  return cols[0] || "";
};

export default function RegtoolsDiffPage() {
  // File state
  const [files, setFiles] = useState<{ regtools: File | null; ns: File | null }>({
    regtools: null,
    ns: null
  });
  const [data, setData] = useState<{ regtools: any[] | null; ns: any[] | null }>({
    regtools: null,
    ns: null
  });
  const [columns, setColumns] = useState<{ regtools: string[]; ns: string[] }>({
    regtools: [],
    ns: []
  });
  
  // Mapping state
  const [mapping, setMapping] = useState({
    regtoolsId: "",
    nsId: "",
    nsAgence: ""
  });

  // UI state
  const [isParsing, setIsParsing] = useState<{ regtools: boolean; ns: boolean }>({
    regtools: false,
    ns: false
  });
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonDone, setComparisonDone] = useState(false);
  const [dragOverRole, setDragOverRole] = useState<"regtools" | "ns" | null>(null);

  // Results state
  const [missingRows, setMissingRows] = useState<any[]>([]);
  const [agenciesList, setAgenciesList] = useState<string[]>([]);
  const [selectedAgency, setSelectedAgency] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // File size formatter
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Octet";
    const k = 1024;
    const sizes = ["Octets", "Ko", "Mo", "Go"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Parser function using XLSX for both Excel and CSV
  const parseFile = (file: File): Promise<{ data: any[]; columns: string[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (!result) throw new Error("Erreur de lecture du fichier.");
          
          const arrayBuffer = result as ArrayBuffer;
          const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
            type: "array",
            cellFormula: false,
            cellHTML: false,
            cellText: false,
            cellStyles: false
          });

          if (workbook.SheetNames.length === 0) {
            throw new Error("Le fichier ne contient aucune feuille de calcul.");
          }

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

          // Filter out empty rows and footer rows
          const cleanData = jsonData.filter((row: any) => {
            const hasValues = Object.values(row).some(val => val !== "");
            return hasValues && !isFooterRow(row);
          });

          let cols: string[] = [];
          if (cleanData.length > 0) {
            cols = Object.keys(cleanData[0]);
          } else if (worksheet["!ref"]) {
            const range = XLSX.utils.decode_range(worksheet["!ref"]);
            for (let c = range.s.c; c <= range.e.c; ++c) {
              const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: c })];
              let hdr = "UNKNOWN_" + c;
              if (cell && cell.t) hdr = XLSX.utils.format_cell(cell);
              cols.push(hdr);
            }
          }

          resolve({ data: cleanData, columns: cols });
        } catch (error: any) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Erreur physique de lecture."));
      reader.readAsArrayBuffer(file);
    });
  };

  // Handle file select
  const handleFileChange = async (role: "regtools" | "ns", file: File) => {
    setIsParsing(prev => ({ ...prev, [role]: true }));
    try {
      const result = await parseFile(file);
      
      setFiles(prev => ({ ...prev, [role]: file }));
      setData(prev => ({ ...prev, [role]: result.data }));
      setColumns(prev => ({ ...prev, [role]: result.columns }));

      // Auto-detect mappings
      if (role === "regtools") {
        const detected = autoDetectCol(result.columns, ['identifiant', 'id', 'identifier', 'code', 'numéro', 'num', 'ref', 'reference', 'matricule']);
        setMapping(prev => ({ ...prev, regtoolsId: detected }));
      } else {
        const detectedId = autoDetectCol(result.columns, ['identifiant', 'id', 'identifier', 'code', 'numéro', 'num', 'ref', 'reference', 'matricule']);
        const detectedAgence = autoDetectCol(result.columns, ['agence', 'agency', 'code agence', 'code_agence', 'structure', 'bureau', 'succursale', 'agenc']);
        setMapping(prev => ({ ...prev, nsId: detectedId, nsAgence: detectedAgence }));
      }
      
      setComparisonDone(false);
    } catch (error: any) {
      alert(`Erreur d'analyse pour ${file.name} :\n${error.message}`);
    } finally {
      setIsParsing(prev => ({ ...prev, [role]: false }));
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent, role: "regtools" | "ns") => {
    e.preventDefault();
    setDragOverRole(role);
  };

  const handleDragLeave = () => {
    setDragOverRole(null);
  };

  const handleDrop = (e: React.DragEvent, role: "regtools" | "ns") => {
    e.preventDefault();
    setDragOverRole(null);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileChange(role, file);
    }
  };

  // Run Comparison
  const handleCompare = () => {
    if (!data.regtools || !data.ns) return;

    setIsComparing(true);
    
    setTimeout(() => {
      try {
        const { regtoolsId, nsId, nsAgence } = mapping;
        if (!regtoolsId || !nsId || !nsAgence) {
          throw new Error("Veuillez configurer toutes les colonnes de rapprochement.");
        }

        // 1. Index RegTools
        const regToolsSet = new Set<string>();
        for (let i = 0; i < data.regtools.length; i++) {
          const row = data.regtools[i];
          const key = normalizeKey(row[regtoolsId]);
          if (key !== "") {
            regToolsSet.add(key);
          }
        }

        // 2. Scan NS
        const missing: any[] = [];
        const agenciesSet = new Set<string>();

        for (let i = 0; i < data.ns.length; i++) {
          const row = data.ns[i];
          const key = normalizeKey(row[nsId]);
          
          // Agence collection
          const agenceVal = row[nsAgence];
          if (agenceVal !== undefined && agenceVal !== null) {
            const agenceStr = String(agenceVal).trim();
            if (agenceStr !== "") {
              agenciesSet.add(agenceStr);
            }
          }

          if (key === "" || !regToolsSet.has(key)) {
            missing.push(row);
          }
        }

        setMissingRows(missing);
        setAgenciesList(Array.from(agenciesSet).sort((a, b) => a.localeCompare(b)));
        setComparisonDone(true);
        setCurrentPage(1);

      } catch (err: any) {
        alert("Erreur lors de la comparaison : " + err.message);
      } finally {
        setIsComparing(false);
      }
    }, 50);
  };

  // Apply filters on the missing rows
  const filteredRows = useMemo(() => {
    if (!comparisonDone) return [];
    
    return missingRows.filter(row => {
      // Agency Filter
      let matchAgency = true;
      if (selectedAgency !== "ALL") {
        const rowAgency = row[mapping.nsAgence];
        matchAgency = rowAgency !== undefined && rowAgency !== null && String(rowAgency).trim() === selectedAgency;
      }

      // Search Filter
      let matchSearch = true;
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        matchSearch = Object.values(row).some(val => 
          val !== undefined && val !== null && String(val).toLowerCase().includes(q)
        );
      }

      return matchAgency && matchSearch;
    });
  }, [missingRows, comparisonDone, selectedAgency, searchQuery, mapping.nsAgence]);

  // Paginated data
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);

  // Pagination helper range
  const paginationRange = useMemo(() => {
    if (totalPages <= 6) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (currentPage > 3) {
      pages.push("...");
    }
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) {
      pages.push("...");
    }
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  // Export Excel function
  const exportExcel = () => {
    if (filteredRows.length === 0) return;

    try {
      const agenceStr = selectedAgency === "ALL" ? "Toutes les agences" : selectedAgency;
      const currentDate = new Date().toLocaleDateString("fr-FR");

      const exportHeaders = [...columns.ns, "CONSIGNE"];
      const exportData = filteredRows.map(row => {
        const newRow: any = {};
        columns.ns.forEach(h => {
          newRow[h] = row[h] !== undefined && row[h] !== null ? row[h] : "";
        });
        newRow["CONSIGNE"] = "Veuillez créer des fiches KYC pour ces clients";
        return newRow;
      });

      const sheetAOA = [
        ["RAPPORT DE RAPPROCHEMENT - CLIENTS ABSENTS DE REGTOOLS"],
        ["CONSIGNE : Veuillez créer des fiches KYC pour ces clients"],
        [`Filtre Agence : ${agenceStr} | Date d'export : ${currentDate} | Lignes : ${exportData.length}`],
        [],
        exportHeaders
      ];

      exportData.forEach(row => {
        sheetAOA.push(exportHeaders.map(h => row[h]));
      });

      const ws = XLSX.utils.aoa_to_sheet(sheetAOA);
      const wb = XLSX.utils.book_new();

      // Merges
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: exportHeaders.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: exportHeaders.length - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: exportHeaders.length - 1 } }
      ];

      // Row Heights
      ws["!rows"] = [
        { hpt: 25 },
        { hpt: 20 },
        { hpt: 18 },
        { hpt: 15 }
      ];

      // Column widths Auto-Fit
      const colWidths = exportHeaders.map((header, colIdx) => {
        let maxLen = header.length;
        for (let rIdx = 5; rIdx < sheetAOA.length; rIdx++) {
          const val = sheetAOA[rIdx][colIdx];
          if (val !== undefined && val !== null) {
            maxLen = Math.max(maxLen, String(val).length);
          }
        }
        return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
      });
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Manquants");
      XLSX.writeFile(wb, `NS_manquants_RegTools_Agence_${agenceStr}.xlsx`);
    } catch (error: any) {
      alert("Erreur lors de l'export Excel : " + error.message);
    }
  };

  // Reset function
  const handleReset = () => {
    setFiles({ regtools: null, ns: null });
    setData({ regtools: null, ns: null });
    setColumns({ regtools: [], ns: [] });
    setMapping({ regtoolsId: "", nsId: "", nsAgence: "" });
    setMissingRows([]);
    setAgenciesList([]);
    setComparisonDone(false);
    setSelectedAgency("ALL");
    setSearchQuery("");
  };

  // Calculation parameters
  const matchRate = useMemo(() => {
    if (!data.ns || !comparisonDone) return 0;
    const foundCount = data.ns.length - missingRows.length;
    return parseFloat(((foundCount / data.ns.length) * 100).toFixed(2));
  }, [data.ns, missingRows, comparisonDone]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Rapprochement Clients RegTools vs NS
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Comparez les identifiants de votre base globale avec la liste NS pour identifier et extraire les écarts par agence.
        </p>
      </div>

      {/* Dashboard Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* RegTools Stat Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base Tab RegTools</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
              {data.regtools ? data.regtools.length.toLocaleString("fr-FR") : "-"}
            </p>
            <p className="text-xs text-slate-400 truncate max-w-[200px] mt-0.5">
              {files.regtools ? files.regtools.name : "Aucun fichier chargé"}
            </p>
          </div>
        </div>

        {/* NS Stat Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fichier NS</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
              {data.ns ? data.ns.length.toLocaleString("fr-FR") : "-"}
            </p>
            <p className="text-xs text-slate-400 truncate max-w-[200px] mt-0.5">
              {files.ns ? files.ns.name : "Aucun fichier chargé"}
            </p>
          </div>
        </div>

        {/* Diff Stat Card */}
        <div className={cn(
          "bg-white dark:bg-slate-900 p-5 rounded-2xl border flex items-center gap-4 transition-colors",
          comparisonDone
            ? missingRows.length > 0
              ? "border-red-500/30 bg-red-50/10 dark:bg-red-950/5"
              : "border-emerald-500/30 bg-emerald-50/10 dark:bg-emerald-950/5"
            : "border-slate-200/60 dark:border-slate-800/60"
        )}>
          <div className={cn(
            "p-3 rounded-xl",
            comparisonDone
              ? missingRows.length > 0
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-slate-500/10 text-slate-400"
          )}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Clients Manquants</p>
            <p className="text-2xl font-bold mt-1">
              {comparisonDone ? missingRows.length.toLocaleString("fr-FR") : "-"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {comparisonDone 
                ? `${matchRate}% trouvé (${(data.ns!.length - missingRows.length).toLocaleString("fr-FR")} lignes)`
                : "Prêt pour comparaison"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Upload & Mapping Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload RegTools */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 dark:text-white">1. Base Référence (Tab RegTools)</h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              Attendu : ~350K lignes
            </span>
          </div>

          <div
            onDragOver={(e) => handleDragOver(e, "regtools")}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, "regtools")}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-height-[150px]",
              dragOverRole === "regtools"
                ? "border-blue-500 bg-blue-500/5"
                : files.regtools
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-slate-200 dark:border-slate-800 hover:border-blue-500/50"
            )}
            onClick={() => document.getElementById("input-regtools")?.click()}
          >
            <input
              type="file"
              id="input-regtools"
              className="hidden"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && handleFileChange("regtools", e.target.files[0])}
            />
            {isParsing.regtools ? (
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Analyse en cours...</p>
              </div>
            ) : files.regtools ? (
              <div className="flex flex-col items-center gap-1.5">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Chargé avec succès</p>
                <p className="text-xs text-slate-400 truncate max-w-[280px]">{files.regtools.name}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-slate-400" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Déposez le fichier ici ou <span className="text-blue-500 underline">parcourez</span>
                </p>
                <p className="text-xs text-slate-400">Formats acceptés : CSV, XLSX, XLS</p>
              </div>
            )}
          </div>

          {files.regtools && data.regtools && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-lg flex flex-col gap-2">
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>{files.regtools.name}</span>
                <span>{formatFileSize(files.regtools.size)}</span>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Colonne d'identifiant :
                </label>
                <select
                  value={mapping.regtoolsId}
                  onChange={(e) => {
                    setMapping(prev => ({ ...prev, regtoolsId: e.target.value }));
                    setComparisonDone(false);
                  }}
                  className="w-full text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 outline-none focus:border-blue-500"
                >
                  {columns.regtools.map(col => (
                    <option key={`regtools-col-${col}`} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Upload NS */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 dark:text-white">2. Fichier à Contrôler (NS)</h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
              Attendu : ~12K lignes
            </span>
          </div>

          <div
            onDragOver={(e) => handleDragOver(e, "ns")}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, "ns")}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-height-[150px]",
              dragOverRole === "ns"
                ? "border-purple-500 bg-purple-500/5"
                : files.ns
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-slate-200 dark:border-slate-800 hover:border-purple-500/50"
            )}
            onClick={() => document.getElementById("input-ns")?.click()}
          >
            <input
              type="file"
              id="input-ns"
              className="hidden"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && handleFileChange("ns", e.target.files[0])}
            />
            {isParsing.ns ? (
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Analyse en cours...</p>
              </div>
            ) : files.ns ? (
              <div className="flex flex-col items-center gap-1.5">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Chargé avec succès</p>
                <p className="text-xs text-slate-400 truncate max-w-[280px]">{files.ns.name}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-slate-400" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Déposez le fichier ici ou <span className="text-purple-500 underline">parcourez</span>
                </p>
                <p className="text-xs text-slate-400">Formats acceptés : CSV, XLSX, XLS</p>
              </div>
            )}
          </div>

          {files.ns && data.ns && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-lg flex flex-col gap-2">
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>{files.ns.name}</span>
                <span>{formatFileSize(files.ns.size)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Identifiant :
                  </label>
                  <select
                    value={mapping.nsId}
                    onChange={(e) => {
                      setMapping(prev => ({ ...prev, nsId: e.target.value }));
                      setComparisonDone(false);
                    }}
                    className="w-full text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 outline-none focus:border-purple-500"
                  >
                    {columns.ns.map(col => (
                      <option key={`ns-col-id-${col}`} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Agence :
                  </label>
                  <select
                    value={mapping.nsAgence}
                    onChange={(e) => {
                      setMapping(prev => ({ ...prev, nsAgence: e.target.value }));
                      setComparisonDone(false);
                    }}
                    className="w-full text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 outline-none focus:border-purple-500"
                  >
                    {columns.ns.map(col => (
                      <option key={`ns-col-agence-${col}`} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compare Control Bar */}
      {data.regtools && data.ns && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-4 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {comparisonDone ? "Comparaison exécutée avec succès." : "Fichiers prêts pour rapprochement."}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Réinitialiser
            </button>
            <button
              onClick={handleCompare}
              disabled={isComparing}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5"
            >
              <RefreshCw className={cn("h-4 w-4", isComparing && "animate-spin")} />
              {isComparing ? "Comparaison..." : "Lancer la Comparaison"}
            </button>
          </div>
        </div>
      )}

      {/* Comparison Results Table */}
      {comparisonDone && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-100 dark:border-slate-800/60 pb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 dark:text-white">Lignes NS absentes de RegTools</h3>
              <span className="text-xs font-bold px-2 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full">
                {filteredRows.length.toLocaleString("fr-FR")} lignes
              </span>
            </div>

            {/* Actions Panel */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Agency Filter */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Agence :</label>
                <select
                  value={selectedAgency}
                  onChange={(e) => {
                    setSelectedAgency(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 outline-none min-w-[150px]"
                >
                  <option value="ALL">Toutes les agences</option>
                  {agenciesList.map(agence => (
                    <option key={`filter-agence-${agence}`} value={agence}>{agence}</option>
                  ))}
                </select>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none w-[200px] focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* Export Trigger */}
              <button
                onClick={exportExcel}
                disabled={filteredRows.length === 0}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
              >
                <Download className="h-4 w-4" />
                Exporter Excel
              </button>
            </div>
          </div>

          {/* Table Element */}
          {filteredRows.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <h4 className="font-semibold text-slate-800 dark:text-white">Aucun écart détecté !</h4>
              <p className="text-xs text-slate-400">Toutes les lignes correspondent aux critères actuels.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      {columns.ns.map(col => (
                        <th 
                          key={`th-${col}`} 
                          className={cn(
                            "p-3 border-b border-slate-100 dark:border-slate-800/60",
                            col === mapping.nsId && "text-purple-600 dark:text-purple-400",
                            col === mapping.nsAgence && "text-blue-600 dark:text-blue-400"
                          )}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row, rIdx) => (
                      <tr key={`tr-row-${rIdx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        {columns.ns.map(col => (
                          <td 
                            key={`td-${rIdx}-${col}`} 
                            className={cn(
                              "p-3 border-b border-slate-100 dark:border-slate-800/60 text-slate-700 dark:text-slate-300",
                              col === mapping.nsId && "font-bold text-purple-600 dark:text-purple-400",
                              col === mapping.nsAgence && "font-bold text-blue-600 dark:text-blue-400"
                            )}
                          >
                            {row[col] !== undefined && row[col] !== null ? String(row[col]) : ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center gap-4 flex-wrap pt-2">
                  <span className="text-xs text-slate-400 font-medium">
                    Affichage de <span className="font-bold text-slate-700 dark:text-white">{(currentPage - 1) * pageSize + 1}</span> à{" "}
                    <span className="font-bold text-slate-700 dark:text-white">{Math.min(currentPage * pageSize, filteredRows.length)}</span> sur{" "}
                    <span className="font-bold text-slate-700 dark:text-white">{filteredRows.length}</span> lignes
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {paginationRange.map((p, pIdx) => {
                        if (p === "...") {
                          return <span key={`ellip-${pIdx}`} className="px-2 text-slate-400">...</span>;
                        }
                        return (
                          <button
                            key={`page-btn-${p}`}
                            onClick={() => setCurrentPage(p as number)}
                            className={cn(
                              "h-7 w-7 text-xs font-semibold rounded-lg transition-all",
                              p === currentPage
                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                            )}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="text-xs text-slate-400">Par page :</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(parseInt(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1 outline-none"
                      >
                        <option value="15">15</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="500">500</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
