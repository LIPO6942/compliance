"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
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
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { useUser } from "@/contexts/UserContext";
import { useActivityLog } from "@/contexts/ActivityLogContext";

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

const AGENCY_MAPPING: Record<string, { name: string; type: string }> = {
  "101": { name: "Place Barcelone", type: "Succursale" },
  "102": { name: "Bizerte", type: "Succursale" },
  "103": { name: "Sousse 1", type: "Succursale" },
  "104": { name: "Sfax 1", type: "Succursale" },
  "105": { name: "Bab Bnet", type: "Succursale" },
  "106": { name: "Kairouan", type: "Succursale" },
  "107": { name: "Gabès", type: "Succursale" },
  "108": { name: "Béja", type: "Succursale" },
  "109": { name: "Nabeul", type: "Succursale" },
  "110": { name: "Al Djazira", type: "Succursale" },
  "111": { name: "Monastir", type: "Succursale" },
  "112": { name: "Jean Jaurès", type: "Succursale" },
  "113": { name: "Lafayette", type: "Succursale" },
  "114": { name: "Kef", type: "Succursale" },
  "115": { name: "Ariana", type: "Succursale" },
  "116": { name: "Bardo", type: "Succursale" },
  "117": { name: "Sfax 2", type: "Succursale" },
  "118": { name: "Sousse 2", type: "Succursale" },
  "119": { name: "Ben Arous I", type: "Succursale" },
  "120": { name: "Djerba", type: "Succursale" },
  "121": { name: "Gafsa", type: "Succursale" },
  "122": { name: "Mourouj", type: "Succursale" },
  "123": { name: "Siliana", type: "Succursale" },
  "124": { name: "Mahdia", type: "Succursale" },
  "125": { name: "Kelibia", type: "Succursale" },
  "126": { name: "Jendouba", type: "Succursale" },
  "127": { name: "Les Berges du Lac", type: "Succursale" },
  "128": { name: "Manar", type: "Succursale" },
  "129": { name: "Sakiet Ezzit", type: "Succursale" },
  "130": { name: "Hammam Lif", type: "Succursale" },
  "131": { name: "Hammamet", type: "Succursale" },
  "132": { name: "M'saken", type: "Succursale" },
  "133": { name: "Zarzis", type: "Succursale" },
  "134": { name: "Sakiet Eddayer", type: "Succursale" },
  "135": { name: "Manouba", type: "Succursale" },
  "136": { name: "Ennasr", type: "Succursale" },
  "137": { name: "Ben Arous II", type: "Succursale" },
  "138": { name: "El Menzah", type: "Succursale" },
  "139": { name: "El Kram", type: "Succursale" },
  "140": { name: "Tataouine", type: "Succursale" },
  "141": { name: "Soukra", type: "Succursale" },
  "142": { name: "Béja II", type: "Succursale" },
  "143": { name: "Nabeul II", type: "Succursale" },
  "144": { name: "AG Sousse (Tafala)", type: "Agence" },
  "146": { name: "AG Gabès", type: "Agence" },
  "147": { name: "AG Raoued", type: "Agence" },
  "149": { name: "AG El Mourouj 3", type: "Agence" },
  "150": { name: "AG Ezzouhour", type: "Agence" },
  "151": { name: "AG Sousse Erriadh", type: "Agence" },
  "152": { name: "AG Sahloul sousse1", type: "Agence" },
  "154": { name: "AG Ennasr II", type: "Agence" },
  "155": { name: "AG Sidi hassine", type: "Agence" },
  "156": { name: "AG El Ouardia", type: "Agence" },
  "157": { name: "AG Mannouba", type: "Agence" },
  "160": { name: "AG chebba", type: "Agence" },
  "161": { name: "AG Boumerdès", type: "Agence" },
  "162": { name: "AG kef", type: "Agence" },
  "165": { name: "AG Enfidha", type: "Agence" },
  "167": { name: "AG Menzel Bourguiba", type: "Agence" },
  "168": { name: "AG Grombalia", type: "Agence" },
  "169": { name: "Testour", type: "Succursale" },
  "170": { name: "AG TRIGUI", type: "Agence" },
  "171": { name: "AG Ettadhamen", type: "Agence" },
  "172": { name: "AG Mjez El Bab", type: "Agence" },
  "173": { name: "AG Ezzahra", type: "Agence" },
  "176": { name: "AG L'Aouina", type: "Agence" },
  "179": { name: "AG Gafsa", type: "Agence" },
  "180": { name: "Zaghouan", type: "Succursale" },
  "181": { name: "AG Kairouan", type: "Agence" },
  "183": { name: "AG Kebili", type: "Agence" },
  "184": { name: "AG Mégrine", type: "Agence" },
  "185": { name: "AG Sfax", type: "Agence" },
  "186": { name: "AG Sfax I", type: "Agence" },
  "187": { name: "AG Médenine", type: "Agence" },
  "188": { name: "AG Korba", type: "Agence" },
  "191": { name: "AG Moknine", type: "Agence" },
  "192": { name: "AG Djerba", type: "Agence" },
  "193": { name: "AG Feriana", type: "Agence" },
  "194": { name: "AG Kasserine", type: "Agence" },
  "195": { name: "AG Tozeur", type: "Agence" },
  "196": { name: "AG El Hamma", type: "Agence" },
  "199": { name: "AG Fouchana", type: "Agence" },
  "271": { name: "Lamine Taieb", type: "courtier" },
  "272": { name: "IMN'ASS", type: "courtier" },
  "273": { name: "Arab African Ins", type: "courtier" },
  "274": { name: "Kais Karaoun", type: "courtier" },
  "275": { name: "El Amana Selcar", type: "courtier" },
  "276": { name: "Timar", type: "courtier" },
  "277": { name: "ST Tunisie cortage", type: "courtier" },
  "278": { name: "ST Macecar", type: "courtier" },
  "279": { name: "Pre-Assur", type: "courtier" },
  "800": { name: "AG Sousse (Kalaa Kebira)", type: "Agence" },
  "801": { name: "Radès", type: "Succursale" },
  "804": { name: "AG Ben Gerdane", type: "Agence" },
  "805": { name: "El Mechtel", type: "Succursale" },
  "807": { name: "Monastir II", type: "Succursale" },
  "808": { name: "AG Hammamet", type: "Agence" },
  "809": { name: "soliman", type: "Succursale" },
  "810": { name: "Zarzis II", type: "Succursale" },
  "811": { name: "El-Jem", type: "Succursale" },
  "812": { name: "Ettoufik", type: "Succursale" },
  "813": { name: "Ghardimaou", type: "Agence" },
  "814": { name: "La Goulette", type: "Succursale" },
  "817": { name: "Sfax V", type: "Succursale" },
  "818": { name: "Lac II", type: "Succursale" },
  "820": { name: "Med Chaouki Ben Amor", type: "Agence Stagiaire" },
  "821": { name: "Kaouther Selmi", type: "Agence" },
  "822": { name: "Med Ali Larjimi", type: "Agence" },
  "823": { name: "Skander Ben Aissa", type: "Agence" },
  "824": { name: "Affef Mrafeq", type: "Agence" },
  "825": { name: "Aziz Tenjel", type: "Agence Stagiaire" },
  "827": { name: "Gabès II", type: "Succursale" },
  "830": { name: "Emna Ayari", type: "Agence Stagiaire" },
  "831": { name: "Nourhene Alouini", type: "Agence Stagiaire" },
  "850": { name: "ghassen Ramdhani", type: "Bureau direct" },
  "832": { name: "La Marsa", type: "Succursale" },
  "833": { name: "Sodab", type: "courtier" },
  "834": { name: "Ines derbel", type: "Agence Stagiaire" },
  "835": { name: "Sonia Mathlouthi", type: "Agence" },
  "837": { name: "Rehab dridi", type: "Agence Stagiaire" },
  "838": { name: "Souha emnaa", type: "Agence Stagiaire" },
  "839": { name: "Bekri Fatma", type: "Agence Stagiaire" },
  "840": { name: "Nouha ayadi", type: "Agence Stagiaire" },
  "841": { name: "Imen trabelsi", type: "Agence Stagiaire" },
  "842": { name: "Asma Mathlouthi", type: "Agence Stagiaire" },
  "843": { name: "OLEA", type: "courtier" },
  "851": { name: "Nadia Ferjallah", type: "Bureau direct" },
  "846": { name: "Bousselem", type: "Succursale" },
  "847": { name: "Jemmel", type: "Succursale" },
  "852": { name: "Mourouj 6", type: "Succursale" },
  "281": { name: "asse assurances", type: "courtier" },
  "844": { name: "hanen gridi", type: "Agence" },
  "848": { name: "Rym aouayni", type: "Agence Stagiaire" },
  "845": { name: "cyrine kedri", type: "Agence Stagiaire" },
  "854": { name: "yassine chanaoueh", type: "Agence Stagiaire" },
  "857": { name: "olfa eschi", type: "Agence Stagiaire" }
};

const resolveAgencyInfo = (code: any) => {
  if (code === undefined || code === null) {
    return { code: "", name: "Non spécifié", type: "-" };
  }
  const normalizedCode = String(code).trim().replace(/^0+(?!$)/, '');
  const info = AGENCY_MAPPING[normalizedCode];
  if (info) {
    return {
      code: normalizedCode,
      name: info.name,
      type: info.type
    };
  }
  return {
    code: normalizedCode,
    name: `Agence ${normalizedCode}`,
    type: "Inconnu"
  };
};

// Excel Date formatting helper
const formatExcelValue = (colName: string, val: any): string => {
  if (val === undefined || val === null || val === "") return "";
  const strVal = String(val).trim();
  
  if (colName.toLowerCase().includes("date")) {
    const num = Number(strVal);
    if (!isNaN(num) && num > 10000 && num < 100000) {
      const days = num - (num > 59 ? 25569 : 25568);
      const date = new Date(days * 24 * 3600 * 1000);
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
  }
  return strVal;
};

export default function RegtoolsDiffPage() {
  const { user } = useUser();
  const { logAction, isAdmin } = useActivityLog();

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

  // Agency stats and tabs state
  const [activeTab, setActiveTab] = useState<"list" | "stats">("list");
  const [statsSearchQuery, setStatsSearchQuery] = useState("");
  const [statsSortField, setStatsSortField] = useState<"agence" | "nom" | "type" | "total" | "existing" | "missing" | "pctExisting" | "pctMissing">("agence");
  const [statsSortDirection, setStatsSortDirection] = useState<"asc" | "desc">("asc");

  // Page Tab state and History state
  const [pageTab, setPageTab] = useState<"new" | "history">("new");
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<any | null>(null);

  // History detail view states
  const [historyTab, setHistoryTab] = useState<"stats" | "list">("stats");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyStatsSearchQuery, setHistoryStatsSearchQuery] = useState("");
  const [historySortField, setHistorySortField] = useState<"agence" | "nom" | "type" | "total" | "existing" | "missing" | "pctExisting" | "pctMissing">("agence");
  const [historySortDirection, setHistorySortDirection] = useState<"asc" | "desc">("asc");
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(15);

  // New filters and sort states
  const [statsTypeFilter, setStatsTypeFilter] = useState<string>("ALL");
  const [historyStatsTypeFilter, setHistoryStatsTypeFilter] = useState<string>("ALL");
  const [historySelectedAgency, setHistorySelectedAgency] = useState<string>("ALL");
  const [detailsSortField, setDetailsSortField] = useState<string>("");
  const [detailsSortDirection, setDetailsSortDirection] = useState<"asc" | "desc">("asc");
  const [historyDetailsSortField, setHistoryDetailsSortField] = useState<string>("");
  const [historyDetailsSortDirection, setHistoryDetailsSortDirection] = useState<"asc" | "desc">("asc");

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

  // Sort the filtered rows
  const sortedRows = useMemo(() => {
    if (!detailsSortField) return filteredRows;
    const items = [...filteredRows];
    items.sort((a, b) => {
      const valA = a[detailsSortField];
      const valB = b[detailsSortField];
      
      if (valA === undefined || valA === null) return detailsSortDirection === "asc" ? 1 : -1;
      if (valB === undefined || valB === null) return detailsSortDirection === "asc" ? -1 : 1;
      
      const strA = String(valA).trim();
      const strB = String(valB).trim();
      
      // Check if numeric
      const numA = Number(strA);
      const numB = Number(strB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return detailsSortDirection === "asc" ? numA - numB : numB - numA;
      }
      
      return detailsSortDirection === "asc"
        ? strA.localeCompare(strB, undefined, { numeric: true, sensitivity: "base" })
        : strB.localeCompare(strA, undefined, { numeric: true, sensitivity: "base" });
    });
    return items;
  }, [filteredRows, detailsSortField, detailsSortDirection]);

  // Paginated data
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [sortedRows, currentPage, pageSize]);

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

      const exportHeaders = [...columns.ns];
      const exportData = filteredRows.map(row => {
        const newRow: any = {};
        columns.ns.forEach(h => {
          newRow[h] = row[h] !== undefined && row[h] !== null ? formatExcelValue(h, row[h]) : "";
        });
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

  // Export a single agency's discrepancy details
  const exportSingleAgencyExcel = (agencyCode: string, isHistory: boolean) => {
    try {
      const agencyInfo = resolveAgencyInfo(agencyCode);
      const currentDate = new Date().toLocaleDateString("fr-FR");
      
      let rowsToExport: any[] = [];
      let nsCols: string[] = [];
      let nsFileName = "";
      
      if (!isHistory) {
        if (!comparisonDone || !mapping.nsAgence) return;
        rowsToExport = missingRows.filter(row => {
          const val = row[mapping.nsAgence];
          return val !== undefined && val !== null && String(val).trim().replace(/^0+(?!$)/, '') === agencyCode.replace(/^0+(?!$)/, '');
        });
        nsCols = columns.ns;
        nsFileName = files.ns ? files.ns.name : "";
      } else {
        if (!selectedHistoryReport) return;
        const agencyCol = selectedHistoryReport.mapping?.nsAgence;
        if (!agencyCol) return;
        rowsToExport = (selectedHistoryReport.missingRows || []).filter((row: any) => {
          const val = row[agencyCol];
          return val !== undefined && val !== null && String(val).trim().replace(/^0+(?!$)/, '') === agencyCode.replace(/^0+(?!$)/, '');
        });
        nsCols = selectedHistoryReport.columnsNS || [];
        nsFileName = selectedHistoryReport.fileNameNS || "";
      }

      if (rowsToExport.length === 0) {
        alert(`Aucun écart trouvé pour l'agence ${agencyCode} (${agencyInfo.name}).`);
        return;
      }

      const exportHeaders = [...nsCols];
      const exportData = rowsToExport.map(row => {
        const newRow: any = {};
        nsCols.forEach(h => {
          newRow[h] = row[h] !== undefined && row[h] !== null ? formatExcelValue(h, row[h]) : "";
        });
        return newRow;
      });

      const sheetAOA = [
        [`RAPPORT DE RAPPROCHEMENT - CLIENTS ABSENTS - AGENCE ${agencyCode}`],
        [`Nom Agence : ${agencyInfo.name} | Type : ${agencyInfo.type}`],
        ["CONSIGNE : Veuillez créer des fiches KYC pour ces clients"],
        [`Fichier NS d'origine : ${nsFileName} | Date d'export : ${currentDate} | Lignes : ${exportData.length}`],
        [],
        exportHeaders
      ];

      exportData.forEach(row => {
        sheetAOA.push(exportHeaders.map(h => row[h]));
      });

      const ws = XLSX.utils.aoa_to_sheet(sheetAOA);
      const wb = XLSX.utils.book_new();

      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: exportHeaders.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: exportHeaders.length - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: exportHeaders.length - 1 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: exportHeaders.length - 1 } }
      ];

      ws["!rows"] = [
        { hpt: 25 },
        { hpt: 20 },
        { hpt: 20 },
        { hpt: 18 },
        { hpt: 15 }
      ];

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
      XLSX.writeFile(wb, `NS_manquants_RegTools_Agence_${agencyCode}.xlsx`);
    } catch (error: any) {
      alert("Erreur lors de l'export Excel par agence : " + error.message);
    }
  };

  // Export Agency Statistics Excel function
  const exportStatsExcel = () => {
    if (filteredAgencyStats.length === 0) return;

    try {
      const currentDate = new Date().toLocaleDateString("fr-FR");

      const exportHeaders = [
        "Code Agence",
        "Nom Agence",
        "Type",
        "Total NS",
        "Présentes dans RegTools (KYC Conformes)",
        "Absentes de RegTools (KYC Manquants)",
        "Taux de Présence KYC (%)",
        "Taux d'Absence KYC (%)"
      ];

      const sheetAOA = [
        ["RAPPORT DE RAPPROCHEMENT - STATISTIQUES PAR AGENCE"],
        [`Date d'export : ${currentDate} | Nombre d'agences : ${filteredAgencyStats.length}`],
        [],
        exportHeaders
      ];

      filteredAgencyStats.forEach(stat => {
        sheetAOA.push([
          stat.agence,
          stat.nom,
          stat.type,
          stat.total,
          stat.existing,
          stat.missing,
          stat.pctExisting,
          stat.pctMissing
        ]);
      });

      if (globalStats) {
        sheetAOA.push([]);
        sheetAOA.push([
          "TOTAL GLOBAL",
          "",
          "",
          globalStats.total,
          globalStats.existing,
          globalStats.missing,
          globalStats.pctExisting,
          globalStats.pctMissing
        ]);
      }

      const ws = XLSX.utils.aoa_to_sheet(sheetAOA);
      const wb = XLSX.utils.book_new();

      // Merges
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: exportHeaders.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: exportHeaders.length - 1 } }
      ];

      // Row Heights
      ws["!rows"] = [
        { hpt: 25 },
        { hpt: 20 },
        { hpt: 15 }
      ];

      // Column widths Auto-Fit
      const colWidths = exportHeaders.map((header, colIdx) => {
        let maxLen = header.length;
        for (let rIdx = 3; rIdx < sheetAOA.length; rIdx++) {
          const val = sheetAOA[rIdx][colIdx];
          if (val !== undefined && val !== null) {
            maxLen = Math.max(maxLen, String(val).length);
          }
        }
        return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
      });
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Stats Agences");
      XLSX.writeFile(wb, `NS_Statistiques_Par_Agence_${currentDate.replace(/\//g, "-")}.xlsx`);
    } catch (error: any) {
      alert("Erreur lors de l'export Excel des statistiques : " + error.message);
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
    setActiveTab("list");
    setStatsSearchQuery("");
    setStatsSortField("agence");
    setStatsSortDirection("asc");
    
    // Reset filters and sort
    setStatsTypeFilter("ALL");
    setDetailsSortField("");
    setDetailsSortDirection("asc");
  };

  // Calculation parameters
  const matchRate = useMemo(() => {
    if (!data.ns || !comparisonDone) return 0;
    const foundCount = data.ns.length - missingRows.length;
    return parseFloat(((foundCount / data.ns.length) * 100).toFixed(2));
  }, [data.ns, missingRows, comparisonDone]);

  // Agency statistics calculations
  const agencyStats = useMemo(() => {
    if (!comparisonDone || !data.ns || !mapping.nsAgence) return [];

    const statsMap = new Map<string, { total: number; missing: number }>();

    // Count total rows per agency in NS
    data.ns.forEach(row => {
      const agenceVal = row[mapping.nsAgence];
      const agenceStr = agenceVal !== undefined && agenceVal !== null ? String(agenceVal).trim() : "Non spécifié";
      if (!statsMap.has(agenceStr)) {
        statsMap.set(agenceStr, { total: 0, missing: 0 });
      }
      statsMap.get(agenceStr)!.total += 1;
    });

    // Count missing rows per agency
    missingRows.forEach(row => {
      const agenceVal = row[mapping.nsAgence];
      const agenceStr = agenceVal !== undefined && agenceVal !== null ? String(agenceVal).trim() : "Non spécifié";
      if (statsMap.has(agenceStr)) {
        statsMap.get(agenceStr)!.missing += 1;
      } else {
        statsMap.set(agenceStr, { total: 0, missing: 1 });
      }
    });

    // Convert to array and calculate percentages
    return Array.from(statsMap.entries())
      .map(([agence, counts]) => {
        const existing = counts.total - counts.missing;
        const pctMissing = counts.total > 0 ? parseFloat(((counts.missing / counts.total) * 100).toFixed(2)) : 0;
        const pctExisting = counts.total > 0 ? parseFloat(((existing / counts.total) * 100).toFixed(2)) : 0;
        const agencyInfo = resolveAgencyInfo(agence);
        return {
          agence: agencyInfo.code,
          nom: agencyInfo.name,
          type: agencyInfo.type,
          total: counts.total,
          missing: counts.missing,
          existing,
          pctMissing,
          pctExisting
        };
      });
  }, [data.ns, missingRows, comparisonDone, mapping.nsAgence]);

  const sortedAgencyStats = useMemo(() => {
    const items = [...agencyStats];
    
    items.sort((a, b) => {
      let valA = a[statsSortField];
      let valB = b[statsSortField];

      // Handle string comparison for agence, nom, type
      if (statsSortField === "agence" || statsSortField === "nom" || statsSortField === "type") {
        const strA = String(valA || "");
        const strB = String(valB || "");
        return statsSortDirection === "asc"
          ? strA.localeCompare(strB, undefined, { numeric: statsSortField === "agence", sensitivity: 'base' })
          : strB.localeCompare(strA, undefined, { numeric: statsSortField === "agence", sensitivity: 'base' });
      }

      // Handle numeric comparison for others
      const numA = Number(valA || 0);
      const numB = Number(valB || 0);
      if (numA < numB) return statsSortDirection === "asc" ? -1 : 1;
      if (numA > numB) return statsSortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return items;
  }, [agencyStats, statsSortField, statsSortDirection]);

  const filteredAgencyStats = useMemo(() => {
    return sortedAgencyStats.filter(stat => {
      // Type Filter
      let matchType = true;
      if (statsTypeFilter !== "ALL") {
        matchType = stat.type && stat.type.toLowerCase() === statsTypeFilter.toLowerCase();
      }
      
      // Search Filter
      let matchSearch = true;
      if (statsSearchQuery.trim() !== "") {
        const query = statsSearchQuery.toLowerCase();
        matchSearch = stat.agence.toLowerCase().includes(query) ||
          (stat.nom && stat.nom.toLowerCase().includes(query)) ||
          (stat.type && stat.type.toLowerCase().includes(query));
      }
      
      return matchType && matchSearch;
    });
  }, [sortedAgencyStats, statsSearchQuery, statsTypeFilter]);

  const globalStats = useMemo(() => {
    if (!comparisonDone || !data.ns) return null;
    const total = data.ns.length;
    const missing = missingRows.length;
    const existing = total - missing;
    const pctExisting = total > 0 ? parseFloat(((existing / total) * 100).toFixed(2)) : 0;
    const pctMissing = total > 0 ? parseFloat(((missing / total) * 100).toFixed(2)) : 0;
    return {
      total,
      missing,
      existing,
      pctExisting,
      pctMissing
    };
  }, [data.ns, missingRows, comparisonDone]);

  // Load History from Firestore & LocalStorage
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    let reportsList: any[] = [];

    // 1. Fetch from Firestore if configured
    if (isFirebaseConfigured && db) {
      try {
        const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
        const q = query(collection(db, "regtoolsHistory"), orderBy("savedAt", "desc"));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((docSnap) => {
          reportsList.push({ id: docSnap.id, ...docSnap.data() });
        });
      } catch (err) {
        console.error("Erreur lors de la lecture de l'historique Firestore :", err);
      }
    }

    // 2. Load from localStorage as fallback or merge
    try {
      const localHistoryJSON = localStorage.getItem("regtools_history_list");
      if (localHistoryJSON) {
        const localList = JSON.parse(localHistoryJSON);
        // Merge without duplicates
        localList.forEach((localReport: any) => {
          if (!reportsList.some(r => r.monthKey === localReport.monthKey)) {
            reportsList.push(localReport);
          }
        });
      }
    } catch (err) {
      console.error("Erreur lors de la lecture de l'historique local :", err);
    }

    // Sort by monthKey descending (e.g. 062026, 052026)
    reportsList.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    setSavedReports(reportsList);
    setIsLoadingHistory(false);
  }, []);

  // Fetch full report from local storage if loading a local-only one
  const handleLoadReport = async (report: any) => {
    setIsLoadingHistory(true);
    try {
      let loadedReport = null;
      // 1. If it's already a full report (fetched from Firestore)
      if (report.missingRows && report.agencyStats) {
        loadedReport = report;
      }

      // 2. If it's a Firestore report, try to fetch full data (in case it wasn't preloaded)
      if (!loadedReport && isFirebaseConfigured && db) {
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          const docSnap = await getDoc(doc(db, "regtoolsHistory", report.monthKey));
          if (docSnap.exists()) {
            loadedReport = { id: docSnap.id, ...docSnap.data() };
          }
        } catch (err) {
          console.error("Erreur lors du chargement complet Firestore :", err);
        }
      }

      // 3. Fallback to localStorage
      if (!loadedReport) {
        const localReportJSON = localStorage.getItem(`regtools_report_${report.monthKey}`);
        if (localReportJSON) {
          loadedReport = JSON.parse(localReportJSON);
        }
      }

      if (loadedReport) {
        setSelectedHistoryReport(loadedReport);
        
        // Log consultation for non-admin users
        const email = user?.email || "";
        if (email && !isAdmin(email)) {
          logAction({
            userEmail: email,
            userName: user?.name || "Utilisateur",
            action: "OTHER",
            label: "Consultation de rapport de rapprochement",
            detail: `Rapport mensuel : ${report.monthLabel}`,
            module: "Rapprochement RegTools"
          });
        }
      } else {
        alert("Impossible de charger les détails de ce rapport (données introuvables).");
      }
    } catch (err) {
      console.error("Erreur lors du chargement du rapport :", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSaveReport = async () => {
    if (!comparisonDone || !files.ns || !data.ns) return;

    let month = "";
    let year = "";
    const fileName = files.ns.name;

    // 1. Try to find 6 digits at the beginning
    let match = fileName.trim().match(/^(\d{2})(\d{4})/);

    // 2. Try to find 6 digits separated anywhere in the filename
    if (!match) {
      match = fileName.trim().match(/(?:^|[^0-9])(\d{2})(\d{4})(?:[^0-9]|$)/);
    }

    // 3. Try with hyphen/underscore separators anywhere in the filename
    if (!match) {
      const sepMatch = fileName.trim().match(/(?:^|[^0-9])(\d{2})[_-](\d{4})(?:[^0-9]|$)/);
      if (sepMatch) {
        match = sepMatch;
      }
    }

    if (match) {
      month = match[1];
      year = match[2];
    } else {
      // Fallback: Ask user via prompt
      const userInput = prompt(
        "Impossible de détecter le mois/année (format 052026) dans le nom du fichier.\n" +
        "Veuillez saisir le mois et l'année de ce rapport (format MMAAAA ou MM/AAAA, ex: 052026) :"
      );
      if (!userInput) return; // User cancelled

      let inputMatch = userInput.trim().match(/^(\d{2})(\d{4})$/);
      if (!inputMatch) {
        inputMatch = userInput.trim().match(/^(\d{2})[/\-_](\d{4})$/);
      }
      if (!inputMatch) {
        alert("Format invalide. La sauvegarde a été annulée. Veuillez saisir le format MMAAAA ou MM/AAAA (ex: 052026 ou 05/2026).");
        return;
      }
      month = inputMatch[1];
      year = inputMatch[2];
    }
    const months = [
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    const monthIdx = parseInt(month, 10) - 1;
    if (monthIdx < 0 || monthIdx >= 12) {
      alert(`Erreur de sauvegarde : Le mois "${month}" extrait est invalide.`);
      return;
    }

    const monthKey = `${month}${year}`;
    const monthLabel = `${months[monthIdx]} ${year}`;

    setIsSavingReport(true);

    const reportPayload = {
      monthKey,
      monthLabel,
      fileNameNS: files.ns.name,
      fileNameRegtools: files.regtools ? files.regtools.name : "",
      savedAt: new Date().toISOString(),
      globalStats: {
        total: globalStats ? globalStats.total : data.ns.length,
        missing: globalStats ? globalStats.missing : missingRows.length,
        existing: globalStats ? globalStats.existing : data.ns.length - missingRows.length,
        pctExisting: globalStats ? globalStats.pctExisting : matchRate,
        pctMissing: globalStats ? globalStats.pctMissing : parseFloat((100 - matchRate).toFixed(2))
      },
      agencyStats: agencyStats,
      missingRows: missingRows,
      columnsNS: columns.ns,
      mapping: mapping
    };

    let savedInFirestore = false;

    if (isFirebaseConfigured && db) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "regtoolsHistory", monthKey), reportPayload);
        savedInFirestore = true;
      } catch (err: any) {
        console.error("Erreur de sauvegarde Firestore :", err);
      }
    }

    try {
      localStorage.setItem(`regtools_report_${monthKey}`, JSON.stringify(reportPayload));

      const localHistoryJSON = localStorage.getItem("regtools_history_list");
      let localList = localHistoryJSON ? JSON.parse(localHistoryJSON) : [];
      localList = localList.filter((r: any) => r.monthKey !== monthKey);
      
      const metadata = {
        monthKey,
        monthLabel,
        fileNameNS: files.ns.name,
        fileNameRegtools: files.regtools ? files.regtools.name : "",
        savedAt: reportPayload.savedAt,
        globalStats: reportPayload.globalStats
      };
      localList.push(metadata);
      localStorage.setItem("regtools_history_list", JSON.stringify(localList));
    } catch (err: any) {
      console.error("Erreur de sauvegarde locale :", err);
    }

    setIsSavingReport(false);
    alert(`Rapport pour ${monthLabel} sauvegardé avec succès ! ${savedInFirestore ? "(Base de données)" : "(Stockage local)"}`);
    loadHistory();
  };

  const handleDeleteReport = async (report: any) => {
    if (!confirm(`Voulez-vous vraiment supprimer le rapport pour ${report.monthLabel} ?`)) return;

    if (isFirebaseConfigured && db) {
      try {
        const { doc, deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "regtoolsHistory", report.monthKey));
      } catch (err) {
        console.error("Erreur de suppression Firestore :", err);
      }
    }

    try {
      localStorage.removeItem(`regtools_report_${report.monthKey}`);
      const localHistoryJSON = localStorage.getItem("regtools_history_list");
      if (localHistoryJSON) {
        let localList = JSON.parse(localHistoryJSON);
        localList = localList.filter((r: any) => r.monthKey !== report.monthKey);
        localStorage.setItem("regtools_history_list", JSON.stringify(localList));
      }
    } catch (err) {
      console.error("Erreur de suppression locale :", err);
    }

    if (selectedHistoryReport?.monthKey === report.monthKey) {
      setSelectedHistoryReport(null);
    }
    loadHistory();
    alert("Rapport supprimé avec succès.");
  };

  // Memos for selected history report
  // Pre-resolve agency info for selected history report to ensure name/type are always present
  const resolvedHistoryAgencyStats = useMemo(() => {
    if (!selectedHistoryReport || !selectedHistoryReport.agencyStats) return [];
    return selectedHistoryReport.agencyStats.map((stat: any) => {
      if (stat.nom && stat.type) return stat;
      const info = resolveAgencyInfo(stat.agence);
      return {
        ...stat,
        nom: info.name,
        type: info.type
      };
    });
  }, [selectedHistoryReport]);

  const sortedHistoryAgencyStats = useMemo(() => {
    const items = [...resolvedHistoryAgencyStats];
    
    items.sort((a, b) => {
      let valA = a[historySortField];
      let valB = b[historySortField];

      if (historySortField === "agence" || historySortField === "nom" || historySortField === "type") {
        const strA = String(valA || "");
        const strB = String(valB || "");
        return historySortDirection === "asc"
          ? strA.localeCompare(strB, undefined, { numeric: historySortField === "agence", sensitivity: 'base' })
          : strB.localeCompare(strA, undefined, { numeric: historySortField === "agence", sensitivity: 'base' });
      }

      const numA = Number(valA || 0);
      const numB = Number(valB || 0);
      if (numA < numB) return historySortDirection === "asc" ? -1 : 1;
      if (numA > numB) return historySortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return items;
  }, [resolvedHistoryAgencyStats, historySortField, historySortDirection]);

  const filteredHistoryAgencyStats = useMemo(() => {
    return sortedHistoryAgencyStats.filter(stat => {
      // Type Filter
      let matchType = true;
      if (historyStatsTypeFilter !== "ALL") {
        matchType = stat.type && stat.type.toLowerCase() === historyStatsTypeFilter.toLowerCase();
      }
      
      // Search Filter
      let matchSearch = true;
      if (historyStatsSearchQuery.trim() !== "") {
        const query = historyStatsSearchQuery.toLowerCase();
        matchSearch = stat.agence.toLowerCase().includes(query) ||
          (stat.nom && stat.nom.toLowerCase().includes(query)) ||
          (stat.type && stat.type.toLowerCase().includes(query));
      }
      
      return matchType && matchSearch;
    });
  }, [sortedHistoryAgencyStats, historyStatsSearchQuery, historyStatsTypeFilter]);

  const historyAgenciesList = useMemo(() => {
    if (!selectedHistoryReport || !selectedHistoryReport.missingRows) return [];
    const agencyCol = selectedHistoryReport.mapping?.nsAgence;
    if (!agencyCol) return [];
    const agenciesSet = new Set<string>();
    selectedHistoryReport.missingRows.forEach((row: any) => {
      const agenceVal = row[agencyCol];
      if (agenceVal !== undefined && agenceVal !== null) {
        const agenceStr = String(agenceVal).trim();
        if (agenceStr !== "") {
          agenciesSet.add(agenceStr);
        }
      }
    });
    return Array.from(agenciesSet).sort((a, b) => a.localeCompare(b));
  }, [selectedHistoryReport]);

  const filteredHistoryRows = useMemo(() => {
    if (!selectedHistoryReport) return [];
    const rows = selectedHistoryReport.missingRows || [];
    const agencyCol = selectedHistoryReport.mapping?.nsAgence;

    return rows.filter((row: any) => {
      // Agency Filter
      let matchAgency = true;
      if (historySelectedAgency !== "ALL" && agencyCol) {
        const rowAgency = row[agencyCol];
        matchAgency = rowAgency !== undefined && rowAgency !== null && String(rowAgency).trim() === historySelectedAgency;
      }

      // Search Filter
      let matchSearch = true;
      if (historySearchQuery.trim() !== "") {
        const query = historySearchQuery.toLowerCase();
        matchSearch = Object.values(row).some(val => 
          val !== undefined && val !== null && String(val).toLowerCase().includes(query)
        );
      }

      return matchAgency && matchSearch;
    });
  }, [selectedHistoryReport, historySearchQuery, historySelectedAgency]);

  // Sort history rows
  const sortedHistoryRows = useMemo(() => {
    if (!historyDetailsSortField) return filteredHistoryRows;
    const items = [...filteredHistoryRows];
    items.sort((a, b) => {
      const valA = a[historyDetailsSortField];
      const valB = b[historyDetailsSortField];
      
      if (valA === undefined || valA === null) return historyDetailsSortDirection === "asc" ? 1 : -1;
      if (valB === undefined || valB === null) return historyDetailsSortDirection === "asc" ? -1 : 1;
      
      const strA = String(valA).trim();
      const strB = String(valB).trim();
      
      // Check if numeric
      const numA = Number(strA);
      const numB = Number(strB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return historyDetailsSortDirection === "asc" ? numA - numB : numB - numA;
      }
      
      return historyDetailsSortDirection === "asc"
        ? strA.localeCompare(strB, undefined, { numeric: true, sensitivity: "base" })
        : strB.localeCompare(strA, undefined, { numeric: true, sensitivity: "base" });
    });
    return items;
  }, [filteredHistoryRows, historyDetailsSortField, historyDetailsSortDirection]);

  const paginatedHistoryRows = useMemo(() => {
    const startIndex = (historyCurrentPage - 1) * historyPageSize;
    return sortedHistoryRows.slice(startIndex, startIndex + historyPageSize);
  }, [sortedHistoryRows, historyCurrentPage, historyPageSize]);

  const totalHistoryPages = Math.ceil(filteredHistoryRows.length / historyPageSize);

  const historyPaginationRange = useMemo(() => {
    if (totalHistoryPages <= 6) {
      return Array.from({ length: totalHistoryPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (historyCurrentPage > 3) {
      pages.push("...");
    }
    const start = Math.max(2, historyCurrentPage - 1);
    const end = Math.min(totalHistoryPages - 1, historyCurrentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (historyCurrentPage < totalHistoryPages - 2) {
      pages.push("...");
    }
    pages.push(totalHistoryPages);
    return pages;
  }, [historyCurrentPage, totalHistoryPages]);

  // History export function
  const exportHistoryExcel = () => {
    if (!selectedHistoryReport) return;
    if (filteredHistoryRows.length === 0) return;
    try {
      const report = selectedHistoryReport;
      const currentDate = new Date(report.savedAt).toLocaleDateString("fr-FR");
      const exportHeaders = [...(report.columnsNS || [])];
      const exportData = filteredHistoryRows.map((row: any) => {
        const newRow: any = {};
        (report.columnsNS || []).forEach((h: string) => {
          newRow[h] = row[h] !== undefined && row[h] !== null ? formatExcelValue(h, row[h]) : "";
        });
        return newRow;
      });

      const sheetAOA = [
        [`RAPPORT DE RAPPROCHEMENT HISTORIQUE - ${report.monthLabel}`],
        ["CONSIGNE : Veuillez créer des fiches KYC pour ces clients"],
        [`Fichier NS d'origine : ${report.fileNameNS} | Date d'export : ${currentDate} | Lignes : ${exportData.length}`],
        [],
        exportHeaders
      ];

      exportData.forEach((row: any) => {
        sheetAOA.push(exportHeaders.map(h => row[h]));
      });

      const ws = XLSX.utils.aoa_to_sheet(sheetAOA);
      const wb = XLSX.utils.book_new();

      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: exportHeaders.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: exportHeaders.length - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: exportHeaders.length - 1 } }
      ];

      ws["!rows"] = [
        { hpt: 25 },
        { hpt: 20 },
        { hpt: 18 },
        { hpt: 15 }
      ];

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
      XLSX.writeFile(wb, `NS_manquants_RegTools_Historique_${report.monthKey}.xlsx`);
    } catch (error: any) {
      alert("Erreur lors de l'export Excel historique : " + error.message);
    }
  };

  const exportHistoryStatsExcel = () => {
    if (!selectedHistoryReport) return;
    if (filteredHistoryAgencyStats.length === 0) return;
    try {
      const report = selectedHistoryReport;
      const currentDate = new Date(report.savedAt).toLocaleDateString("fr-FR");
      const exportHeaders = [
        "Code Agence",
        "Nom Agence",
        "Type",
        "Total NS",
        "Présentes dans RegTools (KYC Conformes)",
        "Absentes de RegTools (KYC Manquants)",
        "Taux de Présence KYC (%)",
        "Taux d'Absence KYC (%)"
      ];

      const sheetAOA = [
        [`RAPPORT DE RAPPROCHEMENT HISTORIQUE - STATISTIQUES AGENCE - ${report.monthLabel}`],
        [`Date d'export : ${currentDate} | Nombre d'agences : ${filteredHistoryAgencyStats.length}`],
        [],
        exportHeaders
      ];

      filteredHistoryAgencyStats.forEach((stat: any) => {
        sheetAOA.push([
          stat.agence,
          stat.nom,
          stat.type,
          stat.total,
          stat.existing,
          stat.missing,
          stat.pctExisting,
          stat.pctMissing
        ]);
      });

      if (report.globalStats) {
        sheetAOA.push([]);
        sheetAOA.push([
          "TOTAL GLOBAL",
          "",
          "",
          report.globalStats.total,
          report.globalStats.existing,
          report.globalStats.missing,
          report.globalStats.pctExisting,
          report.globalStats.pctMissing
        ]);
      }

      const ws = XLSX.utils.aoa_to_sheet(sheetAOA);
      const wb = XLSX.utils.book_new();

      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: exportHeaders.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: exportHeaders.length - 1 } }
      ];

      ws["!rows"] = [
        { hpt: 25 },
        { hpt: 20 },
        { hpt: 15 }
      ];

      const colWidths = exportHeaders.map((header, colIdx) => {
        let maxLen = header.length;
        for (let rIdx = 3; rIdx < sheetAOA.length; rIdx++) {
          const val = sheetAOA[rIdx][colIdx];
          if (val !== undefined && val !== null) {
            maxLen = Math.max(maxLen, String(val).length);
          }
        }
        return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
      });
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Stats Agences");
      XLSX.writeFile(wb, `NS_Statistiques_Par_Agence_Historique_${report.monthKey}.xlsx`);
    } catch (error: any) {
      alert("Erreur lors de l'export Excel historique stats : " + error.message);
    }
  };

  // Sort helper functions for History
  const handleHistorySort = (field: "agence" | "nom" | "type" | "total" | "existing" | "missing" | "pctExisting" | "pctMissing") => {
    if (historySortField === field) {
      setHistorySortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setHistorySortField(field);
      setHistorySortDirection("asc");
    }
  };

  const renderHistorySortableHeader = (
    label: string, 
    field: "agence" | "nom" | "type" | "total" | "existing" | "missing" | "pctExisting" | "pctMissing", 
    align: "left" | "center" = "left"
  ) => {
    const isActive = historySortField === field;
    return (
      <th 
        onClick={() => handleHistorySort(field)}
        className={cn(
          "p-3 border-b border-slate-100 dark:border-slate-800/60 cursor-pointer select-none hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors text-[10px] uppercase font-bold tracking-wider text-slate-400",
          align === "center" && "text-center"
        )}
      >
        <div className={cn("flex items-center gap-1", align === "center" ? "justify-center" : "justify-start")}>
          <span>{label}</span>
          <span className={cn(
            "text-[9px] transition-colors",
            isActive ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-300 dark:text-slate-600"
          )}>
            {isActive ? (historySortDirection === "asc" ? "▲" : "▼") : "▲▼"}
          </span>
        </div>
      </th>
    );
  };

  const handleDetailsSort = (col: string) => {
    if (detailsSortField === col) {
      setDetailsSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setDetailsSortField(col);
      setDetailsSortDirection("asc");
    }
  };

  const handleHistoryDetailsSort = (col: string) => {
    if (historyDetailsSortField === col) {
      setHistoryDetailsSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setHistoryDetailsSortField(col);
      setHistoryDetailsSortDirection("asc");
    }
  };

  // Sort helper functions
  const handleSort = (field: "agence" | "nom" | "type" | "total" | "existing" | "missing" | "pctExisting" | "pctMissing") => {
    if (statsSortField === field) {
      setStatsSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setStatsSortField(field);
      setStatsSortDirection("asc");
    }
  };

  const renderSortableHeader = (
    label: string, 
    field: "agence" | "nom" | "type" | "total" | "existing" | "missing" | "pctExisting" | "pctMissing", 
    align: "left" | "center" = "left"
  ) => {
    const isActive = statsSortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={cn(
          "p-3 border-b border-slate-100 dark:border-slate-800/60 cursor-pointer select-none hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors text-[10px] uppercase font-bold tracking-wider text-slate-400",
          align === "center" && "text-center"
        )}
      >
        <div className={cn("flex items-center gap-1", align === "center" ? "justify-center" : "justify-start")}>
          <span>{label}</span>
          <span className={cn(
            "text-[9px] transition-colors",
            isActive ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-300 dark:text-slate-600"
          )}>
            {isActive ? (statsSortDirection === "asc" ? "▲" : "▼") : "▲▼"}
          </span>
        </div>
      </th>
    );
  };




  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Rapprochement Clients RegTools vs NS
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Comparez les identifiants de votre base globale avec la liste NS pour identifier et extraire les écarts par agence.
          </p>
        </div>

        {/* Page Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
          <button
            onClick={() => setPageTab("new")}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-all",
              pageTab === "new"
                ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            Nouveau Rapprochement
          </button>
          <button
            onClick={() => {
              setPageTab("history");
              loadHistory();
            }}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-all",
              pageTab === "history"
                ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            Historique des Rapports ({savedReports.length})
          </button>
        </div>
      </div>

      {pageTab === "new" ? (
        <>
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

          {/* Comparison Results Container */}
          {comparisonDone && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 flex flex-col gap-4">
              {/* Tabs header */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 justify-between items-center pb-0 mb-2 flex-wrap gap-2">
                <div className="flex flex-wrap">
                  <button
                    onClick={() => setActiveTab("list")}
                    className={cn(
                      "px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 -mb-[2px]",
                      activeTab === "list"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    Détails des Écarts ({filteredRows.length.toLocaleString("fr-FR")} lignes)
                  </button>
                  <button
                    onClick={() => setActiveTab("stats")}
                    className={cn(
                      "px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 -mb-[2px]",
                      activeTab === "stats"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Statistiques par Agence ({filteredAgencyStats.length} agences)
                  </button>
                </div>
                
                <button
                  onClick={handleSaveReport}
                  disabled={isSavingReport}
                  className="mb-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isSavingReport && "animate-spin")} />
                  {isSavingReport ? "Sauvegarde..." : "Sauvegarder le Rapport Mensuel"}
                </button>
              </div>

              {activeTab === "list" ? (
                <div className="flex flex-col gap-4">
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
                              {columns.ns.map(col => {
                                const isSortedCol = detailsSortField === col;
                                return (
                                  <th 
                                    key={`th-${col}`} 
                                    onClick={() => handleDetailsSort(col)}
                                    className={cn(
                                      "p-3 border-b border-slate-100 dark:border-slate-800/60 cursor-pointer select-none hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors",
                                      col === mapping.nsId && "text-purple-600 dark:text-purple-400",
                                      col === mapping.nsAgence && "text-blue-600 dark:text-blue-400"
                                    )}
                                  >
                                    <div className="flex items-center gap-1">
                                      <span>{col}</span>
                                      <span className={cn(
                                        "text-[9px] transition-colors",
                                        isSortedCol ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-300 dark:text-slate-600"
                                      )}>
                                        {isSortedCol ? (detailsSortDirection === "asc" ? "▲" : "▼") : "▲▼"}
                                      </span>
                                    </div>
                                  </th>
                                );
                              })}
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
                                    {row[col] !== undefined && row[col] !== null ? formatExcelValue(col, row[col]) : ""}
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
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-100 dark:border-slate-800/60 pb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 dark:text-white">Rapprochement par Agence</h3>
                      <span className="text-xs font-bold px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full">
                        {filteredAgencyStats.length} agences
                      </span>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Type Filter */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type :</label>
                        <select
                          value={statsTypeFilter}
                          onChange={(e) => setStatsTypeFilter(e.target.value)}
                          className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 outline-none min-w-[130px]"
                        >
                          <option value="ALL">Tous les types</option>
                          <option value="Succursale">Succursale</option>
                          <option value="Agence">Agence</option>
                          <option value="Courtier">Courtier</option>
                          <option value="Bureau direct">Bureau direct</option>
                          <option value="Agence Stagiaire">Agence Stagiaire</option>
                        </select>
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Rechercher une agence..."
                          value={statsSearchQuery}
                          onChange={(e) => setStatsSearchQuery(e.target.value)}
                          className="pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none w-[200px] focus:border-blue-500 focus:bg-white transition-all"
                        />
                      </div>

                      {/* Export Stats Trigger */}
                      <button
                        onClick={exportStatsExcel}
                        disabled={filteredAgencyStats.length === 0}
                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
                      >
                        <Download className="h-4 w-4" />
                        Exporter les Statistiques
                      </button>
                    </div>
                  </div>

                  {filteredAgencyStats.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                      <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                      <h4 className="font-semibold text-slate-800 dark:text-white">Aucune agence trouvée</h4>
                      <p className="text-xs text-slate-400">Aucune agence ne correspond à votre recherche.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                            {renderSortableHeader("Code Agence", "agence")}
                            {renderSortableHeader("Nom Agence", "nom")}
                            {renderSortableHeader("Type", "type")}
                            {renderSortableHeader("Total NS", "total", "center")}
                            {renderSortableHeader("Présentes (Conformes)", "existing", "center")}
                            {renderSortableHeader("Absentes (Écarts)", "missing", "center")}
                            {renderSortableHeader("Taux Présence KYC", "pctExisting", "center")}
                            {renderSortableHeader("Taux Absence KYC", "pctMissing", "center")}
                            <th className="p-3 border-b border-slate-100 dark:border-slate-800/60 w-[200px]">Proportion Visuelle</th>
                            <th className="p-3 border-b border-slate-100 dark:border-slate-800/60 w-[80px] text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAgencyStats.map((stat, idx) => (
                            <tr key={`stat-row-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 font-semibold text-slate-900 dark:text-white">
                                {stat.agence}
                              </td>
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 text-slate-700 dark:text-slate-300">
                                {stat.nom}
                              </td>
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-400">
                                {stat.type}
                              </td>
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 text-center font-semibold text-slate-700 dark:text-slate-300">
                                {stat.total.toLocaleString("fr-FR")}
                              </td>
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                                {stat.existing.toLocaleString("fr-FR")}
                              </td>
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 text-center text-rose-600 dark:text-rose-400 font-medium">
                                {stat.missing.toLocaleString("fr-FR")}
                              </td>
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                {stat.pctExisting}%
                              </td>
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 text-center font-bold text-rose-600 dark:text-rose-400">
                                {stat.pctMissing}%
                              </td>
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60">
                                <div className="flex flex-col gap-1 w-full">
                                  <div className="flex h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <div 
                                      style={{ width: `${stat.pctExisting}%` }} 
                                      className="bg-emerald-500 transition-all duration-500" 
                                      title={`Présentes: ${stat.pctExisting}%`}
                                    />
                                    <div 
                                      style={{ width: `${stat.pctMissing}%` }} 
                                      className="bg-rose-500 transition-all duration-500" 
                                      title={`Absentes: ${stat.pctMissing}%`}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[9px] text-slate-400">
                                    <span>{stat.pctExisting}% présent</span>
                                    <span>{stat.pctMissing}% absent</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 text-center">
                                <button
                                  onClick={() => exportSingleAgencyExcel(stat.agence, false)}
                                  disabled={stat.missing === 0}
                                  className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors inline-flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"
                                  title="Exporter les écarts de cette agence"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {globalStats && (
                            <tr className="bg-slate-50/80 dark:bg-slate-900/80 font-bold border-t border-slate-200 dark:border-slate-800">
                              <td colSpan={3} className="p-3 text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                                TOTAL GLOBAL
                              </td>
                              <td className="p-3 text-center text-slate-900 dark:text-white">
                                {globalStats.total.toLocaleString("fr-FR")}
                              </td>
                              <td className="p-3 text-center text-emerald-600 dark:text-emerald-400">
                                {globalStats.existing.toLocaleString("fr-FR")}
                              </td>
                              <td className="p-3 text-center text-rose-600 dark:text-rose-400">
                                {globalStats.missing.toLocaleString("fr-FR")}
                              </td>
                              <td className="p-3 text-center text-emerald-600 dark:text-emerald-400">
                                {globalStats.pctExisting}%
                              </td>
                              <td className="p-3 text-center text-rose-600 dark:text-rose-400">
                                {globalStats.pctMissing}%
                              </td>
                              <td className="p-3">
                                <div className="flex flex-col gap-1 w-full">
                                  <div className="flex h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    <div 
                                      style={{ width: `${globalStats.pctExisting}%` }} 
                                      className="bg-emerald-600 transition-all duration-500" 
                                      title={`Présentes: ${globalStats.pctExisting}%`}
                                    />
                                    <div 
                                      style={{ width: `${globalStats.pctMissing}%` }} 
                                      className="bg-rose-600 transition-all duration-500" 
                                      title={`Absentes: ${globalStats.pctMissing}%`}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[9px] text-slate-500">
                                    <span>{globalStats.pctExisting}% global</span>
                                    <span>{globalStats.pctMissing}% global</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3"></td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* History Section */
        selectedHistoryReport === null ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Rapports de rapprochement sauvegardés</h3>
              <button 
                onClick={loadHistory}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="Actualiser la liste"
              >
                <RefreshCw className={cn("h-4 w-4", isLoadingHistory && "animate-spin")} />
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                <RefreshCw className="h-8 w-8 animate-spin" />
                <p className="text-sm">Chargement de l'historique...</p>
              </div>
            ) : savedReports.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                <FileSpreadsheet className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                <h4 className="font-semibold text-slate-800 dark:text-white">Aucun rapport sauvegardé</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Lancez un rapprochement dans l'onglet "Nouveau Rapprochement" et cliquez sur "Sauvegarder le Rapport Mensuel" pour l'enregistrer ici.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedReports.map((report) => (
                  <div 
                    key={`report-card-${report.monthKey}`}
                    className="border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-5 hover:border-blue-500/50 hover:shadow-md transition-all bg-slate-50/30 dark:bg-slate-900/10 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-base">
                            {report.monthLabel}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            Sauvegardé le {new Date(report.savedAt).toLocaleDateString("fr-FR")} à {new Date(report.savedAt).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          {report.monthKey}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-500 mb-4 border-t border-b border-slate-100 dark:border-slate-800/50 py-3 my-3">
                        <div className="flex justify-between">
                          <span>Fichier NS :</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]" title={report.fileNameNS}>
                            {report.fileNameNS}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Base RegTools :</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]" title={report.fileNameRegtools}>
                            {report.fileNameRegtools || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 font-semibold text-slate-700 dark:text-slate-300">
                          <span>Taux de Présence KYC :</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {report.globalStats?.pctExisting}%
                          </span>
                        </div>
                        <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                          <span>Taux d'Absence KYC :</span>
                          <span className="text-rose-600 dark:text-rose-400 font-bold">
                            {report.globalStats?.pctMissing}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoadReport(report)}
                        className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-md shadow-blue-500/10"
                      >
                        Consulter
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report)}
                        className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-600 border border-rose-200/50 dark:border-rose-900/50 rounded-lg transition-colors flex items-center justify-center"
                        title="Supprimer ce rapport"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Header of selected history report */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 flex justify-between items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedHistoryReport(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-800/60 flex items-center justify-center"
                  title="Retour à l'historique"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Rapport de Rapprochement : {selectedHistoryReport.monthLabel}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sauvegardé le {new Date(selectedHistoryReport.savedAt).toLocaleDateString("fr-FR")} à {new Date(selectedHistoryReport.savedAt).toLocaleTimeString("fr-FR")} • Fichier NS : {selectedHistoryReport.fileNameNS}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Taux Présence KYC : {selectedHistoryReport.globalStats?.pctExisting}%
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  Taux Absence KYC : {selectedHistoryReport.globalStats?.pctMissing}%
                </span>
              </div>
            </div>

            {/* History sub-tabs container */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex border-b border-slate-200 dark:border-slate-800 justify-between items-center pb-0 mb-2 flex-wrap gap-2">
                <div className="flex flex-wrap">
                  <button
                    onClick={() => setHistoryTab("stats")}
                    className={cn(
                      "px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 -mb-[2px]",
                      historyTab === "stats"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Statistiques par Agence
                  </button>
                  <button
                    onClick={() => setHistoryTab("list")}
                    className={cn(
                      "px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 -mb-[2px]",
                      historyTab === "list"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    Détails des Écarts ({filteredHistoryRows.length.toLocaleString("fr-FR")} lignes)
                  </button>
                </div>
              </div>

              {historyTab === "stats" ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-100 dark:border-slate-800/60 pb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 dark:text-white">Rapprochement par Agence (Historique)</h3>
                      <span className="text-xs font-bold px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full">
                        {filteredHistoryAgencyStats.length} agences
                      </span>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Type Filter */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type :</label>
                        <select
                          value={historyStatsTypeFilter}
                          onChange={(e) => setHistoryStatsTypeFilter(e.target.value)}
                          className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 outline-none min-w-[130px]"
                        >
                          <option value="ALL">Tous les types</option>
                          <option value="Succursale">Succursale</option>
                          <option value="Agence">Agence</option>
                          <option value="Courtier">Courtier</option>
                          <option value="Bureau direct">Bureau direct</option>
                          <option value="Agence Stagiaire">Agence Stagiaire</option>
                        </select>
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Rechercher une agence..."
                          value={historyStatsSearchQuery}
                          onChange={(e) => setHistoryStatsSearchQuery(e.target.value)}
                          className="pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none w-[200px] focus:border-blue-500 focus:bg-white transition-all"
                        />
                      </div>

                      {/* Export Stats Trigger */}
                      <button
                        onClick={exportHistoryStatsExcel}
                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
                      >
                        <Download className="h-4 w-4" />
                        Exporter les Statistiques
                      </button>
                    </div>
                  </div>

                  {filteredHistoryAgencyStats.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                      <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                      <h4 className="font-semibold text-slate-800 dark:text-white">Aucune agence trouvée</h4>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                            {renderHistorySortableHeader("Code Agence", "agence")}
                            {renderHistorySortableHeader("Nom Agence", "nom")}
                            {renderHistorySortableHeader("Type", "type")}
                            {renderHistorySortableHeader("Total NS", "total", "center")}
                            {renderHistorySortableHeader("Présentes (Conformes)", "existing", "center")}
                            {renderHistorySortableHeader("Absentes (Écarts)", "missing", "center")}
                            {renderHistorySortableHeader("Taux Présence KYC", "pctExisting", "center")}
                            {renderHistorySortableHeader("Taux Absence KYC", "pctMissing", "center")}
                            <th className="p-3 border-b border-slate-100 dark:border-slate-800/60 w-[200px]">Proportion Visuelle</th>
                            <th className="p-3 border-b border-slate-100 dark:border-slate-800/60 w-[80px] text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredHistoryAgencyStats.map((stat, idx) => (
                            <tr key={`history-stat-row-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 font-semibold text-slate-900 dark:text-white">
                                {stat.agence}
                              </td>
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 text-slate-700 dark:text-slate-300">
                                {stat.nom}
                              </td>
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-400">
                                {stat.type}
                              </td>
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 text-center font-semibold text-slate-700 dark:text-slate-300">
                                {stat.total.toLocaleString("fr-FR")}
                              </td>
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                                {stat.existing.toLocaleString("fr-FR")}
                              </td>
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 text-center text-rose-600 dark:text-rose-400 font-medium">
                                {stat.missing.toLocaleString("fr-FR")}
                              </td>
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                {stat.pctExisting}%
                              </td>
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 text-center font-bold text-rose-600 dark:text-rose-400">
                                {stat.pctMissing}%
                              </td>
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60">
                                <div className="flex flex-col gap-1 w-full">
                                  <div className="flex h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <div 
                                      style={{ width: `${stat.pctExisting}%` }} 
                                      className="bg-emerald-500 transition-all duration-500" 
                                      title={`Présentes: ${stat.pctExisting}%`}
                                    />
                                    <div 
                                      style={{ width: `${stat.pctMissing}%` }} 
                                      className="bg-rose-500 transition-all duration-500" 
                                      title={`Absentes: ${stat.pctMissing}%`}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[9px] text-slate-400">
                                    <span>{stat.pctExisting}% présent</span>
                                    <span>{stat.pctMissing}% absent</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 text-center">
                                <button
                                  onClick={() => exportSingleAgencyExcel(stat.agence, true)}
                                  disabled={stat.missing === 0}
                                  className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors inline-flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"
                                  title="Exporter les écarts de cette agence"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {selectedHistoryReport.globalStats && (
                            <tr className="bg-slate-50/80 dark:bg-slate-900/80 font-bold border-t border-slate-200 dark:border-slate-800">
                              <td colSpan={3} className="p-3 text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                                TOTAL GLOBAL
                              </td>
                              <td className="p-3 text-center text-slate-900 dark:text-white">
                                {selectedHistoryReport.globalStats.total.toLocaleString("fr-FR")}
                              </td>
                              <td className="p-3 text-center text-emerald-600 dark:text-emerald-400">
                                {selectedHistoryReport.globalStats.existing.toLocaleString("fr-FR")}
                              </td>
                              <td className="p-3 text-center text-rose-600 dark:text-rose-400">
                                {selectedHistoryReport.globalStats.missing.toLocaleString("fr-FR")}
                              </td>
                              <td className="p-3 text-center text-emerald-600 dark:text-emerald-400">
                                {selectedHistoryReport.globalStats.pctExisting}%
                              </td>
                              <td className="p-3 text-center text-rose-600 dark:text-rose-400">
                                {selectedHistoryReport.globalStats.pctMissing}%
                              </td>
                              <td className="p-3">
                                <div className="flex flex-col gap-1 w-full">
                                  <div className="flex h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    <div 
                                      style={{ width: `${selectedHistoryReport.globalStats.pctExisting}%` }} 
                                      className="bg-emerald-600 transition-all duration-500" 
                                      title={`Présentes: ${selectedHistoryReport.globalStats.pctExisting}%`}
                                    />
                                    <div 
                                      style={{ width: `${selectedHistoryReport.globalStats.pctMissing}%` }} 
                                      className="bg-rose-600 transition-all duration-500" 
                                      title={`Absentes: ${selectedHistoryReport.globalStats.pctMissing}%`}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[9px] text-slate-500">
                                    <span>{selectedHistoryReport.globalStats.pctExisting}% global</span>
                                    <span>{selectedHistoryReport.globalStats.pctMissing}% global</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3"></td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-100 dark:border-slate-800/60 pb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 dark:text-white">Détails des Écarts (Historique)</h3>
                      <span className="text-xs font-bold px-2 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full">
                        {filteredHistoryRows.length.toLocaleString("fr-FR")} lignes
                      </span>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Agency Filter */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Agence :</label>
                        <select
                          value={historySelectedAgency}
                          onChange={(e) => {
                            setHistorySelectedAgency(e.target.value);
                            setHistoryCurrentPage(1);
                          }}
                          className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 outline-none min-w-[150px]"
                        >
                          <option value="ALL">Toutes les agences</option>
                          {historyAgenciesList.map(agence => (
                            <option key={`history-filter-agence-${agence}`} value={agence}>{agence}</option>
                          ))}
                        </select>
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Rechercher..."
                          value={historySearchQuery}
                          onChange={(e) => {
                            setHistorySearchQuery(e.target.value);
                            setHistoryCurrentPage(1);
                          }}
                          className="pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none w-[200px] focus:border-blue-500 focus:bg-white transition-all"
                        />
                      </div>

                      {/* Export Trigger */}
                      <button
                        onClick={exportHistoryExcel}
                        disabled={filteredHistoryRows.length === 0}
                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
                      >
                        <Download className="h-4 w-4" />
                        Exporter Excel
                      </button>
                    </div>
                  </div>

                  {filteredHistoryRows.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                      <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                      <h4 className="font-semibold text-slate-800 dark:text-white">Aucun écart</h4>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                              {(selectedHistoryReport.columnsNS || []).map((col: string) => {
                                const isSortedCol = historyDetailsSortField === col;
                                return (
                                  <th 
                                    key={`history-th-${col}`} 
                                    onClick={() => handleHistoryDetailsSort(col)}
                                    className={cn(
                                      "p-3 border-b border-slate-100 dark:border-slate-800/60 cursor-pointer select-none hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors",
                                      col === selectedHistoryReport.mapping?.nsId && "text-purple-600 dark:text-purple-400",
                                      col === selectedHistoryReport.mapping?.nsAgence && "text-blue-600 dark:text-blue-400"
                                    )}
                                  >
                                    <div className="flex items-center gap-1">
                                      <span>{col}</span>
                                      <span className={cn(
                                        "text-[9px] transition-colors",
                                        isSortedCol ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-300 dark:text-slate-600"
                                      )}>
                                        {isSortedCol ? (historyDetailsSortDirection === "asc" ? "▲" : "▼") : "▲▼"}
                                      </span>
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedHistoryRows.map((row: any, rIdx: number) => (
                              <tr key={`history-tr-row-${rIdx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                {(selectedHistoryReport.columnsNS || []).map((col: string) => (
                                  <td 
                                    key={`history-td-${rIdx}-${col}`} 
                                    className={cn(
                                      "p-3 border-b border-slate-100 dark:border-slate-800/60 text-slate-700 dark:text-slate-300",
                                      col === selectedHistoryReport.mapping?.nsId && "font-bold text-purple-600 dark:text-purple-400",
                                      col === selectedHistoryReport.mapping?.nsAgence && "font-bold text-blue-600 dark:text-blue-400"
                                    )}
                                  >
                                    {row[col] !== undefined && row[col] !== null ? formatExcelValue(col, row[col]) : ""}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination controls */}
                      {totalHistoryPages > 1 && (
                        <div className="flex justify-between items-center gap-4 flex-wrap pt-2">
                          <span className="text-xs text-slate-400 font-medium">
                            Affichage de <span className="font-bold text-slate-700 dark:text-white">{(historyCurrentPage - 1) * historyPageSize + 1}</span> à{" "}
                            <span className="font-bold text-slate-700 dark:text-white">{Math.min(historyCurrentPage * historyPageSize, filteredHistoryRows.length)}</span> sur{" "}
                            <span className="font-bold text-slate-700 dark:text-white">{filteredHistoryRows.length}</span> lignes
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              disabled={historyCurrentPage === 1}
                              onClick={() => setHistoryCurrentPage(prev => Math.max(prev - 1, 1))}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-50"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            
                            <div className="flex items-center gap-1">
                              {historyPaginationRange.map((p, pIdx) => {
                                if (p === "...") {
                                  return <span key={`history-ellip-${pIdx}`} className="px-2 text-slate-400">...</span>;
                                }
                                return (
                                  <button
                                    key={`history-page-btn-${p}`}
                                    onClick={() => setHistoryCurrentPage(p as number)}
                                    className={cn(
                                      "h-7 w-7 text-xs font-semibold rounded-lg transition-all",
                                      p === historyCurrentPage
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
                              disabled={historyCurrentPage === totalHistoryPages}
                              onClick={() => setHistoryCurrentPage(prev => Math.min(prev + 1, totalHistoryPages))}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-50"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>

                            <div className="flex items-center gap-1.5 ml-2">
                              <span className="text-xs text-slate-400">Par page :</span>
                              <select
                                value={historyPageSize}
                                onChange={(e) => {
                                  setHistoryPageSize(parseInt(e.target.value));
                                  setHistoryCurrentPage(1);
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
          </div>
        )
      )}
    </div>
  );
}
