"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { useUser } from "@/contexts/UserContext";
import { useActivityLog } from "@/contexts/ActivityLogContext";
import {
  ClipboardList,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  User,
  Users,
  Building,
  Calendar,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
  FileText,
  TrendingUp,
  AlertOctagon,
  MapPin,
  Building2,
  HelpCircle,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAgencyGeography } from "@/data/agencyGeography";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from "recharts";

interface ControlItem {
  id: string; // `${clientId}_${monthKey}`
  clientId: string;
  clientName: string;
  agencyCode: string;
  agencyName: string;
  monthKey: string;
  monthLabel: string;
  entityType: "Personne Physique" | "Association (OBNL)" | "Personne Morale";
  checkCategories: string[]; // ["Données", "Documents"]
  status: "Non commencé" | "En cours" | "Conforme" | "Non conforme";
  comments: string;
  createdAt: string;
  updatedAt: string;
  checklist?: Record<string, boolean>; // e.g. { "pp_donnees_1": true }
}

const DEFAULT_CHECKLIST_TEMPLATES = {
  "Personne Physique": {
    "Données": [
      { id: "pp_data_1", text: "Cohérence Nom / Identifiant NS" },
      { id: "pp_data_2", text: "Validité de la date de naissance (format, majorité)" },
      { id: "pp_data_3", text: "Renseignement de l'adresse et de la ville" }
    ],
    "Documents": [
      { id: "pp_docs_1", text: "Copie de la pièce d'identité (CIN/Passeport) lisible et valide" },
      { id: "pp_docs_2", text: "Justificatif de domicile récent (< 3 mois)" }
    ]
  },
  "Association (OBNL)": {
    "Données": [
      { id: "obnl_data_1", text: "Raison sociale et numéro d'enregistrement" },
      { id: "obnl_data_2", text: "Identification des dirigeants et membres du bureau" },
      { id: "obnl_data_3", text: "Vérification du code CAT_I = 6" }
    ],
    "Documents": [
      { id: "obnl_docs_1", text: "Statuts de l'association signés et enregistrés" },
      { id: "obnl_docs_2", text: "Copie de la publication au JORT (Journal Officiel)" },
      { id: "obnl_docs_3", text: "Pièces d'identité des dirigeants principaux" }
    ]
  },
  "Personne Morale": {
    "Données": [
      { id: "pm_data_1", text: "Raison sociale et immatriculation fiscale (MF/RNE)" },
      { id: "pm_data_2", text: "Identification du représentant légal" },
      { id: "pm_data_3", text: "Identification des bénéficiaires effectifs (UBO)" }
    ],
    "Documents": [
      { id: "pm_docs_1", text: "Extrait RNE récent (< 3 mois)" },
      { id: "pm_docs_2", text: "Statuts de la société certifiés conformes" },
      { id: "pm_docs_3", text: "Pièce d'identité du représentant légal" }
    ]
  }
};

export default function ControleSuiviPage() {
  const { user } = useUser();
  const { logAction } = useActivityLog();

  // Core data states
  const [items, setItems] = useState<ControlItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tab & Trend states
  const [activeTab, setActiveTab] = useState<"fiches" | "tendances">("fiches");
  const [regtoolsHistory, setRegtoolsHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedTrendAgency, setSelectedTrendAgency] = useState<string>("ALL");
  const [trendMetric, setTrendMetric] = useState<"pct" | "count">("pct");

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgency, setSelectedAgency] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");

  // Modal / Editing states
  const [editingItem, setEditingItem] = useState<ControlItem | null>(null);
  const [modalStatus, setModalStatus] = useState<ControlItem["status"]>("Non commencé");
  const [modalComments, setModalComments] = useState("");
  const [modalChecklist, setModalChecklist] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Firebase Realtime sync and localstorage fallback
  useEffect(() => {
    let unsubscribe = () => {};

    // 1. Initial Load from LocalStorage
    const localData = localStorage.getItem("compliance_controle_suivi");
    if (localData) {
      try {
        setItems(JSON.parse(localData));
      } catch (err) {
        console.error("Local storage parse error:", err);
      }
      setIsLoading(false);
    }

    // 2. Real-time sync with Firestore if online
    if (isFirebaseConfigured && db) {
      setIsLoading(true);
      const loadSync = async () => {
        try {
          const { collection, onSnapshot, query, orderBy } = await import("firebase/firestore");
          const q = query(collection(db, "controleSuivi"), orderBy("createdAt", "desc"));
          
          unsubscribe = onSnapshot(q, (snapshot) => {
            const firebaseItems: ControlItem[] = [];
            snapshot.forEach((doc) => {
              firebaseItems.push(doc.data() as ControlItem);
            });
            setItems(firebaseItems);
            localStorage.setItem("compliance_controle_suivi", JSON.stringify(firebaseItems));
            setIsLoading(false);
          }, (err) => {
            console.error("Firestore sync error:", err);
            setIsLoading(false);
          });
        } catch (err) {
          console.error("Failed to import/load firestore:", err);
          setIsLoading(false);
        }
      };
      loadSync();
    }

    return () => unsubscribe();
  }, []);

  // Load reconciliation history
  useEffect(() => {
    const fetchHistory = async () => {
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
          localList.forEach((localReport: any) => {
            if (!reportsList.some(r => r.monthKey === localReport.monthKey)) {
              reportsList.push(localReport);
            }
          });
        }
      } catch (err) {
        console.error("Erreur lors de la lecture de l'historique local :", err);
      }

      // Fetch full details if needed (especially agencyStats)
      for (let i = 0; i < reportsList.length; i++) {
        const r = reportsList[i];
        if (!r.agencyStats) {
          try {
            const fullLocalReportJSON = localStorage.getItem(`regtools_report_${r.monthKey}`);
            if (fullLocalReportJSON) {
              const fullLocal = JSON.parse(fullLocalReportJSON);
              reportsList[i] = { ...reportsList[i], ...fullLocal };
            }
          } catch (e) {
            console.error(e);
          }
        }
      }

      const parseMonthKeyToDate = (monthKey: string) => {
        const cleanKey = monthKey.replace(/_(NS|VIE)$/, "");
        if (cleanKey.length === 6) {
          const month = parseInt(cleanKey.slice(0, 2), 10);
          const year = parseInt(cleanKey.slice(2), 10);
          return new Date(year, month - 1, 1);
        }
        return new Date(0);
      };

      // Sort by date ascending (for trends)
      reportsList.sort((a, b) => parseMonthKeyToDate(a.monthKey).getTime() - parseMonthKeyToDate(b.monthKey).getTime());
      setRegtoolsHistory(reportsList);
      setIsLoadingHistory(false);
    };

    fetchHistory();
  }, []);

  // Compute filters
  const agenciesList = useMemo(() => {
    const list = new Set<string>();
    items.forEach((x) => {
      if (x.agencyCode) {
        list.add(`${x.agencyCode} - ${x.agencyName}`);
      }
    });
    return Array.from(list).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        searchQuery === "" ||
        item.clientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchAgency =
        selectedAgency === "ALL" ||
        item.agencyCode === selectedAgency.split(" - ")[0];

      const matchStatus =
        selectedStatus === "ALL" ||
        item.status === selectedStatus;

      const matchType =
        selectedType === "ALL" ||
        item.entityType === selectedType;

      return matchSearch && matchAgency && matchStatus && matchType;
    });
  }, [items, searchQuery, selectedAgency, selectedStatus, selectedType]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = items.length;
    const compliant = items.filter(x => x.status === "Conforme").length;
    const nonCompliant = items.filter(x => x.status === "Non conforme").length;
    const inProgress = items.filter(x => x.status === "En cours").length;
    const notStarted = items.filter(x => x.status === "Non commencé").length;
    const completionRate = total > 0 ? Math.round((compliant / total) * 100) : 0;
    const progressRate = total > 0 ? Math.round(((compliant + nonCompliant + inProgress) / total) * 100) : 0;

    return { total, compliant, nonCompliant, inProgress, notStarted, completionRate, progressRate };
  }, [items]);

  // Pagination slice
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  // Get latest report
  const latestReport = useMemo(() => {
    if (regtoolsHistory.length === 0) return null;
    return regtoolsHistory[regtoolsHistory.length - 1]; // Already sorted chronologically, so last is latest
  }, [regtoolsHistory]);

  // Find critical agencies from the latest report
  // (pctMissing > 10% AND missing > 10 fiches)
  const criticalAgencies = useMemo(() => {
    if (!latestReport || !latestReport.agencyStats) return [];
    return latestReport.agencyStats.filter((stat: any) => {
      return stat.pctMissing > 10 && stat.missing > 10;
    }).map((stat: any) => {
      const geo = getAgencyGeography(stat.agence, stat.nom);
      return {
        ...stat,
        delegation: geo?.delegation || "Inconnue",
        gouvernorat: geo?.gouvernorat || "Inconnu"
      };
    });
  }, [latestReport]);

  // Get all unique delegations from history
  const allDelegations = useMemo(() => {
    const delegations = new Set<string>();
    regtoolsHistory.forEach(r => {
      if (r.agencyStats) {
        r.agencyStats.forEach((stat: any) => {
          const geo = getAgencyGeography(stat.agence, stat.nom);
          if (geo && geo.delegation) {
            delegations.add(geo.delegation);
          }
        });
      }
    });
    return Array.from(delegations).sort();
  }, [regtoolsHistory]);

  // Get all unique agencies from history (for select menu)
  const allHistoryAgencies = useMemo(() => {
    const agenciesMap = new Map<string, { code: string; name: string }>();
    regtoolsHistory.forEach(r => {
      if (r.agencyStats) {
        r.agencyStats.forEach((stat: any) => {
          agenciesMap.set(stat.agence, { code: stat.agence, name: stat.nom });
        });
      }
    });
    return Array.from(agenciesMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [regtoolsHistory]);

  // Global trends over time
  const globalTrends = useMemo(() => {
    return regtoolsHistory.map(r => {
      let totalFiches = 0;
      let missingFiches = 0;
      if (r.agencyStats) {
        r.agencyStats.forEach((stat: any) => {
          totalFiches += stat.total || 0;
          missingFiches += stat.missing || 0;
        });
      } else if (r.globalStats) {
        totalFiches = r.globalStats.total || 0;
        missingFiches = r.globalStats.missing || 0;
      }
      const pctMissing = totalFiches > 0 ? parseFloat(((missingFiches / totalFiches) * 100).toFixed(2)) : 0;
      return {
        monthLabel: r.monthLabel || r.monthKey,
        monthKey: r.monthKey,
        total: totalFiches,
        missing: missingFiches,
        pctMissing
      };
    });
  }, [regtoolsHistory]);

  // Delegation trends over time
  const delegationTrends = useMemo(() => {
    return regtoolsHistory.map(r => {
      const row: any = {
        monthLabel: r.monthLabel || r.monthKey,
        monthKey: r.monthKey,
      };

      // Initialize each delegation's stats
      const delegationTotals: Record<string, { total: number; missing: number }> = {};
      allDelegations.forEach(del => {
        delegationTotals[del] = { total: 0, missing: 0 };
      });

      if (r.agencyStats) {
        r.agencyStats.forEach((stat: any) => {
          const geo = getAgencyGeography(stat.agence, stat.nom);
          const del = geo?.delegation;
          if (del && delegationTotals[del]) {
            delegationTotals[del].total += stat.total || 0;
            delegationTotals[del].missing += stat.missing || 0;
          }
        });
      }

      // Compute percentages
      allDelegations.forEach(del => {
        const d = delegationTotals[del];
        row[del] = d.total > 0 ? parseFloat(((d.missing / d.total) * 100).toFixed(2)) : 0;
        row[del + "_missing"] = d.missing;
        row[del + "_total"] = d.total;
      });

      return row;
    });
  }, [regtoolsHistory, allDelegations]);

  // Selected agency trends over time
  const selectedAgencyTrendData = useMemo(() => {
    if (selectedTrendAgency === "ALL") return [];
    return regtoolsHistory.map(r => {
      const stat = r.agencyStats?.find((s: any) => s.agence === selectedTrendAgency);
      return {
        monthLabel: r.monthLabel || r.monthKey,
        total: stat ? stat.total : 0,
        missing: stat ? stat.missing : 0,
        pctMissing: stat ? stat.pctMissing : 0
      };
    });
  }, [regtoolsHistory, selectedTrendAgency]);


  // Open Checklist Modal
  const openEditModal = (item: ControlItem) => {
    setEditingItem(item);
    setModalStatus(item.status);
    setModalComments(item.comments || "");
    setModalChecklist(item.checklist || {});
  };

  // Close Checklist Modal
  const closeEditModal = () => {
    setEditingItem(null);
  };

  // Save changes to Firestore & LocalStorage
  const handleSaveItem = async () => {
    if (!editingItem) return;
    setIsSaving(true);

    try {
      const updatedItem: ControlItem = {
        ...editingItem,
        status: modalStatus,
        comments: modalComments,
        checklist: modalChecklist,
        updatedAt: new Date().toISOString()
      };

      // 1. Sync Firestore
      if (isFirebaseConfigured && db) {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "controleSuivi", updatedItem.id), updatedItem);
      }

      // 2. Sync Local Storage
      const localKey = "compliance_controle_suivi";
      const existing = localStorage.getItem(localKey);
      const list = existing ? JSON.parse(existing) : [];
      const updatedList = list.map((x: ControlItem) => x.id === updatedItem.id ? updatedItem : x);
      localStorage.setItem(localKey, JSON.stringify(updatedList));

      // 3. Update local state
      setItems(updatedList);

      // 4. Log Action
      if (user) {
        logAction({
          actionType: "UPDATE",
          description: `Mise à jour du contrôle KYC (${updatedItem.clientId} - ${updatedItem.clientName}) : Statut = ${updatedItem.status}`,
          details: {
            clientId: updatedItem.clientId,
            clientName: updatedItem.clientName,
            status: updatedItem.status,
            monthKey: updatedItem.monthKey
          },
          targetId: updatedItem.id,
          userEmail: user.email || user.authEmail || ""
        });
      }

      alert("Contrôle enregistré et synchronisé avec succès.");
      closeEditModal();
    } catch (error: any) {
      alert("Erreur lors de l'enregistrement : " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete checklist item
  const handleDeleteItem = async (itemId: string, clientName: string) => {
    if (!confirm(`Voulez-vous vraiment retirer le dossier "${clientName}" du processus de contrôle ?`)) return;

    try {
      if (isFirebaseConfigured && db) {
        const { doc, deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "controleSuivi", itemId));
      }

      const localKey = "compliance_controle_suivi";
      const existing = localStorage.getItem(localKey);
      const list = existing ? JSON.parse(existing) : [];
      const updatedList = list.filter((x: ControlItem) => x.id !== itemId);
      localStorage.setItem(localKey, JSON.stringify(updatedList));
      setItems(updatedList);

      if (user) {
        logAction({
          actionType: "DELETE",
          description: `Suppression du contrôle KYC pour le dossier ${clientName}`,
          details: { itemId },
          targetId: itemId,
          userEmail: user.email || user.authEmail || ""
        });
      }
      alert("Dossier supprimé du processus de contrôle.");
    } catch (err: any) {
      alert("Erreur lors de la suppression : " + err.message);
    }
  };

  // Get template items to display in modal
  const activeTemplate = useMemo(() => {
    if (!editingItem) return { dataItems: [], docsItems: [] };
    const typeTemplates = DEFAULT_CHECKLIST_TEMPLATES[editingItem.entityType] || { Données: [], Documents: [] };
    
    return {
      dataItems: editingItem.checkCategories.includes("Données") ? typeTemplates.Données : [],
      docsItems: editingItem.checkCategories.includes("Documents") ? typeTemplates.Documents : []
    };
  }, [editingItem]);

  const modalCompletion = useMemo(() => {
    const totalChecks = activeTemplate.dataItems.length + activeTemplate.docsItems.length;
    if (totalChecks === 0) return 0;
    
    let checkedCount = 0;
    activeTemplate.dataItems.forEach((x) => {
      if (modalChecklist[x.id]) checkedCount++;
    });
    activeTemplate.docsItems.forEach((x) => {
      if (modalChecklist[x.id]) checkedCount++;
    });
    
    return Math.round((checkedCount / totalChecks) * 100);
  }, [activeTemplate, modalChecklist]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/60">Gouvernance & Conformité</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
            Contrôle & Suivi KYC
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Suivi, audit et vérification manuelle de la complétude et de l'exactitude de l'échantillon de clients similaires.
          </p>
        </div>
        
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Synchronisation...</span>
          </div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-px gap-2">
        <button
          onClick={() => setActiveTab("fiches")}
          className={cn(
            "pb-3 text-sm font-bold border-b-2 px-2 transition-all inline-flex items-center gap-2",
            activeTab === "fiches"
              ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300"
          )}
        >
          <ClipboardList className="h-4 w-4" />
          Suivi des Fiches d'Audit ({filteredItems.length})
        </button>
        <button
          onClick={() => setActiveTab("tendances")}
          className={cn(
            "pb-3 text-sm font-bold border-b-2 px-2 transition-all inline-flex items-center gap-2",
            activeTab === "tendances"
              ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300"
          )}
        >
          <TrendingUp className="h-4 w-4" />
          Analyse Temporelle & Agences Critiques
        </button>
      </div>

      {activeTab === "fiches" ? (
        <>
          {/* Stats Cards Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Card */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Échantillonnés</span>
                <ClipboardList className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</h3>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                  <Clock className="h-3 w-3" />
                  <span>Progression : {stats.progressRate}%</span>
                </div>
              </div>
            </div>

            {/* Not Started Card */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Non commencé</span>
                <Clock className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-500">{stats.notStarted}</h3>
                <span className="text-[10px] text-slate-400 block mt-1">Dossiers en attente d'audit</span>
              </div>
            </div>

            {/* In Progress Card */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">En cours</span>
                <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.inProgress}</h3>
                <span className="text-[10px] text-slate-400 block mt-1">Vérification de pièces en cours</span>
              </div>
            </div>

            {/* Compliant Card */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Conforme</span>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-emerald-500">{stats.compliant}</h3>
                <span className="text-[10px] text-emerald-500 block mt-1">Taux de conformité : {stats.completionRate}%</span>
              </div>
            </div>

            {/* Non Compliant Card */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Non conforme</span>
                <AlertTriangle className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-rose-500">{stats.nonCompliant}</h3>
                <span className="text-[10px] text-rose-500 block mt-1">Anomalies KYC détectées</span>
              </div>
            </div>
          </div>

          {/* Main layout: Filters + list */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm overflow-hidden">
            {/* Filters bar */}
            <div className="p-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/5 flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[280px]">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par identifiant ou nom de client..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500/50 transition-colors shadow-sm"
                  />
                </div>

                {/* Dropdowns filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Agency */}
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1 text-sm shadow-sm">
                    <Filter className="h-3.5 w-3.5 text-slate-450" />
                    <select
                      value={selectedAgency}
                      onChange={(e) => {
                        setSelectedAgency(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-transparent py-1.5 outline-none w-full text-slate-700 dark:text-slate-350 cursor-pointer"
                    >
                      <option value="ALL">Toutes les Agences</option>
                      {agenciesList.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1 text-sm shadow-sm">
                    <Clock className="h-3.5 w-3.5 text-slate-455" />
                    <select
                      value={selectedStatus}
                      onChange={(e) => {
                        setSelectedStatus(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-transparent py-1.5 outline-none w-full text-slate-700 dark:text-slate-350 cursor-pointer"
                    >
                      <option value="ALL">Tous les Statuts</option>
                      <option value="Non commencé">Non commencé</option>
                      <option value="En cours">En cours</option>
                      <option value="Conforme">Conforme</option>
                      <option value="Non conforme">Non conforme</option>
                    </select>
                  </div>

                  {/* Entity Type */}
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1 text-sm shadow-sm">
                    <User className="h-3.5 w-3.5 text-slate-455" />
                    <select
                      value={selectedType}
                      onChange={(e) => {
                        setSelectedType(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-transparent py-1.5 outline-none w-full text-slate-700 dark:text-slate-350 cursor-pointer"
                    >
                      <option value="ALL">Tous les Types</option>
                      <option value="Personne Physique">Personne Physique</option>
                      <option value="Association (OBNL)">Association (OBNL)</option>
                      <option value="Personne Morale">Personne Morale</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Data list table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
                    <th className="p-4">Client</th>
                    <th className="p-4">Agence / Succursale</th>
                    <th className="p-4">Rapprochement (Mois)</th>
                    <th className="p-4 text-center">Type Entité</th>
                    <th className="p-4 text-center">Périphérie</th>
                    <th className="p-4 text-center">Statut</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800/60">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400 italic">
                        {isLoading ? "Chargement des dossiers..." : "Aucune fiche de contrôle correspondante."}
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                        {/* Client Info */}
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">{item.clientId}</span>
                            <span className="text-xs text-slate-500 font-medium">{item.clientName}</span>
                          </div>
                        </td>

                        {/* Agency Info */}
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 dark:text-slate-300 text-xs">{item.agencyName}</span>
                            <span className="text-[10px] text-slate-400">Code : {item.agencyCode}</span>
                          </div>
                        </td>

                        {/* Month (Report context) */}
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{item.monthLabel}</span>
                          </div>
                        </td>

                        {/* Entity type badge */}
                        <td className="p-4 text-center">
                          <span className={cn(
                            "text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border",
                            item.entityType === "Personne Physique" 
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : item.entityType === "Association (OBNL)"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                          )}>
                            {item.entityType}
                          </span>
                        </td>

                        {/* Periphery tags */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {item.checkCategories.map(cat => (
                              <span key={cat} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700/60">
                                {cat}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Status badge */}
                        <td className="p-4 text-center">
                          <span className={cn(
                            "text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-tight",
                            item.status === "Conforme" 
                              ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" 
                              : item.status === "Non conforme"
                                ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400"
                                : item.status === "En cours"
                                  ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          )}>
                            {item.status}
                          </span>
                        </td>

                        {/* Action button */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModal(item)}
                              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-sm"
                            >
                              Contrôler
                              <ArrowRight className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, item.clientName)}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg transition-colors inline-flex items-center justify-center"
                              title="Supprimer ce contrôle"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination bar */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-between items-center gap-4 flex-wrap bg-slate-50/20 dark:bg-slate-900/5">
                <span className="text-xs text-slate-400 font-medium">
                  Affichage de <span className="font-bold text-slate-700 dark:text-white">{(currentPage - 1) * pageSize + 1}</span> à{" "}
                  <span className="font-bold text-slate-700 dark:text-white">{Math.min(currentPage * pageSize, filteredItems.length)}</span> sur{" "}
                  <span className="font-bold text-slate-700 dark:text-white">{filteredItems.length}</span> dossiers
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="p-1.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 px-2">
                    Page {currentPage} / {totalPages}
                  </span>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="p-1.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          {isLoadingHistory ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <span className="text-sm font-medium">Chargement de l'analyse historique...</span>
            </div>
          ) : regtoolsHistory.length === 0 ? (
            <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-12 text-center space-y-4">
              <AlertOctagon className="h-12 w-12 text-amber-500 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Aucun historique disponible</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Veuillez d'abord effectuer et sauvegarder un rapprochement RegTools depuis l'onglet dédié pour pouvoir analyser l'évolution dans le temps.
              </p>
            </div>
          ) : (
            <>
              {/* Section 1: Critical Agencies */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-rose-500" />
                    Agences & Succursales Critiques
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-lg">
                    Rapprochement : {latestReport?.monthLabel}
                  </span>
                </div>

                {criticalAgencies.length === 0 ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-450">Aucune agence critique détectée</h4>
                      <p className="text-xs text-emerald-700/80 dark:text-emerald-500/80 mt-1 leading-relaxed">
                        Félicitations ! Toutes les agences et succursales respectent les critères de conformité pour le dernier rapprochement (seuil : taux d'absence KYC &le; 10% ou moins de 10 fiches absentes).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                      <AlertOctagon className="h-6 w-6 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-rose-800 dark:text-rose-450">Agences Critiques Détectées ({criticalAgencies.length})</h4>
                        <p className="text-xs text-rose-700/80 dark:text-rose-500/80 mt-1 leading-relaxed">
                          Les entités listées ci-dessous dépassent simultanément les seuils d'alerte : <strong>taux d'absence KYC &gt; 10%</strong> et <strong>plus de 10 fiches absentes</strong>. Une attention immédiate est requise de la part du service conformité.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {criticalAgencies.map((agency: any) => (
                        <div key={agency.agence} className="bg-white dark:bg-slate-950 border-2 border-rose-500/25 dark:border-rose-500/20 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-all">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded uppercase tracking-wider border border-rose-500/10">
                                  {agency.type || "Agence"} Critique
                                </span>
                                <h5 className="font-extrabold text-slate-900 dark:text-white mt-1.5 text-sm">
                                  {agency.nom}
                                </h5>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Code : {agency.agence} | Délégation : {agency.delegation}
                                </p>
                              </div>
                              <div className="h-8 w-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                                <AlertTriangle className="h-4 w-4" />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl text-center border border-slate-100 dark:border-slate-800/80">
                              <div>
                                <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-tight">Taux absence</span>
                                <span className="text-sm font-black text-rose-600 dark:text-rose-400">{agency.pctMissing}%</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-tight">Fiches absentes</span>
                                <span className="text-sm font-black text-rose-600 dark:text-rose-400">{agency.missing} / {agency.total}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-850">
                            <span className="text-[10px] text-rose-600/90 dark:text-rose-400/95 font-semibold flex items-start gap-1">
                              <span className="shrink-0 font-bold">•</span>
                              <span>
                                Cette entité est classée comme critique car elle présente un taux d'absence KYC de {agency.pctMissing}% (supérieur à 10%) et compte {agency.missing} fiches absentes (supérieur à 10).
                              </span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Temporal Trends (2 or more months) */}
              <div className="space-y-4 pt-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Tendances Temporelles & Évolution
                </h3>

                {regtoolsHistory.length < 2 ? (
                  <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-400 italic text-xs leading-relaxed">
                    <Info className="h-5 w-5 text-slate-400 mx-auto mb-2" />
                    L'analyse des tendances temporelles et la comparaison de l'évolution nécessitent au moins deux mois de rapprochement enregistrés. 
                    Actuellement, vous n'avez que {regtoolsHistory.length} rapprochement(s) sauvegardé(s) dans le système.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Chart 1: Global Trend */}
                      <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                            Évolution Globale du Taux d'Absence KYC (%)
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Taux moyen de fiches RegTools sans correspondance dans les bases NS / VIE au cours du temps.
                          </p>
                        </div>
                        
                        <div className="h-[280px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={globalTrends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-800" />
                              <XAxis dataKey="monthLabel" tick={{ fontSize: 10 }} className="text-slate-450" />
                              <YAxis tick={{ fontSize: 10 }} unit="%" className="text-slate-450" />
                              <RechartsTooltip 
                                contentStyle={{ 
                                  backgroundColor: "rgba(30, 41, 59, 0.95)", 
                                  border: "none", 
                                  borderRadius: "12px",
                                  color: "#fff"
                                }}
                                labelStyle={{ fontWeight: "bold", fontSize: "11px", marginBottom: "4px" }}
                                itemStyle={{ fontSize: "11px", color: "#60a5fa" }}
                              />
                              <ReferenceLine y={10} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: "Seuil Critique (10%)", fill: "#f43f5e", fontSize: 9, position: "top" }} />
                              <Line type="monotone" dataKey="pctMissing" name="Taux d'absence" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Chart 2: Delegation Comparison */}
                      <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Layers className="h-4 w-4 text-emerald-500" />
                            Évolution par Délégation Régionale (%)
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Comparatif de l'évolution du taux d'absence KYC par délégation.
                          </p>
                        </div>
                        
                        <div className="h-[280px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={delegationTrends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-800" />
                              <XAxis dataKey="monthLabel" tick={{ fontSize: 10 }} className="text-slate-450" />
                              <YAxis tick={{ fontSize: 10 }} unit="%" className="text-slate-450" />
                              <RechartsTooltip
                                contentStyle={{ 
                                  backgroundColor: "rgba(30, 41, 59, 0.95)", 
                                  border: "none", 
                                  borderRadius: "12px",
                                  color: "#fff"
                                }}
                                labelStyle={{ fontWeight: "bold", fontSize: "11px", marginBottom: "4px" }}
                                itemStyle={{ fontSize: "10px" }}
                              />
                              <Legend wrapperStyle={{ fontSize: 9, paddingTop: 10 }} />
                              {allDelegations.map(del => {
                                const DELEGATION_COLORS: Record<string, string> = {
                                  "Tunis Centre": "#2563eb",
                                  "Tunis Nord": "#3b82f6",
                                  "Tunis Sud": "#60a5fa",
                                  "Sahel": "#10b981",
                                  "Sfax": "#f59e0b",
                                  "Cap Bon": "#8b5cf6",
                                  "Nord ouest": "#ec4899",
                                  "Sud": "#14b8a6",
                                  "Courtiers": "#6b7280",
                                  "Siége": "#f43f5e",
                                  "Siège": "#f43f5e"
                                };
                                return (
                                  <Line 
                                    key={del} 
                                    type="monotone" 
                                    dataKey={del} 
                                    name={del} 
                                    stroke={DELEGATION_COLORS[del] || "#cbd5e1"} 
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                  />
                                );
                              })}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Agency Individually */}
                    <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-indigo-500" />
                            Analyse Évolutionnaire par Agence
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Sélectionnez une agence ou une succursale pour observer son graphique d'évolution.
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-1.5 text-xs shadow-sm">
                            <Filter className="h-3.5 w-3.5 text-slate-400" />
                            <select
                              value={selectedTrendAgency}
                              onChange={(e) => setSelectedTrendAgency(e.target.value)}
                              className="bg-transparent outline-none w-full max-w-[250px] text-slate-700 dark:text-slate-350 cursor-pointer font-bold"
                            >
                              <option value="ALL">-- Choisir une Agence --</option>
                              {allHistoryAgencies.map((a: any) => (
                                <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                              ))}
                            </select>
                          </div>

                          {selectedTrendAgency !== "ALL" && (
                            <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden text-xs font-bold shadow-sm shrink-0">
                              <button
                                onClick={() => setTrendMetric("pct")}
                                className={cn("px-3 py-1.5 transition-colors", trendMetric === "pct" ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400")}
                              >
                                % Absence
                              </button>
                              <button
                                onClick={() => setTrendMetric("count")}
                                className={cn("px-3 py-1.5 transition-colors", trendMetric === "count" ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400")}
                              >
                                Nb Absents
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedTrendAgency === "ALL" ? (
                        <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl py-14 text-center text-xs text-slate-400 italic">
                          <Building className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                          Veuillez sélectionner une agence dans le menu déroulant ci-dessus pour observer son graphique d'évolution.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                          <div className="lg:col-span-2 h-[260px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={selectedAgencyTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-850" />
                                <XAxis dataKey="monthLabel" tick={{ fontSize: 10 }} className="text-slate-450" />
                                <YAxis tick={{ fontSize: 10 }} unit={trendMetric === "pct" ? "%" : ""} className="text-slate-450" />
                                <RechartsTooltip
                                  contentStyle={{ 
                                    backgroundColor: "rgba(30, 41, 59, 0.95)", 
                                    border: "none", 
                                    borderRadius: "12px",
                                    color: "#fff"
                                  }}
                                  labelStyle={{ fontWeight: "bold", fontSize: "11px", marginBottom: "4px" }}
                                  itemStyle={{ fontSize: "11px", color: "#818cf8" }}
                                />
                                {trendMetric === "pct" ? (
                                  <>
                                    <ReferenceLine y={10} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: "Seuil Critique (10%)", fill: "#f43f5e", fontSize: 8, position: "top" }} />
                                    <Line type="monotone" dataKey="pctMissing" name="Taux d'absence" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                  </>
                                ) : (
                                  <>
                                    <ReferenceLine y={10} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: "Seuil Critique (10 fiches)", fill: "#f43f5e", fontSize: 8, position: "top" }} />
                                    <Line type="monotone" dataKey="missing" name="Fiches absentes" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                  </>
                                )}
                              </LineChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 space-y-4">
                            <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">Historique des Données</h5>
                            
                            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                              {selectedAgencyTrendData.map((row: any) => {
                                const isCrit = row.pctMissing > 10 && row.missing > 10;
                                return (
                                  <div key={row.monthLabel} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                                    <div>
                                      <span className="font-bold text-slate-700 dark:text-slate-300">{row.monthLabel}</span>
                                      <span className="text-[10px] text-slate-450 block mt-0.5">Total fiches : {row.total}</span>
                                    </div>
                                    <div className="text-right space-y-1">
                                      <span className="font-black text-slate-900 dark:text-white block">
                                        {row.pctMissing}% <span className="text-slate-400 font-normal">({row.missing})</span>
                                      </span>
                                      {isCrit && (
                                        <span className="text-[9px] px-1.5 py-0.5 font-bold uppercase rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/10">
                                          Critique
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Editing / Checklist detail Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-650 dark:text-blue-400">Détail du contrôle</span>
                  <span className={cn(
                    "text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border",
                    editingItem.entityType === "Personne Physique" 
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : editingItem.entityType === "Association (OBNL)"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                  )}>
                    {editingItem.entityType}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingItem.clientName}
                </h3>
                <p className="text-xs text-slate-450">
                  Identifiant : <span className="font-bold text-slate-700 dark:text-slate-350">{editingItem.clientId}</span> | Agence : <span className="font-bold text-slate-700 dark:text-slate-350">{editingItem.agencyCode} - {editingItem.agencyName}</span> | Rapprochement : <span className="font-bold text-slate-700 dark:text-slate-350">{editingItem.monthLabel}</span>
                </p>
              </div>
              <button 
                onClick={closeEditModal}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Checklist & Controls */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Éléments de contrôle</h4>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-450 bg-blue-500/5 px-2 py-0.5 rounded">
                      Complétude : {modalCompletion}%
                    </span>
                  </div>

                  {activeTemplate.dataItems.length === 0 && activeTemplate.docsItems.length === 0 && (
                    <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-center italic text-xs text-slate-400">
                      Aucune périphérie de contrôle configurée pour ce dossier.
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Data Items */}
                    {activeTemplate.dataItems.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1 mt-1">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          <span>Contrôle des Données</span>
                        </div>
                        <div className="space-y-2">
                          {activeTemplate.dataItems.map((item) => {
                            const isChecked = !!modalChecklist[item.id];
                            return (
                              <label key={item.id} className="flex items-start gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900 rounded-xl hover:bg-slate-100/50 cursor-pointer transition-all">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setModalChecklist(prev => ({
                                      ...prev,
                                      [item.id]: !prev[item.id]
                                    }));
                                  }}
                                  className="mt-0.5 h-4 w-4 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className={cn("text-xs font-medium text-slate-700 dark:text-slate-300", isChecked && "line-through text-slate-400 dark:text-slate-550")}>
                                  {item.text}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Docs Items */}
                    {activeTemplate.docsItems.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1 mt-3">
                          <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
                          <span>Contrôle des Documents</span>
                        </div>
                        <div className="space-y-2">
                          {activeTemplate.docsItems.map((item) => {
                            const isChecked = !!modalChecklist[item.id];
                            return (
                              <label key={item.id} className="flex items-start gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900 rounded-xl hover:bg-slate-100/50 cursor-pointer transition-all">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setModalChecklist(prev => ({
                                      ...prev,
                                      [item.id]: !prev[item.id]
                                    }));
                                  }}
                                  className="mt-0.5 h-4 w-4 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className={cn("text-xs font-medium text-slate-700 dark:text-slate-300", isChecked && "line-through text-slate-400 dark:text-slate-550")}>
                                  {item.text}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Status & Observations */}
              <div className="space-y-5">
                {/* Status selector */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">Statut de conformité</h4>
                  <div className="flex flex-col gap-2">
                    {(["Non commencé", "En cours", "Conforme", "Non conforme"] as const).map((stat) => (
                      <label
                        key={stat}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all font-semibold text-xs",
                          modalStatus === stat && (
                            stat === "Conforme" 
                              ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/5 dark:border-emerald-550 text-emerald-700 dark:text-emerald-450" 
                              : stat === "Non conforme"
                                ? "border-rose-500 bg-rose-500/5 dark:bg-rose-500/5 dark:border-rose-550 text-rose-700 dark:text-rose-450"
                                : stat === "En cours"
                                  ? "border-blue-500 bg-blue-500/5 dark:bg-blue-500/5 dark:border-blue-550 text-blue-700 dark:text-blue-450"
                                  : "border-slate-500 bg-slate-500/5 dark:border-slate-600 text-slate-700 dark:text-slate-350"
                          )
                        )}
                      >
                        <input
                          type="radio"
                          name="modalStatus"
                          checked={modalStatus === stat}
                          onChange={() => setModalStatus(stat)}
                          className="sr-only"
                        />
                        {stat === "Conforme" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        {stat === "Non conforme" && <AlertTriangle className="h-4 w-4 text-rose-500" />}
                        {stat === "En cours" && <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                        {stat === "Non commencé" && <Clock className="h-4 w-4 text-slate-455" />}
                        <span>{stat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Observations / Comments */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Observations & Commentaires</span>
                  </div>
                  <textarea
                    rows={5}
                    placeholder="Saisissez les conclusions de votre audit KYC, les documents manquants constatés ou les remarques particulières..."
                    value={modalComments}
                    onChange={(e) => setModalComments(e.target.value)}
                    className="w-full p-3 text-xs bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500/50 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/5 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-semibold italic">
                Dernière modification : {editingItem.updatedAt ? new Date(editingItem.updatedAt).toLocaleString("fr-FR") : "-"}
              </span>
              
              <div className="flex gap-3">
                <button
                  onClick={closeEditModal}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                >
                  Fermer
                </button>
                <button
                  disabled={isSaving}
                  onClick={handleSaveItem}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-md shadow-blue-500/10 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    "Enregistrer le contrôle"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
