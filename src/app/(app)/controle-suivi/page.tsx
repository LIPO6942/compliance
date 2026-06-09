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
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

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
                <Clock className="h-3.5 w-3.5 text-slate-450" />
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
