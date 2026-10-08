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
  Hash,
  Settings2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { TestCase, Anomaly, AnomalyStatus, isAnomalyReopened, TestBookMetadata, TestBookStats, TestStatus, AuditEntry } from "@/types/testBook";
import { INITIAL_METADATA, INITIAL_TEST_CASES, INITIAL_ANOMALIES } from "@/data/initialTestBookData";
import { exportTestBookPDF, exportTestBookExcel } from "@/lib/testBookExport";
import { TestBookKpiCards } from "@/components/cahier-recette/TestBookKpiCards";
import { TestCasesTable } from "@/components/cahier-recette/TestCasesTable";
import { AnomaliesGrid } from "@/components/cahier-recette/AnomaliesGrid";
import { TestBookCoverCard } from "@/components/cahier-recette/TestBookCoverCard";
import { AuditLogModal } from "@/components/cahier-recette/AuditLogModal";
import { ModuleManagerModal } from "@/components/cahier-recette/ModuleManagerModal";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { useUser } from "@/contexts/UserContext";
import { useActivityLog } from "@/contexts/ActivityLogContext";

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

// Synchronize test cases based on anomaly status:
// If an anomaly is "RESOLUE", linked tests must be "OK"
// If an anomaly is "OUVERTE" or "REOUVERTE", linked tests must be "KO"
function syncTestsWithAnomalies(
  tests: TestCase[],
  anomalies: Anomaly[],
  author = "Équipe Conformité"
): TestCase[] {
  const nowIso = new Date().toISOString();
  const anomalyMap = new Map<string, Anomaly>();
  anomalies.forEach((a) => anomalyMap.set(a.id, a));

  // Collect anomalies linked to test IDs from a.linkedTest (e.g. "T-005 / T-006")
  const testIdToAnomaly = new Map<string, Anomaly[]>();
  anomalies.forEach((a) => {
    if (a.linkedTest) {
      const parts = a.linkedTest.split(/[/,\s]+/).map((s) => s.trim());
      parts.forEach((tid) => {
        if (tid.startsWith("T-")) {
          const list = testIdToAnomaly.get(tid) || [];
          list.push(a);
          testIdToAnomaly.set(tid, list);
        }
      });
    }
  });

  return tests.map((t) => {
    const linkedAnos: Anomaly[] = [...(testIdToAnomaly.get(t.id) || [])];
    if (t.linkedAnomaly && anomalyMap.has(t.linkedAnomaly)) {
      const direct = anomalyMap.get(t.linkedAnomaly)!;
      if (!linkedAnos.some((a) => a.id === direct.id)) {
        linkedAnos.push(direct);
      }
    }

    if (linkedAnos.length === 0) return t;

    // If ANY linked anomaly is open or reopened, test must be KO
    // If ALL linked anomalies are RESOLUE, test must be OK
    const anyOpen = linkedAnos.some((a) => a.status !== "RESOLUE");
    const targetStatus: TestStatus = anyOpen ? "KO" : "OK";

    if (t.status !== targetStatus) {
      const auditEntry: AuditEntry = {
        timestamp: nowIso,
        author,
        action: "Changement de statut (Alignement Anomalie)",
        changes: `Statut aligné sur anomalie(s) : "${t.status}" → "${targetStatus}"`,
      };
      return {
        ...t,
        status: targetStatus,
        updatedAt: nowIso,
        auditHistory: [auditEntry, ...(t.auditHistory || [])],
      };
    }
    return t;
  });
}

// Load and resequence test IDs on startup
function loadInitialData(): { tests: TestCase[]; anomalies: Anomaly[] } {
  let tests: TestCase[] = INITIAL_TEST_CASES;
  let anomalies: Anomaly[] = INITIAL_ANOMALIES.map((a) => ({
    ...a,
    status: (a.status || "OUVERTE") as AnomalyStatus,
  }));
  if (typeof window === "undefined") return { tests, anomalies };
  try {
    const s = localStorage.getItem("regtools_test_cases_v2") || localStorage.getItem("regtools_test_cases");
    if (s) tests = JSON.parse(s);
  } catch {}
  try {
    const s = localStorage.getItem("regtools_anomalies_v2") || localStorage.getItem("regtools_anomalies");
    if (s) {
      const parsed: Anomaly[] = JSON.parse(s);
      anomalies = parsed.map((a: any) => ({
        ...a,
        status: (a.status || "OUVERTE") as AnomalyStatus,
      }));
    }
  } catch {}
  // Ensure default initial anomalies (like ANO-001 and ANO-002) are present
  const existingIds = new Set(anomalies.map((a) => a.id));
  INITIAL_ANOMALIES.forEach((initAno) => {
    if (!existingIds.has(initAno.id)) {
      anomalies.push(initAno);
    }
  });
  // Always resequence to ensure T-001..T-N with no gaps
  const resequenced = resequenceTests(tests, anomalies);
  // Synchronize test statuses with anomalies (RESOLUE -> OK, OUVERTE/REOUVERTE -> KO)
  const syncedTests = syncTestsWithAnomalies(resequenced.tests, resequenced.anomalies);
  return { tests: syncedTests, anomalies: resequenced.anomalies };
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
  const [isModuleManagerOpen, setIsModuleManagerOpen] = useState(false);
  const { user } = useUser();
  const { isAdmin } = useActivityLog();
  const currentUser = user?.name || "Équipe Conformité";
  const userIsAdmin = user ? isAdmin(user.authEmail || user.email || "") : false;

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
    const reopenedAnomaliesCount = anomalies.filter((a) => isAnomalyReopened(a)).length;

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
      reopenedAnomaliesCount,
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
        (selectedAnomalyStatus === "RESOLUE"
          ? a.status === "RESOLUE"
          : selectedAnomalyStatus === "REOUVERTE"
          ? isAnomalyReopened(a)
          : selectedAnomalyStatus === "OUVERTE"
          ? (a.status === "OUVERTE" || a.status === "EN COURS" || (!a.status && a.status !== "RESOLUE"))
          : a.status !== "RESOLUE");

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [anomalies, searchQuery, selectedPriority, selectedAnomalyStatus]);

  // Test Case Actions
  const handleToggleStatus = (testId: string) => {
    const nowIso = new Date().toISOString();
    let updatedAnomalyList = [...anomalies];

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

    // Bidirectional sync: If test changed, update linked anomaly status
    const toggledTest = updated.find((t) => t.id === testId);
    if (toggledTest) {
      updatedAnomalyList = updatedAnomalyList.map((ano) => {
        const isLinked =
          (toggledTest.linkedAnomaly && toggledTest.linkedAnomaly.includes(ano.id)) ||
          (ano.linkedTest && ano.linkedTest.includes(toggledTest.id));

        if (!isLinked) return ano;

        if (toggledTest.status === "KO" && ano.status === "RESOLUE") {
          const newReopenCount = (ano.reopenCount || 0) + 1;
          const auditEntry: AuditEntry = {
            timestamp: nowIso,
            author: currentUser,
            action: "Réouverture",
            changes: `Statut anomalie : "RESOLUE" → "REOUVERTE" (Cas de test ${testId} passé à KO)`,
            remark: `Anomalie réouverte automatiquement suite au basculement du test ${testId} à KO.`,
          };
          return {
            ...ano,
            status: "REOUVERTE" as AnomalyStatus,
            reopenedAt: nowIso,
            reopenedBy: currentUser,
            reopenCount: newReopenCount,
            updatedAt: nowIso,
            auditHistory: [auditEntry, ...(ano.auditHistory || [])],
          };
        } else if (toggledTest.status === "OK" && ano.status !== "RESOLUE") {
          // Check if all other tests linked to this anomaly are also OK
          const otherTestsForAno = updated.filter(
            (other) =>
              other.id !== testId &&
              ((other.linkedAnomaly && other.linkedAnomaly.includes(ano.id)) ||
                (ano.linkedTest && ano.linkedTest.includes(other.id)))
          );
          const allOtherOk = otherTestsForAno.every((other) => other.status === "OK");
          if (allOtherOk) {
            const auditEntry: AuditEntry = {
              timestamp: nowIso,
              author: currentUser,
              action: "Résolution",
              changes: `Statut anomalie : "${ano.status}" → "RESOLUE" (Validation des tests associés)`,
              remark: `Anomalie résolue automatiquement suite à la validation du test ${testId} à OK.`,
            };
            return {
              ...ano,
              status: "RESOLUE" as AnomalyStatus,
              resolvedAt: nowIso,
              resolvedBy: currentUser,
              updatedAt: nowIso,
              auditHistory: [auditEntry, ...(ano.auditHistory || [])],
            };
          }
        }
        return ano;
      });
    }

    setTestCases(updated);
    setAnomalies(updatedAnomalyList);
    saveToFirestore(updated, updatedAnomalyList);
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
    }

    // Synchronize test statuses with anomalies
    const syncedTests = syncTestsWithAnomalies(updatedTests, updatedAnomalies, author);
    setTestCases(syncedTests);
    setAnomalies(updatedAnomalies);
    saveToFirestore(syncedTests, updatedAnomalies);
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
    }

    const syncedTests = syncTestsWithAnomalies(updatedTests, updatedAnomalies, author);
    setTestCases(syncedTests);
    setAnomalies(updatedAnomalies);
    saveToFirestore(syncedTests, updatedAnomalies);
    toast({
      title: "Cas de test modifié",
      description: `Le cas ${updatedTestCase.id} a été enregistré avec succès.`,
    });
  };

  const handleDeleteTestCase = (testId: string) => {
    const filtered = testCases.filter((t) => t.id !== testId);
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
    const updatedAnomalies = anomalies.map((ano) => {
      if (ano.id === anomalyId) {
        const isCurrentlyResolved = ano.status === "RESOLUE";
        const nextStatus: AnomalyStatus = isCurrentlyResolved ? "REOUVERTE" : "RESOLUE";
        resolvedStatus = nextStatus;
        const newReopenCount = isCurrentlyResolved ? (ano.reopenCount || 0) + 1 : (ano.reopenCount || 0);
        const auditEntry: AuditEntry = {
          timestamp: nowIso,
          author: currentUser,
          action: isCurrentlyResolved ? "Réouverture" : "Résolution",
          changes: isCurrentlyResolved
            ? `Statut anomalie : "${ano.status || "RESOLUE"}" → "REOUVERTE" (Réouverture n°${newReopenCount})`
            : `Statut anomalie : "${ano.status || "OUVERTE"}" → "RESOLUE"`,
          remark: isCurrentlyResolved
            ? "Anomalie réouverte suite à réapparition du problème en recette."
            : "Anomalie marquée comme résolue.",
        };
        return {
          ...ano,
          status: nextStatus,
          updatedAt: nowIso,
          resolvedAt: !isCurrentlyResolved ? nowIso : ano.resolvedAt,
          resolvedBy: !isCurrentlyResolved ? currentUser : ano.resolvedBy,
          reopenedAt: isCurrentlyResolved ? nowIso : ano.reopenedAt,
          reopenedBy: isCurrentlyResolved ? currentUser : ano.reopenedBy,
          reopenCount: newReopenCount,
          auditHistory: [auditEntry, ...(ano.auditHistory || [])],
        };
      }
      return ano;
    });

    // Synchronize test cases: if RESOLUE -> tests become OK; if REOUVERTE -> tests become KO
    const syncedTests = syncTestsWithAnomalies(testCases, updatedAnomalies, currentUser);

    setAnomalies(updatedAnomalies);
    setTestCases(syncedTests);
    saveToFirestore(syncedTests, updatedAnomalies);

    toast({
      title: resolvedStatus === "RESOLUE" ? "✅ Anomalie résolue !" : "↺ Anomalie réouverte",
      description:
        resolvedStatus === "RESOLUE"
          ? `L'anomalie ${anomalyId} est résolue et son cas de test a été basculé sur 'OK'.`
          : `L'anomalie ${anomalyId} est réouverte et son cas de test a été basculé sur 'KO'.`,
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
    const updatedAnomalies = [preparedAno, ...anomalies.filter((a) => a.id !== preparedAno.id)];
    const syncedTests = syncTestsWithAnomalies(testCases, updatedAnomalies, currentUser);

    setAnomalies(updatedAnomalies);
    setTestCases(syncedTests);
    saveToFirestore(syncedTests, updatedAnomalies);
    toast({
      title: "Anomalie déclarée",
      description: `L'anomalie ${newAnomaly.id} a été enregistrée et les cas de test associés ont été alignés.`,
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
    const wasResolved = existingAno?.status === "RESOLUE";
    const isNowReopened =
      (wasResolved && (updatedAnomaly.status === "REOUVERTE" || updatedAnomaly.status === "OUVERTE")) ||
      (existingAno?.status !== "REOUVERTE" && updatedAnomaly.status === "REOUVERTE");

    const newReopenCount = isNowReopened
      ? (existingAno?.reopenCount || 0) + 1
      : (updatedAnomaly.reopenCount ?? existingAno?.reopenCount);

    const changeParts: string[] = [];
    if (existingAno) {
      if (existingAno.priority !== updatedAnomaly.priority) changeParts.push(`Priorité : "${existingAno.priority}" → "${updatedAnomaly.priority}"`);
      if (existingAno.status !== updatedAnomaly.status) changeParts.push(`Statut : "${existingAno.status}" → "${updatedAnomaly.status}"`);
      if (existingAno.description !== updatedAnomaly.description) changeParts.push(`Description mise à jour`);
      if (existingAno.businessImpact !== updatedAnomaly.businessImpact) changeParts.push(`Impact métier mis à jour`);
    }

    const actionType = isNowReopened
      ? "Réouverture"
      : updatedAnomaly.status === "RESOLUE" && !wasResolved
      ? "Résolution"
      : "Modification";

    const auditEntry: AuditEntry = {
      timestamp: nowIso,
      author,
      action: actionType,
      changes: changeParts.length > 0 ? changeParts.join(" | ") : `Anomalie ${updatedAnomaly.id} modifiée`,
      remark: auditRemark,
    };
    const preparedAno: Anomaly = {
      ...updatedAnomaly,
      updatedAt: nowIso,
      createdAt: updatedAnomaly.createdAt || nowIso,
      resolvedAt: updatedAnomaly.status === "RESOLUE" ? (updatedAnomaly.resolvedAt || nowIso) : existingAno?.resolvedAt,
      resolvedBy: updatedAnomaly.status === "RESOLUE" ? (updatedAnomaly.resolvedBy || author) : existingAno?.resolvedBy,
      reopenedAt: isNowReopened ? nowIso : (updatedAnomaly.reopenedAt || existingAno?.reopenedAt),
      reopenedBy: isNowReopened ? author : (updatedAnomaly.reopenedBy || existingAno?.reopenedBy),
      reopenCount: newReopenCount,
      auditHistory: [auditEntry, ...(existingAno?.auditHistory || [])],
    };
    const updatedAnomalies = anomalies.map((a) => (a.id === preparedAno.id ? preparedAno : a));
    const syncedTests = syncTestsWithAnomalies(testCases, updatedAnomalies, author);

    setAnomalies(updatedAnomalies);
    setTestCases(syncedTests);
    saveToFirestore(syncedTests, updatedAnomalies);
    toast({
      title: "Anomalie modifiée",
      description: `L'anomalie ${updatedAnomaly.id} a été mise à jour et le statut du cas de test associé a été aligné (${updatedAnomaly.status === "RESOLUE" ? "OK" : "KO"}).`,
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

  // Admin: rename a functional module across all test cases and anomalies
  const handleRenameModule = (oldName: string, newName: string) => {
    const nowIso = new Date().toISOString();
    const oldKey = oldName.trim().toLowerCase();

    const updatedTests = testCases.map((t) => {
      if ((t.module || "").trim().toLowerCase() !== oldKey) return t;
      const auditEntry: AuditEntry = {
        timestamp: nowIso,
        author: currentUser,
        action: "Modification",
        changes: `Module renommé : "${oldName}" → "${newName}" (action admin)`,
      };
      return {
        ...t,
        module: newName,
        updatedAt: nowIso,
        auditHistory: [auditEntry, ...(t.auditHistory || [])],
      };
    });

    const updatedAnomalies = anomalies.map((a) => {
      if ((a.module || "").trim().toLowerCase() !== oldKey) return a;
      const auditEntry: AuditEntry = {
        timestamp: nowIso,
        author: currentUser,
        action: "Modification",
        changes: `Module renommé : "${oldName}" → "${newName}" (action admin)`,
      };
      return {
        ...a,
        module: newName,
        updatedAt: nowIso,
        auditHistory: [auditEntry, ...(a.auditHistory || [])],
      };
    });

    // Update selected module filter if it was pointing at the old name
    if (selectedModule.trim().toLowerCase() === oldKey) {
      setSelectedModule(newName);
    }

    setTestCases(updatedTests);
    setAnomalies(updatedAnomalies);
    saveToFirestore(updatedTests, updatedAnomalies);
    toast({
      title: "✅ Module renommé",
      description: `Le module "${oldName}" a été renommé en "${newName}" sur ${updatedTests.filter(t => t.module === newName).length} test(s) et ${updatedAnomalies.filter(a => a.module === newName).length} anomalie(s).`,
    });
  };

  // Admin: transfer all tests+anomalies from one module to another
  const handleTransferModule = (fromModule: string, toModule: string) => {
    const nowIso = new Date().toISOString();
    const fromKey = fromModule.trim().toLowerCase();

    const updatedTests = testCases.map((t) => {
      if ((t.module || "").trim().toLowerCase() !== fromKey) return t;
      const auditEntry: AuditEntry = {
        timestamp: nowIso,
        author: currentUser,
        action: "Modification",
        changes: `Module transféré : "${fromModule}" → "${toModule}" (action admin)`,
      };
      return { ...t, module: toModule, updatedAt: nowIso, auditHistory: [auditEntry, ...(t.auditHistory || [])] };
    });

    const updatedAnomalies = anomalies.map((a) => {
      if ((a.module || "").trim().toLowerCase() !== fromKey) return a;
      const auditEntry: AuditEntry = {
        timestamp: nowIso,
        author: currentUser,
        action: "Modification",
        changes: `Module transféré : "${fromModule}" → "${toModule}" (action admin)`,
      };
      return { ...a, module: toModule, updatedAt: nowIso, auditHistory: [auditEntry, ...(a.auditHistory || [])] };
    });

    // Update active module filter if it was pointing at source
    if (selectedModule.trim().toLowerCase() === fromKey) {
      setSelectedModule(toModule);
    }

    const transferredTests = updatedTests.filter(t => t.module === toModule && (testCases.find(o => o.id === t.id)?.module || "").trim().toLowerCase() === fromKey).length;
    const transferredAnos  = updatedAnomalies.filter(a => a.module === toModule && (anomalies.find(o => o.id === a.id)?.module || "").trim().toLowerCase() === fromKey).length;

    setTestCases(updatedTests);
    setAnomalies(updatedAnomalies);
    saveToFirestore(updatedTests, updatedAnomalies);
    toast({
      title: "✅ Transfert effectué",
      description: `${transferredTests} test(s) et ${transferredAnos} anomalie(s) transférés de "${fromModule}" vers "${toModule}".`,
    });
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

          {/* Gestion des modules — Admin uniquement */}
          {userIsAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModuleManagerOpen(true)}
              title="Gérer et renommer les modules fonctionnels (Admin)"
              className="rounded-xl border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/40 text-xs font-bold gap-1.5 shadow-xs"
            >
              <Settings2 className="h-4 w-4" />
              Modules
            </Button>
          )}

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

    {/* Module Manager Modal — Admin only */}
    {userIsAdmin && (
      <ModuleManagerModal
        isOpen={isModuleManagerOpen}
        onClose={() => setIsModuleManagerOpen(false)}
        modulesList={modulesList}
        onRenameModule={handleRenameModule}
        onTransferModule={handleTransferModule}
        anomalyCountByModule={Object.fromEntries(
          modulesList.map((m) => [
            m.toLowerCase(),
            anomalies.filter(
              (a) => (a.module || "").trim().toLowerCase() === m.toLowerCase() && a.status !== "RESOLUE"
            ).length,
          ])
        )}
        testCountByModule={Object.fromEntries(
          modulesList.map((m) => [
            m.toLowerCase(),
            testCases.filter(
              (t) => (t.module || "").trim().toLowerCase() === m.toLowerCase()
            ).length,
          ])
        )}
      />
    )}
    </>
  );
}
