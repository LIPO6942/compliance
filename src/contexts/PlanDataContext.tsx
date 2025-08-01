
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

// Helper to remove 'undefined' values which Firestore doesn't support.
const cleanupObjectForFirestore = (obj: any) => {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
        return value === undefined ? null : value;
    }));
};

export const PlanDataProvider = ({ children }: { children: ReactNode }) => {
  const [planData, setPlanData] = useState<ComplianceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isFirebaseConfigured || !db) {
      setPlanData(initialCompliancePlanData);
      setLoading(false);
      console.warn("Firebase is not configured. Plan data will use mock data and not be saved.");
      return;
    }

    const planDocRef = doc(db, planDocumentPath);
    const unsubscribe = onSnapshot(planDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setPlanData(data.plan || []);
        } else {
            console.log("Plan document does not exist. Creating with initial data.");
            setDoc(planDocRef, { plan: cleanupObjectForFirestore(initialCompliancePlanData) })
                .then(() => setPlanData(initialCompliancePlanData))
                .catch(e => console.error("Error creating initial plan document:", e));
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching plan data, falling back to mock data: ", error);
        setPlanData(initialCompliancePlanData);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [isLoaded]);

  const updateFirestorePlan = async (newData: ComplianceCategory[]) => {
    if (isFirebaseConfigured && db) {
      const planDocRef = doc(db, planDocumentPath);
      await setDoc(planDocRef, { plan: cleanupObjectForFirestore(newData) });
    } else {
       // If firebase is not configured, we just update the local state.
       setPlanData(newData);
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
    const newCategory: ComplianceCategory = { 
        ...category, 
        id: Date.now().toString(), 
        subCategories: [] 
    };
    const newPlanData = [...planData, newCategory];
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
    const newSubCategory: ComplianceSubCategory = { ...subCategory, icon: subCategory.icon || 'ListTodo', id: Date.now().toString(), tasks: [] };
    const newPlanData = planData.map(cat => cat.id === categoryId ? { ...cat, subCategories: [...cat.subCategories, newSubCategory] } : cat);
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
    const newTaskData: ComplianceTask = { 
      ...task, 
      id: Date.now().toString(), 
      completed: false, 
      description: task.description || undefined,
      deadline: task.deadline || undefined,
    };
    const newPlanData = planData.map(cat => cat.id === categoryId ? {
      ...cat,
      subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? { ...sub, tasks: [...sub.tasks, newTaskData] } : sub)
    } : cat);
    await updateFirestorePlan(newPlanData);
  };

  const editTask = async (categoryId: string, subCategoryId: string, taskId: string, taskUpdate: Partial<Omit<ComplianceTask, 'id' | 'completed'>>) => {
    const newPlanData = planData.map(cat => cat.id === categoryId ? {
      ...cat,
      subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? {
        ...sub,
        tasks: sub.tasks.map(t => t.id === taskId ? { ...t, ...taskUpdate, deadline: taskUpdate.deadline || undefined, description: taskUpdate.description || undefined } : t)
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
