
'use client';
import type { ComplianceCategory } from '@/types/compliance';
import { initialCompliancePlanData } from '@/data/compliancePlan';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface PlanDataContextType {
  planData: ComplianceCategory[];
  setPlanData: React.Dispatch<React.SetStateAction<ComplianceCategory[]>>;
  updateTaskCompletion: (categoryId: string, subCategoryId: string, taskId: string, completed: boolean) => void;
  addCategory: (category: Omit<ComplianceCategory, 'id' | 'subCategories'>) => void;
  editCategory: (categoryId: string, categoryUpdate: Partial<Omit<ComplianceCategory, 'id' | 'subCategories'>>) => void;
  removeCategory: (categoryId: string) => void;
  addSubCategory: (categoryId: string, subCategory: Omit<ComplianceSubCategory, 'id' | 'tasks'>) => void;
  editSubCategory: (categoryId: string, subCategoryId: string, subCategoryUpdate: Partial<Omit<ComplianceSubCategory, 'id' | 'tasks'>>) => void;
  removeSubCategory: (categoryId: string, subCategoryId: string) => void;
  addTask: (categoryId: string, subCategoryId: string, task: Omit<ComplianceCategory, 'id' | 'completed'>) => void;
  editTask: (categoryId: string, subCategoryId: string, taskId: string, taskUpdate: Partial<Omit<ComplianceCategory, 'id' | 'completed'>>) => void;
  removeTask: (categoryId: string, subCategoryId: string, taskId: string) => void;
}

const PlanDataContext = createContext<PlanDataContextType | undefined>(undefined);

export const PlanDataProvider = ({ children }: { children: ReactNode }) => {
  const [planData, setPlanData] = useState<ComplianceCategory[]>(() => {
    if (typeof window !== 'undefined') {
      const savedPlanData = localStorage.getItem('planData');
      return savedPlanData ? JSON.parse(savedPlanData) : initialCompliancePlanData;
    }
    return initialCompliancePlanData;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('planData', JSON.stringify(planData));
    }
  }, [planData]);

  const updateTaskCompletion = (categoryId: string, subCategoryId: string, taskId: string, completed: boolean) => {
    setPlanData(prevPlanData =>
      prevPlanData.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              subCategories: cat.subCategories.map(sub =>
                sub.id === subCategoryId
                  ? {
                      ...sub,
                      tasks: sub.tasks.map(task =>
                        task.id === taskId
                          ? { ...task, completed }
                          : task
                      ),
                    }
                  : sub
              ),
            }
          : cat
      )
    );
  };

  const addCategory = (category: Omit<ComplianceCategory, 'id' | 'subCategories'>) => {
    setPlanData(prev => [...prev, { ...category, id: Date.now().toString(), subCategories: [] }]);
  };

  const editCategory = (categoryId: string, categoryUpdate: Partial<Omit<ComplianceCategory, 'id' | 'subCategories'>>) => {
    setPlanData(prev => prev.map(cat => cat.id === categoryId ? { ...cat, ...categoryUpdate } : cat));
  };

  const removeCategory = (categoryId: string) => {
    setPlanData(prev => prev.filter(cat => cat.id !== categoryId));
  };

  const addSubCategory = (categoryId: string, subCategory: Omit<ComplianceSubCategory, 'id' | 'tasks'>) => {
    setPlanData(prev => prev.map(cat => cat.id === categoryId ? { ...cat, subCategories: [...cat.subCategories, { ...subCategory, id: Date.now().toString(), tasks: [] }] } : cat));
  };

  const editSubCategory = (categoryId: string, subCategoryId: string, subCategoryUpdate: Partial<Omit<ComplianceSubCategory, 'id' | 'tasks'>>) => {
     setPlanData(prev => prev.map(cat => cat.id === categoryId ? {
      ...cat,
      subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? { ...sub, ...subCategoryUpdate } : sub)
    } : cat));
  };

  const removeSubCategory = (categoryId: string, subCategoryId: string) => {
    setPlanData(prev => prev.map(cat => cat.id === categoryId ? { ...cat, subCategories: cat.subCategories.filter(sub => sub.id !== subCategoryId) } : cat));
  };

  const addTask = (categoryId: string, subCategoryId: string, task: Omit<ComplianceCategory, 'id' | 'completed'>) => {
    setPlanData(prev => prev.map(cat => cat.id === categoryId ? {
      ...cat,
      subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? { ...sub, tasks: [...sub.tasks, { ...task, id: Date.now().toString(), completed: false }] } : sub)
    } : cat));
  };

  const editTask = (categoryId: string, subCategoryId: string, taskId: string, taskUpdate: Partial<Omit<ComplianceCategory, 'id' | 'completed'>>) => {
     setPlanData(prev => prev.map(cat => cat.id === categoryId ? {
      ...cat,
      subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? {
        ...sub,
        tasks: sub.tasks.map(t => t.id === taskId ? { ...t, ...taskUpdate } : t)
      } : sub)
    } : cat));
  };

  const removeTask = (categoryId: string, subCategoryId: string, taskId: string) => {
     setPlanData(prev => prev.map(cat => cat.id === categoryId ? {
      ...cat,
      subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? { ...sub, tasks: sub.tasks.filter(t => t.id !== taskId) } : sub)
    } : cat));
  };


  return (
    <PlanDataContext.Provider value={{ 
        planData, 
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
