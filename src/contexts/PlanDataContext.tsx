
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
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};


export const PlanDataProvider = ({ children }: { children: ReactNode }) => {
  const [planData, setPlanData] = useState<ComplianceCategory[]>([]);
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

  const updateFirestorePlan = async (getNewPlanData: () => ComplianceCategory[]) => {
    const newPlanData = getNewPlanData();
    if (isFirebaseConfigured && db) {
      try {
        const planDocRef = doc(db, planDocumentPath);
        await setDoc(planDocRef, { plan: newPlanData });
      } catch (error) {
        console.error("Error updating plan data in Firestore: ", error);
        // If Firestore update fails, we might want to revert the state,
        // but for now, we rely on the onSnapshot to keep it in sync.
      }
    } else {
      // If firebase is not configured, we update the local state directly
      setPlanData(newPlanData);
    }
  };

  const updateTaskCompletion = async (categoryId: string, subCategoryId: string, taskId: string, completed: boolean) => {
    await updateFirestorePlan(() => planData.map(cat =>
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
    ));
  };

  const addCategory = async (category: Omit<ComplianceCategory, 'id' | 'subCategories'>) => {
    await updateFirestorePlan(() => [...planData, { ...category, id: Date.now().toString(), subCategories: [] }]);
  };

  const editCategory = async (categoryId: string, categoryUpdate: Partial<Omit<ComplianceCategory, 'id' | 'subCategories'>>) => {
    await updateFirestorePlan(() => planData.map(cat => cat.id === categoryId ? { ...cat, ...categoryUpdate } : cat));
  };

  const removeCategory = async (categoryId: string) => {
    await updateFirestorePlan(() => planData.filter(cat => cat.id !== categoryId));
  };

  const addSubCategory = async (categoryId: string, subCategory: Omit<ComplianceSubCategory, 'id' | 'tasks'>) => {
    await updateFirestorePlan(() => planData.map(cat => cat.id === categoryId ? { ...cat, subCategories: [...cat.subCategories, { ...subCategory, id: Date.now().toString(), tasks: [] }] } : cat));
  };

  const editSubCategory = async (categoryId: string, subCategoryId: string, subCategoryUpdate: Partial<Omit<ComplianceSubCategory, 'id' | 'tasks'>>) => {
     await updateFirestorePlan(() => planData.map(cat => cat.id === categoryId ? {
      ...cat,
      subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? { ...sub, ...subCategoryUpdate } : sub)
    } : cat));
  };

  const removeSubCategory = async (categoryId: string, subCategoryId: string) => {
    await updateFirestorePlan(() => planData.map(cat => cat.id === categoryId ? { ...cat, subCategories: cat.subCategories.filter(sub => sub.id !== subCategoryId) } : cat));
  };

  const addTask = async (categoryId: string, subCategoryId: string, task: Omit<ComplianceTask, 'id' | 'completed'>) => {
    const newTask = cleanupObjectForFirestore({ ...task, id: Date.now().toString(), completed: false });
    await updateFirestorePlan(() => planData.map(cat => cat.id === categoryId ? {
      ...cat,
      subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? { ...sub, tasks: [...sub.tasks, newTask] } : sub)
    } : cat));
  };

  const editTask = async (categoryId: string, subCategoryId: string, taskId: string, taskUpdate: Partial<Omit<ComplianceTask, 'id' | 'completed'>>) => {
    const cleanedUpdate = cleanupObjectForFirestore(taskUpdate);
     await updateFirestorePlan(() => planData.map(cat => cat.id === categoryId ? {
      ...cat,
      subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? {
        ...sub,
        tasks: sub.tasks.map(t => t.id === taskId ? { ...t, ...cleanedUpdate } : t)
      } : sub)
    } : cat));
  };

  const removeTask = async (categoryId: string, subCategoryId: string, taskId: string) => {
     await updateFirestorePlan(() => planData.map(cat => cat.id === categoryId ? {
      ...cat,
      subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? { ...sub, tasks: sub.tasks.filter(t => t.id !== taskId) } : sub)
    } : cat));
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
