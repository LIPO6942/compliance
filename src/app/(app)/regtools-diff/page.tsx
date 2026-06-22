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
  FileText,
  ClipboardList,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { useUser } from "@/contexts/UserContext";
import { useActivityLog } from "@/contexts/ActivityLogContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { getAgencyGeography, AGENCY_GEOGRAPHY } from "@/data/agencyGeography";

// Normalization helper
const normalizeKey = (val: any): string => {
  if (val === undefined || val === null) return "";
  let str = String(val).trim().toUpperCase();
  
  // Remove trailing ".0" if it's an Excel float formatting of an integer
  if (str.endsWith(".0")) {
    str = str.slice(0, -2);
  }
  
  // Remove leading zeros
  return str.replace(/^0+(?!$)/, '');
};

// Detect client entity type based on ID structure and CAT_I code
const detectClientType = (idRaw: any, catIRaw: any): string => {
  if (idRaw === undefined || idRaw === null) return "Inconnu";
  const id = String(idRaw).trim().toUpperCase();
  if (id === "") return "Inconnu";
  
  const catI = catIRaw !== undefined && catIRaw !== null ? String(catIRaw).trim() : "";
  
  // 1. Uniquement numérique => Personne Physique (CIN)
  if (/^\d+$/.test(id)) {
    return "Personne Physique (CIN)";
  }
  
  // 2. Commence par un chiffre (et contient des lettres car non uniquement numérique) => Personne Physique (Passeport)
  if (/^\d/.test(id)) {
    return "Personne Physique (Passeport)";
  }
  
  // 3. Contient des lettres à la fin => Personne Morale ou Association (OBNL)
  if (/[A-Z]$/.test(id)) {
    if (catI === "6" || catI.includes("6")) {
      return "Association (OBNL)";
    }
    return "Personne Morale";
  }
  
  // 4. Par défaut, si commence par une lettre et se termine par un chiffre (ex: J029825) => Personne Physique (Passeport)
  if (/^[A-Z]/.test(id) && /\d$/.test(id)) {
    return "Personne Physique (Passeport)";
  }
  
  // Autre cas (par défaut)
  if (catI === "6" || catI.includes("6")) {
    return "Association (OBNL)";
  }
  return "Personne Morale";
};

// Extract dynamic CAT_I from row object and detect entity type
const detectRowEntityType = (row: any, idCol: string): string => {
  if (!row || !idCol) return "Inconnu";
  const idVal = row[idCol];
  const keys = Object.keys(row);
  const catICol = keys.find(k => {
    const norm = k.replace(/[\s_.-]+/g, "").toUpperCase();
    return norm === "CATI" || norm === "CATEGORIE" || norm === "CAT";
  });
  const catIVal = catICol ? row[catICol] : undefined;
  return detectClientType(idVal, catIVal);
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
  "144": { name: "AG Sousse (Teboulba)", type: "Agence" },
  "146": { name: "AG Gabès", type: "Agence" },
  "147": { name: "AG Raoued", type: "Agence" },
  "149": { name: "AG El Mourouj 3", type: "Agence" },
  "150": { name: "AG Ezzouhour", type: "Agence" },
  "151": { name: "AG Sousse Erriadh", type: "Agence" },
  "152": { name: "AG Sahloul sousse2", type: "Agence" },
  "154": { name: "AG Ennaser II", type: "Agence" },
  "155": { name: "AG Sidi hessine", type: "Agence" },
  "156": { name: "AG El Ouardia", type: "Agence" },
  "157": { name: "AG Manouba", type: "Agence" },
  "160": { name: "AG chebba", type: "Agence" },
  "161": { name: "AG Boumerdés", type: "Agence" },
  "162": { name: "AG kef", type: "Agence" },
  "165": { name: "AG Enfidha", type: "Agence" },
  "167": { name: "AG Menzel Bourguiba", type: "Agence" },
  "168": { name: "AG Grombalia", type: "Agence" },
  "169": { name: "Tastour", type: "Succursale" },
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
  "196": { name: "AG El-Hamma", type: "Agence" },
  "198": { name: "AG Fouchana", type: "Agence" },
  "271": { name: "Laaribi Taieb", type: "courtier" },
  "272": { name: "INRISE", type: "courtier" },
  "273": { name: "Arab African Ins", type: "courtier" },
  "274": { name: "Kare Kamoun", type: "courtier" },
  "275": { name: "El Amana Selcar", type: "courtier" },
  "276": { name: "Ticar", type: "courtier" },
  "277": { name: "ST Tunisie cortage", type: "courtier" },
  "278": { name: "ST Msoscar", type: "courtier" },
  "279": { name: "Pro-Assur", type: "courtier" },
  "280": { name: "ars", type: "courtier" },
  "281": { name: "ascor", type: "courtier" },
  "282": { name: "arco", type: "courtier" },
  "800": { name: "AG Sousse (Kâala Kbira)", type: "Agence" },
  "801": { name: "Radés", type: "Succursale" },
  "804": { name: "AG Ben Gerdaine", type: "Agence" },
  "805": { name: "El Mechtel", type: "Succursale" },
  "807": { name: "Monastir II", type: "Succursale" },
  "808": { name: "AG Hammamet", type: "Agence" },
  "809": { name: "soliman", type: "Succursale" },
  "810": { name: "Zarzis II", type: "Succursale" },
  "811": { name: "El-Jam", type: "Succursale" },
  "813": { name: "AG Ghadimaou", type: "Agence" },
  "816": { name: "La Goulette", type: "Succursale" },
  "817": { name: "Sfax V", type: "Succursale" },
  "818": { name: "Lac II", type: "Succursale" },
  "819": { name: "Med Chawki Ben Amor", type: "Agent Stagiaire" },
  "821": { name: "AG yasminet", type: "Agence" },
  "822": { name: "AG sousse", type: "Agence" },
  "823": { name: "AG bardo", type: "Agence" },
  "824": { name: "AG el kadra", type: "Agence" },
  "827": { name: "Gabes II", type: "Succursale" },
  "830": { name: "AG ain zaghouan", type: "Agence" },
  "831": { name: "Nourhene Akermi", type: "Agent Stagiaire" },
  "832": { name: "La Marsa", type: "Succursale" },
  "833": { name: "STDAB", type: "courtier" },
  "834": { name: "Ines Derbel", type: "Agent Stagiaire" },
  "835": { name: "AG mutuelle ville", type: "Agence" },
  "837": { name: "Rihab driss", type: "Agent Stagiaire" },
  "838": { name: "Souha ammous", type: "Agent Stagiaire" },
  "839": { name: "Bekri fatma", type: "Agent Stagiaire" },
  "840": { name: "Nouha ayadi", type: "Agent Stagiaire" },
  "841": { name: "Imen trabelsi", type: "Agent Stagiaire" },
  "842": { name: "Asma mattoussi", type: "Agent Stagiaire" },
  "843": { name: "OLEA", type: "courtier" },
  "844": { name: "AG sbitla", type: "Agence" },
  "845": { name: "cyrine kedadi", type: "Agent Stagiaire" },
  "846": { name: "boussalem", type: "Succursale" },
  "847": { name: "jammel", type: "Succursale" },
  "849": { name: "Rym aouaysi", type: "Agent Stagiaire" },
  "850": { name: "Siége", type: "siege" },
  "851": { name: "Borj Ghorbel", type: "succursale" },
  "853": { name: "Mourouj 6", type: "Succursale" },
  "854": { name: "yassine chaouch", type: "Agent Stagiaire" },
  "855": { name: "Agence Digital", type: "siege" },
  "857": { name: "olfa euchi", type: "Agent Stagiaire" },
  "858": { name: "Best Lease Gabes", type: "Succursale" },
  "859": { name: "Gafsa II", type: "Succursale" },
  "860": { name: "AG jardin d'el menzeh", type: "Agence" },
  "862": { name: "AG menzeh 1", type: "Agence" }
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

  // Try to find by name matching
  const normalizedStr = normalizeForMatching(normalizedCode);
  const entries = Object.entries(AGENCY_MAPPING);
  for (const [c, inf] of entries) {
    if (normalizeForMatching(inf.name) === normalizedStr) {
      return { code: c, name: inf.name, type: inf.type };
    }
  }

  return {
    code: normalizedCode,
    name: `Agence ${normalizedCode}`,
    type: "Inconnu"
  };
};

// Helper to clean common UTF-8 mojibake encoding issues (e.g., BÃ©ja -> Béja)
const cleanMojibake = (str: string): string => {
  if (!str) return "";
  let res = String(str);
  res = res.replace(/Ã©/g, "é");
  res = res.replace(/Ã‰/g, "É");
  res = res.replace(/Ã¨/g, "è");
  res = res.replace(/Ã /g, "à");
  res = res.replace(/Ã§/g, "ç");
  res = res.replace(/Ã¹/g, "ù");
  res = res.replace(/Ã¢/g, "â");
  res = res.replace(/Ãª/g, "ê");
  res = res.replace(/Ã®/g, "î");
  res = res.replace(/Ã´/g, "ô");
  res = res.replace(/Ã»/g, "û");
  res = res.replace(/Ã«/g, "ë");
  res = res.replace(/Ã¯/g, "ï");
  res = res.replace(/Ã\u00A0/g, "à");
  res = res.replace(/Ã‰/g, "É");
  res = res.replace(/Ãˆ/g, "È");
  res = res.replace(/Ã€/g, "À");
  res = res.replace(/Ã‡/g, "Ç");
  res = res.replace(/Ã‚/g, "Â");
  res = res.replace(/ÃŠ/g, "Ê");
  res = res.replace(/ÃŽ/g, "Î");
  res = res.replace(/Ã”/g, "Ô");
  res = res.replace(/Ã›/g, "Û");
  res = res.replace(/\u00A0/g, " ");
  return res;
};

// Helper to normalize strings for robust comparison (handles accents, spaces, and punctuation)
const normalizeForMatching = (str: string): string => {
  if (!str) return "";
  let res = cleanMojibake(str).toLowerCase();
  res = res.replace(/jaurès/g, "jaure")
           .replace(/jaures/g, "jaure")
           .replace(/jaurÃ¨'s/g, "jaure")
           .replace(/jaurÃ¨s/g, "jaure")
           .replace(/jaurè's/g, "jaure")
           .replace(/jaurè/g, "jaure");
  res = res.replace(/[éèêë]/g, "e")
           .replace(/[àâä]/g, "a")
           .replace(/[ôö]/g, "o")
           .replace(/[ùûü]/g, "u")
           .replace(/[ç]/g, "c")
           .replace(/[îï]/g, "i");
  res = res.replace(/['’`\-_]/g, " ");
  
  // Specific spelling variant normalizations for MAE agencies
  res = res.replace(/\bsekiet\b/g, "sakiet")
           .replace(/\beddayer\b/g, "edayer")
           .replace(/\bezzit\b/g, "ezit")
           .replace(/\bgoullette\b/g, "goulette")
           .replace(/\bmannouba\b/g, "manouba")
           .replace(/\bsbeitla\b/g, "sbitla")
           .replace(/\bouerdia\b/g, "ouardia")
           .replace(/\byassminet\b/g, "yasminet")
           .replace(/\bagn\b/g, "ag");

  res = res.replace(/\s+/g, " ").trim();
  return res;
};

// Excel Date formatting helper
const formatExcelValue = (colName: string, val: any): string => {
  if (val === undefined || val === null || val === "") return "";
  const strVal = String(val).trim();
  const colLower = colName.toLowerCase();
  
  if (colLower.includes("date") || colLower.includes("sous")) {
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

// Helper to clean column name for comparisons
const cleanColumnNameForMapping = (col: string): string => {
  return col.trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, ""); // strip accents
};

const getExportHeadersAndRowMapper = (
  portfolioFilter: string,
  nsCols: string[],
  vieCols: string[]
) => {
  const cleanColumnName = (col: string): string => {
    return col.trim()
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");
  };

  const unwantedColumnsNormalized = new Set([
    "n_avt", "type_a", "c_gest", "date_avn", "droientree", "droitentree", "droitsentree",
    "prime nette annuelle",
    "montant total des primes versees",
    "beneficiaire designe",
    "statut du contrat",
    "date de derniere modification ou mise a jour du contrat",
    "profession ou activite declaree du souscripteur",
    "canal de souscription",
    "dernier avenant applique",
    "capital"
  ]);

  // Find actual names of key columns in vieCols (to match correctly)
  const nomClientVieCol = vieCols.find(h => cleanColumnName(h) === "nom et prenom du souscripteur" || cleanColumnName(h) === "nom du souscripteur" || cleanColumnName(h) === "nom_client") || "Nom et prénom du souscripteur";
  const identifiantVieCol = vieCols.find(h => cleanColumnName(h) === "numero de carte d identite ou matricule fiscal" || cleanColumnName(h) === "numero de carte d'identite ou matricule fiscal" || cleanColumnName(h) === "identifiant") || "Numéro de carte d identité ou matricule fiscal";
  const dateSousVieCol = vieCols.find(h => cleanColumnName(h) === "date de souscription" || cleanColumnName(h) === "date sous") || "Date de souscription";
  const numeroContratVieCol = vieCols.find(h => cleanColumnName(h) === "numero du contrat" || cleanColumnName(h) === "numero de contrat" || cleanColumnName(h) === "contrat") || "Numéro du contrat";
  const nClientVieCol = vieCols.find(h => cleanColumnName(h) === "numero de client" || cleanColumnName(h) === "numero client" || cleanColumnName(h) === "n_client") || "Numéro de client";
  const dateNaissVieCol = vieCols.find(h => cleanColumnName(h) === "date de naissance" || cleanColumnName(h) === "date naissance" || cleanColumnName(h) === "date_naiss") || "Date de naissance";

  // Corresponding Non Vie column names
  const nomClientNsCol = nsCols.find(h => cleanColumnName(h) === "nom_client" || cleanColumnName(h) === "nom client") || "NOM_CLIENT";
  const identifiantNsCol = nsCols.find(h => cleanColumnName(h) === "identifiant" || cleanColumnName(h) === "id") || "Identifiant";
  const dateSousNsCol = nsCols.find(h => cleanColumnName(h) === "date_sous" || cleanColumnName(h) === "date sous") || "DATE_SOUS";
  const nClientNsCol = nsCols.find(h => cleanColumnName(h) === "n_client" || cleanColumnName(h) === "n client") || "N_CLIENT";
  const dateNaissNsCol = nsCols.find(h => cleanColumnName(h) === "date_naiss" || cleanColumnName(h) === "date naiss") || "DATE_NAISS";

  let headers: string[] = [];

  const cleanNsCols = nsCols.filter(h => !unwantedColumnsNormalized.has(cleanColumnName(h)));

  if (portfolioFilter === "NS") {
    headers = cleanNsCols;
  } else if (portfolioFilter === "VIE") {
    headers = ["Portefeuille", numeroContratVieCol, ...cleanNsCols];
  } else {
    headers = ["Portefeuille", numeroContratVieCol, ...cleanNsCols];
  }

  // Row mapper function
  const mapRow = (row: any) => {
    const newRow: any = {};
    const isRowVie = row.__sourcePortfolio === "VIE";

    headers.forEach(h => {
      if (h === "Portefeuille") {
        const rawPortfolio = row.__sourcePortfolio || (isRowVie ? "VIE" : "NS");
        newRow[h] = rawPortfolio === "NS" ? "Non Vie" : (rawPortfolio === "VIE" ? "Vie" : rawPortfolio);
      } else {
        if (isRowVie) {
          if (cleanColumnName(h) === cleanColumnName(nomClientNsCol)) {
            newRow[h] = row[nomClientVieCol] !== undefined && row[nomClientVieCol] !== null ? formatExcelValue(h, row[nomClientVieCol]) : "";
          } else if (cleanColumnName(h) === cleanColumnName(identifiantNsCol)) {
            newRow[h] = row[identifiantVieCol] !== undefined && row[identifiantVieCol] !== null ? formatExcelValue(h, row[identifiantVieCol]) : "";
          } else if (cleanColumnName(h) === cleanColumnName(dateSousNsCol)) {
            newRow[h] = row[dateSousVieCol] !== undefined && row[dateSousVieCol] !== null ? formatExcelValue(h, row[dateSousVieCol]) : "";
          } else if (cleanColumnName(h) === cleanColumnName(nClientNsCol)) {
            newRow[h] = row[nClientVieCol] !== undefined && row[nClientVieCol] !== null ? formatExcelValue(h, row[nClientVieCol]) : "";
          } else if (cleanColumnName(h) === cleanColumnName(dateNaissNsCol)) {
            newRow[h] = row[dateNaissVieCol] !== undefined && row[dateNaissVieCol] !== null ? formatExcelValue(h, row[dateNaissVieCol]) : "";
          } else if (cleanColumnName(h) === cleanColumnName(numeroContratVieCol)) {
            newRow[h] = row[numeroContratVieCol] !== undefined && row[numeroContratVieCol] !== null ? formatExcelValue(h, row[numeroContratVieCol]) : "";
          } else {
            newRow[h] = row[h] !== undefined && row[h] !== null ? formatExcelValue(h, row[h]) : "";
          }
        } else {
          if (cleanColumnName(h) === cleanColumnName(numeroContratVieCol)) {
            newRow[h] = "";
          } else {
            newRow[h] = row[h] !== undefined && row[h] !== null ? formatExcelValue(h, row[h]) : "";
          }
        }
      }
    });

    return newRow;
  };

  return { headers, mapRow };
};

// Resolve agency code from text descriptions (e.g. AGENT D'AS Sousse 1)
const resolveAgencyFromText = (text: any) => {
  if (text === undefined || text === null || text === "") {
    return { code: "", name: "Non spécifié", type: "-" };
  }
  const cleaned = cleanMojibake(String(text).trim());
  const strNormalized = normalizeForMatching(cleaned);
  
  // Check if it's already a numeric code
  const codeMatch = strNormalized.match(/\b\d+\b/);
  if (codeMatch) {
    const code = codeMatch[0].replace(/^0+(?!$)/, '');
    if (AGENCY_MAPPING[code]) {
      return { code, ...AGENCY_MAPPING[code] };
    }
  }

  // Try to match the name
  const entries = Object.entries(AGENCY_MAPPING).sort((a, b) => b[1].name.length - a[1].name.length);
  for (const [code, info] of entries) {
    const normName = normalizeForMatching(info.name);
    if (strNormalized.includes(normName)) {
      return { code, ...info };
    }
  }

  // Try flexible words match
  for (const [code, info] of entries) {
    const normName = normalizeForMatching(info.name);
    const nameWords = normName.replace(/[()]/g, "").split(/\s+/).filter(w => w.length > 2 && w !== "agent" && w !== "agence");
    if (nameWords.length > 0 && nameWords.every(word => strNormalized.includes(word))) {
      return { code, ...info };
    }
  }

  return {
    code: cleaned,
    name: cleaned,
    type: "Inconnu"
  };
};

// Harmonized agency retriever
const getRowAgencyCode = (row: any, agenceCol: string, isVie: boolean): string => {
  if (!row || !agenceCol) return "";
  const val = row[agenceCol];
  if (val === undefined || val === null) return "";
  const strVal = String(val).trim();
  if (isVie) {
    return resolveAgencyFromText(strVal).code;
  }
  return strVal;
};

// Parse month and year from subscription date
const parseMonthYearFromDateStr = (dateStr: string): { month: string; year: string } | null => {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const pattern1 = cleaned.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (pattern1) {
    return { month: pattern1[2].padStart(2, '0'), year: pattern1[3] };
  }

  // YYYY/MM/DD or YYYY-MM-DD
  const pattern2 = cleaned.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
  if (pattern2) {
    return { month: pattern2[2].padStart(2, '0'), year: pattern2[1] };
  }

  // Excel serial date number
  const num = Number(cleaned);
  if (!isNaN(num) && num > 10000 && num < 100000) {
    const days = num - (num > 59 ? 25569 : 25568);
    const date = new Date(days * 24 * 3600 * 1000);
    return {
      month: String(date.getUTCMonth() + 1).padStart(2, '0'),
      year: String(date.getUTCFullYear())
    };
  }

  return null;
};

// Keyword-based column search
const findColumnByKeywords = (cols: string[], keywords: string[]): string => {
  const normalizedKeywords = keywords.map(k => k.toLowerCase().trim());
  for (const col of cols) {
    const colLower = col.toLowerCase().trim();
    if (normalizedKeywords.includes(colLower)) return col;
  }
  for (const col of cols) {
    const colLower = col.toLowerCase().trim();
    if (keywords.every(kw => colLower.includes(kw.toLowerCase().trim()))) {
      return col;
    }
  }
  for (const col of cols) {
    const colLower = col.toLowerCase().trim();
    for (const kw of keywords) {
      if (colLower.includes(kw.toLowerCase().trim())) return col;
    }
  }
  return "";
};

// Process VIE data: filter & clean
const processVieData = (
  rawData: any[],
  cols: string[]
): {
  filteredData: any[];
  detectedMonthKey: string;
  detectedMonthLabel: string;
  detectedMappings: { idCol: string; agenceCol: string };
} => {
  const avenantCol = findColumnByKeywords(cols, ["avenant", "appliqu"]) || findColumnByKeywords(cols, ["avenenat", "appliqu"]) || autoDetectCol(cols, ["avenant", "avenenat"]);
  const statutCol = findColumnByKeywords(cols, ["statut", "contrat"]) || autoDetectCol(cols, ["statut"]);
  const idCol = findColumnByKeywords(cols, ["carte", "identite"]) || findColumnByKeywords(cols, ["matricule", "fiscal"]) || autoDetectCol(cols, ["carte", "matricule"]);
  const dateCol = findColumnByKeywords(cols, ["date", "souscription"]) || findColumnByKeywords(cols, ["date", "sous"]) || autoDetectCol(cols, ["souscription", "sous"]);
  const agenceCol = findColumnByKeywords(cols, ["canal", "souscription"]) || findColumnByKeywords(cols, ["canal", "sou"]) || autoDetectCol(cols, ["canal", "agence", "structure"]);

  let monthKey = "";
  let monthLabel = "";
  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  for (const row of rawData) {
    const rawDateVal = row[dateCol];
    if (rawDateVal) {
      const formattedDate = formatExcelValue(dateCol, rawDateVal);
      const parsed = parseMonthYearFromDateStr(formattedDate);
      if (parsed) {
        const mIdx = parseInt(parsed.month, 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          monthKey = `${parsed.month}${parsed.year}`;
          monthLabel = `${months[mIdx]} ${parsed.year}`;
          break;
        }
      }
    }
  }

  // Filter
  const filtered = rawData.filter(row => {
    const avenantVal = String(row[avenantCol] || "").trim().toLowerCase();
    const statutVal = String(row[statutCol] || "").trim().toLowerCase();
    const matchAvenant = avenantVal.includes("affaire nouvelle");
    const matchStatut = statutVal.includes("en cours");
    return matchAvenant && matchStatut;
  });

  // Deduplicate on unique card/fiscal ID
  const seenIds = new Set<string>();
  const deduplicated: any[] = [];
  
  for (const row of filtered) {
    const idVal = normalizeKey(row[idCol]);
    if (idVal !== "") {
      if (!seenIds.has(idVal)) {
        seenIds.add(idVal);
        deduplicated.push(row);
      }
    } else {
      deduplicated.push(row);
    }
  }

  return {
    filteredData: deduplicated,
    detectedMonthKey: monthKey,
    detectedMonthLabel: monthLabel,
    detectedMappings: {
      idCol: idCol || cols[0],
      agenceCol: agenceCol || cols[0]
    }
  };
};

// Row minification helpers to bypass Firestore 1MB limit
const minifyRows = (rows: any[], columns: string[]): any[][] => {
  if (!rows) return [];
  return rows.map(row => columns.map(col => row[col] !== undefined ? row[col] : ""));
};

const unminifyRows = (minifiedRows: any[][], columns: string[]): any[] => {
  if (!minifiedRows) return [];
  return minifiedRows.map(rowArr => {
    const rowObj: any = {};
    columns.forEach((col, idx) => {
      rowObj[col] = rowArr[idx];
    });
    return rowObj;
  });
};

const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  if (!arr) return chunks;
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

// Extract compliance KPIs from raw RegTools rows
const extractRegtoolsKPIs = (regtoolsData: any[]) => {
  if (!regtoolsData || regtoolsData.length === 0) return null;

  const firstRow = regtoolsData[0];
  const keys = Object.keys(firstRow);

  // Auto-detect columns based on common patterns
  const riskLevelCol = keys.find(k => /risk.*level|niveau.*risque/i.test(k)) || "riskLevel";
  const formNamesCol = keys.find(k => /form.*name|nom.*form|type.*risque/i.test(k)) || "formNames";
  const isPepCol = keys.find(k => /^is.*pep$|^pep$/i.test(k)) || "isPep";
  const isSanctionedCol = keys.find(k => /^is.*sanction|^sanction$/i.test(k)) || "isSanctioned";
  const isAllTreatedCol = keys.find(k => /^is.*treat|trait/i.test(k)) || "isAllTreated";
  const riskValueCol = keys.find(k => /risk.*val|valeur.*risque/i.test(k)) || "riskValue";
  const profileTypeCol = keys.find(k => /profile.*type|type.*profil/i.test(k)) || "potentialProfileType";

  const riskLevels: Record<string, number> = { Faible: 0, Moyen: 0, Eleve: 0 };
  const formTypes: Record<string, number> = {};
  let pepCount = 0;
  let sanctionedCount = 0;
  let treatedCount = 0;
  let totalRiskValue = 0;
  let riskValueCount = 0;

  regtoolsData.forEach(row => {
    // 1. Risk Level
    const rLevelVal = String(row[riskLevelCol] || "").trim().toLowerCase();
    if (rLevelVal.includes("faible")) {
      riskLevels.Faible++;
    } else if (rLevelVal.includes("moyen")) {
      riskLevels.Moyen++;
    } else if (rLevelVal.includes("eleve") || rLevelVal.includes("éleve") || rLevelVal.includes("élevé")) {
      riskLevels.Eleve++;
    }

    // 2. Form Names / Types
    const fNamesVal = String(row[formNamesCol] || "").trim();
    if (fNamesVal) {
      const parts = fNamesVal.split(",").map(p => p.trim()).filter(Boolean);
      parts.forEach(part => {
        let cleaned = part.replace(/^Fiche de Connaissance Client MAE\s*-\s*/i, "").trim();
        if (/personne\s+physique/i.test(cleaned)) {
          if (/assur[eé]\s+personne\s+physique/i.test(cleaned)) {
            cleaned = "Assuré personne physique";
          } else {
            cleaned = "Personne physique";
          }
        } else if (/personne\s+morale?/i.test(cleaned)) {
          cleaned = "Personne morale";
        } else if (/repr[eé]s[eé]ntant\s+l[eé]gale?/i.test(cleaned)) {
          cleaned = "Représentant légal";
        }
        
        formTypes[cleaned] = (formTypes[cleaned] || 0) + 1;
      });
    }

    // 3. PEP
    const pepVal = String(row[isPepCol] || "").trim().toLowerCase();
    const profileVal = String(row[profileTypeCol] || "").trim().toLowerCase();
    const isPep = pepVal === "yes" || pepVal === "oui" || pepVal === "true" || profileVal.includes("pep");
    if (isPep) {
      pepCount++;
    }

    // 4. Sanctions
    const sanctionedVal = String(row[isSanctionedCol] || "").trim().toLowerCase();
    const isSanctioned = sanctionedVal === "yes" || sanctionedVal === "oui" || sanctionedVal === "true" || profileVal.includes("sanction");
    if (isSanctioned) {
      sanctionedCount++;
    }

    // 5. Treated
    const treatedVal = String(row[isAllTreatedCol] || "").trim().toLowerCase();
    if (treatedVal === "yes" || treatedVal === "oui" || treatedVal === "true") {
      treatedCount++;
    }

    // 6. Risk Value
    const rVal = parseFloat(row[riskValueCol]);
    if (!isNaN(rVal)) {
      totalRiskValue += rVal;
      riskValueCount++;
    }
  });

  return {
    riskLevels,
    formTypes: Object.entries(formTypes)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    pepCount,
    sanctionedCount,
    treatedCount,
    avgRiskValue: riskValueCount > 0 ? parseFloat((totalRiskValue / riskValueCount).toFixed(2)) : 0,
    totalForms: regtoolsData.length
  };
};


interface TunisiaHeatmapProps {
  delegationStats: any[];
  selectedDelegation: string | null;
  onSelectDelegation: (delegation: string | null) => void;
}

const TunisiaHeatmap = ({ delegationStats, selectedDelegation, onSelectDelegation }: TunisiaHeatmapProps) => {
  const getDelegationColor = (name: string) => {
    const stat = delegationStats.find(d => d.name === name);
    const pct = stat ? stat.pctExisting : 100;
    if (pct > 98) return {
      fill: "rgba(16, 185, 129, 0.12)",
      stroke: "rgb(16, 185, 129)",
      bg: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400"
    };
    if (pct >= 95) return {
      fill: "rgba(249, 115, 22, 0.12)",
      stroke: "rgb(249, 115, 22)",
      bg: "bg-orange-500",
      text: "text-orange-600 dark:text-orange-400"
    };
    return {
      fill: "rgba(239, 68, 68, 0.12)",
      stroke: "rgb(239, 68, 68)",
      bg: "bg-rose-500",
      text: "text-rose-600 dark:text-rose-400"
    };
  };

  const labelCenters: Record<string, { x: number; y: number }> = {
    "Tunis Nord": { x: 118, y: 32 },
    "Tunis Centre": { x: 126, y: 45 },
    "Tunis Sud": { x: 128, y: 62 },
    "Cap Bon": { x: 148, y: 48 },
    "Sahel": { x: 135, y: 125 },
    "Sfax": { x: 130, y: 225 },
    "Nord ouest": { x: 75, y: 100 },
    "Sud": { x: 95, y: 335 }
  };

  const delegations = [
    {
      name: "Nord ouest",
      path: "M 108,17 C 95,20 70,30 50,39 C 45,80 45,140 50,181 C 65,195 80,202 92,207 C 94,180 95,155 96,129 C 98,105 99,80 100,56 C 102,42 105,28 108,17 Z"
    },
    {
      name: "Tunis Nord",
      path: "M 108,17 C 112,12 118,10 122,12 C 126,14 122,25 115,39 C 114,46 113,52 112,56 C 108,56 104,56 100,56 C 100,42 104,28 108,17 Z"
    },
    {
      name: "Tunis Centre",
      path: "M 115,39 C 122,35 125,38 127,42 C 127,46 125,50 121,56 C 118,56 114,56 112,56 C 113,52 114,46 115,39 Z"
    },
    {
      name: "Tunis Sud",
      path: "M 112,56 C 114,56 118,56 121,56 C 123,62 125,68 121,86 C 117,86 112,86 108,86 C 108,76 110,66 112,56 Z"
    },
    {
      name: "Cap Bon",
      path: "M 115,39 C 122,35 130,28 150,32 C 160,34 167,39 167,45 C 160,65 150,80 137,95 C 131,92 125,89 121,86 C 125,68 123,62 121,56 C 125,50 127,46 127,42 C 125,38 122,35 115,39 Z"
    },
    {
      name: "Sahel",
      path: "M 100,56 C 104,56 108,56 108,86 C 112,86 117,86 121,86 C 125,89 131,92 137,95 C 150,112 158,125 158,142 C 154,152 145,170 129,207 C 115,207 105,170 96,129 C 99,80 100,56 100,56 Z"
    },
    {
      name: "Sfax",
      path: "M 96,129 C 105,170 115,207 129,207 C 145,170 154,172 154,185 C 150,205 145,225 142,241 C 135,260 120,270 105,260 C 98,245 92,230 75,250 C 78,210 92,207 92,207 C 95,180 95,155 96,129 Z"
    },
    {
      name: "Sud",
      path: "M 75,250 C 92,230 105,260 142,241 C 145,260 150,300 150,345 C 142,414 135,460 121,491 C 105,491 80,450 50,353 C 42,302 60,280 75,250 Z"
    }
  ];

  return (
    <div className="relative w-full max-w-[300px] mx-auto bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-4 shadow-inner">
      <svg
        viewBox="0 0 200 500"
        className="w-full h-auto filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.06)]"
      >
        <g strokeWidth="1.5" strokeLinejoin="round">
          {delegations.map(del => {
            const colors = getDelegationColor(del.name);
            const isSelected = selectedDelegation === del.name;
            
            return (
              <path
                key={`del-path-${del.name}`}
                d={del.path}
                fill={colors.fill}
                stroke={colors.stroke}
                onClick={() => onSelectDelegation(isSelected ? null : del.name)}
                className={cn(
                  "cursor-pointer transition-all duration-300 outline-none",
                  isSelected 
                    ? "fill-current opacity-90 stroke-[2.5px]"
                    : "hover:opacity-85 hover:stroke-[2px]"
                )}
                style={{
                  color: colors.stroke
                }}
              />
            );
          })}
        </g>
        
        {delegations.map(del => {
          const center = labelCenters[del.name];
          if (!center) return null;
          
          const stat = delegationStats.find(d => d.name === del.name);
          const pct = stat ? stat.pctExisting : 100;
          const colors = getDelegationColor(del.name);
          const isSelected = selectedDelegation === del.name;
          
          return (
            <g
              key={`label-g-${del.name}`}
              className="cursor-pointer select-none"
              onClick={() => onSelectDelegation(isSelected ? null : del.name)}
            >
              {/* Badge Background Circle */}
              <circle
                cx={center.x}
                cy={center.y}
                r="13"
                className={cn(
                  "fill-white dark:fill-slate-950 stroke-2 filter drop-shadow-sm transition-all duration-300",
                  isSelected ? "stroke-slate-900 dark:stroke-white scale-110" : "stroke-slate-200 dark:stroke-slate-800"
                )}
              />
              {/* Colored status dot inside circle */}
              <circle
                cx={center.x}
                cy={center.y - 6}
                r="2.5"
                className={colors.bg}
              />
              {/* Percentage Text */}
              <text
                x={center.x}
                y={center.y + 4}
                textAnchor="middle"
                fontSize="8"
                fontWeight="bold"
                className="fill-slate-800 dark:fill-slate-200 font-sans"
              >
                {pct}%
              </text>
              
              {/* Delegation name label */}
              <text
                x={center.x}
                y={center.y + 20}
                textAnchor="middle"
                fontSize="7.5"
                fontWeight="700"
                className="fill-slate-700 dark:fill-slate-300 font-sans"
              >
                {del.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};


export default function RegtoolsDiffPage() {
  const { user } = useUser();
  const { logAction, isAdmin } = useActivityLog();

  // Reconciliation type state
  const [reconciliationType, setReconciliationType] = useState<"NS" | "VIE">("NS");
  const [detectedMonthKey, setDetectedMonthKey] = useState("");
  const [detectedMonthLabel, setDetectedMonthLabel] = useState("");
  const [historyReconciliationType, setHistoryReconciliationType] = useState<"NS" | "VIE">("NS");

  // File state
  const [files, setFiles] = useState<{ regtools: File | null; ns: File | null; vie: File | null }>({
    regtools: null,
    ns: null,
    vie: null
  });
  const [data, setData] = useState<{ regtools: any[] | null; ns: any[] | null; vie: any[] | null }>({
    regtools: null,
    ns: null,
    vie: null
  });
  const [columns, setColumns] = useState<{ regtools: string[]; ns: string[]; vie: string[] }>({
    regtools: [],
    ns: [],
    vie: []
  });
  
  // Mapping state
  const [mapping, setMapping] = useState({
    regtoolsId: "",
    nsId: "",
    nsAgence: "",
    vieId: "",
    vieAgence: ""
  });

  // UI state
  const [isParsing, setIsParsing] = useState<{ regtools: boolean; ns: boolean; vie: boolean }>({
    regtools: false,
    ns: false,
    vie: false
  });

  // Portfolio dropdown filters
  const [portfolioFilter, setPortfolioFilter] = useState<"ALL" | "NS" | "VIE">("ALL");
  const [historyPortfolioFilter, setHistoryPortfolioFilter] = useState<"ALL" | "NS" | "VIE">("ALL");

  const [isComparing, setIsComparing] = useState(false);
  const [comparisonDone, setComparisonDone] = useState(false);
  const [dragOverRole, setDragOverRole] = useState<"regtools" | "ns" | "vie" | null>(null);

  // Results state
  const [missingRows, setMissingRows] = useState<any[]>([]);
  const [similarRows, setSimilarRows] = useState<any[]>([]);
  const [agenciesList, setAgenciesList] = useState<string[]>([]);
  const [selectedAgency, setSelectedAgency] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Agency stats and tabs state
  const [activeTab, setActiveTab] = useState<"list" | "stats" | "similar" | "report">("list");
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
  const [historyTab, setHistoryTab] = useState<"stats" | "list" | "similar" | "report">("stats");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyStatsSearchQuery, setHistoryStatsSearchQuery] = useState("");
  const [historySortField, setHistorySortField] = useState<"agence" | "nom" | "type" | "total" | "existing" | "missing" | "pctExisting" | "pctMissing">("agence");
  const [historySortDirection, setHistorySortDirection] = useState<"asc" | "desc">("asc");
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(15);

  // New filters and sort states
  const [statsTypeFilter, setStatsTypeFilter] = useState<string>("ALL");
  const [statsDelegationFilter, setStatsDelegationFilter] = useState<string>("ALL");
  const [historyStatsTypeFilter, setHistoryStatsTypeFilter] = useState<string>("ALL");
  const [historyStatsDelegationFilter, setHistoryStatsDelegationFilter] = useState<string>("ALL");
  const [historySelectedAgency, setHistorySelectedAgency] = useState<string>("ALL");
  const [detailsSortField, setDetailsSortField] = useState<string>("");
  const [detailsSortDirection, setDetailsSortDirection] = useState<"asc" | "desc">("asc");
  const [historyDetailsSortField, setHistoryDetailsSortField] = useState<string>("");
  const [historyDetailsSortDirection, setHistoryDetailsSortDirection] = useState<"asc" | "desc">("asc");
  
  const [selectedDelegation, setSelectedDelegation] = useState<string | null>(null);
  const [historySelectedDelegation, setHistorySelectedDelegation] = useState<string | null>(null);

  // Geography Overrides States (Admin settings)
  const [geographyOverrides, setGeographyOverrides] = useState<Record<string, { delegation: string; gouvernorat: string }>>({});
  const [agencyOverrides, setAgencyOverrides] = useState<Record<string, { name: string; type: string }>>({});
  const [isGeoSettingsOpen, setIsGeoSettingsOpen] = useState(false);
  const [activeSettingsDelegation, setActiveSettingsDelegation] = useState("Tunis Centre");
  const [settingsSearchQuery, setSettingsSearchQuery] = useState("");
  const [settingsNewCode, setSettingsNewCode] = useState("");
  const [settingsNewName, setSettingsNewName] = useState("");
  const [settingsNewType, setSettingsNewType] = useState("Agence");
  const [settingsNewGouv, setSettingsNewGouv] = useState("");
  const [settingsNewDel, setSettingsNewDel] = useState("Tunis Centre");

  const resolveAgencyInfo = useCallback((code: any) => {
    if (code === undefined || code === null) {
      return { code: "", name: "Non spécifié", type: "-" };
    }
    const cleanedCode = cleanMojibake(String(code).trim());
    const normalizedCode = cleanedCode.replace(/^0+(?!$)/, '');
    
    // Check state overrides first
    if (agencyOverrides[normalizedCode]) {
      return {
        code: normalizedCode,
        name: agencyOverrides[normalizedCode].name,
        type: agencyOverrides[normalizedCode].type
      };
    }
    
    // Fallback to static mapping
    const info = AGENCY_MAPPING[normalizedCode];
    if (info) {
      return {
        code: normalizedCode,
        name: info.name,
        type: info.type
      };
    }

    // Try name match on state overrides
    const normalizedStr = normalizeForMatching(normalizedCode);
    for (const [c, inf] of Object.entries(agencyOverrides)) {
      if (normalizeForMatching(inf.name) === normalizedStr) {
        return { code: c, name: inf.name, type: inf.type };
      }
    }

    // Try name match on static mapping
    for (const [c, inf] of Object.entries(AGENCY_MAPPING)) {
      if (normalizeForMatching(inf.name) === normalizedStr) {
        return { code: c, name: inf.name, type: inf.type };
      }
    }

    return {
      code: normalizedCode,
      name: `Agence ${normalizedCode}`,
      type: "Inconnu"
    };
  }, [agencyOverrides]);

  const renderTableCellContent = useCallback((col: string, val: any, isHistory: boolean = false) => {
    if (val === undefined || val === null || val === "") return "";
    
    // Check if it is the agency column
    const agCol = isHistory
      ? (selectedHistoryReport?.mapping?.nsAgence || selectedHistoryReport?.mapping?.vieAgence || "")
      : (mapping.nsAgence || mapping.vieAgence || "");
      
    if (col === agCol) {
      const info = resolveAgencyInfo(val);
      if (info.code) {
        if (info.name && info.name !== `Agence ${info.code}`) {
          return `${info.name} (${info.code})`;
        }
        return info.code;
      }
    }
    return formatExcelValue(col, val);
  }, [mapping.nsAgence, mapping.vieAgence, selectedHistoryReport, resolveAgencyInfo]);

  const resolveAgencyGeography = useCallback((code: any, name?: string) => {
    const normCode = String(code || "").trim().replace(/^0+(?!$)/, "");
    
    const info = resolveAgencyInfo(normCode);
    if (info && info.type.toLowerCase() === "courtier") {
      return { delegation: "Courtiers", gouvernorat: "" };
    }
    if (info && (info.type.toLowerCase() === "siege" || info.type.toLowerCase() === "siège")) {
      return { delegation: "Siège", gouvernorat: "" };
    }

    if (geographyOverrides[normCode]) {
      return geographyOverrides[normCode];
    }

    // Check if code is explicitly in AGENCY_GEOGRAPHY (determined link)
    if (AGENCY_GEOGRAPHY[normCode]) {
      return AGENCY_GEOGRAPHY[normCode];
    }

    // Check name match keywords (determined link)
    const finalName = name || (info ? info.name : "");
    const normName = String(finalName || "").toLowerCase().trim();
    const hasKeyword = normName.includes("barcelone") || normName.includes("bnet") || normName.includes("jaures") || normName.includes("jaurès") || normName.includes("lafayette") || normName.includes("marsa") ||
                       normName.includes("bizerte") || normName.includes("ariana") || normName.includes("bardo") || normName.includes("lac") || normName.includes("manar") || normName.includes("mnihla") || normName.includes("enasr") || normName.includes("menzah") || normName.includes("kram") || normName.includes("soukra") ||
                       normName.includes("ben arous") || normName.includes("mourouj") || normName.includes("hammam lif") || normName.includes("fouchana") || normName.includes("rades") || normName.includes("radès") || normName.includes("megrine") || normName.includes("mégrine") || normName.includes("ezzahra") ||
                       normName.includes("sousse") || normName.includes("monastir") || normName.includes("kairouan") || normName.includes("moknine") || normName.includes("jemmel") || normName.includes("msaken") || normName.includes("m'saken") ||
                       normName.includes("sfax") || normName.includes("mahdia") || normName.includes("gabes") || normName.includes("gabès") || normName.includes("chebba") || normName.includes("boumerdes") || normName.includes("boumerdès") || normName.includes("el-jem") || normName.includes("hamma") ||
                       normName.includes("nabeul") || normName.includes("kelibia") || normName.includes("kélibia") || normName.includes("hammamet") || normName.includes("soliman") || normName.includes("zaghouan") ||
                       normName.includes("beja") || normName.includes("béja") || normName.includes("kef") || normName.includes("siliana") || normName.includes("jendouba") || normName.includes("testour") || normName.includes("mjez") || normName.includes("kasserine") || normName.includes("feriana") || normName.includes("ghardimaou") || normName.includes("bousselem") ||
                       normName.includes("djerba") || normName.includes("gafsa") || normName.includes("zarzis") || normName.includes("tataouine") || normName.includes("kebili") || normName.includes("kébili") || normName.includes("tozeur") || normName.includes("medenine") || normName.includes("médenine") || normName.includes("gerdane");

    if (hasKeyword) {
      return getAgencyGeography(code, finalName);
    }

    // Default to "Non affecté" if no explicit geography or name match exists
    return { delegation: "Non affecté", gouvernorat: "Non affecté" };
  }, [geographyOverrides, resolveAgencyInfo]);

  const [delegationSearch, setDelegationSearch] = useState("");
  const [delegationSortField, setDelegationSortField] = useState<"name" | "agencyCount" | "total" | "existing" | "missing" | "pctExisting">("pctExisting");
  const [delegationSortDirection, setDelegationSortDirection] = useState<"asc" | "desc">("asc");

  const [historyDelegationSearch, setHistoryDelegationSearch] = useState("");
  const [historyDelegationSortField, setHistoryDelegationSortField] = useState<"name" | "agencyCount" | "total" | "existing" | "missing" | "pctExisting">("pctExisting");
  const [historyDelegationSortDirection, setHistoryDelegationSortDirection] = useState<"asc" | "desc">("asc");

  // Similarities states (Active reconciliation)
  const [similarSelectedAgency, setSimilarSelectedAgency] = useState<string>("ALL");
  const [similarSearchQuery, setSimilarSearchQuery] = useState<string>("");
  const [similarCurrentPage, setSimilarCurrentPage] = useState<number>(1);
  const [similarPageSize, setSimilarPageSize] = useState<number>(15);
  const [similarSortField, setSimilarSortField] = useState<string>("");
  const [similarSortDirection, setSimilarSortDirection] = useState<"asc" | "desc">("asc");

  // Similarities states (History report)
  const [historySimilarSelectedAgency, setHistorySimilarSelectedAgency] = useState<string>("ALL");
  const [historySimilarSearchQuery, setHistorySimilarSearchQuery] = useState<string>("");
  const [historySimilarCurrentPage, setHistorySimilarCurrentPage] = useState<number>(1);
  const [historySimilarPageSize, setHistorySimilarPageSize] = useState<number>(15);
  const [historySimilarSortField, setHistorySimilarSortField] = useState<string>("");
  const [historySimilarSortDirection, setHistorySimilarSortDirection] = useState<"asc" | "desc">("asc");

  // Column visibility states (Active compare and history)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [showColumnDropdown, setShowColumnDropdown] = useState<boolean>(false);
  const [historyVisibleColumns, setHistoryVisibleColumns] = useState<string[]>([]);
  const [showHistoryColumnDropdown, setShowHistoryColumnDropdown] = useState<boolean>(false);

  // Sampling / Checklist creation states
  const [samplingAgency, setSamplingAgency] = useState<string>("");
  const [isSamplingModalOpen, setIsSamplingModalOpen] = useState(false);
  const [samplingStep, setSamplingStep] = useState<1 | 2>(1); // Step 1: selection, Step 2: configuration
  const [samplingSearchQuery, setSamplingSearchQuery] = useState("");
  const [selectedSampleIds, setSelectedSampleIds] = useState<Record<string, boolean>>({}); // clientId -> boolean
  const [rowEntityTypes, setRowEntityTypes] = useState<Record<string, "Personne Physique" | "Association (OBNL)" | "Personne Morale">>({});
  const [configEntityType, setConfigEntityType] = useState<"Personne Physique" | "Association (OBNL)" | "Personne Morale">("Personne Physique");
  const [configCheckData, setConfigCheckData] = useState(true);
  const [configCheckDocs, setConfigCheckDocs] = useState(true);
  const [isSavingSample, setIsSavingSample] = useState(false);

  const getModalColumns = useCallback(() => {
    if (!selectedHistoryReport || !selectedHistoryReport.columnsNS) {
      return { idCol: "", adherentCol: "", nomClientCol: "", otherCols: [] };
    }
    const cols = selectedHistoryReport.columnsNS as string[];
    const idCol = selectedHistoryReport.mapping?.nsId || "";
    const agenceCol = selectedHistoryReport.mapping?.nsAgence || "";
    
    // Find Num adherent (N_CLIENT or NUM_CLIENT)
    const adherentCol = cols.find(c => {
      const norm = c.toLowerCase();
      return norm === "n_client" || norm === "num_client" || norm === "nclient" || norm === "adherent" || norm.includes("adher") || norm === "n° client";
    }) || "";
    
    // Find Nom client (NOM_CLIENT or NOM)
    const nomClientCol = cols.find(c => {
      const norm = c.toLowerCase();
      return norm === "nom_client" || norm === "nom client" || norm === "nomclient" || norm === "client_name" || norm === "nom" || norm === "nom_prenom" || norm === "nom & prenom";
    }) || cols.find(c => {
      const norm = c.toLowerCase();
      return /nom|name|raison/i.test(norm) && !/num|n_|n°/i.test(norm);
    }) || "";
    
    const otherCols = cols.filter(c => c !== idCol && c !== agenceCol && c !== adherentCol && c !== nomClientCol);
    
    return { idCol, adherentCol, nomClientCol, otherCols };
  }, [selectedHistoryReport]);

  const openSamplingModal = (agencyCode: string) => {
    setSamplingAgency(agencyCode);
    setSamplingStep(1);
    setSamplingSearchQuery("");
    setSelectedSampleIds({});
    
    // Auto-detect and populate default entity type for each row in this agency
    if (selectedHistoryReport) {
      const agencyCol = selectedHistoryReport.mapping?.nsAgence;
      const idCol = selectedHistoryReport.mapping?.nsId || "";
      const isVie = selectedHistoryReport.reconciliationType === "VIE";
      if (agencyCol && idCol) {
        const rows = (selectedHistoryReport.similarRows || []).filter((row: any) => {
          const code = getRowAgencyCode(row, agencyCol, isVie);
          return code.replace(/^0+(?!$)/, '') === agencyCode.replace(/^0+(?!$)/, '');
        });
        
        const initialTypes: Record<string, "Personne Physique" | "Association (OBNL)" | "Personne Morale"> = {};
        rows.forEach((row: any) => {
          const idVal = String(row[idCol] || "");
          if (idVal) {
            const autoType = detectRowEntityType(row, idCol);
            if (autoType === "Association (OBNL)") {
              initialTypes[idVal] = "Association (OBNL)";
            } else if (autoType === "Personne Morale") {
              initialTypes[idVal] = "Personne Morale";
            } else {
              initialTypes[idVal] = "Personne Physique"; // Default guess
            }
          }
        });
        setRowEntityTypes(initialTypes);
      }
    }
    
    setConfigEntityType("Personne Physique");
    setConfigCheckData(true);
    setConfigCheckDocs(true);
    setIsSamplingModalOpen(true);
  };

  const getAgencySimilarRows = useCallback(() => {
    if (!selectedHistoryReport || !samplingAgency) return [];
    const agencyCol = selectedHistoryReport.mapping?.nsAgence;
    if (!agencyCol) return [];
    const isVie = selectedHistoryReport.reconciliationType === "VIE";
    
    return (selectedHistoryReport.similarRows || []).filter((row: any) => {
      const code = getRowAgencyCode(row, agencyCol, isVie);
      return code.replace(/^0+(?!$)/, '') === samplingAgency.replace(/^0+(?!$)/, '');
    });
  }, [selectedHistoryReport, samplingAgency]);

  const filteredAgencySimilarRows = useMemo(() => {
    const rows = getAgencySimilarRows();
    if (!samplingSearchQuery.trim() || !selectedHistoryReport) return rows;
    
    const query = samplingSearchQuery.toLowerCase().trim();
    const { idCol, nomClientCol } = getModalColumns();
    
    return rows.filter((row: any) => {
      const idVal = String(row[idCol] || "").toLowerCase();
      const nameVal = String(row[nomClientCol] || "").toLowerCase();
      return idVal.includes(query) || nameVal.includes(query);
    });
  }, [getAgencySimilarRows, samplingSearchQuery, selectedHistoryReport, getModalColumns]);

  const saveSampleChecklist = async () => {
    if (!selectedHistoryReport || !samplingAgency) return;
    const agencyRows = getAgencySimilarRows();
    const { idCol, nomClientCol } = getModalColumns();
    
    const selectedRows = agencyRows.filter((row: any) => {
      const idVal = String(row[idCol] || "");
      return !!selectedSampleIds[idVal];
    });
    
    if (selectedRows.length === 0) {
      alert("Veuillez sélectionner au moins un dossier.");
      return;
    }
    
    setIsSavingSample(true);
    try {
      const categories: string[] = [];
      if (configCheckData) categories.push("Données");
      if (configCheckDocs) categories.push("Documents");
      
      const newItems = selectedRows.map((row: any) => {
        const clientId = String(row[idCol] || "").trim();
        const clientName = String(row[nomClientCol] || "").trim();
        const agencyInfo = resolveAgencyInfo(samplingAgency);
        const entityType = rowEntityTypes[clientId] || "Personne Physique";
        
        return {
          id: `${clientId}_${selectedHistoryReport.monthKey}`,
          clientId,
          clientName,
          agencyCode: samplingAgency,
          agencyName: agencyInfo.name,
          monthKey: selectedHistoryReport.monthKey,
          monthLabel: selectedHistoryReport.monthLabel,
          entityType: entityType,
          checkCategories: categories,
          status: "Non commencé",
          comments: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          checklist: {}
        };
      });
      
      let firestoreCount = 0;
      if (isFirebaseConfigured && db) {
        const { doc, setDoc } = await import("firebase/firestore");
        for (const item of newItems) {
          try {
            await setDoc(doc(db, "controleSuivi", item.id), item);
            firestoreCount++;
          } catch (err) {
            console.error("Firestore save error for doc: ", item.id, err);
          }
        }
      }
      
      const localKey = "compliance_controle_suivi";
      const existing = localStorage.getItem(localKey);
      const list = existing ? JSON.parse(existing) : [];
      const updatedList = [...list];
      
      for (const item of newItems) {
        const idx = updatedList.findIndex(x => x.id === item.id);
        if (idx > -1) {
          updatedList[idx] = item;
        } else {
          updatedList.push(item);
        }
      }
      localStorage.setItem(localKey, JSON.stringify(updatedList));
      
      if (user) {
        logAction({
          actionType: "CREATE",
          description: `Échantillonnage de ${newItems.length} dossier(s) pour contrôle (Agence: ${samplingAgency})`,
          details: {
            agencyCode: samplingAgency,
            monthKey: selectedHistoryReport.monthKey,
            count: newItems.length,
            categories
          },
          targetId: selectedHistoryReport.monthKey,
          userEmail: user.email || user.authEmail || ""
        });
      }
      
      alert(`Échantillonnage réussi !\n${newItems.length} fiches de contrôle créées et sauvegardées (Cloud: ${firestoreCount}/${newItems.length}).`);
      setIsSamplingModalOpen(false);
    } catch (error: any) {
      alert("Erreur lors de la sauvegarde de l'échantillon : " + error.message);
    } finally {
      setIsSavingSample(false);
    }
  };

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
  const handleFileChange = async (role: "regtools" | "ns" | "vie", file: File) => {
    setIsParsing(prev => ({ ...prev, [role]: true }));
    try {
      const result = await parseFile(file);
      
      setFiles(prev => ({ ...prev, [role]: file }));

      if (role === "vie") {
        const processed = processVieData(result.data, result.columns);
        setData(prev => ({ ...prev, vie: processed.filteredData }));
        setColumns(prev => ({ ...prev, vie: result.columns }));
        setDetectedMonthKey(processed.detectedMonthKey);
        setDetectedMonthLabel(processed.detectedMonthLabel);

        // Auto mappings for VIE
        setMapping(prev => ({
          ...prev,
          vieId: processed.detectedMappings.idCol,
          vieAgence: processed.detectedMappings.agenceCol
        }));
        setVisibleColumns(result.columns.slice(0, 6));
      } else if (role === "ns") {
        setData(prev => ({ ...prev, ns: result.data }));
        setColumns(prev => ({ ...prev, ns: result.columns }));

        // Auto-detect mappings for NS
        const detectedId = autoDetectCol(result.columns, ['identifiant', 'id', 'identifier', 'code', 'numéro', 'num', 'ref', 'reference', 'matricule']);
        const detectedAgence = autoDetectCol(result.columns, ['agence', 'agency', 'code agence', 'code_agence', 'structure', 'bureau', 'succursale', 'agenc']);
        setMapping(prev => ({ ...prev, nsId: detectedId, nsAgence: detectedAgence }));
        setVisibleColumns(result.columns.slice(0, 6));
      } else {
        // regtools
        setData(prev => ({ ...prev, regtools: result.data }));
        setColumns(prev => ({ ...prev, regtools: result.columns }));

        // Auto-detect mappings for RegTools
        const detected = autoDetectCol(result.columns, ['identifiant', 'id', 'identifier', 'code', 'numéro', 'num', 'ref', 'reference', 'matricule']);
        setMapping(prev => ({ ...prev, regtoolsId: detected }));
      }
      
      setComparisonDone(false);
    } catch (error: any) {
      alert(`Erreur d'analyse pour ${file.name} :\n${error.message}`);
    } finally {
      setIsParsing(prev => ({ ...prev, [role]: false }));
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent, role: "regtools" | "ns" | "vie") => {
    e.preventDefault();
    setDragOverRole(role);
  };

  const handleDragLeave = () => {
    setDragOverRole(null);
  };

  const handleDrop = (e: React.DragEvent, role: "regtools" | "ns" | "vie") => {
    e.preventDefault();
    setDragOverRole(null);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileChange(role, file);
    }
  };

  // Run Comparison
  const handleCompare = () => {
    if (!data.regtools || (!data.ns && !data.vie)) return;

    setIsComparing(true);
    
    setTimeout(() => {
      try {
        const { regtoolsId, nsId, nsAgence, vieId, vieAgence } = mapping;
        if (!regtoolsId) {
          throw new Error("Veuillez configurer la colonne d'identifiant pour RegTools.");
        }
        if (data.ns && (!nsId || !nsAgence)) {
          throw new Error("Veuillez configurer les colonnes pour le fichier Non-Vie (NS).");
        }
        if (data.vie && (!vieId || !vieAgence)) {
          throw new Error("Veuillez configurer les colonnes pour le fichier Assurance VIE.");
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

        // 2. Scan and Compare
        const missing: any[] = [];
        const similarities: any[] = [];
        const agenciesSet = new Set<string>();

        // Scan NS
        if (data.ns && nsId && nsAgence) {
          for (let i = 0; i < data.ns.length; i++) {
            const row = { ...data.ns[i] };
            row.__sourcePortfolio = "NS";
            const key = normalizeKey(row[nsId]);
            
            const agenceCode = getRowAgencyCode(row, nsAgence, false);
            if (agenceCode !== "") {
              agenciesSet.add(agenceCode);
            }

            if (key === "" || !regToolsSet.has(key)) {
              missing.push(row);
            } else {
              similarities.push(row);
            }
          }
        }

        // Scan VIE
        if (data.vie && vieId && vieAgence) {
          for (let i = 0; i < data.vie.length; i++) {
            const row = { ...data.vie[i] };
            row.__sourcePortfolio = "VIE";
            const key = normalizeKey(row[vieId]);
            
            const agenceCode = getRowAgencyCode(row, vieAgence, true);
            if (agenceCode !== "") {
              agenciesSet.add(agenceCode);
            }

            if (key === "" || !regToolsSet.has(key)) {
              missing.push(row);
            } else {
              similarities.push(row);
            }
          }
        }

        setMissingRows(missing);
        setSimilarRows(similarities);
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
      // Portfolio Filter
      if (portfolioFilter !== "ALL" && row.__sourcePortfolio !== portfolioFilter) {
        return false;
      }

      // Agency Filter
      let matchAgency = true;
      if (selectedAgency !== "ALL") {
        const isVieRow = row.__sourcePortfolio === "VIE";
        const agencyCol = isVieRow ? mapping.vieAgence : mapping.nsAgence;
        const agencyCode = getRowAgencyCode(row, agencyCol, isVieRow);
        matchAgency = agencyCode === selectedAgency;
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
  }, [missingRows, comparisonDone, selectedAgency, searchQuery, mapping.nsAgence, mapping.vieAgence, portfolioFilter]);

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

  const exportExcel = () => {
    if (filteredRows.length === 0) return;

    try {
      const agenceStr = selectedAgency === "ALL" ? "Toutes les agences" : selectedAgency;
      const fileLabel = portfolioFilter === "ALL" ? "NS_VIE" : portfolioFilter;

      const { headers: exportHeaders, mapRow } = getExportHeadersAndRowMapper(
        portfolioFilter,
        columns.ns || [],
        columns.vie || []
      );

      const exportData = filteredRows.map(row => mapRow(row));

      const sheetAOA = [
        ["CONSIGNE : Veuillez créer des fiches KYC pour ces clients"],
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
        { s: { r: 0, c: 0 }, e: { r: 0, c: exportHeaders.length - 1 } }
      ];

      // Row Heights
      ws["!rows"] = [
        { hpt: 20 },
        { hpt: 15 }
      ];

      // Column widths Auto-Fit
      const colWidths = exportHeaders.map((header, colIdx) => {
        let maxLen = header.length;
        for (let rIdx = 2; rIdx < sheetAOA.length; rIdx++) {
          const val = sheetAOA[rIdx][colIdx];
          if (val !== undefined && val !== null) {
            maxLen = Math.max(maxLen, String(val).length);
          }
        }
        return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
      });
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Manquants");
      XLSX.writeFile(wb, `${fileLabel}_manquants_RegTools_Agence_${agenceStr}.xlsx`);
    } catch (error: any) {
      alert("Erreur lors de l'export Excel : " + error.message);
    }
  };

  const exportSimilarExcel = () => {
    if (filteredSimilarRows.length === 0) return;

    try {
      const agenceStr = similarSelectedAgency === "ALL" ? "Toutes les agences" : similarSelectedAgency;
      const currentDate = new Date().toLocaleDateString("fr-FR");
      
      const fileLabel = portfolioFilter === "ALL" ? "NS_VIE" : portfolioFilter;

      let exportHeaders: string[] = [];
      if (portfolioFilter === "NS") {
        exportHeaders = [...columns.ns];
      } else if (portfolioFilter === "VIE") {
        exportHeaders = [...columns.vie];
      } else {
        const union = new Set([...columns.ns, ...columns.vie]);
        exportHeaders = ["Portefeuille", ...Array.from(union)];
      }

      const exportData = filteredSimilarRows.map(row => {
        const newRow: any = {};
        const isRowVie = row.__sourcePortfolio === "VIE";
        exportHeaders.forEach(h => {
          if (h === "Portefeuille") {
            newRow[h] = row.__sourcePortfolio || (isRowVie ? "VIE" : "NS");
          } else {
            newRow[h] = row[h] !== undefined && row[h] !== null ? formatExcelValue(h, row[h]) : "";
          }
        });
        return newRow;
      });

      const sheetAOA = [
        [`RAPPORT DE RAPPROCHEMENT - CLIENTS SIMILAIRES (CONFORMES REGTOOLS) (${fileLabel === "NS_VIE" ? "NS + VIE" : fileLabel})`],
        ["INFORMATION : Ces clients existent de part et d'autre (KYC conformes)"],
        [`Filtre Agence : ${agenceStr} | Date d'export : ${currentDate} | Lignes : ${exportData.length}`],
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

      XLSX.utils.book_append_sheet(wb, ws, "Similitudes");
      XLSX.writeFile(wb, `${fileLabel}_similitudes_RegTools_Agence_${agenceStr}.xlsx`);
    } catch (error: any) {
      alert("Erreur lors de l'export Excel des similitudes : " + error.message);
    }
  };

  // Export a single agency's discrepancy details
  const exportSingleAgencyExcel = (agencyCode: string, isHistory: boolean) => {
    try {
      const agencyInfo = resolveAgencyInfo(agencyCode);
      const currentPortfolioFilter = isHistory ? historyPortfolioFilter : portfolioFilter;
      const fileLabel = currentPortfolioFilter === "ALL" ? "NS_VIE" : currentPortfolioFilter;
      
      const sourceRows = isHistory 
        ? (selectedHistoryReport?.missingRows || []) 
        : missingRows;

      const nsCols = isHistory ? (selectedHistoryReport?.columnsNS || []) : (columns.ns || []);
      const vieCols = isHistory ? (selectedHistoryReport?.columnsVIE || []) : (columns.vie || []);

      const rowsToExport = sourceRows.filter((row: any) => {
        const rowPortfolio = row.__sourcePortfolio || (isHistory ? (selectedHistoryReport?.reconciliationType === "VIE" ? "VIE" : "NS") : (reconciliationType === "VIE" ? "VIE" : "NS"));
        
        // Filter by portfolio selection
        if (currentPortfolioFilter !== "ALL" && rowPortfolio !== currentPortfolioFilter) {
          return false;
        }

        const isVieRow = rowPortfolio === "VIE";
        const agencyCol = isVieRow ? (isHistory ? selectedHistoryReport?.mapping?.vieAgence : mapping.vieAgence) : (isHistory ? selectedHistoryReport?.mapping?.nsAgence : mapping.nsAgence);
        
        if (!agencyCol) return false;
        const code = getRowAgencyCode(row, agencyCol, isVieRow);
        return code.replace(/^0+(?!$)/, '') === agencyCode.replace(/^0+(?!$)/, '');
      });

      if (rowsToExport.length === 0) {
        alert(`Aucun écart trouvé pour l'agence ${agencyCode} (${agencyInfo.name}).`);
        return;
      }

      const { headers: exportHeaders, mapRow } = getExportHeadersAndRowMapper(
        currentPortfolioFilter,
        nsCols,
        vieCols
      );

      const exportData = rowsToExport.map((row: any) => mapRow(row));

      const sheetAOA = [
        [`Nom Agence : ${agencyInfo.name} | Type : ${agencyInfo.type}`],
        ["CONSIGNE : Veuillez créer des fiches KYC pour ces clients"],
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
        { s: { r: 1, c: 0 }, e: { r: 1, c: exportHeaders.length - 1 } }
      ];

      ws["!rows"] = [
        { hpt: 20 },
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

      XLSX.utils.book_append_sheet(wb, ws, "Manquants");
      XLSX.writeFile(wb, `${fileLabel}_manquants_RegTools_Agence_${agencyCode}.xlsx`);
    } catch (error: any) {
      alert("Erreur lors de l'export Excel par agence : " + error.message);
    }
  };

  const exportSingleAgencySimilarExcel = (agencyCode: string, isHistory: boolean) => {
    try {
      const agencyInfo = resolveAgencyInfo(agencyCode);
      const currentDate = new Date().toLocaleDateString("fr-FR");
      
      const currentPortfolioFilter = isHistory ? historyPortfolioFilter : portfolioFilter;
      const fileLabel = currentPortfolioFilter === "ALL" ? "NS_VIE" : currentPortfolioFilter;
      
      const sourceRows = isHistory 
        ? (selectedHistoryReport?.similarRows || []) 
        : similarRows;

      const mappingVal = isHistory 
        ? selectedHistoryReport?.mapping 
        : mapping;

      const nsCols = isHistory ? (selectedHistoryReport?.columnsNS || []) : (columns.ns || []);
      const vieCols = isHistory ? (selectedHistoryReport?.columnsVIE || []) : (columns.vie || []);

      const rowsToExport = sourceRows.filter((row: any) => {
        const rowPortfolio = row.__sourcePortfolio || (isHistory ? (selectedHistoryReport?.reconciliationType === "VIE" ? "VIE" : "NS") : (reconciliationType === "VIE" ? "VIE" : "NS"));
        
        // Filter by portfolio selection
        if (currentPortfolioFilter !== "ALL" && rowPortfolio !== currentPortfolioFilter) {
          return false;
        }

        const isVieRow = rowPortfolio === "VIE";
        const agencyCol = isVieRow ? mappingVal?.vieAgence : mappingVal?.nsAgence;
        
        if (!agencyCol) return false;
        const code = getRowAgencyCode(row, agencyCol, isVieRow);
        return code.replace(/^0+(?!$)/, '') === agencyCode.replace(/^0+(?!$)/, '');
      });

      if (rowsToExport.length === 0) {
        alert(`Aucune similitude trouvée pour l'agence ${agencyCode} (${agencyInfo.name}).`);
        return;
      }

      let exportHeaders: string[] = [];
      if (currentPortfolioFilter === "NS") {
        exportHeaders = [...nsCols];
      } else if (currentPortfolioFilter === "VIE") {
        exportHeaders = [...vieCols];
      } else {
        const union = new Set([...nsCols, ...vieCols]);
        exportHeaders = ["Portefeuille", ...Array.from(union)];
      }

      const exportData = rowsToExport.map((row: any) => {
        const newRow: any = {};
        exportHeaders.forEach(h => {
          if (h === "Portefeuille") {
            newRow[h] = row.__sourcePortfolio || (row.__sourcePortfolio === "VIE" || (row.__sourcePortfolio === undefined && (isHistory ? selectedHistoryReport?.reconciliationType === "VIE" : reconciliationType === "VIE")) ? "VIE" : "NS");
          } else {
            newRow[h] = row[h] !== undefined && row[h] !== null ? formatExcelValue(h, row[h]) : "";
          }
        });
        return newRow;
      });

      const nsFileName = isHistory ? (selectedHistoryReport?.fileNameNS || "") : (files.ns ? files.ns.name : "");
      const vieFileName = isHistory ? (selectedHistoryReport?.fileNameVIE || "") : (files.vie ? files.vie.name : "");
      
      let sourceFileStr = "";
      if (currentPortfolioFilter === "NS") {
        sourceFileStr = `Fichier NS d'origine : ${nsFileName}`;
      } else if (currentPortfolioFilter === "VIE") {
        sourceFileStr = `Fichier VIE d'origine : ${vieFileName}`;
      } else {
        sourceFileStr = `Fichiers d'origine : NS (${nsFileName || "non chargé"}) | VIE (${vieFileName || "non chargé"})`;
      }

      const sheetAOA = [
        [`RAPPORT DE RAPPROCHEMENT - CLIENTS SIMILAIRES - AGENCE ${agencyCode} (${fileLabel === "NS_VIE" ? "NS + VIE" : fileLabel})`],
        [`Nom Agence : ${agencyInfo.name} | Type : ${agencyInfo.type}`],
        ["INFORMATION : Ces clients existent de part et d'autre (KYC conformes)"],
        [`${sourceFileStr} | Date d'export : ${currentDate} | Lignes : ${exportData.length}`],
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

      XLSX.utils.book_append_sheet(wb, ws, "Similitudes");
      XLSX.writeFile(wb, `${fileLabel}_similitudes_RegTools_Agence_${agencyCode}.xlsx`);
    } catch (error: any) {
      alert("Erreur lors de l'export Excel des similitudes par agence : " + error.message);
    }
  };

  // Export Agency Statistics Excel function
  const exportStatsExcel = () => {
    if (filteredAgencyStats.length === 0) return;

    try {
      const currentDate = new Date().toLocaleDateString("fr-FR");
      const isVie = reconciliationType === "VIE";
      const fileLabel = isVie ? "VIE" : "NS";

      const exportHeaders = [
        "Code Agence",
        "Nom Agence",
        "Type",
        `Total ${fileLabel}`,
        "Présentes dans RegTools (KYC Conformes)",
        "Absentes de RegTools (KYC Manquants)",
        "Taux de Présence KYC (%)",
        "Taux d'Absence KYC (%)"
      ];

      const sheetAOA = [
        [`RAPPORT DE RAPPROCHEMENT - STATISTIQUES PAR AGENCE (${fileLabel})`],
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
      XLSX.writeFile(wb, `${fileLabel}_Statistiques_Par_Agence_${currentDate.replace(/\//g, "-")}.xlsx`);
    } catch (error: any) {
      alert("Erreur lors de l'export Excel des statistiques : " + error.message);
    }
  };

  // Reset function
  const handleReset = () => {
    setFiles({ regtools: null, ns: null, vie: null });
    setData({ regtools: null, ns: null, vie: null });
    setColumns({ regtools: [], ns: [], vie: [] });
    setMapping({ regtoolsId: "", nsId: "", nsAgence: "", vieId: "", vieAgence: "" });
    setMissingRows([]);
    setSimilarRows([]);
    setAgenciesList([]);
    setComparisonDone(false);
    setSelectedAgency("ALL");
    setSearchQuery("");
    setActiveTab("list");
    setStatsSearchQuery("");
    setStatsSortField("agence");
    setStatsSortDirection("asc");
    setPortfolioFilter("ALL");
    setDetectedMonthKey("");
    setDetectedMonthLabel("");
    
    // Reset filters and sort
    setStatsTypeFilter("ALL");
    setStatsDelegationFilter("ALL");
    setDetailsSortField("");
    setDetailsSortDirection("asc");

    // Reset similarities states
    setSimilarSelectedAgency("ALL");
    setSimilarSearchQuery("");
    setSimilarCurrentPage(1);
    setSimilarPageSize(15);
    setSimilarSortField("");
    setSimilarSortDirection("asc");
  };

  // Calculation parameters
  // Calculation parameters
  const matchRate = useMemo(() => {
    let totalLen = 0;
    if (data.ns) totalLen += data.ns.length;
    if (data.vie) totalLen += data.vie.length;
    if (totalLen === 0 || !comparisonDone) return 0;
    const foundCount = totalLen - missingRows.length;
    return parseFloat(((foundCount / totalLen) * 100).toFixed(2));
  }, [data.ns, data.vie, missingRows, comparisonDone]);

  // Apply filters on the similar rows
  const filteredSimilarRows = useMemo(() => {
    if (!comparisonDone) return [];
    
    return similarRows.filter(row => {
      // Portfolio Filter
      if (portfolioFilter !== "ALL" && row.__sourcePortfolio !== portfolioFilter) {
        return false;
      }

      // Agency Filter
      let matchAgency = true;
      if (similarSelectedAgency !== "ALL") {
        const isVieRow = row.__sourcePortfolio === "VIE";
        const agencyCol = isVieRow ? mapping.vieAgence : mapping.nsAgence;
        const agencyCode = getRowAgencyCode(row, agencyCol, isVieRow);
        matchAgency = agencyCode === similarSelectedAgency;
      }

      // Search Filter
      let matchSearch = true;
      if (similarSearchQuery.trim() !== "") {
        const q = similarSearchQuery.toLowerCase();
        matchSearch = Object.values(row).some(val => 
          val !== undefined && val !== null && String(val).toLowerCase().includes(q)
        );
      }

      return matchAgency && matchSearch;
    });
  }, [similarRows, comparisonDone, similarSelectedAgency, similarSearchQuery, mapping.nsAgence, mapping.vieAgence, portfolioFilter]);

  // Sort the filtered similar rows
  const sortedSimilarRows = useMemo(() => {
    if (!similarSortField) return filteredSimilarRows;
    const items = [...filteredSimilarRows];
    items.sort((a, b) => {
      const valA = a[similarSortField];
      const valB = b[similarSortField];
      
      if (valA === undefined || valA === null) return similarSortDirection === "asc" ? 1 : -1;
      if (valB === undefined || valB === null) return similarSortDirection === "asc" ? -1 : 1;
      
      const strA = String(valA).trim();
      const strB = String(valB).trim();
      
      // Check if numeric
      const numA = Number(strA);
      const numB = Number(strB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return similarSortDirection === "asc" ? numA - numB : numB - numA;
      }
      
      return similarSortDirection === "asc"
        ? strA.localeCompare(strB, undefined, { numeric: true, sensitivity: "base" })
        : strB.localeCompare(strA, undefined, { numeric: true, sensitivity: "base" });
    });
    return items;
  }, [filteredSimilarRows, similarSortField, similarSortDirection]);

  // Paginated similar rows
  const paginatedSimilarRows = useMemo(() => {
    const startIndex = (similarCurrentPage - 1) * similarPageSize;
    return sortedSimilarRows.slice(startIndex, startIndex + similarPageSize);
  }, [sortedSimilarRows, similarCurrentPage, similarPageSize]);

  const totalSimilarPages = Math.ceil(filteredSimilarRows.length / similarPageSize);

  // Pagination helper range for similarities
  const similarPaginationRange = useMemo(() => {
    if (totalSimilarPages <= 6) {
      return Array.from({ length: totalSimilarPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (similarCurrentPage > 3) {
      pages.push("...");
    }
    const start = Math.max(2, similarCurrentPage - 1);
    const end = Math.min(totalSimilarPages - 1, similarCurrentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (similarCurrentPage < totalSimilarPages - 2) {
      pages.push("...");
    }
    pages.push(totalSimilarPages);
    return pages;
  }, [similarCurrentPage, totalSimilarPages]);

  // Agency statistics calculations
  const agencyStats = useMemo(() => {
    if (!comparisonDone) return [];

    const statsMap = new Map<string, { total: number; missing: number }>();

    // Determine which raw rows to include based on portfolioFilter
    const rawRows: any[] = [];
    if (portfolioFilter === "ALL" || portfolioFilter === "NS") {
      if (data.ns) {
        data.ns.forEach(row => {
          rawRows.push({ ...row, __sourcePortfolio: "NS" });
        });
      }
    }
    if (portfolioFilter === "ALL" || portfolioFilter === "VIE") {
      if (data.vie) {
        data.vie.forEach(row => {
          rawRows.push({ ...row, __sourcePortfolio: "VIE" });
        });
      }
    }

    // Count total rows per agency
    rawRows.forEach(row => {
      const isVie = row.__sourcePortfolio === "VIE";
      const agencyCol = isVie ? mapping.vieAgence : mapping.nsAgence;
      const agenceVal = row[agencyCol];
      let agenceStr = agenceVal !== undefined && agenceVal !== null ? String(agenceVal).trim() : "Non spécifié";
      if (agenceStr !== "Non spécifié") {
        agenceStr = resolveAgencyFromText(agenceStr).code;
      }
      if (!statsMap.has(agenceStr)) {
        statsMap.set(agenceStr, { total: 0, missing: 0 });
      }
      statsMap.get(agenceStr)!.total += 1;
    });

    // Count missing rows per agency
    missingRows.forEach(row => {
      if (portfolioFilter !== "ALL" && row.__sourcePortfolio !== portfolioFilter) {
        return;
      }
      const isVie = row.__sourcePortfolio === "VIE";
      const agencyCol = isVie ? mapping.vieAgence : mapping.nsAgence;
      const agenceVal = row[agencyCol];
      let agenceStr = agenceVal !== undefined && agenceVal !== null ? String(agenceVal).trim() : "Non spécifié";
      if (agenceStr !== "Non spécifié") {
        agenceStr = resolveAgencyFromText(agenceStr).code;
      }
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
  }, [data.ns, data.vie, missingRows, comparisonDone, mapping.nsAgence, mapping.vieAgence, portfolioFilter, resolveAgencyInfo]);

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

      // Delegation Filter
      let matchDelegation = true;
      if (statsDelegationFilter !== "ALL") {
        const geo = resolveAgencyGeography(stat.agence, stat.nom);
        matchDelegation = geo && geo.delegation === statsDelegationFilter;
      }
      
      // Search Filter
      let matchSearch = true;
      if (statsSearchQuery.trim() !== "") {
        const query = statsSearchQuery.toLowerCase();
        matchSearch = stat.agence.toLowerCase().includes(query) ||
          (stat.nom && stat.nom.toLowerCase().includes(query)) ||
          (stat.type && stat.type.toLowerCase().includes(query));
      }
      
      return matchType && matchDelegation && matchSearch;
    });
  }, [sortedAgencyStats, statsSearchQuery, statsTypeFilter, statsDelegationFilter, resolveAgencyGeography]);

  // Active side delegation and top 10 KYC absence stats
  const delegationStats = useMemo(() => {
    if (!comparisonDone || agencyStats.length === 0) return [];
    
    const map = new Map<string, { total: number; missing: number; agencyCount: number; agencies: any[] }>();
    const mainDelegations = ["Tunis Centre", "Tunis Nord", "Tunis Sud", "Sahel", "Sfax", "Cap Bon", "Nord ouest", "Sud", "Courtiers", "Siège", "Non affecté"];
    mainDelegations.forEach(del => {
      map.set(del, { total: 0, missing: 0, agencyCount: 0, agencies: [] });
    });

    agencyStats.forEach(stat => {
      const geo = resolveAgencyGeography(stat.agence, stat.nom);
      const delegation = geo.delegation;
      if (delegation && map.has(delegation)) {
        const item = map.get(delegation)!;
        item.total += stat.total;
        item.missing += stat.missing;
        item.agencyCount += 1;
        item.agencies.push(stat);
      }
    });

    return Array.from(map.entries()).map(([name, data]) => {
      const existing = data.total - data.missing;
      const pctExisting = data.total > 0 ? parseFloat(((existing / data.total) * 100).toFixed(2)) : 100;
      const pctMissing = data.total > 0 ? parseFloat(((data.missing / data.total) * 100).toFixed(2)) : 0;
      return {
        name,
        total: data.total,
        missing: data.missing,
        existing,
        pctExisting,
        pctMissing,
        agencyCount: data.agencyCount,
        agencies: data.agencies
      };
    });
  }, [agencyStats, comparisonDone, resolveAgencyGeography]);

  const top10AbsentKYC = useMemo(() => {
    if (!comparisonDone || agencyStats.length === 0) return [];
    
    return [...agencyStats]
      .filter(stat => {
        const typeLower = (stat.type || "").toLowerCase();
        return !typeLower.includes("courtier") && !typeLower.includes("siege") && !typeLower.includes("siège");
      })
      .sort((a, b) => b.pctMissing - a.pctMissing)
      .slice(0, 10);
  }, [agencyStats, comparisonDone]);

  const agenciesBySelectedDelegation = useMemo(() => {
    if (!selectedDelegation || agencyStats.length === 0) return [];
    return agencyStats.filter(stat => {
      const geo = resolveAgencyGeography(stat.agence, stat.nom);
      return geo.delegation === selectedDelegation;
    });
  }, [agencyStats, selectedDelegation, resolveAgencyGeography]);

  const globalStats = useMemo(() => {
    if (!comparisonDone || (!data.ns && !data.vie)) return null;
    const nsTotal = data.ns ? data.ns.length : 0;
    const vieTotal = data.vie ? data.vie.length : 0;
    const total = nsTotal + vieTotal;
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
  }, [data.ns, data.vie, missingRows, comparisonDone]);

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

  // Helper to fetch details for a single report key
  const fetchSingleFullReportData = async (reportMeta: any): Promise<any> => {
    let loadedReport = null;

    // 1. If it's already a full report (fetched from Firestore)
    if (reportMeta.missingRows && reportMeta.agencyStats) {
      loadedReport = { ...reportMeta };
    }

    // 2. If it's a Firestore report, try to fetch full data (in case it wasn't preloaded)
    if (!loadedReport && isFirebaseConfigured && db) {
      try {
        const { doc, getDoc, collection, getDocs } = await import("firebase/firestore");
        const docSnap = await getDoc(doc(db, "regtoolsHistory", reportMeta.monthKey));
        if (docSnap.exists()) {
          const mainData = docSnap.data();
          
          let minifiedMissingRows: any[][] = mainData.minifiedMissingRows || [];
          let minifiedSimilarRows: any[][] = mainData.minifiedSimilarRows || [];

          if (mainData.hasSubCollectionDetails) {
            const querySnapshot = await getDocs(collection(db, "regtoolsHistory", reportMeta.monthKey, "details"));
            
            const missingChunksList: { index: number; rows: any[][] }[] = [];
            const similarChunksList: { index: number; rows: any[][] }[] = [];
            
            querySnapshot.forEach((chunkDoc) => {
              const chunkData = chunkDoc.data();
              let chunkRows: any[][] = [];
              if (typeof chunkData.rows === "string") {
                try {
                  chunkRows = JSON.parse(chunkData.rows);
                } catch (e) {
                  console.error("Erreur de parsing JSON pour chunk rows:", e);
                }
              } else if (Array.isArray(chunkData.rows)) {
                chunkRows = chunkData.rows;
              }

              if (chunkData.type === "missing") {
                missingChunksList.push({ index: chunkData.index, rows: chunkRows || [] });
              } else if (chunkData.type === "similar") {
                similarChunksList.push({ index: chunkData.index, rows: chunkRows || [] });
              }
            });
            
            // Sort chunks by index
            missingChunksList.sort((a, b) => a.index - b.index);
            similarChunksList.sort((a, b) => a.index - b.index);
            
            minifiedMissingRows = [];
            minifiedSimilarRows = [];
            
            missingChunksList.forEach(chunk => minifiedMissingRows.push(...chunk.rows));
            similarChunksList.forEach(chunk => minifiedSimilarRows.push(...chunk.rows));
          }

          loadedReport = {
            id: docSnap.id,
            ...mainData,
            minifiedMissingRows,
            minifiedSimilarRows
          };
        }
      } catch (err) {
        console.error("Erreur lors du chargement complet Firestore :", err);
      }
    }

    // 3. Fallback to localStorage (or merge rows if Firestore report metadata exists but details are missing)
    const localReportJSON = localStorage.getItem(`regtools_report_${reportMeta.monthKey}`);
    if (localReportJSON) {
      try {
        const localReport = JSON.parse(localReportJSON);
        if (loadedReport) {
          // Restore details from local storage if Firestore has empty details
          if ((!loadedReport.missingRows || loadedReport.missingRows.length === 0) && localReport.missingRows && localReport.missingRows.length > 0) {
            loadedReport.missingRows = localReport.missingRows;
          }
          if ((!loadedReport.similarRows || loadedReport.similarRows.length === 0) && localReport.similarRows && localReport.similarRows.length > 0) {
            loadedReport.similarRows = localReport.similarRows;
          }
          if ((!loadedReport.minifiedMissingRows || loadedReport.minifiedMissingRows.length === 0) && localReport.minifiedMissingRows && localReport.minifiedMissingRows.length > 0) {
            loadedReport.minifiedMissingRows = localReport.minifiedMissingRows;
          }
          if ((!loadedReport.minifiedSimilarRows || loadedReport.minifiedSimilarRows.length === 0) && localReport.minifiedSimilarRows && localReport.minifiedSimilarRows.length > 0) {
            loadedReport.minifiedSimilarRows = localReport.minifiedSimilarRows;
          }
        } else {
          loadedReport = localReport;
        }
      } catch (e) {
        console.error("Erreur lors de la fusion du rapport local :", e);
      }
    }

    if (loadedReport) {
      // Restore minified rows if present
      const columnsNS = loadedReport.columnsNS || [];
      if (loadedReport.minifiedMissingRows && (!loadedReport.missingRows || loadedReport.missingRows.length === 0)) {
        loadedReport.missingRows = unminifyRows(loadedReport.minifiedMissingRows, columnsNS);
      }
      if (loadedReport.minifiedSimilarRows && (!loadedReport.similarRows || loadedReport.similarRows.length === 0)) {
        loadedReport.similarRows = unminifyRows(loadedReport.minifiedSimilarRows, columnsNS);
      }
      return loadedReport;
    }
    return null;
  };

  // Fetch full report from local storage if loading a local-only one
  const handleLoadReport = async (report: any) => {
    setIsLoadingHistory(true);
    try {
      const baseKey = report.monthKey.substring(0, 6);
      const nsMeta = savedReports.find(r => r.monthKey === `${baseKey}_NS` || (r.monthKey === baseKey && (r.reconciliationType || "NS") === "NS"));
      const vieMeta = savedReports.find(r => r.monthKey === `${baseKey}_VIE`);

      let loadedReport: any = null;

      if (nsMeta && vieMeta) {
        // Load both reports and merge them
        const [nsReport, vieReport] = await Promise.all([
          fetchSingleFullReportData(nsMeta),
          fetchSingleFullReportData(vieMeta)
        ]);

        if (nsReport || vieReport) {
          const mergedReport: any = {
            monthKey: baseKey,
            monthLabel: nsReport?.monthLabel || vieReport?.monthLabel || report.monthLabel,
            savedAt: nsReport?.savedAt || vieReport?.savedAt || report.savedAt,
            fileNameNS: nsReport?.fileNameNS || "",
            fileNameVIE: vieReport?.fileNameNS || "",
            fileNameRegtools: nsReport?.fileNameRegtools || vieReport?.fileNameRegtools || "",
            reconciliationType: "BOTH",
            mapping: {
              nsId: nsReport?.mapping?.nsId || "",
              nsAgence: nsReport?.mapping?.nsAgence || "",
              vieId: vieReport?.mapping?.vieId || "",
              vieAgence: vieReport?.mapping?.vieAgence || "",
              regtoolsId: nsReport?.mapping?.regtoolsId || vieReport?.mapping?.regtoolsId || ""
            },
            columnsNS: nsReport?.columnsNS || [],
            columnsVIE: vieReport?.columnsNS || [],
            missingRows: [],
            similarRows: [],
            nsGlobalStats: nsReport?.globalStats || null,
            vieGlobalStats: vieReport?.globalStats || null,
            nsAgencyStats: nsReport?.agencyStats || [],
            vieAgencyStats: vieReport?.agencyStats || []
          };

          if (nsReport) {
            const rows = (nsReport.missingRows || []).map((r: any) => ({ ...r, __sourcePortfolio: "NS" }));
            mergedReport.missingRows.push(...rows);
            const simRows = (nsReport.similarRows || []).map((r: any) => ({ ...r, __sourcePortfolio: "NS" }));
            mergedReport.similarRows.push(...simRows);
          }
          if (vieReport) {
            const rows = (vieReport.missingRows || []).map((r: any) => ({ ...r, __sourcePortfolio: "VIE" }));
            mergedReport.missingRows.push(...rows);
            const simRows = (vieReport.similarRows || []).map((r: any) => ({ ...r, __sourcePortfolio: "VIE" }));
            mergedReport.similarRows.push(...simRows);
          }

          // Merge Agency Stats
          const statsMap = new Map<string, { total: number; missing: number; existing: number }>();
          const addStats = (stats: any[]) => {
            if (!stats) return;
            stats.forEach(stat => {
              if (!statsMap.has(stat.agence)) {
                statsMap.set(stat.agence, { total: 0, missing: 0, existing: 0 });
              }
              const entry = statsMap.get(stat.agence)!;
              entry.total += stat.total || 0;
              entry.missing += stat.missing || 0;
              entry.existing += stat.existing || 0;
            });
          };
          if (nsReport?.agencyStats) addStats(nsReport.agencyStats);
          if (vieReport?.agencyStats) addStats(vieReport.agencyStats);

          mergedReport.agencyStats = Array.from(statsMap.entries()).map(([agence, counts]) => {
            const pctMissing = counts.total > 0 ? parseFloat(((counts.missing / counts.total) * 100).toFixed(2)) : 0;
            const pctExisting = counts.total > 0 ? parseFloat(((counts.existing / counts.total) * 100).toFixed(2)) : 0;
            const agencyInfo = resolveAgencyInfo(agence);
            return {
              agence,
              nom: agencyInfo.name,
              type: agencyInfo.type,
              total: counts.total,
              missing: counts.missing,
              existing: counts.existing,
              pctMissing,
              pctExisting
            };
          });

          // Calculate overall stats
          const total = (nsReport?.globalStats?.total || 0) + (vieReport?.globalStats?.total || 0);
          const missing = mergedReport.missingRows.length;
          const existing = total - missing;
          mergedReport.globalStats = {
            total,
            missing,
            existing,
            pctExisting: total > 0 ? parseFloat(((existing / total) * 100).toFixed(2)) : 0,
            pctMissing: total > 0 ? parseFloat(((missing / total) * 100).toFixed(2)) : 0
          };

          loadedReport = mergedReport;
        }
      } else {
        loadedReport = await fetchSingleFullReportData(report);
      }

      if (loadedReport) {
        setHistoryReconciliationType(loadedReport.reconciliationType || "NS");
        setSelectedHistoryReport(loadedReport);

        let cols = loadedReport.columnsNS || [];
        if (loadedReport.reconciliationType === "BOTH") {
          const union = new Set([...(loadedReport.columnsNS || []), ...(loadedReport.columnsVIE || [])]);
          cols = Array.from(union);
        }
        setHistoryVisibleColumns(cols.slice(0, 6));
        setHistoryPortfolioFilter(loadedReport.reconciliationType === "BOTH" ? "ALL" : (loadedReport.reconciliationType || "NS"));

        // Log consultation for non-admin users
        const email = user?.email || "";
        if (email && !isAdmin(email)) {
          logAction({
            userEmail: email,
            userName: user?.name || "Utilisateur",
            action: "OTHER",
            label: "Consultation de rapport de rapprochement",
            detail: `Rapport mensuel : ${loadedReport.monthLabel}`,
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

  // Load history & geography overrides on mount
  useEffect(() => {
    loadHistory();

    // Load local storage overrides
    const saved = localStorage.getItem("regtools_geo_overrides");
    if (saved) {
      try {
        setGeographyOverrides(JSON.parse(saved));
      } catch (e) {
        console.error("Erreur lors de la lecture des surcharges locales :", e);
      }
    }

    const savedNameType = localStorage.getItem("regtools_agency_name_type_overrides");
    if (savedNameType) {
      try {
        setAgencyOverrides(JSON.parse(savedNameType));
      } catch (e) {
        console.error("Erreur lors de la lecture des surcharges de noms/types locales :", e);
      }
    }

    // Load Firestore overrides if configured
    if (isFirebaseConfigured && db) {
      const loadFirestoreOverrides = async () => {
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          const docRef = doc(db, "regtoolsSettings", "agencyOverrides");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && data.overrides) {
              setGeographyOverrides(data.overrides);
              localStorage.setItem("regtools_geo_overrides", JSON.stringify(data.overrides));
            }
          }
        } catch (err) {
          console.error("Erreur lors de la lecture des surcharges géographiques Firestore :", err);
        }
      };
      loadFirestoreOverrides();

      const loadNameTypeOverrides = async () => {
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          const docRef = doc(db, "regtoolsSettings", "agencyNameTypeOverrides");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && data.overrides) {
              setAgencyOverrides(data.overrides);
              localStorage.setItem("regtools_agency_name_type_overrides", JSON.stringify(data.overrides));
            }
          }
        } catch (err) {
          console.error("Erreur lors de la lecture des surcharges de noms/types Firestore :", err);
        }
      };
      loadNameTypeOverrides();
    }
  }, [loadHistory]);

  const handleSaveReport = async () => {
    if (!comparisonDone || (!data.ns && !data.vie)) return;

    let baseMonthKey = "";
    let monthLabel = "";

    // 1. Detect Month & Year
    if (detectedMonthKey && detectedMonthLabel) {
      baseMonthKey = detectedMonthKey;
      monthLabel = detectedMonthLabel;
    } else {
      const fileForName = files.ns || files.vie;
      if (!fileForName) return;
      const fileName = fileForName.name;

      let month = "";
      let year = "";
      let match = fileName.trim().match(/^(\d{2})(\d{4})/);
      if (!match) {
        match = fileName.trim().match(/(?:^|[^0-9])(\d{2})(\d{4})(?:[^0-9]|$)/);
      }
      if (!match) {
        const sepMatch = fileName.trim().match(/(?:^|[^0-9])(\d{2})[_-](\d{4})(?:[^0-9]|$)/);
        if (sepMatch) match = sepMatch;
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

      baseMonthKey = `${month}${year}`;
      monthLabel = `${months[monthIdx]} ${year}`;
    }

    setIsSavingReport(true);
    let firestoreError = "";
    let savedInFirestore = false;

    // Helper function to calculate agency stats per portfolio during save
    const calculateStatsForPortfolio = (type: "NS" | "VIE", rawRows: any[], missingRowsList: any[], mappingVal: any) => {
      const statsMap = new Map<string, { total: number; missing: number }>();
      const isVie = type === "VIE";
      const agencyCol = isVie ? mappingVal.vieAgence : mappingVal.nsAgence;

      rawRows.forEach(row => {
        const agenceVal = row[agencyCol];
        let agenceStr = agenceVal !== undefined && agenceVal !== null ? String(agenceVal).trim() : "Non spécifié";
        if (agenceStr !== "Non spécifié") {
          agenceStr = resolveAgencyFromText(agenceStr).code;
        }
        if (!statsMap.has(agenceStr)) {
          statsMap.set(agenceStr, { total: 0, missing: 0 });
        }
        statsMap.get(agenceStr)!.total += 1;
      });

      missingRowsList.forEach(row => {
        const agenceVal = row[agencyCol];
        let agenceStr = agenceVal !== undefined && agenceVal !== null ? String(agenceVal).trim() : "Non spécifié";
        if (agenceStr !== "Non spécifié") {
          agenceStr = resolveAgencyFromText(agenceStr).code;
        }
        if (statsMap.has(agenceStr)) {
          statsMap.get(agenceStr)!.missing += 1;
        } else {
          statsMap.set(agenceStr, { total: 0, missing: 1 });
        }
      });

      return Array.from(statsMap.entries()).map(([agence, counts]) => {
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
    };

    const saveReportForType = async (type: "NS" | "VIE", fileObj: File, rawDataList: any[], rowsMissing: any[], rowsSimilar: any[]) => {
      const targetMonthKey = `${baseMonthKey}_${type}`;
      const minifiedMissing = minifyRows(rowsMissing, columns[type.toLowerCase() as "ns" | "vie"]);
      const minifiedSimilar = minifyRows(rowsSimilar, columns[type.toLowerCase() as "ns" | "vie"]);

      const total = rawDataList.length;
      const missing = rowsMissing.length;
      const existing = total - missing;
      const pctExisting = total > 0 ? parseFloat(((existing / total) * 100).toFixed(2)) : 0;
      const pctMissing = total > 0 ? parseFloat(((missing / total) * 100).toFixed(2)) : 0;

      const pStats = calculateStatsForPortfolio(type, rawDataList, rowsMissing, mapping);
      const kpis = extractRegtoolsKPIs(data.regtools || []);

      const reportPayload = {
        monthKey: targetMonthKey,
        monthLabel,
        fileNameNS: fileObj.name,
        fileNameRegtools: files.regtools ? files.regtools.name : "",
        savedAt: new Date().toISOString(),
        globalStats: {
          total,
          missing,
          existing,
          pctExisting,
          pctMissing
        },
        agencyStats: pStats,
        minifiedMissingRows: minifiedMissing,
        minifiedSimilarRows: minifiedSimilar,
        columnsNS: columns[type.toLowerCase() as "ns" | "vie"],
        mapping: mapping,
        reconciliationType: type,
        regtoolsKPIs: kpis
      };

      // 1. Save to Firestore
      if (isFirebaseConfigured && db) {
        const { doc, setDoc, collection, getDocs, deleteDoc } = await import("firebase/firestore");
        
        // Clean up old chunks
        const oldDetailsDocs = await getDocs(collection(db, "regtoolsHistory", targetMonthKey, "details"));
        const deletePromises: Promise<any>[] = [];
        oldDetailsDocs.forEach(docSnap => {
          deletePromises.push(deleteDoc(docSnap.ref));
        });
        await Promise.all(deletePromises);

        // Save chunks
        const missingChunks = chunkArray(minifiedMissing, 1000);
        const similarChunks = chunkArray(minifiedSimilar, 1000);

        for (let i = 0; i < missingChunks.length; i++) {
          await setDoc(doc(db, "regtoolsHistory", targetMonthKey, "details", `missing_${i}`), {
            type: "missing",
            index: i,
            rows: JSON.stringify(missingChunks[i])
          });
        }

        for (let i = 0; i < similarChunks.length; i++) {
          await setDoc(doc(db, "regtoolsHistory", targetMonthKey, "details", `similar_${i}`), {
            type: "similar",
            index: i,
            rows: JSON.stringify(similarChunks[i])
          });
        }

        // Save main doc
        const firestoreMainPayload = {
          monthKey: targetMonthKey,
          monthLabel,
          fileNameNS: fileObj.name,
          fileNameRegtools: files.regtools ? files.regtools.name : "",
          savedAt: reportPayload.savedAt,
          globalStats: reportPayload.globalStats,
          agencyStats: reportPayload.agencyStats,
          columnsNS: reportPayload.columnsNS,
          mapping: reportPayload.mapping,
          hasSubCollectionDetails: true,
          reconciliationType: type,
          regtoolsKPIs: reportPayload.regtoolsKPIs
        };
        await setDoc(doc(db, "regtoolsHistory", targetMonthKey), firestoreMainPayload);
        savedInFirestore = true;
      }

      // 2. Save to LocalStorage
      localStorage.setItem(`regtools_report_${targetMonthKey}`, JSON.stringify(reportPayload));

      const localHistoryJSON = localStorage.getItem("regtools_history_list");
      let localList = localHistoryJSON ? JSON.parse(localHistoryJSON) : [];
      localList = localList.filter((r: any) => r.monthKey !== targetMonthKey);
      
      const metadata = {
        monthKey: targetMonthKey,
        monthLabel,
        fileNameNS: fileObj.name,
        fileNameRegtools: files.regtools ? files.regtools.name : "",
        savedAt: reportPayload.savedAt,
        globalStats: reportPayload.globalStats,
        reconciliationType: type,
        regtoolsKPIs: kpis
      };
      localList.push(metadata);
      localStorage.setItem("regtools_history_list", JSON.stringify(localList));
    };

    try {
      // Filter rows
      const nsMissing = missingRows.filter(r => r.__sourcePortfolio === "NS");
      const vieMissing = missingRows.filter(r => r.__sourcePortfolio === "VIE");
      const nsSimilar = similarRows.filter(r => r.__sourcePortfolio === "NS");
      const vieSimilar = similarRows.filter(r => r.__sourcePortfolio === "VIE");

      if (data.ns && files.ns) {
        await saveReportForType("NS", files.ns, data.ns, nsMissing, nsSimilar);
      }
      if (data.vie && files.vie) {
        await saveReportForType("VIE", files.vie, data.vie, vieMissing, vieSimilar);
      }
    } catch (err: any) {
      console.error("Erreur de sauvegarde :", err);
      firestoreError = err.message || "Erreur inconnue";
    }

    setIsSavingReport(false);
    if (firestoreError) {
      alert(`Erreur de sauvegarde : ${firestoreError}`);
    } else {
      alert(`Rapport pour ${monthLabel} sauvegardé avec succès ! ${savedInFirestore ? "(Base de données Cloud et locale)" : "(Stockage local uniquement)"}`);
    }
    loadHistory();
  };

  const handleDeleteReport = async (report: any) => {
    const baseKey = report.monthKey.substring(0, 6);
    if (!confirm(`Voulez-vous vraiment supprimer le rapprochement pour le mois de ${report.monthLabel} ?`)) return;

    setIsLoadingHistory(true);
    try {
      const keysToDelete = [`${baseKey}_NS`, `${baseKey}_VIE`, baseKey];

      for (const key of keysToDelete) {
        if (!savedReports.some(r => r.monthKey === key)) continue;

        if (isFirebaseConfigured && db) {
          try {
            const { doc, deleteDoc, collection, getDocs } = await import("firebase/firestore");
            
            // First delete details subcollection chunks
            const detailsDocs = await getDocs(collection(db, "regtoolsHistory", key, "details"));
            const deleteDetailsPromises = detailsDocs.docs.map(d => deleteDoc(d.ref));
            await Promise.all(deleteDetailsPromises);

            // Then delete main doc
            await deleteDoc(doc(db, "regtoolsHistory", key));
          } catch (err) {
            console.error(`Erreur de suppression Firestore pour la clé ${key} :`, err);
          }
        }

        try {
          localStorage.removeItem(`regtools_report_${key}`);
        } catch (err) {
          console.error(`Erreur de suppression locale pour la clé ${key} :`, err);
        }
      }

      // Update local history list
      try {
        const localHistoryJSON = localStorage.getItem("regtools_history_list");
        if (localHistoryJSON) {
          let localList = JSON.parse(localHistoryJSON);
          localList = localList.filter((r: any) => {
            const rBase = r.monthKey.substring(0, 6);
            return rBase !== baseKey;
          });
          localStorage.setItem("regtools_history_list", JSON.stringify(localList));
        }
      } catch (err) {
        console.error("Erreur de mise à jour de la liste locale :", err);
      }

      if (selectedHistoryReport?.monthKey.substring(0, 6) === baseKey) {
        setSelectedHistoryReport(null);
        setHistoryVisibleColumns([]);
        setShowHistoryColumnDropdown(false);
      }
      
      alert("Rapprochement supprimé avec succès.");
      await loadHistory();
    } catch (err) {
      console.error("Erreur lors de la suppression :", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Group history reports by base month key (first 6 characters, e.g. "052026")
  const groupedHistoryReports = useMemo(() => {
    const groups: Record<string, {
      baseMonthKey: string;
      monthLabel: string;
      nsReport?: any;
      vieReport?: any;
      maxSavedAt: string;
    }> = {};

    savedReports.forEach(report => {
      if (!report.monthKey) return;
      const baseKey = report.monthKey.substring(0, 6);
      const type = report.reconciliationType || "NS";

      if (!groups[baseKey]) {
        groups[baseKey] = {
          baseMonthKey: baseKey,
          monthLabel: report.monthLabel || "Inconnu",
          maxSavedAt: report.savedAt
        };
      }

      if (new Date(report.savedAt) > new Date(groups[baseKey].maxSavedAt)) {
        groups[baseKey].maxSavedAt = report.savedAt;
      }

      if (type === "VIE") {
        groups[baseKey].vieReport = report;
      } else {
        groups[baseKey].nsReport = report;
      }
    });

    return Object.values(groups).sort((a, b) => b.baseMonthKey.localeCompare(a.baseMonthKey));
  }, [savedReports]);

  // Memos for selected history report
  // Pre-resolve agency info for selected history report to ensure name/type are always present
  // Pre-resolve agency info for selected history report to ensure name/type are always present
  const resolvedHistoryAgencyStats = useMemo(() => {
    if (!selectedHistoryReport) return [];
    
    let rawStats: any[] = [];
    if (selectedHistoryReport.reconciliationType === "BOTH") {
      if (historyPortfolioFilter === "NS") {
        rawStats = selectedHistoryReport.nsAgencyStats || [];
      } else if (historyPortfolioFilter === "VIE") {
        rawStats = selectedHistoryReport.vieAgencyStats || [];
      } else {
        rawStats = selectedHistoryReport.agencyStats || [];
      }
    } else {
      rawStats = selectedHistoryReport.agencyStats || [];
    }

    // Merge duplicate stats that resolve to the same code (e.g. 108 and BÃ©ja)
    const mergedMap = new Map<string, any>();
    rawStats.forEach((stat: any) => {
      const info = resolveAgencyInfo(stat.agence);
      const code = info.code || stat.agence;
      if (!mergedMap.has(code)) {
        mergedMap.set(code, {
          ...stat,
          agence: code,
          nom: info.name,
          type: info.type,
          total: 0,
          existing: 0,
          missing: 0
        });
      }
      const existing = mergedMap.get(code)!;
      existing.total += (stat.total || 0);
      existing.missing += (stat.missing || 0);
      existing.existing = existing.total - existing.missing;
      existing.pctMissing = existing.total > 0 ? parseFloat(((existing.missing / existing.total) * 100).toFixed(2)) : 0;
      existing.pctExisting = existing.total > 0 ? parseFloat(((existing.existing / existing.total) * 100).toFixed(2)) : 0;
    });

    return Array.from(mergedMap.values());
  }, [selectedHistoryReport, historyPortfolioFilter, resolveAgencyInfo]);

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

      // Delegation Filter
      let matchDelegation = true;
      if (historyStatsDelegationFilter !== "ALL") {
        const geo = resolveAgencyGeography(stat.agence, stat.nom);
        matchDelegation = geo && geo.delegation === historyStatsDelegationFilter;
      }
      
      // Search Filter
      let matchSearch = true;
      if (historyStatsSearchQuery.trim() !== "") {
        const query = historyStatsSearchQuery.toLowerCase();
        matchSearch = stat.agence.toLowerCase().includes(query) ||
          (stat.nom && stat.nom.toLowerCase().includes(query)) ||
          (stat.type && stat.type.toLowerCase().includes(query));
      }
      
      return matchType && matchDelegation && matchSearch;
    });
  }, [sortedHistoryAgencyStats, historyStatsSearchQuery, historyStatsTypeFilter, historyStatsDelegationFilter, resolveAgencyGeography]);

  // History side delegation and top 10 KYC absence stats
  const historyDelegationStats = useMemo(() => {
    if (!selectedHistoryReport || resolvedHistoryAgencyStats.length === 0) return [];

    const map = new Map<string, { total: number; missing: number; agencyCount: number; agencies: any[] }>();
    const mainDelegations = ["Tunis Centre", "Tunis Nord", "Tunis Sud", "Sahel", "Sfax", "Cap Bon", "Nord ouest", "Sud", "Courtiers", "Siège", "Non affecté"];
    mainDelegations.forEach(del => {
      map.set(del, { total: 0, missing: 0, agencyCount: 0, agencies: [] });
    });

    resolvedHistoryAgencyStats.forEach((stat: any) => {
      const geo = resolveAgencyGeography(stat.agence, stat.nom);
      const delegation = geo.delegation;
      if (delegation && map.has(delegation)) {
        const item = map.get(delegation)!;
        item.total += stat.total;
        item.missing += stat.missing;
        item.agencyCount += 1;
        item.agencies.push(stat);
      }
    });

    return Array.from(map.entries()).map(([name, data]) => {
      const existing = data.total - data.missing;
      const pctExisting = data.total > 0 ? parseFloat(((existing / data.total) * 100).toFixed(2)) : 100;
      const pctMissing = data.total > 0 ? parseFloat(((data.missing / data.total) * 100).toFixed(2)) : 0;
      return {
        name,
        total: data.total,
        missing: data.missing,
        existing,
        pctExisting,
        pctMissing,
        agencyCount: data.agencyCount,
        agencies: data.agencies
      };
    });
  }, [resolvedHistoryAgencyStats, selectedHistoryReport, resolveAgencyGeography]);

  const historyTop10AbsentKYC = useMemo(() => {
    if (!selectedHistoryReport || resolvedHistoryAgencyStats.length === 0) return [];

    return [...resolvedHistoryAgencyStats]
      .filter((stat: any) => {
        const typeLower = (stat.type || "").toLowerCase();
        return !typeLower.includes("courtier") && !typeLower.includes("siege") && !typeLower.includes("siège");
      })
      .sort((a, b) => b.pctMissing - a.pctMissing)
      .slice(0, 10);
  }, [resolvedHistoryAgencyStats, selectedHistoryReport]);

  const agenciesBySelectedHistoryDelegation = useMemo(() => {
    if (!historySelectedDelegation || resolvedHistoryAgencyStats.length === 0) return [];
    return resolvedHistoryAgencyStats.filter((stat: any) => {
      const geo = resolveAgencyGeography(stat.agence, stat.nom);
      return geo.delegation === historySelectedDelegation;
    });
  }, [resolvedHistoryAgencyStats, historySelectedDelegation, resolveAgencyGeography]);

  // Save geography overrides to local & Firestore
  const saveGeographyOverrides = async (newOverrides: Record<string, { delegation: string; gouvernorat: string }>) => {
    setGeographyOverrides(newOverrides);
    localStorage.setItem("regtools_geo_overrides", JSON.stringify(newOverrides));
    
    if (isFirebaseConfigured && db) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        const docRef = doc(db, "regtoolsSettings", "agencyOverrides");
        await setDoc(docRef, { overrides: newOverrides, updatedAt: new Date().toISOString() });
        logAction("update_geography_overrides", { count: Object.keys(newOverrides).length });
      } catch (err) {
        console.error("Erreur lors de la sauvegarde sur Firestore :", err);
      }
    }
  };

  // Save name/type overrides to local & Firestore
  const saveAgencyOverrides = async (newOverrides: Record<string, { name: string; type: string }>) => {
    setAgencyOverrides(newOverrides);
    localStorage.setItem("regtools_agency_name_type_overrides", JSON.stringify(newOverrides));
    
    if (isFirebaseConfigured && db) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        const docRef = doc(db, "regtoolsSettings", "agencyNameTypeOverrides");
        await setDoc(docRef, { overrides: newOverrides, updatedAt: new Date().toISOString() });
        logAction("update_agency_name_type_overrides", { count: Object.keys(newOverrides).length });
      } catch (err) {
        console.error("Erreur lors de la sauvegarde des noms/types sur Firestore :", err);
      }
    }
  };

  // Compile all known agencies from static and loaded sources
  const allKnownAgencies = useMemo(() => {
    const list: { code: string; name: string; currentType: string; currentDelegation: string; currentGouvernorat: string }[] = [];
    
    // 1. Static agencies
    Object.entries(AGENCY_GEOGRAPHY).forEach(([code, geo]) => {
      const info = resolveAgencyInfo(code);
      const resolvedGeo = resolveAgencyGeography(code, info.name);
      list.push({
        code,
        name: info.name,
        currentType: info.type,
        currentDelegation: resolvedGeo.delegation,
        currentGouvernorat: resolvedGeo.gouvernorat
      });
    });
    
    // 2. Uploaded active/history files
    const processedCodes = new Set(list.map(item => item.code));
    const addFromStats = (stats: any[]) => {
      stats.forEach(stat => {
        const code = normalizeKey(stat.agence);
        if (code && !processedCodes.has(code)) {
          processedCodes.add(code);
          const info = resolveAgencyInfo(code);
          let finalName = info.name;
          if (info.name === `Agence ${code}` && stat.nom) {
            finalName = stat.nom;
          }
          const resolvedGeo = resolveAgencyGeography(code, finalName);
          list.push({
            code,
            name: finalName,
            currentType: info.type,
            currentDelegation: resolvedGeo.delegation,
            currentGouvernorat: resolvedGeo.gouvernorat
          });
        }
      });
    };
    
    addFromStats(agencyStats);
    addFromStats(resolvedHistoryAgencyStats);
    
    return list.sort((a, b) => a.code.localeCompare(b.code));
  }, [agencyStats, resolvedHistoryAgencyStats, resolveAgencyGeography, resolveAgencyInfo]);

  const historyAgenciesList = useMemo(() => {
    if (!selectedHistoryReport || !selectedHistoryReport.missingRows) return [];
    const mappingVal = selectedHistoryReport.mapping;
    const agenciesSet = new Set<string>();
    
    selectedHistoryReport.missingRows.forEach((row: any) => {
      const rowPortfolio = row.__sourcePortfolio || selectedHistoryReport.reconciliationType || "NS";
      const isVie = rowPortfolio === "VIE";
      const agencyCol = isVie ? mappingVal?.vieAgence : mappingVal?.nsAgence;
      if (agencyCol) {
        const agenceCode = getRowAgencyCode(row, agencyCol, isVie);
        if (agenceCode !== "") {
          agenciesSet.add(agenceCode);
        }
      }
    });
    return Array.from(agenciesSet).sort((a, b) => a.localeCompare(b));
  }, [selectedHistoryReport]);

  const filteredHistoryRows = useMemo(() => {
    if (!selectedHistoryReport) return [];
    const rows = selectedHistoryReport.missingRows || [];
    const mappingVal = selectedHistoryReport.mapping;

    return rows.filter((row: any) => {
      const rowPortfolio = row.__sourcePortfolio || selectedHistoryReport.reconciliationType || "NS";
      // Portfolio Filter
      if (historyPortfolioFilter !== "ALL" && rowPortfolio !== historyPortfolioFilter) {
        return false;
      }

      // Agency Filter
      let matchAgency = true;
      if (historySelectedAgency !== "ALL") {
        const isVieRow = rowPortfolio === "VIE";
        const agencyCol = isVieRow ? mappingVal?.vieAgence : mappingVal?.nsAgence;
        if (agencyCol) {
          const agencyCode = getRowAgencyCode(row, agencyCol, isVieRow);
          matchAgency = agencyCode === historySelectedAgency;
        }
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
  }, [selectedHistoryReport, historySearchQuery, historySelectedAgency, historyPortfolioFilter]);

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

  const historySimilarAgenciesList = useMemo(() => {
    if (!selectedHistoryReport || !selectedHistoryReport.similarRows) return [];
    const mappingVal = selectedHistoryReport.mapping;
    const agenciesSet = new Set<string>();
    selectedHistoryReport.similarRows.forEach((row: any) => {
      const rowPortfolio = row.__sourcePortfolio || selectedHistoryReport.reconciliationType || "NS";
      const isVie = rowPortfolio === "VIE";
      const agencyCol = isVie ? mappingVal?.vieAgence : mappingVal?.nsAgence;
      if (agencyCol) {
        const agenceCode = getRowAgencyCode(row, agencyCol, isVie);
        if (agenceCode !== "") {
          agenciesSet.add(agenceCode);
        }
      }
    });
    return Array.from(agenciesSet).sort((a, b) => a.localeCompare(b));
  }, [selectedHistoryReport]);

  const filteredHistorySimilarRows = useMemo(() => {
    if (!selectedHistoryReport) return [];
    const rows = selectedHistoryReport.similarRows || [];
    const mappingVal = selectedHistoryReport.mapping;

    return rows.filter((row: any) => {
      const rowPortfolio = row.__sourcePortfolio || selectedHistoryReport.reconciliationType || "NS";
      // Portfolio Filter
      if (historyPortfolioFilter !== "ALL" && rowPortfolio !== historyPortfolioFilter) {
        return false;
      }

      // Agency Filter
      let matchAgency = true;
      if (historySimilarSelectedAgency !== "ALL") {
        const isVieRow = rowPortfolio === "VIE";
        const agencyCol = isVieRow ? mappingVal?.vieAgence : mappingVal?.nsAgence;
        if (agencyCol) {
          const agencyCode = getRowAgencyCode(row, agencyCol, isVieRow);
          matchAgency = agencyCode === historySimilarSelectedAgency;
        }
      }

      // Search Filter
      let matchSearch = true;
      if (historySimilarSearchQuery.trim() !== "") {
        const query = historySimilarSearchQuery.toLowerCase();
        matchSearch = Object.values(row).some(val => 
          val !== undefined && val !== null && String(val).toLowerCase().includes(query)
        );
      }

      return matchAgency && matchSearch;
    });
  }, [selectedHistoryReport, historySimilarSearchQuery, historySimilarSelectedAgency, historyPortfolioFilter]);

  // Sort history similar rows
  const sortedHistorySimilarRows = useMemo(() => {
    if (!historySimilarSortField) return filteredHistorySimilarRows;
    const items = [...filteredHistorySimilarRows];
    items.sort((a, b) => {
      const valA = a[historySimilarSortField];
      const valB = b[historySimilarSortField];
      
      if (valA === undefined || valA === null) return historySimilarSortDirection === "asc" ? 1 : -1;
      if (valB === undefined || valB === null) return historySimilarSortDirection === "asc" ? -1 : 1;
      
      const strA = String(valA).trim();
      const strB = String(valB).trim();
      
      // Check if numeric
      const numA = Number(strA);
      const numB = Number(strB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return historySimilarSortDirection === "asc" ? numA - numB : numB - numA;
      }
      
      return historySimilarSortDirection === "asc"
        ? strA.localeCompare(strB, undefined, { numeric: true, sensitivity: "base" })
        : strB.localeCompare(strA, undefined, { numeric: true, sensitivity: "base" });
    });
    return items;
  }, [filteredHistorySimilarRows, historySimilarSortField, historySimilarSortDirection]);

  const paginatedHistorySimilarRows = useMemo(() => {
    const startIndex = (historySimilarCurrentPage - 1) * historySimilarPageSize;
    return sortedHistorySimilarRows.slice(startIndex, startIndex + historySimilarPageSize);
  }, [sortedHistorySimilarRows, historySimilarCurrentPage, historySimilarPageSize]);

  const totalHistorySimilarPages = Math.ceil(filteredHistorySimilarRows.length / historySimilarPageSize);

  const historySimilarPaginationRange = useMemo(() => {
    if (totalHistorySimilarPages <= 6) {
      return Array.from({ length: totalHistorySimilarPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (historySimilarCurrentPage > 3) {
      pages.push("...");
    }
    const start = Math.max(2, historySimilarCurrentPage - 1);
    const end = Math.min(totalHistorySimilarPages - 1, historySimilarCurrentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (historySimilarCurrentPage < totalHistorySimilarPages - 2) {
      pages.push("...");
    }
    pages.push(totalHistorySimilarPages);
    return pages;
  }, [historySimilarCurrentPage, totalHistorySimilarPages]);

  // Dynamic columns memos for active comparison
  const availableColumns = useMemo(() => {
    if (portfolioFilter === "NS") return columns.ns;
    if (portfolioFilter === "VIE") return columns.vie;
    const union = new Set([...columns.ns, ...columns.vie]);
    return Array.from(union);
  }, [columns.ns, columns.vie, portfolioFilter]);

  const displayedColumns = useMemo(() => {
    const baseCols = availableColumns;
    if (visibleColumns.length > 0) {
      const filtered = visibleColumns.filter(c => baseCols.includes(c));
      if (filtered.length > 0) return filtered;
    }
    return baseCols.slice(0, 8);
  }, [availableColumns, visibleColumns]);

  // Dynamic columns memos for history comparison
  const historyAvailableColumns = useMemo(() => {
    if (!selectedHistoryReport) return [];
    if (selectedHistoryReport.reconciliationType === "BOTH") {
      if (historyPortfolioFilter === "NS") return selectedHistoryReport.columnsNS || [];
      if (historyPortfolioFilter === "VIE") return selectedHistoryReport.columnsVIE || [];
      const union = new Set([...(selectedHistoryReport.columnsNS || []), ...(selectedHistoryReport.columnsVIE || [])]);
      return Array.from(union);
    }
    return selectedHistoryReport.columnsNS || [];
  }, [selectedHistoryReport, historyPortfolioFilter]);

  const historyDisplayedColumns = useMemo(() => {
    const available = historyAvailableColumns;
    if (historyVisibleColumns.length > 0) {
      const filtered = historyVisibleColumns.filter(c => available.includes(c));
      if (filtered.length > 0) return filtered;
    }
    return available.slice(0, 8);
  }, [historyAvailableColumns, historyVisibleColumns]);

  const displayedHistoryGlobalStats = useMemo(() => {
    if (!selectedHistoryReport) return null;
    if (selectedHistoryReport.reconciliationType === "BOTH") {
      if (historyPortfolioFilter === "NS") {
        return selectedHistoryReport.nsGlobalStats || null;
      } else if (historyPortfolioFilter === "VIE") {
        return selectedHistoryReport.vieGlobalStats || null;
      }
    }
    return selectedHistoryReport.globalStats || null;
  }, [selectedHistoryReport, historyPortfolioFilter]);

  const exportHistorySimilarExcel = () => {
    if (!selectedHistoryReport) return;
    if (filteredHistorySimilarRows.length === 0) return;
    try {
      const report = selectedHistoryReport;
      const fileLabel = historyPortfolioFilter === "ALL" ? "NS_VIE" : historyPortfolioFilter;
      const currentDate = new Date(report.savedAt).toLocaleDateString("fr-FR");
      
      let exportHeaders: string[] = [];
      const nsCols = report.columnsNS || [];
      const vieCols = report.columnsVIE || [];
      
      if (historyPortfolioFilter === "NS") {
        exportHeaders = [...nsCols];
      } else if (historyPortfolioFilter === "VIE") {
        exportHeaders = [...vieCols];
      } else {
        const union = new Set([...nsCols, ...vieCols]);
        exportHeaders = ["Portefeuille", ...Array.from(union)];
      }

      const exportData = filteredHistorySimilarRows.map((row: any) => {
        const newRow: any = {};
        const isRowVie = row.__sourcePortfolio === "VIE";
        exportHeaders.forEach((h: string) => {
          if (h === "Portefeuille") {
            newRow[h] = row.__sourcePortfolio || (isRowVie ? "VIE" : "NS");
          } else {
            newRow[h] = row[h] !== undefined && row[h] !== null ? formatExcelValue(h, row[h]) : "";
          }
        });
        return newRow;
      });

      const sheetAOA = [
        [`RAPPORT DE RAPPROCHEMENT HISTORIQUE - SIMILAIRES - ${report.monthLabel} (${fileLabel === "NS_VIE" ? "NS + VIE" : fileLabel})`],
        ["INFORMATION : Ces clients existent de part et d'autre (KYC conformes)"],
        [`Fichiers d'origine : NS (${report.fileNameNS || "non chargé"}) | VIE (${report.fileNameVIE || "non chargé"}) | Date d'export : ${currentDate} | Lignes : ${exportData.length}`],
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

      XLSX.utils.book_append_sheet(wb, ws, "Similitudes");
      XLSX.writeFile(wb, `${fileLabel}_similitudes_RegTools_Historique_${report.monthKey}.xlsx`);
    } catch (error: any) {
      alert("Erreur lors de l'export Excel historique des similitudes : " + error.message);
    }
  };

  const exportHistoryExcel = () => {
    if (!selectedHistoryReport) return;
    if (filteredHistoryRows.length === 0) return;
    try {
      const report = selectedHistoryReport;
      const fileLabel = historyPortfolioFilter === "ALL" ? "NS_VIE" : historyPortfolioFilter;
      
      const nsCols = report.columnsNS || [];
      const vieCols = report.columnsVIE || [];
      
      const { headers: exportHeaders, mapRow } = getExportHeadersAndRowMapper(
        historyPortfolioFilter,
        nsCols,
        vieCols
      );

      const exportData = filteredHistoryRows.map((row: any) => mapRow(row));

      const sheetAOA = [
        ["CONSIGNE : Veuillez créer des fiches KYC pour ces clients"],
        [],
        exportHeaders
      ];

      exportData.forEach((row: any) => {
        sheetAOA.push(exportHeaders.map(h => row[h]));
      });

      const ws = XLSX.utils.aoa_to_sheet(sheetAOA);
      const wb = XLSX.utils.book_new();

      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: exportHeaders.length - 1 } }
      ];

      ws["!rows"] = [
        { hpt: 20 },
        { hpt: 15 }
      ];

      const colWidths = exportHeaders.map((header, colIdx) => {
        let maxLen = header.length;
        for (let rIdx = 2; rIdx < sheetAOA.length; rIdx++) {
          const val = sheetAOA[rIdx][colIdx];
          if (val !== undefined && val !== null) {
            maxLen = Math.max(maxLen, String(val).length);
          }
        }
        return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
      });
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Manquants");
      XLSX.writeFile(wb, `${fileLabel}_manquants_RegTools_Historique_${report.monthKey}.xlsx`);
    } catch (error: any) {
      alert("Erreur lors de l'export Excel historique : " + error.message);
    }
  };

  const exportHistoryStatsExcel = () => {
    if (!selectedHistoryReport) return;
    if (filteredHistoryAgencyStats.length === 0) return;
    try {
      const report = selectedHistoryReport;
      const isVie = report.reconciliationType === "VIE";
      const fileLabel = isVie ? "VIE" : "NS";
      const currentDate = new Date(report.savedAt).toLocaleDateString("fr-FR");
      const exportHeaders = [
        "Code Agence",
        "Nom Agence",
        "Type",
        `Total ${fileLabel}`,
        "Présentes dans RegTools (KYC Conformes)",
        "Absentes de RegTools (KYC Manquants)",
        "Taux de Présence KYC (%)",
        "Taux d'Absence KYC (%)"
      ];

      const sheetAOA = [
        [`RAPPORT DE RAPPROCHEMENT HISTORIQUE - STATISTIQUES AGENCE - ${report.monthLabel} (${fileLabel})`],
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
      XLSX.writeFile(wb, `${fileLabel}_Statistiques_Par_Agence_Historique_${report.monthKey}.xlsx`);
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

  const handleSimilarDetailsSort = (col: string) => {
    if (similarSortField === col) {
      setSimilarSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSimilarSortField(col);
      setSimilarSortDirection("asc");
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

  const handleHistorySimilarDetailsSort = (col: string) => {
    if (historySimilarSortField === col) {
      setHistorySimilarSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setHistorySimilarSortField(col);
      setHistorySimilarSortDirection("asc");
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




  const exportComplianceReportExcel = (delStats: any[], top10Stats: any[], allAgencies: any[], isHistoryView: boolean) => {
    try {
      const currentDate = new Date().toLocaleDateString("fr-FR");
      const fileLabel = isHistoryView
        ? (selectedHistoryReport ? (selectedHistoryReport.reconciliationType === "BOTH" ? "NS + VIE" : selectedHistoryReport.reconciliationType === "VIE" ? "VIE" : "NS") : "NS")
        : (data.ns && data.vie ? "NS + VIE" : data.vie ? "VIE" : "NS");
        
      const wb = XLSX.utils.book_new();

      // --- Sheet 1: Synthèse Régionale ---
      const regionalHeaders = [
        "Délégation",
        "Nombre d'Agences",
        "Clients Totaux",
        "KYC Présents (Conformes)",
        "KYC Absents (Écarts)",
        "Taux de Conformité (%)"
      ];

      const regionalData = [
        [`RAPPORT DE CONFORMITÉ AML - SYNTHÈSE RÉGIONALE (${fileLabel})`],
        [`Date d'export : ${currentDate}`],
        [],
        regionalHeaders
      ];

      delStats.forEach(stat => {
        regionalData.push([
          stat.name,
          stat.agencyCount,
          stat.total,
          stat.existing,
          stat.missing,
          stat.pctExisting
        ]);
      });

      const totalAgencies = delStats.reduce((sum, d) => sum + d.agencyCount, 0);
      const totalClients = delStats.reduce((sum, d) => sum + d.total, 0);
      const totalExisting = delStats.reduce((sum, d) => sum + d.existing, 0);
      const totalMissing = delStats.reduce((sum, d) => sum + d.missing, 0);
      const totalPctExisting = totalClients > 0 ? parseFloat(((totalExisting / totalClients) * 100).toFixed(2)) : 100;

      regionalData.push([]);
      regionalData.push([
        "TOTAL GLOBAL",
        totalAgencies,
        totalClients,
        totalExisting,
        totalMissing,
        totalPctExisting
      ]);

      const wsRegional = XLSX.utils.aoa_to_sheet(regionalData);
      wsRegional["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: regionalHeaders.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: regionalHeaders.length - 1 } }
      ];
      wsRegional["!cols"] = regionalHeaders.map((header, colIdx) => {
        let maxLen = header.length;
        for (let rIdx = 3; rIdx < regionalData.length; rIdx++) {
          const val = regionalData[rIdx][colIdx];
          if (val !== undefined && val !== null) {
            maxLen = Math.max(maxLen, String(val).length);
          }
        }
        return { wch: maxLen + 3 };
      });
      XLSX.utils.book_append_sheet(wb, wsRegional, "Synthèse Régionale");

      // --- Sheet 2: Top 10 Agences Critiques ---
      const top10Headers = [
        "Rang",
        "Code Agence",
        "Nom Agence",
        "Type",
        "Clients Totaux",
        "KYC Présents (Conformes)",
        "KYC Absents (Écarts)",
        "Taux d'Absence KYC (%)"
      ];

      const top10Data = [
        [`RAPPORT DE CONFORMITÉ AML - TOP 10 DES ÉCARTS (CRITIQUES)`],
        [`Date d'export : ${currentDate} | Réseau Direct Interne (Hors Courtiers)`],
        [],
        top10Headers
      ];

      top10Stats.forEach((stat, idx) => {
        top10Data.push([
          idx + 1,
          stat.agence,
          stat.nom,
          stat.type,
          stat.total,
          stat.existing,
          stat.missing,
          stat.pctMissing
        ]);
      });

      const wsTop10 = XLSX.utils.aoa_to_sheet(top10Data);
      wsTop10["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: top10Headers.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: top10Headers.length - 1 } }
      ];
      wsTop10["!cols"] = top10Headers.map((header, colIdx) => {
        let maxLen = header.length;
        for (let rIdx = 3; rIdx < top10Data.length; rIdx++) {
          const val = top10Data[rIdx][colIdx];
          if (val !== undefined && val !== null) {
            maxLen = Math.max(maxLen, String(val).length);
          }
        }
        return { wch: maxLen + 3 };
      });
      XLSX.utils.book_append_sheet(wb, wsTop10, "Top 10 Écarts");

      // --- Sheet 3: Détails par Agence ---
      const detailsHeaders = [
        "Code Agence",
        "Nom Agence",
        "Type",
        "Délégation",
        "Gouvernorat",
        "Clients Totaux",
        "KYC Présents (Conformes)",
        "KYC Absents (Écarts)",
        "Taux de Conformité (%)"
      ];

      const detailsData = [
        [`RAPPORT DE CONFORMITÉ AML - DÉTAILS TOUTES AGENCES (${fileLabel})`],
        [`Date d'export : ${currentDate}`],
        [],
        detailsHeaders
      ];

      allAgencies.forEach(stat => {
        const geo = resolveAgencyGeography(stat.agence, stat.nom);
        detailsData.push([
          stat.agence,
          stat.nom,
          stat.type,
          geo.delegation,
          geo.gouvernorat,
          stat.total,
          stat.existing,
          stat.missing,
          stat.pctExisting
        ]);
      });

      const wsDetails = XLSX.utils.aoa_to_sheet(detailsData);
      wsDetails["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: detailsHeaders.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: detailsHeaders.length - 1 } }
      ];
      wsDetails["!cols"] = detailsHeaders.map((header, colIdx) => {
        let maxLen = header.length;
        for (let rIdx = 3; rIdx < detailsData.length; rIdx++) {
          const val = detailsData[rIdx][colIdx];
          if (val !== undefined && val !== null) {
            maxLen = Math.max(maxLen, String(val).length);
          }
        }
        return { wch: maxLen + 3 };
      });
      XLSX.utils.book_append_sheet(wb, wsDetails, "Détails Toutes Agences");

      XLSX.writeFile(wb, `Rapport_Conformite_AML_Comite_${currentDate.replace(/\//g, "-")}.xlsx`);
    } catch (error: any) {
      alert("Erreur lors de l'export Excel : " + error.message);
    }
  };

  const renderComplianceReportTab = (
    delStats: any[],
    top10Stats: any[],
    selDel: string | null,
    setSelDel: (del: string | null) => void,
    agenciesForDel: any[],
    isHistoryView: boolean,
    allAgenciesStats: any[]
  ) => {
    const totalCount = delStats.reduce((sum, d) => sum + d.total, 0);
    const missingCount = delStats.reduce((sum, d) => sum + d.missing, 0);
    const existingCount = totalCount - missingCount;
    const complianceRate = totalCount > 0 ? parseFloat(((existingCount / totalCount) * 100).toFixed(2)) : 100;

    let statusColorClass = "text-rose-600 dark:text-rose-400";
    let statusBgClass = "bg-rose-500/10 border-rose-500/20";
    if (complianceRate > 98) {
      statusColorClass = "text-emerald-600 dark:text-emerald-400";
      statusBgClass = "bg-emerald-500/10 border-emerald-500/20";
    } else if (complianceRate >= 95) {
      statusColorClass = "text-orange-600 dark:text-orange-400";
      statusBgClass = "bg-orange-500/10 border-orange-500/20";
    }

    // Resolve state dynamically based on view type
    const searchVal = isHistoryView ? historyDelegationSearch : delegationSearch;
    const setSearchVal = isHistoryView ? setHistoryDelegationSearch : setDelegationSearch;
    const sortField = isHistoryView ? historyDelegationSortField : delegationSortField;
    const setSortField = isHistoryView ? setHistoryDelegationSortField : setDelegationSortField;
    const sortDirection = isHistoryView ? historyDelegationSortDirection : delegationSortDirection;
    const setSortDirection = isHistoryView ? setHistoryDelegationSortDirection : setDelegationSortDirection;

    // Filter and Sort delegation stats
    let processedDelStats = [...delStats];
    if (searchVal.trim()) {
      const query = searchVal.toLowerCase().trim();
      processedDelStats = processedDelStats.filter(stat =>
        stat.name.toLowerCase().includes(query)
      );
    }

    processedDelStats.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortDirection === "asc"
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });

    const handleHeaderClick = (field: "name" | "agencyCount" | "total" | "existing" | "missing" | "pctExisting") => {
      if (sortField === field) {
        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    };

    const renderTabSortableHeader = (
      label: string, 
      field: "name" | "agencyCount" | "total" | "existing" | "missing" | "pctExisting", 
      align: "left" | "center" = "center"
    ) => {
      const isActive = sortField === field;
      return (
        <th 
          onClick={() => handleHeaderClick(field)}
          className={cn(
            "p-3 border-b border-slate-100 dark:border-slate-800/60 cursor-pointer select-none hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors text-[10px] uppercase font-bold tracking-wider text-slate-400",
            align === "center" && "text-center"
          )}
        >
          <div className={cn("flex items-center gap-1 justify-center", align === "left" && "justify-start")}>
            <span>{label}</span>
            <span className="text-[9px] text-slate-300 dark:text-slate-600">
              {isActive ? (sortDirection === "asc" ? " ▲" : " ▼") : " ▲▼"}
            </span>
          </div>
        </th>
      );
    };

    return (
      <div className="flex flex-col gap-6 animate-fadeIn">
        {/* KPI Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={cn("p-5 rounded-2xl border flex flex-col gap-1.5 shadow-sm transition-all", statusBgClass)}>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Taux de Conformité</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={cn("text-3xl font-extrabold tracking-tight", statusColorClass)}>{complianceRate}%</span>
              <span className="text-xs text-slate-400 font-medium">d'objectif (98%)</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-1000", 
                  complianceRate > 98 ? "bg-emerald-500" : complianceRate >= 95 ? "bg-orange-500" : "bg-rose-500"
                )}
                style={{ width: `${complianceRate}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-1.5 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dossiers Totaux</span>
            <span className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white mt-1">
              {totalCount.toLocaleString("fr-FR")}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Base de portefeuilles rapprochée</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-1.5 shadow-sm">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">KYC Présents</span>
            <span className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
              {existingCount.toLocaleString("fr-FR")}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Conformes aux règles AML</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-1.5 shadow-sm">
            <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">Dossiers Absents</span>
            <span className="text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400 mt-1">
              {missingCount.toLocaleString("fr-FR")}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Écarts de fiches KYC à régulariser</span>
          </div>
        </div>

        {/* Map & Top 10 Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Map Column */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 flex flex-col gap-4 shadow-sm min-h-[550px]">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Heatmap Géographique par Délégation</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Sélectionnez une délégation sur la carte de la Tunisie pour afficher ses agences correspondantes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <TunisiaHeatmap 
                delegationStats={delStats}
                selectedDelegation={selDel}
                onSelectDelegation={setSelDel}
              />

              <div className="flex flex-col gap-3 h-full justify-start border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800/60 md:pl-6 pt-4 md:pt-0">
                {selDel ? (
                  <div className="flex flex-col gap-3 h-full">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/60">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">{selDel}</h4>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Délégation Régionale
                        </span>
                      </div>
                      <button 
                        onClick={() => setSelDel(null)}
                        className="text-[10px] text-blue-500 hover:underline font-semibold"
                      >
                        Effacer
                      </button>
                    </div>

                    <div className="overflow-y-auto max-h-[360px] pr-1 flex flex-col gap-2">
                      {agenciesForDel.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-4 text-center">Aucune agence dans cette délégation</p>
                      ) : (
                        agenciesForDel
                          .sort((a, b) => b.pctMissing - a.pctMissing)
                          .map((stat, sIdx) => {
                            let itemBg = "bg-rose-500";
                            if (stat.pctExisting > 98) itemBg = "bg-emerald-500";
                            else if (stat.pctExisting >= 95) itemBg = "bg-orange-500";

                            return (
                              <div key={`sel-del-ag-${sIdx}`} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:bg-slate-800/50 flex flex-col gap-1.5 hover:border-slate-200 dark:hover:border-slate-700/80 transition-all">
                                <div className="flex justify-between items-start">
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{stat.nom}</p>
                                    <span className="text-[9px] text-slate-400 font-medium">Code: {stat.agence} • {stat.type}</span>
                                  </div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                    {stat.pctExisting}% conf.
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={cn("h-full rounded-full", itemBg)} 
                                    style={{ width: `${stat.pctExisting}%` }} 
                                  />
                                </div>
                                <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                                  <span>{stat.existing.toLocaleString("fr-FR")} KYC OK</span>
                                  <span className="text-rose-500">{stat.missing.toLocaleString("fr-FR")} absents</span>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6 text-slate-400 gap-3">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800/50 rounded-2xl">
                      <FileSpreadsheet className="h-8 w-8 text-slate-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Aucune sélection</h4>
                      <p className="text-[11px] max-w-[180px] mx-auto mt-1 leading-relaxed">
                        Veuillez cliquer sur une zone de la carte pour inspecter les agences associées.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top 10 Column */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 flex flex-col gap-4 shadow-sm min-h-[550px]">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Top 10 des Écarts (Absences KYC)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Agences et succursales internes affichant le taux d'absence KYC le plus critique (hors courtiers).
              </p>
            </div>

            {top10Stats.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-slate-400 py-12 gap-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Conformité parfaite</h4>
                <p className="text-[10px] text-center max-w-[200px] leading-relaxed">
                  Toutes les agences enregistrent un taux de fiches KYC complet.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 flex-1">
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={top10Stats}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" fontSize={9} stroke="#94a3b8" unit="%" />
                      <YAxis dataKey="nom" type="category" width={90} fontSize={8} stroke="#94a3b8" tickFormatter={(t) => t ? t.substring(0, 15) : ""} />
                      <RechartsTooltip
                        formatter={(value) => [`${value}% d'absence`, 'Taux absence']}
                        contentStyle={{ fontSize: 10, borderRadius: 8 }}
                      />
                      <Bar dataKey="pctMissing" radius={[0, 4, 4, 0]}>
                        {top10Stats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.pctMissing > 15 ? "#ef4444" : "#f97316"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px] pr-1">
                  {top10Stats.map((stat, idx) => (
                    <div 
                      key={`top-absent-row-${idx}`}
                      className="p-3 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 rounded-xl flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex items-center justify-center h-6 w-6 font-bold text-xs bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{stat.nom}</p>
                          <p className="text-[9px] text-slate-400 font-medium">Code {stat.agence} • {stat.type}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-extrabold text-rose-600 dark:text-rose-400">{stat.pctMissing}%</p>
                        <p className="text-[9px] text-slate-400 font-medium">{stat.missing.toLocaleString("fr-FR")} absents</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Summary Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Tableau Récapitulatif par Délégation</h3>
              <p className="text-xs text-slate-400 mt-0.5">Synthèse régionale de la conformité AML</p>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrer par délégation..."
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500/50 transition-colors w-[180px] sm:w-[220px]"
                />
              </div>
              <button
                onClick={() => exportComplianceReportExcel(delStats, top10Stats, allAgenciesStats, isHistoryView)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm hover:shadow transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Exporter Excel</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  {renderTabSortableHeader("Délégation", "name", "left")}
                  {renderTabSortableHeader("Nombre d'Agences", "agencyCount", "center")}
                  {renderTabSortableHeader("Clients Totaux", "total", "center")}
                  {renderTabSortableHeader("KYC Présents (Conformes)", "existing", "center")}
                  {renderTabSortableHeader("KYC Absents (Écarts)", "missing", "center")}
                  {renderTabSortableHeader("Taux Conformité (Objectif 98%)", "pctExisting", "center")}
                  <th className="p-3 border-b border-slate-100 dark:border-slate-800/60 w-[180px]">Proportion Visuelle</th>
                </tr>
              </thead>
              <tbody>
                {processedDelStats.map((stat, idx) => {
                  let badgeBg = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
                  let barColor = "bg-rose-500";
                  if (stat.pctExisting > 98) {
                    badgeBg = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                    barColor = "bg-emerald-500";
                  } else if (stat.pctExisting >= 95) {
                    badgeBg = "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
                    barColor = "bg-orange-500";
                  }

                  return (
                    <tr 
                      key={`del-table-row-${idx}`} 
                      className={cn(
                        "hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer",
                        selDel === stat.name && "bg-blue-500/5 dark:bg-blue-500/5"
                      )}
                      onClick={() => setSelDel(selDel === stat.name ? null : stat.name)}
                    >
                      <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", barColor)}></span>
                        {stat.name}
                      </td>
                      <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 text-center text-slate-600 dark:text-slate-400 font-medium">
                        {stat.agencyCount}
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
                      <td className="p-3 border-b border-slate-100 dark:border-slate-800/60 text-center font-bold">
                        <span className={cn("px-2 py-0.5 border rounded-full text-[10px] font-extrabold", badgeBg)}>
                          {stat.pctExisting}%
                        </span>
                      </td>
                      <td className="p-3 border-b border-slate-100 dark:border-slate-800/60">
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div 
                              style={{ width: `${stat.pctExisting}%` }} 
                              className={cn(barColor, "transition-all duration-500")} 
                              title={`Présentes: ${stat.pctExisting}%`}
                            />
                            <div 
                              style={{ width: `${stat.pctMissing}%` }} 
                              className="bg-slate-200 dark:bg-slate-800 transition-all duration-500" 
                              title={`Absentes: ${stat.pctMissing}%`}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {pageTab === "new" 
              ? `Rapprochement Clients RegTools vs ${data.ns && data.vie ? "NS + VIE" : data.vie ? "Assurance VIE" : "Non-Vie (NS)"}`
              : selectedHistoryReport
                ? `Rapport Historique : RegTools vs ${selectedHistoryReport.reconciliationType === "BOTH" ? "NS + VIE" : selectedHistoryReport.reconciliationType === "VIE" ? "Assurance VIE" : "Non-Vie (NS)"}`
                : "Rapprochement Clients RegTools - Historique"
            }
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {pageTab === "new"
              ? `Comparez les identifiants de votre base globale avec les fichiers ${data.ns && data.vie ? "NS + VIE" : data.vie ? "Assurance VIE" : "Non-Vie (NS)"} pour identifier et extraire les écarts par agence.`
              : "Consultez et gérez l'historique des rapports de rapprochement mensuels sauvegardés."
            }
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user && isAdmin(user.authEmail || user.email || '') && (
            <button
              onClick={() => setIsGeoSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200/60 dark:border-slate-700/60 transition-all shadow-sm cursor-pointer"
              title="Paramétrer les délégations"
            >
              <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span>Paramètres Délégations</span>
            </button>
          )}

          {/* Page Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
            <button
              onClick={() => {
                setPageTab("new");
                setShowHistoryColumnDropdown(false);
              }}
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
                setShowColumnDropdown(false);
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
      </div>

      {pageTab === "new" ? (
        <>
          {/* Info Card */}
          <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-500/5 dark:via-purple-500/5 dark:to-pink-500/5 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-1.5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Rapprochement Multi-Portefeuilles
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Importez simultanément votre base de référence RegTools et vos portefeuilles Non-Vie (NS) et/ou Assurance VIE pour lancer une comparaison globale. Filtrez ensuite les résultats par portefeuille et par agence.
            </p>
          </div>

          {/* Dashboard Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Portefeuille NS</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                  {data.ns ? data.ns.length.toLocaleString("fr-FR") : "-"}
                </p>
                <p className="text-xs text-slate-400 truncate max-w-[200px] mt-0.5">
                  {files.ns ? files.ns.name : "Aucun fichier chargé"}
                </p>
              </div>
            </div>

            {/* VIE Stat Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-4">
              <div className="p-3 bg-pink-500/10 text-pink-600 dark:text-pink-455 rounded-xl">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Portefeuille VIE (Filtré)</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                  {data.vie ? data.vie.length.toLocaleString("fr-FR") : "-"}
                </p>
                <p className="text-xs text-slate-400 truncate max-w-[200px] mt-0.5">
                  {files.vie ? files.vie.name : "Aucun fichier chargé"}
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
                    ? `${matchRate}% trouvé (${((data.ns ? data.ns.length : 0) + (data.vie ? data.vie.length : 0) - missingRows.length).toLocaleString("fr-FR")} lignes)`
                    : "Prêt pour comparaison"
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Upload & Mapping Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload RegTools */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 dark:text-white">1. Base Référence (RegTools)</h3>
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
                <h3 className="font-semibold text-slate-800 dark:text-white">
                  2. Portefeuille Non-Vie (NS)
                </h3>
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

            {/* Upload VIE */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 dark:text-white">
                  3. Portefeuille Assurance VIE
                </h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  Nettoyage & Période auto
                </span>
              </div>

              <div
                onDragOver={(e) => handleDragOver(e, "vie")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "vie")}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-height-[150px]",
                  dragOverRole === "vie"
                    ? "border-purple-500 bg-purple-500/5"
                    : files.vie
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-slate-200 dark:border-slate-800 hover:border-purple-500/50"
                )}
                onClick={() => document.getElementById("input-vie")?.click()}
              >
                <input
                  type="file"
                  id="input-vie"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => e.target.files?.[0] && handleFileChange("vie", e.target.files[0])}
                />
                {isParsing.vie ? (
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Analyse en cours...</p>
                  </div>
                ) : files.vie ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Chargé avec succès</p>
                    <p className="text-xs text-slate-400 truncate max-w-[280px]">{files.vie.name}</p>
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

              {files.vie && data.vie && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-lg flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-slate-400 font-medium">
                    <span>{files.vie.name}</span>
                    <span>{formatFileSize(files.vie.size)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Identifiant :
                      </label>
                      <select
                        value={mapping.vieId}
                        onChange={(e) => {
                          setMapping(prev => ({ ...prev, vieId: e.target.value }));
                          setComparisonDone(false);
                        }}
                        className="w-full text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 outline-none focus:border-purple-500"
                      >
                        {columns.vie.map(col => (
                          <option key={`vie-col-id-${col}`} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Agence :
                      </label>
                      <select
                        value={mapping.vieAgence}
                        onChange={(e) => {
                          setMapping(prev => ({ ...prev, vieAgence: e.target.value }));
                          setComparisonDone(false);
                        }}
                        className="w-full text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-1.5 outline-none focus:border-purple-500"
                      >
                        {columns.vie.map(col => (
                          <option key={`vie-col-agence-${col}`} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Compare Control Bar */}
          {data.regtools && (data.ns || data.vie) && (
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
                    onClick={() => setActiveTab("similar")}
                    className={cn(
                      "px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 -mb-[2px]",
                      activeTab === "similar"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Détails des Similitudes ({filteredSimilarRows.length.toLocaleString("fr-FR")} lignes)
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
                  <button
                    onClick={() => setActiveTab("report")}
                    className={cn(
                      "px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 -mb-[2px]",
                      activeTab === "report"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    <ClipboardList className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Rapport Conformité (Comité)
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
                      <h3 className="font-semibold text-slate-800 dark:text-white">
                        Lignes {reconciliationType} absentes de RegTools
                      </h3>
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
                          {agenciesList.map(agence => {
                            const info = resolveAgencyInfo(agence);
                            const displayName = info.name !== `Agence ${agence}` ? `${info.name} (${agence})` : agence;
                            return (
                              <option key={`filter-agence-${agence}`} value={agence}>{displayName}</option>
                            );
                          })}
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

                      {/* Column Selector Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                          className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl transition-all flex items-center gap-1.5"
                        >
                          Colonnes ({visibleColumns.length > 0 ? visibleColumns.length : columns.ns.length})
                        </button>
                        {showColumnDropdown && (
                          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 p-2 max-h-60 overflow-y-auto">
                            <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/60">
                              <button 
                                onClick={() => setVisibleColumns(columns.ns)}
                                className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                              >
                                Toutes
                              </button>
                              <button 
                                onClick={() => setVisibleColumns(columns.ns.slice(0, 6))}
                                className="text-[10px] text-slate-500 hover:underline"
                              >
                                Défaut
                              </button>
                            </div>
                            {columns.ns.map(col => (
                              <label key={`col-toggle-${col}`} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={visibleColumns.includes(col)}
                                  onChange={() => {
                                    if (visibleColumns.includes(col)) {
                                      setVisibleColumns(visibleColumns.filter(c => c !== col));
                                    } else {
                                      setVisibleColumns([...visibleColumns, col]);
                                    }
                                  }}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="truncate">{col}</span>
                              </label>
                            ))}
                          </div>
                        )}
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
                              {(visibleColumns.length > 0 ? visibleColumns : columns.ns).map(col => {
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
                                {(visibleColumns.length > 0 ? visibleColumns : columns.ns).map(col => (
                                  <td 
                                    key={`td-${rIdx}-${col}`} 
                                    className={cn(
                                      "p-3 border-b border-slate-100 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 max-w-[200px] truncate whitespace-nowrap",
                                      col === mapping.nsId && "font-bold text-purple-600 dark:text-purple-400",
                                      col === mapping.nsAgence && "font-bold text-blue-600 dark:text-blue-400"
                                    )}
                                    title={row[col] !== undefined && row[col] !== null ? renderTableCellContent(col, row[col]) : ""}
                                  >
                                    {row[col] !== undefined && row[col] !== null ? renderTableCellContent(col, row[col]) : ""}
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
              ) : activeTab === "similar" ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-100 dark:border-slate-800/60 pb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 dark:text-white">Lignes NS présentes dans RegTools (Similitudes)</h3>
                      <span className="text-xs font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full">
                        {filteredSimilarRows.length.toLocaleString("fr-FR")} lignes
                      </span>
                    </div>

                    {/* Actions Panel */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Agency Filter */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Agence :</label>
                        <select
                          value={similarSelectedAgency}
                          onChange={(e) => {
                            setSimilarSelectedAgency(e.target.value);
                            setSimilarCurrentPage(1);
                          }}
                          className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 outline-none min-w-[150px]"
                        >
                          <option value="ALL">Toutes les agences</option>
                          {agenciesList.map(agence => {
                            const info = resolveAgencyInfo(agence);
                            const displayName = info.name !== `Agence ${agence}` ? `${info.name} (${agence})` : agence;
                            return (
                              <option key={`filter-similar-agence-${agence}`} value={agence}>{displayName}</option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Rechercher..."
                          value={similarSearchQuery}
                          onChange={(e) => {
                            setSimilarSearchQuery(e.target.value);
                            setSimilarCurrentPage(1);
                          }}
                          className="pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none w-[200px] focus:border-blue-500 focus:bg-white transition-all"
                        />
                      </div>

                      {/* Column Selector Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                          className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl transition-all flex items-center gap-1.5"
                        >
                          Colonnes ({visibleColumns.length > 0 ? visibleColumns.length : columns.ns.length})
                        </button>
                        {showColumnDropdown && (
                          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 p-2 max-h-60 overflow-y-auto">
                            <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/60">
                              <button 
                                onClick={() => setVisibleColumns(columns.ns)}
                                className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                              >
                                Toutes
                              </button>
                              <button 
                                onClick={() => setVisibleColumns(columns.ns.slice(0, 6))}
                                className="text-[10px] text-slate-500 hover:underline"
                              >
                                Défaut
                              </button>
                            </div>
                            {columns.ns.map(col => (
                              <label key={`col-toggle-similar-${col}`} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={visibleColumns.includes(col)}
                                  onChange={() => {
                                    if (visibleColumns.includes(col)) {
                                      setVisibleColumns(visibleColumns.filter(c => c !== col));
                                    } else {
                                      setVisibleColumns([...visibleColumns, col]);
                                    }
                                  }}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="truncate">{col}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Export Trigger */}
                      <button
                        onClick={exportSimilarExcel}
                        disabled={filteredSimilarRows.length === 0}
                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
                      >
                        <Download className="h-4 w-4" />
                        Exporter Excel
                      </button>
                    </div>
                  </div>

                  {/* Table Element */}
                  {filteredSimilarRows.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                      <AlertTriangle className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                      <h4 className="font-semibold text-slate-800 dark:text-white">Aucune ligne correspondante</h4>
                      <p className="text-xs text-slate-400">Aucune ligne ne correspond aux filtres actuels.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                              {(visibleColumns.length > 0 ? visibleColumns : columns.ns).map(col => {
                                const isSortedCol = similarSortField === col;
                                return (
                                  <th 
                                    key={`similar-th-${col}`} 
                                    onClick={() => handleSimilarDetailsSort(col)}
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
                                        {isSortedCol ? (similarSortDirection === "asc" ? "▲" : "▼") : "▲▼"}
                                      </span>
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedSimilarRows.map((row, rIdx) => (
                              <tr key={`similar-tr-row-${rIdx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                {(visibleColumns.length > 0 ? visibleColumns : columns.ns).map(col => (
                                  <td 
                                    key={`similar-td-${rIdx}-${col}`} 
                                    className={cn(
                                      "p-3 border-b border-slate-100 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 max-w-[200px] truncate whitespace-nowrap",
                                      col === mapping.nsId && "font-bold text-purple-600 dark:text-purple-400",
                                      col === mapping.nsAgence && "font-bold text-blue-600 dark:text-blue-400"
                                    )}
                                    title={row[col] !== undefined && row[col] !== null ? renderTableCellContent(col, row[col]) : ""}
                                  >
                                    {row[col] !== undefined && row[col] !== null ? renderTableCellContent(col, row[col]) : ""}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination controls */}
                      {totalSimilarPages > 1 && (
                        <div className="flex justify-between items-center gap-4 flex-wrap pt-2">
                          <span className="text-xs text-slate-400 font-medium">
                            Affichage de <span className="font-bold text-slate-700 dark:text-white">{(similarCurrentPage - 1) * similarPageSize + 1}</span> à{" "}
                            <span className="font-bold text-slate-700 dark:text-white">{Math.min(similarCurrentPage * similarPageSize, filteredSimilarRows.length)}</span> sur{" "}
                            <span className="font-bold text-slate-700 dark:text-white">{filteredSimilarRows.length}</span> lignes
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              disabled={similarCurrentPage === 1}
                              onClick={() => setSimilarCurrentPage(prev => Math.max(prev - 1, 1))}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-50"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            
                            <div className="flex items-center gap-1">
                              {similarPaginationRange.map((p, pIdx) => {
                                if (p === "...") {
                                  return <span key={`similar-page-ellip-${pIdx}`} className="px-2 text-slate-400">...</span>;
                                }
                                return (
                                  <button
                                    key={`similar-page-btn-${p}`}
                                    onClick={() => setSimilarCurrentPage(p as number)}
                                    className={cn(
                                      "h-7 w-7 text-xs font-semibold rounded-lg transition-all",
                                      p === similarCurrentPage
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
                              disabled={similarCurrentPage === totalSimilarPages}
                              onClick={() => setSimilarCurrentPage(prev => Math.min(prev + 1, totalSimilarPages))}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-50"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>

                            <div className="flex items-center gap-1.5 ml-2">
                              <span className="text-xs text-slate-400">Par page :</span>
                              <select
                                value={similarPageSize}
                                onChange={(e) => {
                                  setSimilarPageSize(parseInt(e.target.value));
                                  setSimilarCurrentPage(1);
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
              ) : activeTab === "stats" ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-100 dark:border-slate-800/60 pb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 dark:text-white">Rapprochement par Agence</h3>
                      <span className="text-xs font-bold px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full">
                        {filteredAgencyStats.length} agences
                      </span>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Delegation Filter */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Délégation :</label>
                        <select
                          value={statsDelegationFilter}
                          onChange={(e) => setStatsDelegationFilter(e.target.value)}
                          className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 outline-none min-w-[140px]"
                        >
                          <option value="ALL">Toutes les délégations</option>
                          <option value="Tunis Centre">Tunis Centre</option>
                          <option value="Tunis Nord">Tunis Nord</option>
                          <option value="Tunis Sud">Tunis Sud</option>
                          <option value="Sahel">Sahel</option>
                          <option value="Sfax">Sfax</option>
                          <option value="Cap Bon">Cap Bon</option>
                          <option value="Nord ouest">Nord ouest</option>
                          <option value="Sud">Sud</option>
                          <option value="Courtiers">Courtiers</option>
                          <option value="Siège">Siège</option>
                          <option value="Non affecté">Non affecté</option>
                        </select>
                      </div>

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
                            {renderSortableHeader(`Total ${data.ns && data.vie ? "NS + VIE" : data.vie ? "VIE" : "NS"}`, "total", "center")}
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
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => exportSingleAgencyExcel(stat.agence, false)}
                                    disabled={stat.missing === 0}
                                    className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg transition-colors inline-flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"
                                    title="Exporter les écarts de cette agence (KYC Manquants)"
                                  >
                                    <AlertTriangle className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => exportSingleAgencySimilarExcel(stat.agence, false)}
                                    disabled={stat.existing === 0}
                                    className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors inline-flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"
                                    title="Exporter les similitudes de cette agence (KYC Conformes)"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </button>
                                </div>
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
              ) : (
                renderComplianceReportTab(
                  delegationStats,
                  top10AbsentKYC,
                  selectedDelegation,
                  setSelectedDelegation,
                  agenciesBySelectedDelegation,
                  false,
                  agencyStats
                )
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
                {groupedHistoryReports.map((group) => (
                  <div 
                    key={`grouped-report-card-${group.baseMonthKey}`}
                    className="border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-5 bg-slate-50/30 dark:bg-slate-900/10 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-base">
                            {group.monthLabel}
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Dernière activité le {new Date(group.maxSavedAt).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {group.baseMonthKey}
                        </span>
                      </div>

                      {/* Combined "Consulter les deux" button when both NS and VIE exist */}
                      {group.nsReport && group.vieReport && (
                        <button
                          onClick={() => handleLoadReport(group.nsReport)}
                          className="w-full mb-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          Consulter NS + VIE (Les deux)
                        </button>
                      )}

                      <div className="space-y-4">
                        {/* NS Report Section */}
                        {group.nsReport ? (
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/50 dark:border-slate-800/80 flex flex-col gap-2 shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                Non-Vie (NS)
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {new Date(group.nsReport.savedAt).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 space-y-1 my-1">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Fichier :</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={group.nsReport.fileNameNS}>
                                  {group.nsReport.fileNameNS}
                                </span>
                              </div>
                              <div className="flex justify-between font-semibold">
                                <span className="text-slate-400">Présence :</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  {group.nsReport.globalStats?.pctExisting}%
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1.5 mt-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                              {!group.vieReport && (
                                <button
                                  onClick={() => handleLoadReport(group.nsReport)}
                                  className="flex-1 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                                >
                                  Consulter NS
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteReport(group.nsReport)}
                                className="flex-1 py-1.5 text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-600 rounded-md transition-colors flex items-center justify-center border border-rose-200/50 dark:border-rose-900/50"
                                title="Supprimer ce rapprochement NS"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Supprimer NS</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-100/30 dark:bg-slate-900/20 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center py-4">
                            <p className="text-[10px] text-slate-400">Aucun rapprochement Non-Vie (NS)</p>
                          </div>
                        )}

                        {/* VIE Report Section */}
                        {group.vieReport ? (
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/50 dark:border-slate-800/80 flex flex-col gap-2 shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                Assurance VIE
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {new Date(group.vieReport.savedAt).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 space-y-1 my-1">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Fichier :</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={group.vieReport.fileNameNS}>
                                  {group.vieReport.fileNameNS}
                                </span>
                              </div>
                              <div className="flex justify-between font-semibold">
                                <span className="text-slate-400">Présence :</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  {group.vieReport.globalStats?.pctExisting}%
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1.5 mt-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                              {!group.nsReport && (
                                <button
                                  onClick={() => handleLoadReport(group.vieReport)}
                                  className="flex-1 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                                >
                                  Consulter VIE
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteReport(group.vieReport)}
                                className="flex-1 py-1.5 text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-600 rounded-md transition-colors flex items-center justify-center border border-rose-200/50 dark:border-rose-900/50"
                                title="Supprimer ce rapprochement VIE"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Supprimer VIE</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-100/30 dark:bg-slate-900/20 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center py-4">
                            <p className="text-[10px] text-slate-400">Aucun rapprochement Assurance VIE</p>
                          </div>
                        )}
                      </div>
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
                  onClick={() => {
                    setSelectedHistoryReport(null);
                    setHistoryVisibleColumns([]);
                    setShowHistoryColumnDropdown(false);
                    setHistoryTab("stats");
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-800/60 flex items-center justify-center"
                  title="Retour à l'historique"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Rapport de Rapprochement : {selectedHistoryReport.monthLabel}
                    <span className={cn(
                      "text-xs font-bold px-2.5 py-0.5 rounded-full",
                      selectedHistoryReport.reconciliationType === "BOTH"
                        ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        : selectedHistoryReport.reconciliationType === "VIE"
                        ? "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
                        : "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                    )}>
                      {selectedHistoryReport.reconciliationType === "BOTH" ? "NS + VIE" : selectedHistoryReport.reconciliationType === "VIE" ? "VIE" : "NS"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sauvegardé le {new Date(selectedHistoryReport.savedAt).toLocaleDateString("fr-FR")}
                    {selectedHistoryReport.reconciliationType === "BOTH" && (
                      <> • NS : {selectedHistoryReport.fileNameNS} | VIE : {selectedHistoryReport.fileNameVIE}</>
                    )}
                    {selectedHistoryReport.reconciliationType !== "BOTH" && (
                      <> • Fichier {selectedHistoryReport.reconciliationType === "VIE" ? "VIE" : "NS"} : {selectedHistoryReport.fileNameNS}</>
                    )}
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
                    onClick={() => {
                      setHistoryTab("stats");
                      setShowHistoryColumnDropdown(false);
                    }}
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
                    onClick={() => {
                      setHistoryTab("list");
                      setShowHistoryColumnDropdown(false);
                    }}
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
                  <button
                    onClick={() => {
                      setHistoryTab("similar");
                      setShowHistoryColumnDropdown(false);
                    }}
                    className={cn(
                      "px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 -mb-[2px]",
                      historyTab === "similar"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Détails des Similitudes {selectedHistoryReport.similarRows ? `(${filteredHistorySimilarRows.length.toLocaleString("fr-FR")} lignes)` : "(Non dispo.)"}
                  </button>
                  <button
                    onClick={() => {
                      setHistoryTab("report");
                      setShowHistoryColumnDropdown(false);
                    }}
                    className={cn(
                      "px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 -mb-[2px]",
                      historyTab === "report"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    <ClipboardList className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Rapport Conformité (Comité)
                  </button>
                </div>

                {/* Portfolio filter — shown only for BOTH (NS + VIE) reports */}
                {selectedHistoryReport.reconciliationType === "BOTH" && (
                  <div className="flex items-center gap-2 pb-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Portefeuille :</label>
                    <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                      <button
                        onClick={() => { setHistoryPortfolioFilter("ALL"); setHistoryCurrentPage(1); setHistorySimilarCurrentPage(1); }}
                        className={cn(
                          "px-3 py-1.5 transition-colors",
                          historyPortfolioFilter === "ALL"
                            ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        Les deux
                      </button>
                      <button
                        onClick={() => { setHistoryPortfolioFilter("NS"); setHistoryCurrentPage(1); setHistorySimilarCurrentPage(1); }}
                        className={cn(
                          "px-3 py-1.5 border-l border-slate-200 dark:border-slate-800 transition-colors",
                          historyPortfolioFilter === "NS"
                            ? "bg-blue-600 text-white"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        Non-Vie (NS)
                      </button>
                      <button
                        onClick={() => { setHistoryPortfolioFilter("VIE"); setHistoryCurrentPage(1); setHistorySimilarCurrentPage(1); }}
                        className={cn(
                          "px-3 py-1.5 border-l border-slate-200 dark:border-slate-800 transition-colors",
                          historyPortfolioFilter === "VIE"
                            ? "bg-purple-600 text-white"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        Assurance VIE
                      </button>
                    </div>
                  </div>
                )}
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
                      {/* Delegation Filter */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Délégation :</label>
                        <select
                          value={historyStatsDelegationFilter}
                          onChange={(e) => setHistoryStatsDelegationFilter(e.target.value)}
                          className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 outline-none min-w-[140px]"
                        >
                          <option value="ALL">Toutes les délégations</option>
                          <option value="Tunis Centre">Tunis Centre</option>
                          <option value="Tunis Nord">Tunis Nord</option>
                          <option value="Tunis Sud">Tunis Sud</option>
                          <option value="Sahel">Sahel</option>
                          <option value="Sfax">Sfax</option>
                          <option value="Cap Bon">Cap Bon</option>
                          <option value="Nord ouest">Nord ouest</option>
                          <option value="Sud">Sud</option>
                          <option value="Courtiers">Courtiers</option>
                          <option value="Siège">Siège</option>
                          <option value="Non affecté">Non affecté</option>
                        </select>
                      </div>

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
                            {renderHistorySortableHeader(`Total ${historyReconciliationType === "BOTH" ? "NS + VIE" : historyReconciliationType === "VIE" ? "VIE" : "NS"}`, "total", "center")}
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
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => exportSingleAgencyExcel(stat.agence, true)}
                                    disabled={stat.missing === 0}
                                    className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg transition-colors inline-flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"
                                    title="Exporter les écarts de cette agence (KYC Manquants)"
                                  >
                                    <AlertTriangle className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => exportSingleAgencySimilarExcel(stat.agence, true)}
                                    disabled={!selectedHistoryReport.similarRows || stat.existing === 0}
                                    className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors inline-flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"
                                    title="Exporter les similitudes de cette agence (KYC Conformes)"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => openSamplingModal(stat.agence)}
                                    disabled={!selectedHistoryReport.similarRows || stat.existing === 0}
                                    className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors inline-flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"
                                    title="Échantillonner pour contrôle"
                                  >
                                    <ClipboardList className="h-4 w-4" />
                                  </button>
                                </div>
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
              ) : historyTab === "similar" ? (
                <div className="flex flex-col gap-4">
                  {!selectedHistoryReport.similarRows ? (
                    <div className="text-center py-12 flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <AlertTriangle className="h-12 w-12 text-amber-500" />
                      <h4 className="font-semibold text-slate-800 dark:text-white">Détails des similitudes non disponibles</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Les lignes de similitudes n'ont pas été stockées dans la base de données cloud pour ce rapport car elles dépassaient la limite de taille Firestore (1 Mo).
                        Les statistiques globales et par agence restent néanmoins disponibles.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-100 dark:border-slate-800/60 pb-4">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-800 dark:text-white">Détails des Similitudes (Historique)</h3>
                          <span className="text-xs font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full">
                            {filteredHistorySimilarRows.length.toLocaleString("fr-FR")} lignes
                          </span>
                        </div>

                        <div className="flex items-center gap-4 flex-wrap">
                          {/* Agency Filter */}
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Agence :</label>
                            <select
                              value={historySimilarSelectedAgency}
                              onChange={(e) => {
                                setHistorySimilarSelectedAgency(e.target.value);
                                setHistorySimilarCurrentPage(1);
                              }}
                              className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 outline-none min-w-[150px]"
                            >
                              <option value="ALL">Toutes les agences</option>
                              {historySimilarAgenciesList.map(agence => {
                                const info = resolveAgencyInfo(agence);
                                const displayName = info.name !== `Agence ${agence}` ? `${info.name} (${agence})` : agence;
                                return (
                                  <option key={`history-similar-filter-agence-${agence}`} value={agence}>{displayName}</option>
                                );
                              })}
                            </select>
                          </div>

                          {/* Search Bar */}
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Rechercher..."
                              value={historySimilarSearchQuery}
                              onChange={(e) => {
                                setHistorySimilarSearchQuery(e.target.value);
                                setHistorySimilarCurrentPage(1);
                              }}
                              className="pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none w-[200px] focus:border-blue-500 focus:bg-white transition-all"
                            />
                          </div>

                          {/* Column Selector Dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => setShowHistoryColumnDropdown(!showHistoryColumnDropdown)}
                              className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl transition-all flex items-center gap-1.5"
                            >
                              Colonnes ({historyDisplayedColumns.length})
                            </button>
                            {showHistoryColumnDropdown && (
                              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 p-2 max-h-60 overflow-y-auto">
                                <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/60">
                                  <button 
                                    onClick={() => setHistoryVisibleColumns(historyAvailableColumns)}
                                    className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                                  >
                                    Toutes
                                  </button>
                                  <button 
                                    onClick={() => setHistoryVisibleColumns(historyAvailableColumns.slice(0, 6))}
                                    className="text-[10px] text-slate-500 hover:underline"
                                  >
                                    Défaut
                                  </button>
                                </div>
                                {historyAvailableColumns.map((col: string) => (
                                  <label key={`col-toggle-history-similar-${col}`} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                                    <input
                                      type="checkbox"
                                      checked={historyDisplayedColumns.includes(col)}
                                      onChange={() => {
                                        if (historyVisibleColumns.includes(col)) {
                                          setHistoryVisibleColumns(historyVisibleColumns.filter(c => c !== col));
                                        } else {
                                          setHistoryVisibleColumns([...historyVisibleColumns, col]);
                                        }
                                      }}
                                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="truncate">{col}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Export Trigger */}
                          <button
                            onClick={exportHistorySimilarExcel}
                            disabled={filteredHistorySimilarRows.length === 0}
                            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
                          >
                            <Download className="h-4 w-4" />
                            Exporter Excel
                          </button>
                        </div>
                      </div>

                      {filteredHistorySimilarRows.length === 0 ? (
                        <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                          <h4 className="font-semibold text-slate-800 dark:text-white">Aucune ligne correspondante</h4>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-xl">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                  {selectedHistoryReport.reconciliationType === "BOTH" && (
                                    <th className="p-3 border-b border-slate-100 dark:border-slate-800/60 w-16">Type</th>
                                  )}
                                  {historyDisplayedColumns.map((col: string) => {
                                    const isSortedCol = historySimilarSortField === col;
                                    return (
                                      <th 
                                        key={`history-similar-th-${col}`} 
                                        onClick={() => handleHistorySimilarDetailsSort(col)}
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
                                            {isSortedCol ? (historySimilarSortDirection === "asc" ? "▲" : "▼") : "▲▼"}
                                          </span>
                                        </div>
                                      </th>
                                    );
                                  })}
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedHistorySimilarRows.map((row: any, rIdx: number) => (
                                  <tr key={`history-similar-tr-row-${rIdx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                    {selectedHistoryReport.reconciliationType === "BOTH" && (
                                      <td className="p-3 border-b border-slate-100 dark:border-slate-800/60">
                                        <span className={cn(
                                          "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                                          row.__sourcePortfolio === "VIE"
                                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                        )}>
                                          {row.__sourcePortfolio || "NS"}
                                        </span>
                                      </td>
                                    )}
                                    {historyDisplayedColumns.map((col: string) => (
                                      <td 
                                        key={`history-similar-td-${rIdx}-${col}`} 
                                        className={cn(
                                          "p-3 border-b border-slate-100 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 max-w-[200px] truncate whitespace-nowrap",
                                          col === selectedHistoryReport.mapping?.nsId && "font-bold text-purple-600 dark:text-purple-400",
                                          col === selectedHistoryReport.mapping?.nsAgence && "font-bold text-blue-600 dark:text-blue-400"
                                        )}
                                        title={row[col] !== undefined && row[col] !== null ? renderTableCellContent(col, row[col], true) : ""}
                                      >
                                        {row[col] !== undefined && row[col] !== null ? renderTableCellContent(col, row[col], true) : ""}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Pagination controls */}
                          {totalHistorySimilarPages > 1 && (
                            <div className="flex justify-between items-center gap-4 flex-wrap pt-2">
                              <span className="text-xs text-slate-400 font-medium">
                                Affichage de <span className="font-bold text-slate-700 dark:text-white">{(historySimilarCurrentPage - 1) * historySimilarPageSize + 1}</span> à{" "}
                                <span className="font-bold text-slate-700 dark:text-white">{Math.min(historySimilarCurrentPage * historySimilarPageSize, filteredHistorySimilarRows.length)}</span> sur{" "}
                                <span className="font-bold text-slate-700 dark:text-white">{filteredHistorySimilarRows.length}</span> lignes
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  disabled={historySimilarCurrentPage === 1}
                                  onClick={() => setHistorySimilarCurrentPage(prev => Math.max(prev - 1, 1))}
                                  className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-50"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </button>
                                
                                <div className="flex items-center gap-1">
                                  {historySimilarPaginationRange.map((p, pIdx) => {
                                    if (p === "...") {
                                      return <span key={`history-similar-ellip-${pIdx}`} className="px-2 text-slate-400">...</span>;
                                    }
                                    return (
                                      <button
                                        key={`history-similar-page-btn-${p}`}
                                        onClick={() => setHistorySimilarCurrentPage(p as number)}
                                        className={cn(
                                          "h-7 w-7 text-xs font-semibold rounded-lg transition-all",
                                          p === historySimilarCurrentPage
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
                                  disabled={historySimilarCurrentPage === totalHistorySimilarPages}
                                  onClick={() => setHistorySimilarCurrentPage(prev => Math.min(prev + 1, totalHistorySimilarPages))}
                                  className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-50"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>

                                <div className="flex items-center gap-1.5 ml-2">
                                  <span className="text-xs text-slate-400">Par page :</span>
                                  <select
                                    value={historySimilarPageSize}
                                    onChange={(e) => {
                                      setHistorySimilarPageSize(parseInt(e.target.value));
                                      setHistorySimilarCurrentPage(1);
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
              ) : historyTab === "list" ? (
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
                          {historyAgenciesList.map(agence => {
                            const info = resolveAgencyInfo(agence);
                            const displayName = info.name !== `Agence ${agence}` ? `${info.name} (${agence})` : agence;
                            return (
                              <option key={`history-filter-agence-${agence}`} value={agence}>{displayName}</option>
                            );
                          })}
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

                      {/* Column Selector Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowHistoryColumnDropdown(!showHistoryColumnDropdown)}
                          className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl transition-all flex items-center gap-1.5"
                        >
                          Colonnes ({historyDisplayedColumns.length})
                        </button>
                        {showHistoryColumnDropdown && (
                          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 p-2 max-h-60 overflow-y-auto">
                            <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/60">
                              <button 
                                onClick={() => setHistoryVisibleColumns(historyAvailableColumns)}
                                className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                              >
                                Toutes
                              </button>
                              <button 
                                onClick={() => setHistoryVisibleColumns(historyAvailableColumns.slice(0, 6))}
                                className="text-[10px] text-slate-500 hover:underline"
                              >
                                Défaut
                              </button>
                            </div>
                            {historyAvailableColumns.map((col: string) => (
                              <label key={`col-toggle-history-list-${col}`} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={historyDisplayedColumns.includes(col)}
                                  onChange={() => {
                                    if (historyVisibleColumns.includes(col)) {
                                      setHistoryVisibleColumns(historyVisibleColumns.filter(c => c !== col));
                                    } else {
                                      setHistoryVisibleColumns([...historyVisibleColumns, col]);
                                    }
                                  }}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="truncate">{col}</span>
                              </label>
                            ))}
                          </div>
                        )}
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
                              {selectedHistoryReport.reconciliationType === "BOTH" && (
                                <th className="p-3 border-b border-slate-100 dark:border-slate-800/60 w-16">Type</th>
                              )}
                              {historyDisplayedColumns.map((col: string) => {
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
                                {selectedHistoryReport.reconciliationType === "BOTH" && (
                                  <td className="p-3 border-b border-slate-100 dark:border-slate-800/60">
                                    <span className={cn(
                                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                                      row.__sourcePortfolio === "VIE"
                                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                    )}>
                                      {row.__sourcePortfolio || "NS"}
                                    </span>
                                  </td>
                                )}
                                {historyDisplayedColumns.map((col: string) => (
                                  <td 
                                    key={`history-td-${rIdx}-${col}`} 
                                    className={cn(
                                      "p-3 border-b border-slate-100 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 max-w-[200px] truncate whitespace-nowrap",
                                      col === selectedHistoryReport.mapping?.nsId && "font-bold text-purple-600 dark:text-purple-400",
                                      col === selectedHistoryReport.mapping?.nsAgence && "font-bold text-blue-600 dark:text-blue-400"
                                    )}
                                    title={row[col] !== undefined && row[col] !== null ? renderTableCellContent(col, row[col], true) : ""}
                                  >
                                    {row[col] !== undefined && row[col] !== null ? renderTableCellContent(col, row[col], true) : ""}
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
              ) : (
                renderComplianceReportTab(
                  historyDelegationStats,
                  historyTop10AbsentKYC,
                  historySelectedDelegation,
                  setHistorySelectedDelegation,
                  agenciesBySelectedHistoryDelegation,
                  true,
                  resolvedHistoryAgencyStats
                )
              )}
            </div>
          </div>
        )
      )}

      {/* Sampling Modal */}
      {isSamplingModalOpen && (() => {
        const { idCol, adherentCol, nomClientCol } = getModalColumns();
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Contrôle & Échantillonnage</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {samplingStep === 1 
                      ? `Sélection de l'échantillon - Agence ${samplingAgency} (${resolveAgencyInfo(samplingAgency).name})`
                      : `Configuration du contrôle - Agence ${samplingAgency}`
                    }
                  </h3>
                </div>
                <button 
                  onClick={() => setIsSamplingModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              {samplingStep === 1 ? (
                <>
                  {/* Step 1 Content: Row selection */}
                  <div className="p-6 flex-1 overflow-y-auto space-y-4">
                    <div className="flex items-center gap-4 justify-between flex-wrap">
                      <div className="relative flex-1 min-w-[280px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Rechercher par identifiant, numéro adhérent ou nom de client..."
                          value={samplingSearchQuery}
                          onChange={(e) => setSamplingSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500/50 transition-colors"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const allIds: Record<string, boolean> = {};
                            filteredAgencySimilarRows.forEach((row: any) => {
                              if (idCol) {
                                const idVal = String(row[idCol] || "");
                                if (idVal) allIds[idVal] = true;
                              }
                            });
                            setSelectedSampleIds(allIds);
                          }}
                          className="text-xs font-bold text-blue-600 hover:text-blue-500 transition-colors"
                        >
                          Tout cocher
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          onClick={() => setSelectedSampleIds({})}
                          className="text-xs font-bold text-slate-500 hover:text-slate-400 transition-colors"
                        >
                          Tout décocher
                        </button>
                      </div>
                    </div>

                    <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/20 dark:bg-slate-900/5">
                      <div className="max-h-[40vh] overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                              <th className="p-3 w-12 text-center">Choix</th>
                              <th className="p-3">Identifiant</th>
                              {adherentCol && <th className="p-3">Num adherent</th>}
                              {nomClientCol && <th className="p-3">Nom Client</th>}
                              <th className="p-3">Nature Client</th>
                              {selectedHistoryReport?.columnsNS?.slice(0, 3).map((col: string) => {
                                if (col === idCol || col === selectedHistoryReport.mapping?.nsAgence || col === adherentCol || col === nomClientCol) return null;
                                return <th key={`sample-th-${col}`} className="p-3">{col}</th>;
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAgencySimilarRows.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                                  Aucun dossier correspondant.
                                </td>
                              </tr>
                            ) : (
                              filteredAgencySimilarRows.map((row: any, rIdx: number) => {
                                const idVal = idCol ? String(row[idCol] || "") : "";
                                const adherentVal = adherentCol ? String(row[adherentCol] || "") : "";
                                const nomClientVal = nomClientCol ? String(row[nomClientCol] || "") : "";
                                const isChecked = !!selectedSampleIds[idVal];
                                const currentNature = rowEntityTypes[idVal] || "Personne Physique";

                                return (
                                  <tr 
                                    key={`sample-tr-${rIdx}`} 
                                    onClick={() => {
                                      setSelectedSampleIds(prev => ({
                                        ...prev,
                                        [idVal]: !prev[idVal]
                                      }));
                                    }}
                                    className={cn(
                                      "hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-900",
                                      isChecked && "bg-blue-500/5 dark:bg-blue-500/5"
                                    )}
                                  >
                                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          setSelectedSampleIds(prev => ({
                                            ...prev,
                                            [idVal]: !prev[idVal]
                                          }));
                                        }}
                                        className="h-4 w-4 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                      />
                                    </td>
                                    <td className="p-3 font-bold text-slate-900 dark:text-white">{idVal}</td>
                                    {adherentCol && <td className="p-3 text-slate-700 dark:text-slate-350">{adherentVal}</td>}
                                    {nomClientCol && <td className="p-3 text-slate-800 dark:text-slate-300 font-semibold">{nomClientVal}</td>}
                                    
                                    {/* Nature Dropdown Selection directly in Step 1 */}
                                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                      <select
                                        value={currentNature}
                                        onChange={(e) => {
                                          const val = e.target.value as "Personne Physique" | "Association (OBNL)" | "Personne Morale";
                                          setRowEntityTypes(prev => ({
                                            ...prev,
                                            [idVal]: val
                                          }));
                                          // Also auto-select the checkbox for convenience if they modify the nature
                                          if (!isChecked) {
                                            setSelectedSampleIds(prev => ({
                                              ...prev,
                                              [idVal]: true
                                            }));
                                          }
                                        }}
                                        className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-1 outline-none font-medium cursor-pointer shadow-sm text-slate-700 dark:text-slate-300 focus:border-blue-500"
                                      >
                                        <option value="Personne Physique">Personne Physique (PP)</option>
                                        <option value="Personne Morale">Personne Morale (PM)</option>
                                        <option value="Association (OBNL)">Association (OBNL)</option>
                                      </select>
                                    </td>

                                    {selectedHistoryReport?.columnsNS?.slice(0, 3).map((col: string) => {
                                      if (col === idCol || col === selectedHistoryReport.mapping?.nsAgence || col === adherentCol || col === nomClientCol) return null;
                                      return (
                                        <td key={`sample-td-${rIdx}-${col}`} className="p-3 text-slate-500 dark:text-slate-400">
                                          {row[col] !== undefined && row[col] !== null ? formatExcelValue(col, row[col]) : ""}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Step 1 Footer */}
                  <div className="p-6 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/5 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      {Object.values(selectedSampleIds).filter(Boolean).length} dossier(s) sélectionné(s) sur {filteredAgencySimilarRows.length} visible(s) ({getAgencySimilarRows().length} total agence).
                    </span>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsSamplingModalOpen(false)}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        disabled={Object.values(selectedSampleIds).filter(Boolean).length === 0}
                        onClick={() => setSamplingStep(2)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/10"
                      >
                        Configurer le contrôle
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Step 2 Content: Configuration */}
                  <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">1. Synthèse de l'échantillon sélectionné</h4>
                      <p className="text-xs text-slate-400 mb-3">Voici la liste des dossiers qui seront insérés avec leur type d'entité respectif :</p>
                      <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden max-h-40 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/5 p-2 space-y-1">
                        {(() => {
                          const agencyRows = getAgencySimilarRows();
                          const selectedRows = agencyRows.filter((row: any) => {
                            const idVal = String(row[idCol] || "");
                            return !!selectedSampleIds[idVal];
                          });
                          return selectedRows.map((row: any, idx: number) => {
                            const idVal = String(row[idCol] || "");
                            const nomClientVal = nomClientCol ? String(row[nomClientCol] || "") : "";
                            const nature = rowEntityTypes[idVal] || "Personne Physique";
                            return (
                              <div key={`summary-${idx}`} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                                <span className="font-semibold text-slate-700 dark:text-slate-350">{idVal} - {nomClientVal}</span>
                                <span className={cn(
                                  "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border",
                                  nature === "Personne Physique" 
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : nature === "Association (OBNL)"
                                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                      : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                                )}>
                                  {nature}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">2. Périphérie de Contrôle</h4>
                      <p className="text-xs text-slate-400 mb-3">Définissez quels aspects de conformité doivent être validés pour cet échantillon (Complétude & Exactitude).</p>
                      
                      <div className="space-y-3">
                        <label className="flex items-start gap-3 p-3 border border-slate-100 dark:border-slate-800/80 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-900/20 cursor-pointer transition-all">
                          <input
                            type="checkbox"
                            checked={configCheckData}
                            onChange={(e) => setConfigCheckData(e.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white block">Contrôle des Données (Données de base)</span>
                            <span className="text-xs text-slate-400 block mt-0.5">Vérification de l'exactitude des informations saisies (noms, identifiants, adresses, dates de naissance, etc.).</span>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 p-3 border border-slate-100 dark:border-slate-800/80 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-900/20 cursor-pointer transition-all">
                          <input
                            type="checkbox"
                            checked={configCheckDocs}
                            onChange={(e) => setConfigCheckDocs(e.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white block">Contrôle des Documents (Pièces justificatives)</span>
                            <span className="text-xs text-slate-400 block mt-0.5">Vérification de la présence, validité et lisibilité des justificatifs requis (CIN, Passeport, Statuts, RNE, etc.).</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 Footer */}
                  <div className="p-6 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/5 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      Configuration appliquée à {Object.values(selectedSampleIds).filter(Boolean).length} dossier(s).
                    </span>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSamplingStep(1)}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                      >
                        Retour
                      </button>
                      <button
                        disabled={isSavingSample || (!configCheckData && !configCheckDocs)}
                        onClick={saveSampleChecklist}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shadow-md shadow-blue-500/10 flex items-center gap-2"
                      >
                        {isSavingSample ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Création...
                          </>
                        ) : (
                          "Valider et Créer les checklists"
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Geography Settings Modal (Admin Only) */}
      {isGeoSettingsOpen && user && isAdmin(user.authEmail || user.email || '') && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Configuration</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  Affectation Géographique des Agences
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Déplacez les agences et succursales entre les 8 délégations régionales. Ces modifications mettront à jour la carte et le tableau.
                </p>
              </div>
              <button 
                onClick={() => setIsGeoSettingsOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 h-[60vh] min-h-[400px] overflow-hidden flex flex-col md:flex-row gap-6">
              {/* Left column: List of delegations and their agencies */}
              <div className="w-full md:w-2/3 flex flex-col gap-4 overflow-hidden h-full min-h-0">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Vue par Délégation</h4>
                  <div className="flex gap-2">
                    <select
                      value={activeSettingsDelegation}
                      onChange={(e) => setActiveSettingsDelegation(e.target.value)}
                      className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 outline-none cursor-pointer"
                    >
                      {["Tunis Centre", "Tunis Nord", "Tunis Sud", "Sahel", "Sfax", "Cap Bon", "Nord ouest", "Sud", "Courtiers", "Siège", "Non affecté"].map(d => (
                        <option key={`opt-sel-del-${d}`} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-800/60 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(() => {
                      const filtered = allKnownAgencies.filter(a => a.currentDelegation === activeSettingsDelegation);
                      if (filtered.length === 0) {
                        return <p className="text-xs text-slate-400 italic col-span-2 text-center py-8">Aucune agence affectée à cette délégation</p>;
                      }
                      return filtered.map(ag => {
                        const isBrokerOrSiege = ag.currentType.toLowerCase() === "courtier" || 
                                                ag.currentType.toLowerCase() === "siege" || 
                                                ag.currentType.toLowerCase() === "siège";
                        return (
                          <div 
                            key={`settings-ag-card-${ag.code}`}
                            className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col gap-2.5 shadow-sm hover:shadow transition-shadow"
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-150 dark:bg-slate-800 text-slate-700 dark:text-slate-350 rounded-md">
                                Code: {ag.code}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                                {ag.currentType}
                              </span>
                            </div>
                            
                            {/* Nom Input */}
                            <div className="flex flex-col gap-0.5">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nom</label>
                              <input
                                type="text"
                                value={ag.name}
                                onChange={(e) => {
                                  const updated = { ...agencyOverrides };
                                  updated[ag.code] = { name: e.target.value, type: ag.currentType };
                                  saveAgencyOverrides(updated);
                                }}
                                className="w-full text-xs px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500/50 text-slate-800 dark:text-slate-100"
                              />
                            </div>

                            {/* Type & Gouvernorat */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col gap-0.5">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Type</label>
                                <select
                                  value={ag.currentType}
                                  onChange={(e) => {
                                    const newType = e.target.value;
                                    const updated = { ...agencyOverrides };
                                    updated[ag.code] = { name: ag.name, type: newType };
                                    saveAgencyOverrides(updated);
                                  }}
                                  className="w-full text-[11px] p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none cursor-pointer text-slate-800 dark:text-slate-100 font-medium"
                                >
                                  {["Succursale", "Agence", "Courtier", "Bureau direct", "Agent Stagiaire", "siege"].map(t => (
                                    <option key={`opt-type-${t}`} value={t}>{t === "siege" ? "Siège" : t}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex flex-col gap-0.5">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Gouvernorat</label>
                                <input
                                  type="text"
                                  value={ag.currentGouvernorat}
                                  disabled={isBrokerOrSiege}
                                  onChange={(e) => {
                                    const updatedGeo = { ...geographyOverrides };
                                    updatedGeo[ag.code] = { 
                                      delegation: ag.currentDelegation, 
                                      gouvernorat: e.target.value 
                                    };
                                    saveGeographyOverrides(updatedGeo);
                                  }}
                                  className="w-full text-xs px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500/50 text-slate-800 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                  placeholder={isBrokerOrSiege ? "-" : "Gouvernorat"}
                                />
                              </div>
                            </div>

                            {/* Délégation Select */}
                            <div className="flex flex-col gap-0.5">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Délégation</label>
                              {isBrokerOrSiege ? (
                                <div className="px-2 py-1 text-[11px] bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg font-bold border border-blue-100/50 dark:border-blue-900/30">
                                  {ag.currentDelegation} (Auto)
                                </div>
                              ) : (
                                <select
                                  value={ag.currentDelegation}
                                  onChange={(e) => {
                                    const newDelegation = e.target.value;
                                    const updatedGeo = { ...geographyOverrides };
                                    updatedGeo[ag.code] = { 
                                      delegation: newDelegation, 
                                      gouvernorat: ag.currentGouvernorat 
                                    };
                                    saveGeographyOverrides(updatedGeo);
                                  }}
                                  className="w-full text-[11px] p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none cursor-pointer text-blue-600 dark:text-blue-400 font-bold"
                                >
                                  {["Tunis Centre", "Tunis Nord", "Tunis Sud", "Sahel", "Sfax", "Cap Bon", "Nord ouest", "Sud", "Non affecté"].map(d => (
                                    <option key={`opt-move-del-${d}`} value={d}>{d}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* Right column: Search and actions */}
              <div className="w-full md:w-1/3 flex flex-col gap-4 overflow-hidden h-full min-h-0">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recherche & Actions Rapides</h4>
                
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher code ou nom d'agence..."
                    value={settingsSearchQuery}
                    onChange={(e) => setSettingsSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-800/60 rounded-xl p-3 flex flex-col gap-2 bg-slate-50/20 dark:bg-slate-900/10 animate-fadeIn">
                  {(() => {
                    const filtered = allKnownAgencies.filter(a => 
                      a.code.toLowerCase().includes(settingsSearchQuery.toLowerCase()) || 
                      a.name.toLowerCase().includes(settingsSearchQuery.toLowerCase())
                    );
                    if (filtered.length === 0) {
                      return <p className="text-xs text-slate-400 italic text-center py-4">Aucune agence trouvée</p>;
                    }
                    return filtered.slice(0, 30).map(ag => (
                      <div 
                        key={`settings-search-item-${ag.code}`}
                        className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-3 shadow-sm hover:border-blue-500/30 transition-colors"
                      >
                        <div 
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => {
                            if (["Tunis Centre", "Tunis Nord", "Tunis Sud", "Sahel", "Sfax", "Cap Bon", "Nord ouest", "Sud", "Courtiers", "Siège", "Non affecté"].includes(ag.currentDelegation)) {
                              setActiveSettingsDelegation(ag.currentDelegation);
                            }
                          }}
                        >
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400">{ag.name}</p>
                          <p className="text-[9px] text-slate-400 font-medium">
                            Code: {ag.code} • {ag.currentType} • <span className="underline">{ag.currentDelegation}</span>
                          </p>
                        </div>
                        
                        {ag.currentType.toLowerCase() === "courtier" || ag.currentType.toLowerCase() === "siege" || ag.currentType.toLowerCase() === "siège" ? (
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase shrink-0">
                            {ag.currentDelegation}
                          </span>
                        ) : (
                          <select
                            value={ag.currentDelegation}
                            onChange={(e) => {
                              const newDelegation = e.target.value;
                              const updated = { ...geographyOverrides };
                              updated[ag.code] = { delegation: newDelegation, gouvernorat: ag.currentGouvernorat };
                              saveGeographyOverrides(updated);
                            }}
                            className="text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-1 outline-none text-slate-600 dark:text-slate-300 font-medium shrink-0 cursor-pointer"
                          >
                            {["Tunis Centre", "Tunis Nord", "Tunis Sud", "Sahel", "Sfax", "Cap Bon", "Nord ouest", "Sud", "Non affecté"].map(d => (
                              <option key={`opt-move-search-del-${d}`} value={d}>{d}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ));
                  })()}
                  {allKnownAgencies.filter(a => 
                    a.code.toLowerCase().includes(settingsSearchQuery.toLowerCase()) || 
                    a.name.toLowerCase().includes(settingsSearchQuery.toLowerCase())
                  ).length > 30 && (
                    <p className="text-[10px] text-slate-400 text-center italic mt-1">Affichage limité aux 30 premiers résultats...</p>
                  )}
                </div>

                {/* Quick Add Custom Agency Assignment */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 rounded-xl flex flex-col gap-2">
                  <h5 className="text-[10px] font-bold uppercase text-slate-400">Ajouter une affectation spécifique</h5>
                  <div className="flex flex-col gap-1.5">
                    <input
                      type="text"
                      placeholder="Code"
                      value={settingsNewCode}
                      onChange={(e) => setSettingsNewCode(e.target.value)}
                      className="w-full p-1.5 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-slate-800 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="Nom de l'agence"
                      value={settingsNewName}
                      onChange={(e) => setSettingsNewName(e.target.value)}
                      className="w-full p-1.5 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-slate-800 dark:text-slate-100"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={settingsNewType}
                        onChange={(e) => setSettingsNewType(e.target.value)}
                        className="w-full p-1.5 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none cursor-pointer text-slate-700 dark:text-slate-350"
                      >
                        {["Succursale", "Agence", "Courtier", "Bureau direct", "Agent Stagiaire", "siege"].map(t => (
                          <option key={`opt-new-type-${t}`} value={t}>{t === "siege" ? "Siège" : t}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Gouvernorat"
                        disabled={settingsNewType.toLowerCase() === "courtier" || settingsNewType.toLowerCase() === "siege" || settingsNewType.toLowerCase() === "siège"}
                        value={settingsNewGouv}
                        onChange={(e) => setSettingsNewGouv(e.target.value)}
                        className="w-full p-1.5 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-slate-800 dark:text-slate-100 disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <select
                      value={settingsNewDel}
                      disabled={settingsNewType.toLowerCase() === "courtier" || settingsNewType.toLowerCase() === "siege" || settingsNewType.toLowerCase() === "siège"}
                      onChange={(e) => setSettingsNewDel(e.target.value)}
                      className="flex-1 p-1.5 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none cursor-pointer text-slate-700 dark:text-slate-350 disabled:opacity-50"
                    >
                      {["Tunis Centre", "Tunis Nord", "Tunis Sud", "Sahel", "Sfax", "Cap Bon", "Nord ouest", "Sud", "Non affecté"].map(d => (
                        <option key={`opt-new-del-${d}`} value={d}>{d}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const normCode = settingsNewCode.trim().replace(/^0+(?!$)/, "");
                        if (!normCode) {
                          alert("Veuillez saisir un code d'agence.");
                          return;
                        }
                        
                        const nameToSave = settingsNewName.trim() || `Agence ${normCode}`;
                        const typeToSave = settingsNewType;
                        const updatedOverrides = { ...agencyOverrides };
                        updatedOverrides[normCode] = { name: nameToSave, type: typeToSave };
                        saveAgencyOverrides(updatedOverrides);

                        const isBrokerOrSiege = typeToSave.toLowerCase() === "courtier" || 
                                                typeToSave.toLowerCase() === "siege" || 
                                                typeToSave.toLowerCase() === "siège";
                        const finalDel = isBrokerOrSiege 
                          ? (typeToSave.toLowerCase() === "courtier" ? "Courtiers" : "Siège")
                          : settingsNewDel;
                        const finalGouv = isBrokerOrSiege ? "" : (settingsNewGouv.trim() || "Tunis");

                        const updatedGeo = { ...geographyOverrides };
                        updatedGeo[normCode] = { 
                          delegation: finalDel, 
                          gouvernorat: finalGouv 
                        };
                        saveGeographyOverrides(updatedGeo);

                        setSettingsNewCode("");
                        setSettingsNewName("");
                        setSettingsNewType("Agence");
                        setSettingsNewGouv("");
                      }}
                      className="px-3 py-1.5 text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer shadow-sm shrink-0"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/20 flex items-center justify-between">
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    if (confirm("Voulez-vous vraiment réinitialiser toutes les surcharges de noms et types d'agences ?")) {
                      saveAgencyOverrides({});
                    }
                  }}
                  className="text-xs text-rose-500 hover:underline font-semibold cursor-pointer"
                >
                  Réinitialiser noms/types
                </button>
                <button
                  onClick={() => {
                    if (confirm("Voulez-vous vraiment réinitialiser toutes les surcharges d'affectation géographique ? Cela rétablira les affectations par défaut.")) {
                      saveGeographyOverrides({});
                    }
                  }}
                  className="text-xs text-rose-500 hover:underline font-semibold cursor-pointer"
                >
                  Réinitialiser affectations géographiques
                </button>
              </div>
              <button
                onClick={() => setIsGeoSettingsOpen(false)}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
