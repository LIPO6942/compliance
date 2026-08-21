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
  toggleMemoScope: (id: string) => Promise<void>;
  toggleChecklistItem: (memoId: string, itemId: string) => Promise<void>;
  pinnedMemos: ComplianceMemo[];
  getMemosForSection: (href: string) => ComplianceMemo[];
  totalActiveCount: number;
  collaborativeCount: number;
  privateCount: number;
}

const LOCAL_STORAGE_KEY = "compliance_memos_v3";

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

const MemoContext = createContext<MemoContextType | undefined>(undefined);

export const MemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const { toast } = useToast();
  const [rawMemos, setRawMemos] = useState<ComplianceMemo[]>(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("compliance_memos_v1");
      localStorage.removeItem("compliance_memos_v2");
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse local memos:", e);
        }
      }
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [activeEditorMemo, setActiveEditorMemo] = useState<ComplianceMemo | null>(null);

  const currentUserEmail = (user?.authEmail || user?.email || "").toLowerCase().trim();

  // Filter memos based on scope & user identity:
  // - COLLABORATIVE memos are visible to the entire team across all sessions.
  // - PRIVATE memos are visible only to the author (or in single-user offline fallback).
  const visibleMemos = useMemo(() => {
    return rawMemos.filter((m) => {
      if (m.scope === "COLLABORATIVE") return true;
      if (!m.authorEmail || !currentUserEmail) return true;
      return m.authorEmail.toLowerCase().trim() === currentUserEmail;
    });
  }, [rawMemos, currentUserEmail]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rawMemos));
    } catch (e) {
      console.error("Failed to sync memos to localStorage:", e);
    }
  }, [rawMemos]);

  // Real-time bidirectional sync with Firestore
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
            const cloudMemos: ComplianceMemo[] = snapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })) as ComplianceMemo[];
            
            // If cloud has records or empty collection
            setRawMemos(cloudMemos);
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
        pinned: memoData.pinned ?? false,
        checklists: memoData.checklists || [],
      };

      // Update local state immediately for instant feedback
      setRawMemos((prev) => [newMemo, ...prev.filter((m) => m.id !== newMemo.id)]);

      // Persist to Firestore for real-time team collaboration
      if (isFirebaseConfigured && db) {
        try {
          const { doc, setDoc } = await import("firebase/firestore");
          await setDoc(doc(db, "compliance_memos", newMemo.id), cleanData(newMemo));
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
      setRawMemos((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updatedData } : m))
      );

      if (isFirebaseConfigured && db) {
        try {
          const { doc, setDoc } = await import("firebase/firestore");
          await setDoc(doc(db, "compliance_memos", id), cleanData(updatedData), { merge: true });
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
      setRawMemos((prev) => prev.filter((m) => m.id !== id));

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
      const memo = rawMemos.find((m) => m.id === id);
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
    [rawMemos, user, updateMemo]
  );

  const togglePinMemo = useCallback((id: string) => {
    setRawMemos((prev) =>
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
      const targetMemo = rawMemos.find((m) => m.id === memoId);
      if (!targetMemo || !targetMemo.checklists) return;

      const updatedChecklists = targetMemo.checklists.map((chk) =>
        chk.id === itemId ? { ...chk, completed: !chk.completed } : chk
      );

      await updateMemo(memoId, { checklists: updatedChecklists });
    },
    [rawMemos, updateMemo]
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
    return visibleMemos.filter((m) => m.pinned && m.status === "ACTIVE");
  }, [visibleMemos]);

  const getMemosForSection = useCallback(
    (href: string) => {
      const cleanPath = href.split("?")[0];
      return visibleMemos.filter((m) => {
        const memoPath = m.associatedSectionHref.split("?")[0];
        return (
          m.associatedSectionHref === href ||
          memoPath === cleanPath ||
          (m.associatedSectionHref.includes("risk-mapping") && href.includes("risk-mapping"))
        );
      });
    },
    [visibleMemos]
  );

  const toggleMemoScope = useCallback(
    async (id: string): Promise<void> => {
      const target = rawMemos.find((m) => m.id === id);
      if (!target) return;
      const nextScope: MemoScope = target.scope === "COLLABORATIVE" ? "PRIVATE" : "COLLABORATIVE";
      await updateMemo(id, { scope: nextScope });
      toast({
        title: nextScope === "COLLABORATIVE" ? "Mémo partagé avec l'équipe" : "Mémo rendu privé",
        description: nextScope === "COLLABORATIVE" ? "Ce mémo est maintenant visible par toute l'équipe." : "Ce mémo n'est plus visible que par vous.",
      });
    },
    [rawMemos, updateMemo, toast]
  );

  const totalActiveCount = useMemo(() => {
    return visibleMemos.filter((m) => m.status === "ACTIVE").length;
  }, [visibleMemos]);

  const collaborativeCount = useMemo(() => {
    return visibleMemos.filter((m) => m.status === "ACTIVE" && m.scope === "COLLABORATIVE").length;
  }, [visibleMemos]);

  const privateCount = useMemo(() => {
    return visibleMemos.filter((m) => m.status === "ACTIVE" && m.scope === "PRIVATE").length;
  }, [visibleMemos]);

  return (
    <MemoContext.Provider
      value={{
        memos: visibleMemos,
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
        toggleMemoScope,
        toggleChecklistItem,
        pinnedMemos,
        getMemosForSection,
        totalActiveCount,
        collaborativeCount,
        privateCount,
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
