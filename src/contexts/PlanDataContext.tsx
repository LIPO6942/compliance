
'use client';
import type { ComplianceCategory, ComplianceSubCategory, ComplianceTask } from '@/types/compliance';
import { initialCompliancePlanData } from '@/data/compliancePlan';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useUser } from './UserContext';

const planDocumentPath = "plan/main";

interface PlanDataContextType {
  planData: ComplianceCategory[];
  loading: boolean;
  setPlanData: React.Dispatch<React.SetStateAction<ComplianceCategory[]>>;
  updateTaskCompletion: (categoryId: string, subCategoryId: string, taskId: string, completed: boolean) => void;
  addCategory: (category: Omit<ComplianceCategory, 'id' | 'subCategories'>) => void;
  editCategory: (categoryId: string, categoryUpdate: Partial<Omit<ComplianceCategory, 'id' | 'subCategories'>>) => void;
  removeCategory: (categoryId: string) => void;
  addSubCategory: (categoryId: string, subCategory: Omit<ComplianceSubCategory, 'id' | 'tasks'>) => void;
  editSubCategory: (categoryId: string, subCategoryId: string, subCategoryUpdate: Partial<Omit<ComplianceSubCategory, 'id' | 'tasks'>>) => void;
  removeSubCategory: (categoryId: string, subCategoryId: string) => void;
  addTask: (categoryId: string, subCategoryId: string, task: Omit<ComplianceTask, 'id' | 'completed'>) => void;
  editTask: (categoryId: string, subCategoryId: string, taskId: string, taskUpdate: Partial<Omit<ComplianceTask, 'id' | 'completed'>>) => void;
  removeTask: (categoryId: string, subCategoryId: string, taskId: string) => void;
}

const PlanDataContext = createContext<PlanDataContextType | undefined>(undefined);

export const PlanDataProvider = ({ children }: { children: ReactNode }) => {
  const [planData, setPlanData] = useState<ComplianceCategory[]>(initialCompliancePlanData);
  const [loading, setLoading] = useState(true);
  const { isLoaded } = useUser();

  const planDocRef = doc(db, planDocumentPath);

  useEffect(() => {
    if (!isLoaded) return;

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
      console.error("Error fetching plan data: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isLoaded]);

  const updateFirestorePlan = async (newPlanData: ComplianceCategory[]) => {
    try {
      await setDoc(planDocRef, { plan: newPlanData });
    } catch (error) {
      console.error("Error updating plan data in Firestore: ", error);
    }
  };

  const updateTaskCompletion = (categoryId: string, subCategoryId: string, taskId: string, completed: boolean) => {
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
    setPlanData(newPlanData);
    updateFirestorePlan(newPlanData);
  };

  const addCategory = (category: Omit<ComplianceCategory, 'id' | 'subCategories'>) => {
    const newPlanData = [...planData, { ...category, id: Date.now().toString(), subCategories: [] }];
    setPlanData(newPlanData);
    updateFirestorePlan(newPlanData);
  };

  const editCategory = (categoryId: string, categoryUpdate: Partial<Omit<ComplianceCategory, 'id' | 'subCategories'>>) => {
    const newPlanData = planData.map(cat => cat.id === categoryId ? { ...cat, ...categoryUpdate } : cat);
    setPlanData(newPlanData);
    updateFirestorePlan(newPlanData);
  };

  const removeCategory = (categoryId: string) => {
    const newPlanData = planData.filter(cat => cat.id !== categoryId);
    setPlanData(newPlanData);
    updateFirestorePlan(newPlanData);
  };

  const addSubCategory = (categoryId: string, subCategory: Omit<ComplianceSubCategory, 'id' | 'tasks'>) => {
    const newPlanData = planData.map(cat => cat.id === categoryId ? { ...cat, subCategories: [...cat.subCategories, { ...subCategory, id: Date.now().toString(), tasks: [] }] } : cat);
    setPlanData(newPlanData);
    updateFirestorePlan(newPlanData);
  };

  const editSubCategory = (categoryId: string, subCategoryId: string, subCategoryUpdate: Partial<Omit<ComplianceSubCategory, 'id' | 'tasks'>>) => {
     const newPlanData = planData.map(cat => cat.id === categoryId ? {
      ...cat,
      subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? { ...sub, ...subCategoryUpdate } : sub)
    } : cat);
    setPlanData(newPlanData);
    updateFirestorePlan(newPlanData);
  };

  const removeSubCategory = (categoryId: string, subCategoryId: string) => {
    const newPlanData = planData.map(cat => cat.id === categoryId ? { ...cat, subCategories: cat.subCategories.filter(sub => sub.id !== subCategoryId) } : cat);
    setPlanData(newPlanData);
    updateFirestorePlan(newPlanData);
  };

  const addTask = (categoryId: string, subCategoryId: string, task: Omit<ComplianceTask, 'id' | 'completed'>) => {
    const newPlanData = planData.map(cat => cat.id === categoryId ? {
      ...cat,
      subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? { ...sub, tasks: [...sub.tasks, { ...task, id: Date.now().toString(), completed: false }] } : sub)
    } : cat);
    setPlanData(newPlanData);
    updateFirestorePlan(newPlanData);
  };

  const editTask = (categoryId: string, subCategoryId: string, taskId: string, taskUpdate: Partial<Omit<ComplianceTask, 'id' | 'completed'>>) => {
     const newPlanData = planData.map(cat => cat.id === categoryId ? {
      ...cat,
      subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? {
        ...sub,
        tasks: sub.tasks.map(t => t.id === taskId ? { ...t, ...taskUpdate } : t)
      } : sub)
    } : cat);
    setPlanData(newPlanData);
    updateFirestorePlan(newPlanData);
  };

  const removeTask = (categoryId: string, subCategoryId: string, taskId: string) => {
     const newPlanData = planData.map(cat => cat.id === categoryId ? {
      ...cat,
      subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? { ...sub, tasks: sub.tasks.filter(t => t.id !== taskId) } : sub)
    } : cat);
    setPlanData(newPlanData);
    updateFirestorePlan(newPlanData);
  };


  return (
    <PlanDataContext.Provider value={{
        planData,
        loading,
        setPlanData,
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
