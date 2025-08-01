
'use client';
import type { ComplianceCategory, ComplianceSubCategory, ComplianceTask } from '@/types/compliance';
import { initialCompliancePlanData } from '@/data/compliancePlan';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useUser } from './UserContext';

const planDocumentPath = "plan/main";

interface PlanDataContextType {
  planData: ComplianceCategory[];
  loading: boolean;
  updateTaskCompletion: (categoryId: string, subCategoryId: string, taskId: string, completed: boolean) => Promise<void>;
  addCategory: (category: Omit<ComplianceCategory, 'id' | 'subCategories'>) => Promise<void>;
  editCategory: (categoryId: string, categoryUpdate: Partial<Omit<ComplianceCategory, 'id' | 'subCategories'>>) => Promise<void>;
  removeCategory: (categoryId: string) => Promise<void>;
  addSubCategory: (categoryId: string, subCategory: Omit<ComplianceSubCategory, 'id' | 'tasks'>) => Promise<void>;
  editSubCategory: (categoryId: string, subCategoryId: string, subCategoryUpdate: Partial<Omit<ComplianceSubCategory, 'id' | 'tasks'>>) => Promise<void>;
  removeSubCategory: (categoryId: string, subCategoryId: string) => Promise<void>;
  addTask: (categoryId: string, subCategoryId: string, task: Omit<ComplianceTask, 'id' | 'completed'>) => Promise<void>;
  editTask: (categoryId: string, subCategoryId: string, taskId: string, taskUpdate: Partial<Omit<ComplianceTask, 'id' | 'completed'>>) => Promise<void>;
  removeTask: (categoryId: string, subCategoryId: string, taskId: string) => Promise<void>;
}

const PlanDataContext = createContext<PlanDataContextType | undefined>(undefined);

// Helper to remove undefined fields from an object before sending to Firestore
const cleanupObjectForFirestore = (obj: any) => {
  const newObj: any = {};
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value !== undefined) {
      newObj[key] = value;
    } else {
      // Explicitly set undefined to null for Firestore compatibility if needed
      // For this case, we just omit the key
    }
  });
  return newObj;
};


export const PlanDataProvider = ({ children }: { children: ReactNode }) => {
  const [planData, setPlanData] = useState<ComplianceCategory[]>(initialCompliancePlanData);
  const [loading, setLoading] = useState(true);
  const { isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (isFirebaseConfigured && db) {
      const planDocRef = doc(db, planDocumentPath);
      const unsubscribe = onSnapshot(planDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setPlanData(docSnap.data().plan);
        } else {
          // If it doesn't exist in Firestore, create it with initial data
          setDoc(planDocRef, { plan: initialCompliancePlanData });
          setPlanData(initialCompliancePlanData);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching plan data, falling back to mock data: ", error);
        setPlanData(initialCompliancePlanData);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Firebase is not configured, use initial data and stop loading
      setPlanData(initialCompliancePlanData);
      setLoading(false);
      console.warn("Firebase is not configured. Plan data will not be saved.");
    }
  }, [isLoaded]);

  const updateFirestorePlan = async (newData: ComplianceCategory[]) => {
     // The onSnapshot listener will automatically update the local state.
     // We optimistically update the state for a snappier UI, but the source of truth is Firestore.
    setPlanData(newData);
    if (isFirebaseConfigured && db) {
      try {
        const planDocRef = doc(db, planDocumentPath);
        await setDoc(planDocRef, { plan: newData });
      } catch (error) {
        console.error("Error updating plan data in Firestore: ", error);
        // If Firestore update fails, onSnapshot will eventually revert the state.
      }
    }
  };

  const updateTaskCompletion = async (categoryId: string, subCategoryId: string, taskId: string, completed: boolean) => {
    const newPlanData = planData.map(cat =>
      cat.id === categoryId
        ? {
            ...cat,
            subCategories: cat.subCategories.map(sub =>
              sub.id === subCategoryId
                ? {
                    ...sub,
                    tasks: sub.tasks.map(task =>
                      task.id === taskId ? { ...task, completed } : task
                    ),
                  }
                : sub
            ),
          }
        : cat
    );
    await updateFirestorePlan(newPlanData);
  };

  const addCategory = async (category: Omit<ComplianceCategory, 'id' | 'subCategories'>) => {
    const newPlanData = [...planData, { ...category, id: Date.now().toString(), subCategories: [] }];
    await updateFirestorePlan(newPlanData);
  };

  const editCategory = async (categoryId: string, categoryUpdate: Partial<Omit<ComplianceCategory, 'id' | 'subCategories'>>) => {
    const newPlanData = planData.map(cat => cat.id === categoryId ? { ...cat, ...categoryUpdate } : cat);
    await updateFirestorePlan(newPlanData);
  };

  const removeCategory = async (categoryId: string) => {
    const newPlanData = planData.filter(cat => cat.id !== categoryId);
    await updateFirestorePlan(newPlanData);
  };

  const addSubCategory = async (categoryId: string, subCategory: Omit<ComplianceSubCategory, 'id' | 'tasks'>) => {
    const newPlanData = planData.map(cat => cat.id === categoryId ? { ...cat, subCategories: [...cat.subCategories, { ...subCategory, id: Date.now().toString(), tasks: [] }] } : cat);
    await updateFirestorePlan(newPlanData);
  };

  const editSubCategory = async (categoryId: string, subCategoryId: string, subCategoryUpdate: Partial<Omit<ComplianceSubCategory, 'id' | 'tasks'>>) => {
     const newPlanData = planData.map(cat => cat.id === categoryId ? {
      ...cat,
      subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? { ...sub, ...subCategoryUpdate } : sub)
    } : cat);
    await updateFirestorePlan(newPlanData);
  };

  const removeSubCategory = async (categoryId: string, subCategoryId: string) => {
    const newPlanData = planData.map(cat => cat.id === categoryId ? { ...cat, subCategories: cat.subCategories.filter(sub => sub.id !== subCategoryId) } : cat);
    await updateFirestorePlan(newPlanData);
  };

  const addTask = async (categoryId: string, subCategoryId: string, task: Omit<ComplianceTask, 'id' | 'completed'>) => {
    const newTaskData = cleanupObjectForFirestore({ ...task, id: Date.now().toString(), completed: false });
    const newPlanData = planData.map(cat => cat.id === categoryId ? {
      ...cat,
      subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? { ...sub, tasks: [...sub.tasks, newTaskData] } : sub)
    } : cat);
    await updateFirestorePlan(newPlanData);
  };

  const editTask = async (categoryId: string, subCategoryId: string, taskId: string, taskUpdate: Partial<Omit<ComplianceTask, 'id' | 'completed'>>) => {
    const cleanedUpdate = cleanupObjectForFirestore(taskUpdate);
    const newPlanData = planData.map(cat => cat.id === categoryId ? {
      ...cat,
      subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? {
        ...sub,
        tasks: sub.tasks.map(t => t.id === taskId ? { ...t, ...cleanedUpdate } : t)
      } : sub)
    } : cat));
    await updateFirestorePlan(newPlanData);
  };

  const removeTask = async (categoryId: string, subCategoryId: string, taskId: string) => {
     const newPlanData = planData.map(cat => cat.id === categoryId ? {
      ...cat,
      subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? { ...sub, tasks: sub.tasks.filter(t => t.id !== taskId) } : sub)
    } : cat));
    await updateFirestorePlan(newPlanData);
  };


  return (
    <PlanDataContext.Provider value={{
        planData,
        loading,
        updateTaskCompletion,
        addCategory,
        editCategory,
        removeCategory,
        addSubCategory,
        editSubCategory,
        removeSubCategory,
        addTask,
        editTask,
        removeTask
        }}>
      {children}
    </PlanDataContext.Provider>
  );
};

export const usePlanData = () => {
  const context = useContext(PlanDataContext);
  if (context === undefined) {
    throw new Error('usePlanData must be used within a PlanDataProvider');
  }
  return context;
};
