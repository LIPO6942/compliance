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
  Plus,
  History,
  Hash
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { TestCase, Anomaly, TestBookMetadata, TestBookStats, TestStatus, AuditEntry } from "@/types/testBook";
import { INITIAL_METADATA, INITIAL_TEST_CASES, INITIAL_ANOMALIES } from "@/data/initialTestBookData";
import { exportTestBookPDF, exportTestBookExcel } from "@/lib/testBookExport";
import { TestBookKpiCards } from "@/components/cahier-recette/TestBookKpiCards";
import { TestCasesTable } from "@/components/cahier-recette/TestCasesTable";
import { AnomaliesGrid } from "@/components/cahier-recette/AnomaliesGrid";
import { TestBookCoverCard } from "@/components/cahier-recette/TestBookCoverCard";
import { AuditLogModal } from "@/components/cahier-recette/AuditLogModal";
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

// Resequence test IDs to T-001, T-002, ... based on createdAt order
function resequenceTests(tests: TestCase[], anomalies: Anomaly[]): { tests: TestCase[]; anomalies: Anomaly[] } {
  // Sort by createdAt first, then by existing numeric ID as fallback
  const sorted = [...tests].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (dateA !== dateB) return dateA - dateB;
    const na = parseInt(a.id.replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });
  const map: Record<string, string> = {};
  const resequenced = sorted.map((t, i) => {
    const newId = `T-${String(i + 1).padStart(3, "0")}`;
    map[t.id] = newId;
    return { ...t, id: newId };
  });
  const updatedAnomalies = anomalies.map((a) => ({
    ...a,
    linkedTest: a.linkedTest
      ? a.linkedTest.split(/[/,\s]+/).map((s: string) => map[s.trim()] || s.trim()).join(" / ")
      : a.linkedTest,
  }));
  return { tests: resequenced, anomalies: updatedAnomalies };
}

// Load and resequence test IDs on startup
function loadInitialData(): { tests: TestCase[]; anomalies: Anomaly[] } {
  let tests: TestCase[] = INITIAL_TEST_CASES;
  let anomalies: Anomaly[] = INITIAL_ANOMALIES.map((a) => ({ ...a, status: "OUVERTE" as const }));
  if (typeof window === "undefined") return { tests, anomalies };
  try {
    const s = localStorage.getItem("regtools_test_cases_v2") || localStorage.getItem("regtools_test_cases");
    if (s) tests = JSON.parse(s);
  } catch {}
  try {
    const s = localStorage.getItem("regtools_anomalies_v2") || localStorage.getItem("regtools_anomalies");
    if (s) anomalies = JSON.parse(s).map((a: any) => ({ ...a, status: a.status || "OUVERTE" }));
  } catch {}
  // Always resequence to ensure T-001..T-N with no gaps
  return resequenceTests(tests, anomalies);
}

export default function TestBookPage() {
  const { toast } = useToast();

  // Load both states together so resequencing can update anomaly linkedTest refs
  const [_init] = useState(() => loadInitialData());
  const [testCases, setTestCases] = useState<TestCase[]>(_init.tests);
  const [anomalies, setAnomalies] = useState<Anomaly[]>(_init.anomalies);

  const [metadata] = useState<TestBookMetadata>(INITIAL_METADATA);
  const [activeTab, setActiveTab] = useState<"tests" | "anomalies" | "cover">("tests");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [selectedAnomalyStatus, setSelectedAnomalyStatus] = useState<string>("ALL");
  const [highlightedAnomalyId, setHighlightedAnomalyId] = useState<string | null>(null);
  const [highlightedTestId, setHighlightedTestId] = useState<string | null>(null);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>(() => {
    try { return localStorage.getItem("regtools_current_user") || "Équipe Conformité"; } catch { return "Équipe Conformité"; }
  });

  const handleNavigateToAnomaly = (anomalyId: string) => {
    setHighlightedAnomalyId(anomalyId);
    setActiveTab("anomalies");
    setTimeout(() => setHighlightedAnomalyId(null), 3000);
  };

  const handleNavigateToTest = (testId: string) => {
    // Extract first test ID if multiple (e.g. "T-008 / T-009")
    const firstId = testId.split(/[/,\s]+/).map(s => s.trim()).find(s => s.startsWith("T-")) || testId;
    setHighlightedTestId(firstId);
    setSelectedModule("ALL");
    setSelectedStatus("ALL");
    setActiveTab("tests");
    setTimeout(() => setHighlightedTestId(null), 3000);
  };

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
    const modulesMap = new Map<string, string>();
    [...testCases.map((t) => t.module), ...anomalies.map((a) => a.module)]
      .filter(Boolean)
      .forEach((m) => {
        const trimmed = (m || "").trim();
        const key = trimmed.toLowerCase();
        if (trimmed && !modulesMap.has(key)) {
          modulesMap.set(key, trimmed);
        }
      });
    return Array.from(modulesMap.values()).sort((a, b) =>
      a.localeCompare(b, "fr", { sensitivity: "base" })
    );
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

      const matchesModule =
        selectedModule === "ALL" ||
        (tc.module || "").trim().toLowerCase() === selectedModule.trim().toLowerCase();
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
    const nowIso = new Date().toISOString();
    const updated = testCases.map((t) => {
      if (t.id === testId) {
        const nextStatus: TestStatus =
          t.status === "OK" ? "KO" : t.status === "KO" ? "Non encore testé" : "OK";
        const auditEntry: AuditEntry = {
          timestamp: nowIso,
          author: currentUser,
          action: "Changement de statut",
          changes: `Statut modifié : "${t.status}" → "${nextStatus}"`,
        };
        return {
          ...t,
          status: nextStatus,
          updatedAt: nowIso,
          createdAt: t.createdAt || nowIso,
          auditHistory: [auditEntry, ...(t.auditHistory || [])],
        };
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

  const handleAddTestCase = (newTestCase: TestCase, associatedAnomaly?: Anomaly, auditRemark?: string, auditAuthor?: string) => {
    const nowIso = new Date().toISOString();
    const cleanModule = (newTestCase.module || "").trim() || "Général";
    const author = auditAuthor || currentUser;
    if (auditAuthor && auditAuthor !== currentUser) {
      setCurrentUser(auditAuthor);
      try { localStorage.setItem("regtools_current_user", auditAuthor); } catch {}
    }
    const auditEntry: AuditEntry = {
      timestamp: nowIso,
      author,
      action: "Création",
      changes: `Cas de test créé : "${newTestCase.title}" — Module : ${cleanModule} — Statut : ${newTestCase.status}`,
      remark: auditRemark,
    };
    const preparedTest: TestCase = {
      ...newTestCase,
      module: cleanModule,
      createdAt: newTestCase.createdAt || nowIso,
      updatedAt: nowIso,
      auditHistory: [auditEntry],
    };
    const updatedTests = [preparedTest, ...testCases.filter((t) => t.id !== preparedTest.id)];
    let updatedAnomalies = [...anomalies];

    if (associatedAnomaly) {
      const anoAuditEntry: AuditEntry = {
        timestamp: nowIso,
        author,
        action: "Création",
        changes: `Anomalie créée via le test ${newTestCase.id} — Priorité : ${associatedAnomaly.priority}`,
      };
      const preparedAno: Anomaly = {
        ...associatedAnomaly,
        module: (associatedAnomaly.module || cleanModule).trim(),
        createdAt: associatedAnomaly.createdAt || nowIso,
        updatedAt: nowIso,
        auditHistory: [anoAuditEntry],
      };
      updatedAnomalies = [preparedAno, ...anomalies.filter((a) => a.id !== preparedAno.id)];
      setAnomalies(updatedAnomalies);
    }

    setTestCases(updatedTests);
    saveToFirestore(updatedTests, updatedAnomalies);
    toast({
      title: "Cas de test créé",
      description: associatedAnomaly
        ? `Le cas ${newTestCase.id} et l'anomalie ${associatedAnomaly.id} ont été enregistrés.`
        : `Le cas ${newTestCase.id} (${newTestCase.title}) a été ajouté au cahier.`,
    });
  };

  const handleUpdateTestCase = (updatedTestCase: TestCase, associatedAnomaly?: Anomaly, auditRemark?: string, auditAuthor?: string) => {
    const nowIso = new Date().toISOString();
    const cleanModule = (updatedTestCase.module || "").trim() || "Général";
    const author = auditAuthor || currentUser;
    if (auditAuthor && auditAuthor !== currentUser) {
      setCurrentUser(auditAuthor);
      try { localStorage.setItem("regtools_current_user", auditAuthor); } catch {}
    }
    const existing = testCases.find((t) => t.id === updatedTestCase.id);
    const changeParts: string[] = [];
    if (existing) {
      if (existing.status !== updatedTestCase.status)
        changeParts.push(`Statut : "${existing.status}" → "${updatedTestCase.status}"`);
      if (existing.module !== cleanModule)
        changeParts.push(`Module : "${existing.module}" → "${cleanModule}"`);
      if (existing.title !== updatedTestCase.title) changeParts.push(`Titre modifié`);
      if (existing.steps !== updatedTestCase.steps) changeParts.push(`Étapes mises à jour`);
      if (existing.expectedResult !== updatedTestCase.expectedResult) changeParts.push(`Résultat attendu mis à jour`);
      if (existing.comment !== updatedTestCase.comment) changeParts.push(`Commentaire mis à jour`);
    }
    const auditEntry: AuditEntry = {
      timestamp: nowIso,
      author,
      action: changeParts.some((c) => c.startsWith("Statut")) ? "Changement de statut" : "Modification",
      changes: changeParts.length > 0 ? changeParts.join(" | ") : `Cas de test ${updatedTestCase.id} modifié`,
      remark: auditRemark,
    };
    const preparedTest: TestCase = {
      ...updatedTestCase,
      module: cleanModule,
      updatedAt: nowIso,
      createdAt: updatedTestCase.createdAt || nowIso,
      auditHistory: [auditEntry, ...(existing?.auditHistory || [])],
    };
    const updatedTests = testCases.map((t) => (t.id === preparedTest.id ? preparedTest : t));
    let updatedAnomalies = [...anomalies];

    if (associatedAnomaly) {
      const existingAno = anomalies.find((a) => a.id === associatedAnomaly.id);
      const anoAuditEntry: AuditEntry = {
        timestamp: nowIso,
        author,
        action: existingAno ? "Modification" : "Création",
        changes: `Anomalie ${existingAno ? "mise à jour" : "créée"} via le test ${updatedTestCase.id}`,
        remark: auditRemark,
      };
      const preparedAno: Anomaly = {
        ...associatedAnomaly,
        module: (associatedAnomaly.module || cleanModule).trim(),
        updatedAt: nowIso,
        createdAt: associatedAnomaly.createdAt || nowIso,
        auditHistory: [anoAuditEntry, ...(existingAno?.auditHistory || [])],
      };
      updatedAnomalies = [preparedAno, ...anomalies.filter((a) => a.id !== preparedAno.id)];
      setAnomalies(updatedAnomalies);
    }

    setTestCases(updatedTests);
    saveToFirestore(updatedTests, updatedAnomalies);
    toast({
      title: "Cas de test modifié",
      description: `Le cas ${updatedTestCase.id} a été enregistré avec succès.`,
    });
  };

  const handleDeleteTestCase = (testId: string) => {
    // Remove the test, then renumber all remaining tests sequentially (T-001, T-002, ...)
    const filtered = testCases.filter((t) => t.id !== testId);
    // Sort by existing numeric ID to preserve order
    const sorted = [...filtered].sort((a, b) => {
      const na = parseInt(a.id.replace(/\D/g, ""), 10) || 0;
      const nb = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
      return na - nb;
    });
    const oldIdToNew: Record<string, string> = {};
    const renumbered = sorted.map((t, i) => {
      const newId = `T-${String(i + 1).padStart(3, "0")}`;
      oldIdToNew[t.id] = newId;
      return { ...t, id: newId };
    });
    // Update linkedAnomaly references in anomalies that point to old test IDs (via linkedTest field in anomalies)
    const updatedAnomalies = anomalies.map((a) => ({
      ...a,
      linkedTest: a.linkedTest
        ? a.linkedTest
            .split(/[/,\s]+/)
            .map((s) => {
              const t = s.trim();
              return oldIdToNew[t] || t;
            })
            .join(" / ")
        : a.linkedTest,
    }));
    setTestCases(renumbered);
    setAnomalies(updatedAnomalies);
    saveToFirestore(renumbered, updatedAnomalies);
    toast({
      title: "Cas de test supprimé",
      description: `Le cas ${testId} a été retiré. Les identifiants ont été réorganisés séquentiellement.`,
    });
  };

  // Anomaly Actions
  const handleToggleResolveAnomaly = (anomalyId: string) => {
    let resolvedStatus: string = "";
    const nowIso = new Date().toISOString();
    const updated = anomalies.map((ano) => {
      if (ano.id === anomalyId) {
        const isCurrentlyResolved = ano.status === "RESOLUE";
        const nextStatus = isCurrentlyResolved ? "OUVERTE" : "RESOLUE";
        resolvedStatus = nextStatus;
        const auditEntry: AuditEntry = {
          timestamp: nowIso,
          author: currentUser,
          action: nextStatus === "RESOLUE" ? "Résolution" : "Réouverture",
          changes: `Statut anomalie : "${ano.status || "OUVERTE"}" → "${nextStatus}"`,
        };
        return {
          ...ano,
          status: nextStatus as any,
          updatedAt: nowIso,
          resolvedAt: !isCurrentlyResolved ? nowIso : undefined,
          resolvedBy: !isCurrentlyResolved ? currentUser : undefined,
          auditHistory: [auditEntry, ...(ano.auditHistory || [])],
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
          ? `L'anomalie ${anomalyId} a été marquée comme résolue.`
          : `L'anomalie ${anomalyId} est de nouveau ouverte pour investigation.`,
    });
  };

  const handleAddAnomaly = (newAnomaly: Anomaly) => {
    const nowIso = new Date().toISOString();
    const auditEntry: AuditEntry = {
      timestamp: nowIso,
      author: currentUser,
      action: "Création",
      changes: `Anomalie déclarée — Module : ${newAnomaly.module} — Priorité : ${newAnomaly.priority}`,
    };
    const preparedAno: Anomaly = {
      ...newAnomaly,
      createdAt: newAnomaly.createdAt || nowIso,
      updatedAt: nowIso,
      resolvedAt: newAnomaly.status === "RESOLUE" ? (newAnomaly.resolvedAt || nowIso) : undefined,
      auditHistory: [auditEntry],
    };
    const updated = [preparedAno, ...anomalies.filter((a) => a.id !== preparedAno.id)];
    setAnomalies(updated);
    saveToFirestore(testCases, updated);
    toast({
      title: "Anomalie déclarée",
      description: `L'anomalie ${newAnomaly.id} a été enregistrée.`,
    });
  };

  const handleUpdateAnomaly = (updatedAnomaly: Anomaly, auditRemark?: string, auditAuthor?: string) => {
    const nowIso = new Date().toISOString();
    const author = auditAuthor || currentUser;
    if (auditAuthor && auditAuthor !== currentUser) {
      setCurrentUser(auditAuthor);
      try { localStorage.setItem("regtools_current_user", auditAuthor); } catch {}
    }
    const existingAno = anomalies.find((a) => a.id === updatedAnomaly.id);
    const changeParts: string[] = [];
    if (existingAno) {
      if (existingAno.priority !== updatedAnomaly.priority) changeParts.push(`Priorité : "${existingAno.priority}" → "${updatedAnomaly.priority}"`);
      if (existingAno.status !== updatedAnomaly.status) changeParts.push(`Statut : "${existingAno.status}" → "${updatedAnomaly.status}"`);
      if (existingAno.description !== updatedAnomaly.description) changeParts.push(`Description mise à jour`);
      if (existingAno.businessImpact !== updatedAnomaly.businessImpact) changeParts.push(`Impact métier mis à jour`);
    }
    const auditEntry: AuditEntry = {
      timestamp: nowIso,
      author,
      action: "Modification",
      changes: changeParts.length > 0 ? changeParts.join(" | ") : `Anomalie ${updatedAnomaly.id} modifiée`,
      remark: auditRemark,
    };
    const preparedAno: Anomaly = {
      ...updatedAnomaly,
      updatedAt: nowIso,
      createdAt: updatedAnomaly.createdAt || nowIso,
      resolvedAt: updatedAnomaly.status === "RESOLUE" ? (updatedAnomaly.resolvedAt || nowIso) : undefined,
      auditHistory: [auditEntry, ...(existingAno?.auditHistory || [])],
    };
    const updated = anomalies.map((a) => (a.id === preparedAno.id ? preparedAno : a));
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

  const handleResequenceIds = () => {
    if (!window.confirm(`Renuméroter les ${testCases.length} cas de test séquentiellement (T-001 à T-${String(testCases.length).padStart(3, "0")}) ?\n\nLes références dans les anomalies seront mises à jour automatiquement.`)) return;
    const { tests: resequenced, anomalies: updatedAnomalies } = resequenceTests(testCases, anomalies);
    setTestCases(resequenced);
    setAnomalies(updatedAnomalies);
    saveToFirestore(resequenced, updatedAnomalies);
    toast({
      title: "✅ IDs renumérotés",
      description: `${resequenced.length} cas de test renumérotés de T-001 à T-${String(resequenced.length).padStart(3, "0")}.`,
    });
  };

  return (
    <>
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

          {/* Journal des modifications */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAuditLogOpen(true)}
            className="rounded-xl border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-bold gap-1.5 shadow-xs"
          >
            <History className="h-4 w-4" />
            Journal
          </Button>

          {/* Renuméroter les IDs */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResequenceIds}
            title={`Renuméroter les IDs de T-001 à T-${String(testCases.length).padStart(3, "0")}`}
            className="rounded-xl text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-bold gap-1"
          >
            <Hash className="h-4 w-4" />
            Renuméroter
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
          onNavigateToAnomaly={handleNavigateToAnomaly}
          highlightedTestId={highlightedTestId}
          currentUser={currentUser}
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
          highlightedAnomalyId={highlightedAnomalyId}
          onNavigateToTest={handleNavigateToTest}
          currentUser={currentUser}
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

    {/* Global Audit Log Modal */}
    <AuditLogModal
      isOpen={isAuditLogOpen}
      onClose={() => setIsAuditLogOpen(false)}
      testCases={testCases}
      anomalies={anomalies}
    />
    </>
  );
}
