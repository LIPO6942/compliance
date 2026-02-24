
'use client';
import type { ComplianceCategory, ComplianceSubCategory, ComplianceTask, WorkflowTask, WorkflowTaskStatus, AuditLog, AvailableUser, AvailableRole } from '@/types/compliance';
import { initialCompliancePlanData } from '@/data/compliancePlan';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, getDoc, collection, query, where, orderBy, limit, QuerySnapshot, DocumentData } from "firebase/firestore";
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

  resetToInitialData: () => Promise<void>;
  updateAvailableRole: (id: string, update: Partial<AvailableRole>) => Promise<void>;
  removeAvailableRole: (id: string) => Promise<void>;
  activeWorkflows: Record<string, { code: string; name: string, order?: number }>;
  workflowTasks: WorkflowTask[];
  availableUsers: AvailableUser[];
  availableRoles: AvailableRole[];
  auditLogs: AuditLog[];
  assignTask: (task: Omit<WorkflowTask, 'id' | 'assignedAt'>) => Promise<void>;
  updateTaskStatus: (taskId: string, status: WorkflowTaskStatus) => Promise<void>;
  updateTask: (taskId: string, update: Partial<WorkflowTask>) => Promise<void>;
  addAvailableUser: (user: Omit<AvailableUser, 'id' | 'createdAt'>) => Promise<void>;
  updateAvailableUser: (id: string, update: Partial<AvailableUser>) => Promise<void>;
  removeAvailableUser: (id: string) => Promise<void>;
  addAvailableRole: (role: Omit<AvailableRole, 'id' | 'createdAt'>) => Promise<void>;
  deleteWorkflow: (workflowId: string) => Promise<void>;
  updateWorkflowOrder: (workflowId: string, order: number) => Promise<void>;
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
  const [activeWorkflows, setActiveWorkflows] = useState<Record<string, { code: string; name: string, order?: number }>>({});
  const [workflowTasks, setWorkflowTasks] = useState<WorkflowTask[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
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
      // Only seed if the document doesn't exist at all (first-time setup).
      // NEVER overwrite based on length comparison — that destroys user modifications.
      if (!docSnap.exists() || !existingPlan) {
        console.log("Plan document does not exist. Initial seeding with default data.");
        try {
          await updatePlanInFirestore(initialCompliancePlanData);
          // onSnapshot will trigger again with the new data.
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

  useEffect(() => {
    if (!isLoaded || !isFirebaseConfigured || !db) return;

    const q = query(collection(db, 'workflows'));
    const unsubscribe = onSnapshot(q, async (snapshot: QuerySnapshot<DocumentData>) => {
      const workflows: Record<string, { code: string; name: string, order?: number }> = {};

      // console.log(`[PlanData] Workflows snapshot size: ${snapshot.size}`);
      for (const workflowDoc of snapshot.docs) {
        const data = workflowDoc.data() as any;
        // console.log(`[PlanData] Workflow ${workflowDoc.id} data:`, data);

        if (data.activeVersionId) {
          // console.log(`[PlanData] Fetching active version ${data.activeVersionId} for ${workflowDoc.id}`);
          try {
            const vRef = doc(db as any, 'workflows', workflowDoc.id, 'versions', data.activeVersionId);
            const vSnap = await getDoc(vRef);
            if (vSnap.exists()) {
              // console.log(`[PlanData] Version found for ${workflowDoc.id}`);
              workflows[data.workflowId] = {
                code: vSnap.data().mermaidCode,
                name: data.name || data.workflowId,
                order: data.order
              };
            } else {
              console.warn(`[PlanData] Version document ${data.activeVersionId} not found for workflow ${workflowDoc.id}`);
            }
          } catch (e) {
            console.error(`[PlanData] Error fetching version for ${workflowDoc.id}:`, e);
          }
        } else {
          // console.log(`[PlanData] Workflow ${workflowDoc.id} has no activeVersionId`);
        }
      }
      // console.log(`[PlanData] Final active workflows:`, Object.keys(workflows));
      setActiveWorkflows(workflows);
    });

    return () => unsubscribe();
  }, [isLoaded]);

  // Chargement des tâches et audit logs
  useEffect(() => {
    if (!isLoaded || !isFirebaseConfigured || !db) return;

    const tasksUnsubscribe = onSnapshot(collection(db, 'tasks'), async (snapshot) => {
      const rawTasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WorkflowTask));

      // Déduplication : garder uniquement la tâche la plus récente par workflowId+nodeId
      const taskMap = new Map<string, WorkflowTask>();
      const duplicateIds: string[] = [];

      rawTasks.forEach(t => {
        const key = `${t.workflowId}-${t.nodeId}`;
        const existing = taskMap.get(key);
        if (existing) {
          // Garder la plus récente, supprimer l'ancienne
          const existingDate = new Date(existing.assignedAt || 0).getTime();
          const currentDate = new Date(t.assignedAt || 0).getTime();
          if (currentDate > existingDate) {
            duplicateIds.push(existing.id);
            taskMap.set(key, t);
          } else {
            duplicateIds.push(t.id);
          }
        } else {
          taskMap.set(key, t);
        }
      });

      // Nettoyage automatique des doublons dans Firestore
      if (duplicateIds.length > 0 && db) {
        console.log(`[PlanData] Nettoyage de ${duplicateIds.length} tâche(s) dupliquée(s)`);
        for (const dupId of duplicateIds) {
          try {
            await deleteDoc(doc(db, 'tasks', dupId));
          } catch (e) {
            console.warn('Erreur suppression doublon:', dupId, e);
          }
        }
      }

      setWorkflowTasks(Array.from(taskMap.values()));
    });

    const auditUnsubscribe = onSnapshot(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(100)), (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
      setAuditLogs(logs);
    });

    const usersUnsubscribe = onSnapshot(collection(db, 'available_users'), (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AvailableUser));
      setAvailableUsers(users);
    });

    const rolesUnsubscribe = onSnapshot(collection(db, 'available_roles'), (snapshot) => {
      const roles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AvailableRole));
      setAvailableRoles(roles);
    });

    return () => {
      tasksUnsubscribe();
      auditUnsubscribe();
      usersUnsubscribe();
      rolesUnsubscribe();
    };
  }, [isLoaded]);

  const addAuditLog = async (log: Omit<AuditLog, 'id' | 'timestamp' | 'performedByUserId' | 'performedByUserName'>) => {
    if (!isFirebaseConfigured || !db) return;
    const logId = Date.now().toString();
    const newLog: AuditLog = {
      ...log,
      id: logId,
      timestamp: new Date().toISOString(),
      performedByUserId: 'main-user',
      performedByUserName: 'Administrateur',
    };
    await setDoc(doc(db, 'audit_logs', logId), newLog);
  };


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
    } catch (error) {
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
    } catch (error) {
      console.error("Erreur suppression tâche:", error);
    }
  };

  const updateTaskCompletion = async (categoryId: string, subCategoryId: string, taskId: string, completed: boolean) => {
    try {
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
      await updatePlanInFirestore(newPlanData);
    } catch (error) {
      console.error("Erreur mise à jour statut tâche:", error);
    }
  };

  const resetToInitialData = async () => {
    try {
      setLoading(true);
      await updatePlanInFirestore(initialCompliancePlanData);
      setPlanData(initialCompliancePlanData);
      setLoading(false);
    } catch (error) {
      console.error("Erreur réinitialisation données:", error);
      setLoading(false);
      throw error;
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
      removeTask,
      resetToInitialData,
      activeWorkflows,
      workflowTasks,
      auditLogs,
      availableUsers,
      availableRoles,
      assignTask: async (task) => {
        if (!db) return;
        // Utilisation d'un ID déterministe pour éviter les doublons par noeud et workflow
        const taskId = `task-${task.workflowId}-${task.nodeId.replace(/\s+/g, '_')}`;
        const newTask: WorkflowTask = {
          ...task,
          id: taskId,
          assignedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'tasks', taskId), newTask, { merge: true });
        await addAuditLog({
          taskId: taskId,
          workflowId: task.workflowId,
          action: 'Assigned',
          details: `Tâche "${task.taskName}" assignée à ${task.responsibleUserName} (${task.roleRequired})`,
        });
      },
      updateTaskStatus: async (taskId, status) => {
        if (!db) return;
        const taskRef = doc(db, 'tasks', taskId);
        const taskSnap = await getDoc(taskRef);
        if (taskSnap.exists()) {
          const taskData = taskSnap.data() as WorkflowTask;
          await updateDoc(taskRef, {
            status,
            completedAt: status === 'Terminé' ? new Date().toISOString() : null
          });
          await addAuditLog({
            taskId,
            workflowId: taskData.workflowId,
            action: 'Status Update',
            details: `Statut de "${taskData.taskName}" mis à jour: ${status}`,
          });
        }
      },
      updateTask: async (taskId, update) => {
        if (!db) return;
        const taskRef = doc(db, 'tasks', taskId);
        await updateDoc(taskRef, update as any);
        // Log simple
        const taskSnap = await getDoc(taskRef);
        const taskData = taskSnap.data() as WorkflowTask;
        await addAuditLog({
          taskId,
          workflowId: taskData.workflowId,
          action: 'Update',
          details: `Informations de la tâche "${taskData.taskName}" mises à jour.`,
        });
      },
      addAvailableUser: async (user) => {
        if (!db) return;
        const id = `user-${Date.now()}`;
        await setDoc(doc(db, 'available_users', id), {
          ...user,
          id,
          createdAt: new Date().toISOString()
        });
      },
      updateAvailableUser: async (id, update) => {
        if (!db) return;
        await updateDoc(doc(db, 'available_users', id), update as any);
      },
      removeAvailableUser: async (id) => {
        if (!db) return;
        // En vrai on devrait utiliser deleteDoc mais let's be consistent with updateDoc for now or use common sense
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'available_users', id));
      },
      addAvailableRole: async (role) => {
        if (!db) return;
        const id = `role-${Date.now()}`;
        await setDoc(doc(db, 'available_roles', id), {
          ...role,
          id,
          createdAt: new Date().toISOString()
        });
      },
      updateAvailableRole: async (id, update) => {
        if (!db) return;
        await updateDoc(doc(db, 'available_roles', id), update as any);
      },
      removeAvailableRole: async (id) => {
        if (!db) return;
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'available_roles', id));
      },
      deleteWorkflow: async (workflowId) => {
        if (!db) return;
        try {
          await deleteDoc(doc(db, 'workflows', workflowId));
        } catch (e) {
          console.error("Error deleting workflow:", e);
          throw e;
        }
      },
      updateWorkflowOrder: async (workflowId, order) => {
        if (!db) return;
        try {
          await updateDoc(doc(db, 'workflows', workflowId), { order });
        } catch (e) {
          console.error("Error updating workflow order:", e);
          throw e;
        }
      }
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
