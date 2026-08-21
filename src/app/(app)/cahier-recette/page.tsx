"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Printer,
  FileSpreadsheet,
  RefreshCw,
  Search,
  CheckSquare,
  AlertTriangle,
  Info,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { TestCase, Anomaly, TestBookMetadata, TestBookStats, TestStatus } from "@/types/testBook";
import { INITIAL_METADATA, INITIAL_TEST_CASES, INITIAL_ANOMALIES } from "@/data/initialTestBookData";
import { exportTestBookPDF, exportTestBookExcel } from "@/lib/testBookExport";
import { TestBookKpiCards } from "@/components/cahier-recette/TestBookKpiCards";
import { TestCasesTable } from "@/components/cahier-recette/TestCasesTable";
import { AnomaliesGrid } from "@/components/cahier-recette/AnomaliesGrid";
import { TestBookCoverCard } from "@/components/cahier-recette/TestBookCoverCard";
import { db, isFirebaseConfigured } from "@/lib/firebase";

const cleanData = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(cleanData);
  } else if (typeof data === "object" && data !== null) {
    const cleaned: Record<string, any> = {};
    for (const key in data) {
      if (data[key] !== undefined) {
        cleaned[key] = cleanData(data[key]);
      }
    }
    return cleaned;
  }
  return data;
};

export default function TestBookPage() {
  const { toast } = useToast();

  const [testCases, setTestCases] = useState<TestCase[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("regtools_test_cases_v2");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
      // Migrate from v1
      const oldSaved = localStorage.getItem("regtools_test_cases");
      if (oldSaved) {
        try {
          return JSON.parse(oldSaved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return INITIAL_TEST_CASES;
  });

  const [anomalies, setAnomalies] = useState<Anomaly[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("regtools_anomalies_v2");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
      // Migrate from v1
      const oldSaved = localStorage.getItem("regtools_anomalies");
      if (oldSaved) {
        try {
          const parsed = JSON.parse(oldSaved) as Anomaly[];
          return parsed.map((a) => ({
            ...a,
            status: a.status || "OUVERTE",
          }));
        } catch (e) {
          console.error(e);
        }
      }
    }
    return INITIAL_ANOMALIES.map((a) => ({
      ...a,
      status: a.status || "OUVERTE",
    }));
  });

  const [metadata] = useState<TestBookMetadata>(INITIAL_METADATA);
  const [activeTab, setActiveTab] = useState<"tests" | "anomalies" | "cover">("tests");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [selectedAnomalyStatus, setSelectedAnomalyStatus] = useState<string>("ALL");

  // LocalStorage Persistence
  useEffect(() => {
    try {
      localStorage.setItem("regtools_test_cases_v2", JSON.stringify(testCases));
    } catch (e) {
      console.error(e);
    }
  }, [testCases]);

  useEffect(() => {
    try {
      localStorage.setItem("regtools_anomalies_v2", JSON.stringify(anomalies));
    } catch (e) {
      console.error(e);
    }
  }, [anomalies]);

  // Firestore Sync (if configured)
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;

    let unsubscribe: (() => void) | undefined;
    (async () => {
      try {
        const { doc, onSnapshot } = await import("firebase/firestore");
        const docRef = doc(db, "cahier_recette", "main");
        unsubscribe = onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.testCases && Array.isArray(data.testCases)) {
              setTestCases(data.testCases);
            }
            if (data.anomalies && Array.isArray(data.anomalies)) {
              setAnomalies(data.anomalies);
            }
          }
        });
      } catch (err) {
        console.warn("Firestore sync error for cahier_recette:", err);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const saveToFirestore = async (newTestCases: TestCase[], newAnomalies: Anomaly[]) => {
    if (isFirebaseConfigured && db) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(
          doc(db, "cahier_recette", "main"),
          cleanData({
            testCases: newTestCases,
            anomalies: newAnomalies,
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
      } catch (e) {
        console.error("Failed to save cahier_recette to Firestore:", e);
      }
    }
  };

  const stats: TestBookStats = useMemo(() => {
    const total = testCases.length;
    const okCount = testCases.filter((t) => t.status === "OK").length;
    const koCount = testCases.filter((t) => t.status === "KO").length;
    const pendingCount = testCases.filter((t) => t.status === "Non encore testé").length;

    const openAnomalies = anomalies.filter((a) => a.status !== "RESOLUE");
    const openAnomaliesCount = openAnomalies.length;
    const resolvedAnomaliesCount = anomalies.filter((a) => a.status === "RESOLUE").length;

    const criticalAnomalies = openAnomalies.filter((a) => a.priority === "CRITIQUE").length;
    const highAnomalies = openAnomalies.filter((a) => a.priority === "HAUTE").length;

    const progressRate = total > 0 ? ((okCount / total) * 100).toFixed(1) : "0.0";
    const executionRate = total > 0 ? (((okCount + koCount) / total) * 100).toFixed(1) : "0.0";

    return {
      total,
      okCount,
      koCount,
      pendingCount,
      criticalAnomalies,
      highAnomalies,
      openAnomaliesCount,
      resolvedAnomaliesCount,
      progressRate,
      executionRate,
    };
  }, [testCases, anomalies]);

  const modulesList = useMemo(() => {
    const fromTests = testCases.map((t) => t.module);
    const fromAnos = anomalies.map((a) => a.module);
    return Array.from(new Set([...fromTests, ...fromAnos])).filter(Boolean);
  }, [testCases, anomalies]);

  // Filtered Test Cases
  const filteredTestCases = useMemo(() => {
    return testCases.filter((tc) => {
      const matchesSearch =
        tc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tc.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tc.linkedAnomaly && tc.linkedAnomaly.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tc.comment && tc.comment.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesModule = selectedModule === "ALL" || tc.module === selectedModule;
      const matchesStatus = selectedStatus === "ALL" || tc.status === selectedStatus;
      return matchesSearch && matchesModule && matchesStatus;
    });
  }, [testCases, searchQuery, selectedModule, selectedStatus]);

  // Filtered Anomalies
  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((a) => {
      const matchesSearch =
        a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.businessImpact.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.linkedTest.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPriority = selectedPriority === "ALL" || a.priority === selectedPriority;
      const matchesStatus =
        selectedAnomalyStatus === "ALL" ||
        (selectedAnomalyStatus === "RESOLUE" ? a.status === "RESOLUE" : a.status !== "RESOLUE");

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [anomalies, searchQuery, selectedPriority, selectedAnomalyStatus]);

  // Test Case Actions
  const handleToggleStatus = (testId: string) => {
    const updated = testCases.map((t) => {
      if (t.id === testId) {
        const nextStatus: TestStatus =
          t.status === "OK" ? "KO" : t.status === "KO" ? "Non encore testé" : "OK";
        return { ...t, status: nextStatus };
      }
      return t;
    });
    setTestCases(updated);
    saveToFirestore(updated, anomalies);
    toast({
      title: "Statut mis à jour",
      description: `Le cas de test ${testId} a été mis à jour.`,
    });
  };

  const handleAddTestCase = (newTestCase: TestCase) => {
    const updated = [newTestCase, ...testCases.filter((t) => t.id !== newTestCase.id)];
    setTestCases(updated);
    saveToFirestore(updated, anomalies);
    toast({
      title: "Cas de test créé",
      description: `Le cas ${newTestCase.id} (${newTestCase.title}) a été ajouté au cahier.`,
    });
  };

  const handleUpdateTestCase = (updatedTestCase: TestCase) => {
    const updated = testCases.map((t) => (t.id === updatedTestCase.id ? updatedTestCase : t));
    setTestCases(updated);
    saveToFirestore(updated, anomalies);
    toast({
      title: "Cas de test modifié",
      description: `Le cas ${updatedTestCase.id} a été enregistré.`,
    });
  };

  const handleDeleteTestCase = (testId: string) => {
    const updated = testCases.filter((t) => t.id !== testId);
    setTestCases(updated);
    saveToFirestore(updated, anomalies);
    toast({
      title: "Cas de test supprimé",
      description: `Le cas ${testId} a été retiré.`,
    });
  };

  // Anomaly Actions
  const handleToggleResolveAnomaly = (anomalyId: string) => {
    let resolvedStatus: string = "";
    const updated = anomalies.map((ano) => {
      if (ano.id === anomalyId) {
        const isCurrentlyResolved = ano.status === "RESOLUE";
        const nextStatus = isCurrentlyResolved ? "OUVERTE" : "RESOLUE";
        resolvedStatus = nextStatus;
        return {
          ...ano,
          status: nextStatus as any,
          resolvedAt: !isCurrentlyResolved ? new Date().toISOString() : undefined,
          resolvedBy: !isCurrentlyResolved ? "Équipe Conformité" : undefined,
        };
      }
      return ano;
    });

    setAnomalies(updated);
    saveToFirestore(testCases, updated);

    toast({
      title: resolvedStatus === "RESOLUE" ? "✅ Anomalie résolue !" : "↺ Anomalie réouverte",
      description:
        resolvedStatus === "RESOLUE"
          ? `L'anomalie ${anomalyId} a été marquée comme résolue. Le compteur du module a été recalculé.`
          : `L'anomalie ${anomalyId} est de nouveau ouverte pour investigation.`,
    });
  };

  const handleAddAnomaly = (newAnomaly: Anomaly) => {
    const updated = [newAnomaly, ...anomalies.filter((a) => a.id !== newAnomaly.id)];
    setAnomalies(updated);
    saveToFirestore(testCases, updated);
    toast({
      title: "Anomalie déclarée",
      description: `L'anomalie ${newAnomaly.id} a été enregistrée.`,
    });
  };

  const handleUpdateAnomaly = (updatedAnomaly: Anomaly) => {
    const updated = anomalies.map((a) => (a.id === updatedAnomaly.id ? updatedAnomaly : a));
    setAnomalies(updated);
    saveToFirestore(testCases, updated);
    toast({
      title: "Anomalie modifiée",
      description: `L'anomalie ${updatedAnomaly.id} a été mise à jour.`,
    });
  };

  const handleDeleteAnomaly = (anomalyId: string) => {
    const updated = anomalies.filter((a) => a.id !== anomalyId);
    setAnomalies(updated);
    saveToFirestore(testCases, updated);
    toast({
      title: "Anomalie supprimée",
      description: `L'anomalie ${anomalyId} a été retirée du registre.`,
    });
  };

  const handleResetData = () => {
    if (window.confirm("Restaurer les données initiales du cahier de recette ?")) {
      const initialAnos = INITIAL_ANOMALIES.map((a) => ({ ...a, status: "OUVERTE" as const }));
      setTestCases(INITIAL_TEST_CASES);
      setAnomalies(initialAnos);
      localStorage.removeItem("regtools_test_cases_v2");
      localStorage.removeItem("regtools_anomalies_v2");
      saveToFirestore(INITIAL_TEST_CASES, initialAnos);
      toast({ title: "Cahier réinitialisé", description: "Données restaurées avec succès." });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* En-tête Principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-[10px] font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">
              Assurance Qualité & Conformité
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">
            Cahier de Recette <span className="text-indigo-600 dark:text-indigo-400 font-black">RegTools</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Campagne de tests d'homologation, matrice d'exécution et suivi dynamique des anomalies
          </p>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast({ title: "Génération de l'impression", description: "Préparation du document certifié MAE..." });
              exportTestBookPDF(testCases, anomalies, metadata, stats);
            }}
            className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold gap-1.5 shadow-xs"
          >
            <Printer className="h-4 w-4 text-indigo-600" />
            Imprimer / PDF
          </Button>

          <Button
            size="sm"
            onClick={async () => {
              await exportTestBookExcel(testCases, anomalies, metadata, stats);
              toast({ title: "Export Excel réussi", description: "Le cahier de recette a été téléchargé." });
            }}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 shadow-md shadow-indigo-500/20"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exporter Excel (.xlsx)
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetData}
            title="Restaurer les données initiales"
            className="rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <TestBookKpiCards stats={stats} />

      {/* Onglets & Recherche */}
      <div className="flex justify-between items-center gap-4 flex-wrap border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("tests")}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
              activeTab === "tests"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Cas de Test ({testCases.length})
          </button>
          <button
            onClick={() => setActiveTab("anomalies")}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
              activeTab === "anomalies"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
            Anomalies Signalées ({anomalies.length})
            {stats.openAnomaliesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white">
                {stats.openAnomaliesCount} ouvertes
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("cover")}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
              activeTab === "cover"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <Info className="h-3.5 w-3.5" />
            Fiche & Page de Garde
          </button>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher test, anomalie..."
            className="pl-8 text-xs h-9 rounded-xl bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60 shadow-xs"
          />
        </div>
      </div>

      {/* Contenu selon l'onglet actif */}
      {activeTab === "tests" && (
        <TestCasesTable
          testCases={filteredTestCases}
          allTestCases={testCases}
          anomalies={anomalies}
          modulesList={modulesList}
          stats={stats}
          selectedModule={selectedModule}
          setSelectedModule={setSelectedModule}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          onToggleStatus={handleToggleStatus}
          onAddTestCase={handleAddTestCase}
          onUpdateTestCase={handleUpdateTestCase}
          onDeleteTestCase={handleDeleteTestCase}
        />
      )}

      {activeTab === "anomalies" && (
        <AnomaliesGrid
          anomalies={filteredAnomalies}
          allAnomalies={anomalies}
          stats={stats}
          modulesList={modulesList}
          selectedPriority={selectedPriority}
          setSelectedPriority={setSelectedPriority}
          selectedStatus={selectedAnomalyStatus}
          setSelectedStatus={setSelectedAnomalyStatus}
          onToggleResolveAnomaly={handleToggleResolveAnomaly}
          onAddAnomaly={handleAddAnomaly}
          onUpdateAnomaly={handleUpdateAnomaly}
          onDeleteAnomaly={handleDeleteAnomaly}
        />
      )}

      {activeTab === "cover" && (
        <TestBookCoverCard
          metadata={metadata}
          onExportPDF={() => {
            toast({ title: "Génération de l'impression", description: "Préparation du document certifié MAE..." });
            exportTestBookPDF(testCases, anomalies, metadata, stats);
          }}
          onExportExcel={async () => {
            await exportTestBookExcel(testCases, anomalies, metadata, stats);
            toast({ title: "Export Excel réussi", description: "Le cahier de recette a été téléchargé." });
          }}
        />
      )}
    </div>
  );
}
