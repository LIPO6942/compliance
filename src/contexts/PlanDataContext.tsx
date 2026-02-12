
'use client';
import type { ComplianceCategory, ComplianceSubCategory, ComplianceTask } from '@/types/compliance';
import { initialCompliancePlanData } from '@/data/compliancePlan';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
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
  addTask: (categoryId: string, subCategoryId: string, task: Omit<ComplianceTask, 'id' | 'completed' | 'year'>) => Promise<void>;
  editTask: (categoryId: string, subCategoryId: string, taskId: string, taskUpdate: Partial<Omit<ComplianceTask, 'id' | 'completed' | 'year'>>) => Promise<void>;
  removeTask: (categoryId: string, subCategoryId: string, taskId: string) => Promise<void>;
}

const PlanDataContext = createContext<PlanDataContextType | undefined>(undefined);

const cleanData = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(cleanData);
  } else if (typeof data === 'object' && data !== null) {
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

const updatePlanInFirestore = async (newPlan: ComplianceCategory[]) => {
  if (!isFirebaseConfigured || !db) {
    console.warn("Firebase is not configured. Plan data will not be saved.");
    return;
  }
  try {
    const planDocRef = doc(db, "plan", "main");
    const cleanedData = cleanData(newPlan);
    await setDoc(planDocRef, { plan: cleanedData });
  } catch (err) {
    console.error("🔥 Erreur updatePlanInFirestore:", err);
    throw err;
  }
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
  
    const planDocRef = doc(db, "plan", "main");
  
    const unsubscribe = onSnapshot(planDocRef, async (docSnap) => {
        const existingPlan = docSnap.data()?.plan;
        // This logic forces a one-time overwrite if the plan in DB is missing or has fewer categories than the mock data.
        if (!docSnap.exists() || !existingPlan || existingPlan.length < initialCompliancePlanData.length) {
            console.log("Plan document is missing or outdated. Force-seeding with detailed data.");
            try {
                await updatePlanInFirestore(initialCompliancePlanData);
                // No need to setPlanData here, onSnapshot will trigger again with the new data.
            } catch (e) {
                console.error("Error creating initial plan document:", e);
                setPlanData(initialCompliancePlanData);
                setLoading(false);
            }
        } else {
            setPlanData(existingPlan);
            setLoading(false);
        }
    }, (error) => {
        console.error("Error fetching plan data, falling back to mock data: ", error);
        setPlanData(initialCompliancePlanData);
        setLoading(false);
    });
  
    return () => unsubscribe();
  }, [isLoaded]);


  const addCategory = async (category: Omit<ComplianceCategory, 'id' | 'subCategories'>) => {
    const newCategory: ComplianceCategory = {
      ...category,
      id: Date.now().toString(),
      subCategories: [],
    };
    try {
      const updatedPlan = [...planData, newCategory];
      await updatePlanInFirestore(updatedPlan);
    } catch (error) {
      console.error("Erreur ajout catégorie:", error);
    }
  };
  
  const editCategory = async (categoryId: string, categoryUpdate: Partial<Omit<ComplianceCategory, 'id' | 'subCategories'>>) => {
    try {
      const newPlanData = planData.map(cat => cat.id === categoryId ? { ...cat, ...categoryUpdate } : cat);
      await updatePlanInFirestore(newPlanData);
    } catch (error) {
      console.error("Erreur modification catégorie:", error);
    }
  };

  const removeCategory = async (categoryId: string) => {
    try {
      const newPlanData = planData.filter(cat => cat.id !== categoryId);
      await updatePlanInFirestore(newPlanData);
    } catch (error) {
      console.error("Erreur suppression catégorie:", error);
    }
  };

  const addSubCategory = async (categoryId: string, subCategory: Omit<ComplianceSubCategory, 'id' | 'tasks'>) => {
    const newSubCategory: ComplianceSubCategory = { ...subCategory, icon: subCategory.icon || 'ListTodo', id: Date.now().toString(), tasks: [] };
    try {
      const newPlanData = planData.map(cat => cat.id === categoryId ? { ...cat, subCategories: [...cat.subCategories, newSubCategory] } : cat);
      await updatePlanInFirestore(newPlanData);
    } catch (error) {
      console.error("Erreur ajout sous-catégorie:", error);
    }
  };

  const editSubCategory = async (categoryId: string, subCategoryId: string, subCategoryUpdate: Partial<Omit<ComplianceSubCategory, 'id' | 'tasks'>>) => {
    try {
      const newPlanData = planData.map(cat => cat.id === categoryId ? {
        ...cat,
        subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? { ...sub, ...subCategoryUpdate } : sub)
      } : cat);
      await updatePlanInFirestore(newPlanData);
    } catch (error) {
       console.error("Erreur modification sous-catégorie:", error);
    }
  };

  const removeSubCategory = async (categoryId: string, subCategoryId: string) => {
    try {
      const newPlanData = planData.map(cat => cat.id === categoryId ? { ...cat, subCategories: cat.subCategories.filter(sub => sub.id !== subCategoryId) } : cat);
      await updatePlanInFirestore(newPlanData);
    } catch (error) {
       console.error("Erreur suppression sous-catégorie:", error);
    }
  };

  const addTask = async (categoryId: string, subCategoryId: string, task: Omit<ComplianceTask, 'id' | 'completed'>) => {
    const newTaskData: ComplianceTask = {
      ...task,
      id: Date.now().toString(),
      completed: false,
    };
    try {
      const newPlanData = planData.map(cat => cat.id === categoryId ? {
        ...cat,
        subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? { ...sub, tasks: [...sub.tasks, newTaskData] } : sub)
      } : cat);
      await updatePlanInFirestore(newPlanData);
    } catch (error) {
      console.error("Erreur ajout tâche:", error);
    }
  };

  const editTask = async (categoryId: string, subCategoryId: string, taskId: string, taskUpdate: Partial<Omit<ComplianceTask, 'id' | 'completed'>>) => {
      try {
        const newPlanData = planData.map(cat => (cat.id === categoryId ? {
            ...cat,
            subCategories: cat.subCategories.map(sub => (sub.id === subCategoryId ? {
                ...sub,
                tasks: sub.tasks.map(t => (t.id === taskId ? { ...t, ...taskUpdate } : t))
            } : sub))
        } : cat));
        await updatePlanInFirestore(newPlanData);
      } catch(error) {
        console.error("Erreur modification tâche:", error);
      }
  };

  const removeTask = async (categoryId: string, subCategoryId: string, taskId: string) => {
    try {
      const newPlanData = planData.map(cat => cat.id === categoryId ? {
        ...cat,
        subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? { ...sub, tasks: sub.tasks.filter(t => t.id !== taskId) } : sub)
      } : cat);
      await updatePlanInFirestore(newPlanData);
    } catch(error) {
      console.error("Erreur suppression tâche:", error);
    }
  };
  
  const updateTaskCompletion = async (categoryId: string, subCategoryId: string, taskId: string, completed: boolean) => {
    const recursiveUpdate = (tasks: ComplianceTask[]): ComplianceTask[] => {
      return tasks.map(task => {
        if (task.id === taskId) {
          return { ...task, completed };
        }
        if (task.branches) {
          return {
            ...task,
            branches: task.branches.map(branch => ({
              ...branch,
              tasks: recursiveUpdate(branch.tasks)
            }))
          };
        }
        return task;
      });
    };

    try {
      const newPlanData = planData.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              subCategories: cat.subCategories.map(sub =>
                sub.id === subCategoryId
                  ? {
                      ...sub,
                      tasks: recursiveUpdate(sub.tasks),
                    }
                  : sub
              ),
            }
          : cat
      );
      await updatePlanInFirestore(newPlanData);
    } catch (error) {
      console.error("Erreur mise à jour statut tâche:", error);
    }
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
