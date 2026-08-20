"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { ComplianceMemo, MemoPillar, MemoScope, MemoPriority, MemoStatus } from "@/types/memo";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { db, isFirebaseConfigured } from "@/lib/firebase";

interface MemoContextType {
  memos: ComplianceMemo[];
  isLoading: boolean;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  openDrawerWithNewMemo: (defaultSectionHref?: string, defaultSectionLabel?: string) => void;
  activeEditorMemo: ComplianceMemo | null;
  setActiveEditorMemo: (memo: ComplianceMemo | null) => void;
  isEditorOpen: boolean;
  setIsEditorOpen: (open: boolean) => void;
  addMemo: (memoData: Omit<ComplianceMemo, "id" | "createdAt" | "authorEmail" | "authorName">) => Promise<ComplianceMemo>;
  updateMemo: (id: string, updates: Partial<ComplianceMemo>) => Promise<void>;
  deleteMemo: (id: string) => Promise<void>;
  toggleResolveMemo: (id: string) => Promise<void>;
  togglePinMemo: (id: string) => void;
  toggleChecklistItem: (memoId: string, itemId: string) => Promise<void>;
  pinnedMemos: ComplianceMemo[];
  getMemosForSection: (href: string) => ComplianceMemo[];
  totalActiveCount: number;
}

const LOCAL_STORAGE_KEY = "compliance_memos_v2";

const INITIAL_DEMO_MEMOS: ComplianceMemo[] = [
  {
    id: "memo-demo-1",
    title: "Points de contrôle Rapprochement RegTools (Juillet 2026)",
    content: "Vérifier la concordance des 4 dossiers sous sanctions avant l'envoi du rapport trimestriel à la direction générale. S'assurer que les pièces justificatives sont archivées.",
    pillar: "LAB_FT",
    scope: "COLLABORATIVE",
    priority: "URGENT",
    status: "ACTIVE",
    authorEmail: "moslem.gouia@mae.tn",
    authorName: "Moslem G.",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    associatedSectionHref: "/regtools-diff",
    associatedSectionLabel: "Rapprochement Clients RegTools",
    pinned: true,
    checklists: [
      { id: "chk-1", text: "Vérifier les 4 fiches sous sanctions", completed: true },
      { id: "chk-2", text: "Contrôler les 86 profils PEP identifiés", completed: false },
      { id: "chk-3", text: "Valider l'export Excel certifié", completed: false }
    ]
  },
  {
    id: "memo-demo-2",
    title: "Revue des coefficients DMR — Matrice des Risques",
    content: "Prévoir une réunion d'arbitrage avec la direction technique pour ajuster la pondération du facteur 'Voie de distribution / Vente à distance' suite aux dernières directives CGA.",
    pillar: "CONFORMITE_REGLEMENTAIRE",
    scope: "COLLABORATIVE",
    priority: "ATTENTION",
    status: "ACTIVE",
    authorEmail: "conformite@mae.com.tn",
    authorName: "Équipe Conformité",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    associatedSectionHref: "/risk-mapping?tab=matrix",
    associatedSectionLabel: "Matrice des Risques KYC",
    pinned: false,
    checklists: [
      { id: "chk-4", text: "Préparer la note de cadrage", completed: false },
      { id: "chk-5", text: "Vérifier l'historique des modifications", completed: true }
    ]
  },
  {
    id: "memo-demo-3",
    title: "Suivi des anomalies du Cahier de Recette",
    content: "L'anomalie ANO-003 (identification PEP non générée) doit être testée en priorité dès la mise en ligne du prochain patch éditeur.",
    pillar: "AUDIT_CONTROLE",
    scope: "COLLABORATIVE",
    priority: "URGENT",
    status: "ACTIVE",
    authorEmail: "moslem.gouia@mae.tn",
    authorName: "Moslem G.",
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    associatedSectionHref: "/cahier-recette",
    associatedSectionLabel: "Cahier de Recette RegTools",
    pinned: false,
    checklists: [
      { id: "chk-6", text: "Rejouer les cas de test T-008, T-009 et T-010", completed: false }
    ]
  }
];

const MemoContext = createContext<MemoContextType | undefined>(undefined);

export const MemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const { toast } = useToast();
  const [memos, setMemos] = useState<ComplianceMemo[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return INITIAL_DEMO_MEMOS;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [activeEditorMemo, setActiveEditorMemo] = useState<ComplianceMemo | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(memos));
    } catch (e) {
      console.error(e);
    }
  }, [memos]);

  // Sync with Firestore if configured
  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setIsLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    (async () => {
      try {
        const { collection, onSnapshot, query, orderBy } = await import("firebase/firestore");
        const q = query(collection(db, "compliance_memos"), orderBy("createdAt", "desc"));
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            if (!snapshot.empty) {
              const cloudMemos: ComplianceMemo[] = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
              })) as ComplianceMemo[];
              setMemos(cloudMemos);
            }
            setIsLoading(false);
          },
          (err) => {
            console.warn("Firestore memos snapshot error, falling back to local:", err);
            setIsLoading(false);
          }
        );
      } catch (err) {
        console.error("Firestore setup error for memos:", err);
        setIsLoading(false);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const addMemo = useCallback(
    async (
      memoData: Omit<ComplianceMemo, "id" | "createdAt" | "authorEmail" | "authorName">
    ): Promise<ComplianceMemo> => {
      const authorEmail = user?.authEmail || user?.email || "conformite@mae.tn";
      const authorName = user?.name || "Équipe Conformité";
      const newMemo: ComplianceMemo = {
        ...memoData,
        id: `memo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        authorEmail,
        authorName,
        createdAt: new Date().toISOString(),
        status: "ACTIVE",
      };

      setMemos((prev) => [newMemo, ...prev]);

      if (isFirebaseConfigured && db) {
        try {
          const { doc, setDoc } = await import("firebase/firestore");
          await setDoc(doc(db, "compliance_memos", newMemo.id), newMemo);
        } catch (e) {
          console.error("Error saving memo to Firestore:", e);
        }
      }

      toast({
        title: "Mémo enregistré",
        description: `Le mémo "${newMemo.title}" a été créé avec succès.`,
      });

      return newMemo;
    },
    [user, toast]
  );

  const updateMemo = useCallback(
    async (id: string, updates: Partial<ComplianceMemo>): Promise<void> => {
      const updatedData = { ...updates, updatedAt: new Date().toISOString() };
      setMemos((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updatedData } : m))
      );

      if (isFirebaseConfigured && db) {
        try {
          const { doc, updateDoc } = await import("firebase/firestore");
          await updateDoc(doc(db, "compliance_memos", id), updatedData);
        } catch (e) {
          console.error("Error updating memo in Firestore:", e);
        }
      }

      toast({
        title: "Mémo mis à jour",
        description: "Les modifications ont été enregistrées.",
      });
    },
    [toast]
  );

  const deleteMemo = useCallback(
    async (id: string): Promise<void> => {
      setMemos((prev) => prev.filter((m) => m.id !== id));

      if (isFirebaseConfigured && db) {
        try {
          const { doc, deleteDoc } = await import("firebase/firestore");
          await deleteDoc(doc(db, "compliance_memos", id));
        } catch (e) {
          console.error("Error deleting memo from Firestore:", e);
        }
      }

      toast({
        title: "Mémo supprimé",
        description: "La note a été retirée du registre.",
      });
    },
    [toast]
  );

  const toggleResolveMemo = useCallback(
    async (id: string): Promise<void> => {
      const memo = memos.find((m) => m.id === id);
      if (!memo) return;

      const isResolving = memo.status === "ACTIVE";
      const nextStatus: MemoStatus = isResolving ? "RESOLVED" : "ACTIVE";
      const updates: Partial<ComplianceMemo> = {
        status: nextStatus,
        resolvedAt: isResolving ? new Date().toISOString() : undefined,
        resolvedBy: isResolving ? user?.name || "Utilisateur" : undefined,
      };

      await updateMemo(id, updates);
    },
    [memos, user, updateMemo]
  );

  const togglePinMemo = useCallback((id: string) => {
    setMemos((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const nextPinned = !m.pinned;
          return { ...m, pinned: nextPinned };
        }
        return m;
      })
    );
  }, []);

  const toggleChecklistItem = useCallback(
    async (memoId: string, itemId: string): Promise<void> => {
      const targetMemo = memos.find((m) => m.id === memoId);
      if (!targetMemo || !targetMemo.checklists) return;

      const updatedChecklists = targetMemo.checklists.map((chk) =>
        chk.id === itemId ? { ...chk, completed: !chk.completed } : chk
      );

      await updateMemo(memoId, { checklists: updatedChecklists });
    },
    [memos, updateMemo]
  );

  const openDrawerWithNewMemo = useCallback(
    (defaultSectionHref?: string, defaultSectionLabel?: string) => {
      setActiveEditorMemo(
        defaultSectionHref
          ? ({
              title: "",
              content: "",
              pillar: "LAB_FT",
              scope: "COLLABORATIVE",
              priority: "ATTENTION",
              status: "ACTIVE",
              associatedSectionHref: defaultSectionHref,
              associatedSectionLabel: defaultSectionLabel || "Page actuelle",
              checklists: [],
            } as any)
          : null
      );
      setIsEditorOpen(true);
    },
    []
  );

  const pinnedMemos = useMemo(() => {
    return memos.filter((m) => m.pinned && m.status === "ACTIVE");
  }, [memos]);

  const getMemosForSection = useCallback(
    (href: string) => {
      const cleanPath = href.split("?")[0];
      return memos.filter((m) => {
        const memoPath = m.associatedSectionHref.split("?")[0];
        return (
          m.associatedSectionHref === href ||
          memoPath === cleanPath ||
          (m.associatedSectionHref.includes("risk-mapping") && href.includes("risk-mapping"))
        );
      });
    },
    [memos]
  );

  const totalActiveCount = useMemo(() => {
    return memos.filter((m) => m.status === "ACTIVE").length;
  }, [memos]);

  return (
    <MemoContext.Provider
      value={{
        memos,
        isLoading,
        isDrawerOpen,
        setIsDrawerOpen,
        openDrawerWithNewMemo,
        activeEditorMemo,
        setActiveEditorMemo,
        isEditorOpen,
        setIsEditorOpen,
        addMemo,
        updateMemo,
        deleteMemo,
        toggleResolveMemo,
        togglePinMemo,
        toggleChecklistItem,
        pinnedMemos,
        getMemosForSection,
        totalActiveCount,
      }}
    >
      {children}
    </MemoContext.Provider>
  );
};

export const useMemos = () => {
  const context = useContext(MemoContext);
  if (!context) {
    throw new Error("useMemos must be used within a MemoProvider");
  }
  return context;
};
