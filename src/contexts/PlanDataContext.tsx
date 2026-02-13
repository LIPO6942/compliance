
'use client';
import type { ComplianceCategory, ComplianceSubCategory, ComplianceTask, WorkflowTask, AuditLog, AvailableUser, AvailableRole } from '@/types/compliance';
import { initialCompliancePlanData } from '@/data/compliancePlan';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove, getDoc, collection, query, where, orderBy, limit, QuerySnapshot, DocumentData } from "firebase/firestore";
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
  // Branch / liaison helpers
  addBranch: (categoryId: string, subCategoryId: string, taskId: string, label: string) => Promise<void>;
  removeBranch: (categoryId: string, subCategoryId: string, taskId: string, label: string) => Promise<void>;
  renameBranch: (categoryId: string, subCategoryId: string, taskId: string, oldLabel: string, newLabel: string) => Promise<void>;
  addTaskToBranch: (categoryId: string, subCategoryId: string, taskId: string, branchLabel: string, task: Omit<ComplianceTask, 'id' | 'completed'>) => Promise<void>;
  moveTaskIntoBranch: (categoryId: string, subCategoryId: string, sourceTaskId: string, destParentTaskId: string, destBranchLabel: string) => Promise<void>;
  resetToInitialData: () => Promise<void>;
  activeWorkflows: Record<string, string>;
  workflowTasks: WorkflowTask[];
  auditLogs: AuditLog[];
  availableUsers: AvailableUser[];
  availableRoles: AvailableRole[];
  assignTask: (task: Omit<WorkflowTask, 'id' | 'assignedAt'>) => Promise<void>;
  updateTaskStatus: (taskId: string, status: WorkflowTask['status']) => Promise<void>;
  updateTask: (taskId: string, update: Partial<WorkflowTask>) => Promise<void>;
  addAvailableUser: (user: Omit<AvailableUser, 'id' | 'createdAt'>) => Promise<void>;
  updateAvailableUser: (id: string, update: Partial<AvailableUser>) => Promise<void>;
  removeAvailableUser: (id: string) => Promise<void>;
  addAvailableRole: (role: Omit<AvailableRole, 'id' | 'createdAt'>) => Promise<void>;
  updateAvailableRole: (id: string, update: Partial<AvailableRole>) => Promise<void>;
  removeAvailableRole: (id: string) => Promise<void>;
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
  const [activeWorkflows, setActiveWorkflows] = useState<Record<string, string>>({});
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

  useEffect(() => {
    if (!isLoaded || !isFirebaseConfigured || !db) return;

    const q = query(collection(db, 'workflows'));
    const unsubscribe = onSnapshot(q, async (snapshot: QuerySnapshot<DocumentData>) => {
      const workflows: Record<string, string> = {};

      for (const workflowDoc of snapshot.docs) {
        const data = workflowDoc.data() as any;
        if (data.activeVersionId) {
          const vRef = doc(db, 'workflows', workflowDoc.id, 'versions', data.activeVersionId);
          const vSnap = await getDoc(vRef);
          if (vSnap.exists()) {
            workflows[data.workflowId] = vSnap.data().mermaidCode;
          }
        }
      }
      setActiveWorkflows(workflows);
    });

    return () => unsubscribe();
  }, [isLoaded]);

  // Chargement des tâches et audit logs
  useEffect(() => {
    if (!isLoaded || !isFirebaseConfigured || !db) return;

    const tasksUnsubscribe = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkflowTask));
      setWorkflowTasks(tasks);
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

  // Helper: remove a task by id anywhere inside a list of tasks (recursively)
  const removeTaskById = (tasks: ComplianceTask[], taskId: string): { tasks: ComplianceTask[]; removed?: ComplianceTask } => {
    let removed: ComplianceTask | undefined;
    const recurse = (list: ComplianceTask[]): ComplianceTask[] => {
      return list.reduce<ComplianceTask[]>((acc, t) => {
        if (t.id === taskId) {
          removed = t;
          return acc;
        }
        let newTask = { ...t } as ComplianceTask;
        if (t.branches) {
          newTask.branches = t.branches.map(b => ({ ...b, tasks: recurse(b.tasks) }));
        }
        acc.push(newTask);
        return acc;
      }, []);
    };
    return { tasks: recurse(tasks), removed };
  };

  const addBranch = async (categoryId: string, subCategoryId: string, taskId: string, label: string) => {
    try {
      const newPlanData = planData.map(cat => cat.id === categoryId ? {
        ...cat,
        subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? {
          ...sub,
          tasks: sub.tasks.map(function recurse(task) {
            if (task.id === taskId) {
              const existing = task.branches || [];
              // avoid duplicate labels
              if (existing.find(b => b.label === label)) return { ...task };
              return { ...task, branches: [...existing, { label, tasks: [] }] } as ComplianceTask;
            }
            if (task.branches) {
              return { ...task, branches: task.branches.map(b => ({ ...b, tasks: b.tasks.map(recurse) })) };
            }
            return task;
          })
        } : sub)
      } : cat);
      await updatePlanInFirestore(newPlanData);
    } catch (err) {
      console.error("Erreur addBranch:", err);
    }
  };

  const removeBranch = async (categoryId: string, subCategoryId: string, taskId: string, label: string) => {
    try {
      const newPlanData = planData.map(cat => cat.id === categoryId ? {
        ...cat,
        subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? {
          ...sub,
          tasks: sub.tasks.map(function recurse(task) {
            if (task.id === taskId) {
              return { ...task, branches: (task.branches || []).filter(b => b.label !== label) } as ComplianceTask;
            }
            if (task.branches) {
              return { ...task, branches: task.branches.map(b => ({ ...b, tasks: b.tasks.map(recurse) })) };
            }
            return task;
          })
        } : sub)
      } : cat);
      await updatePlanInFirestore(newPlanData);
    } catch (err) {
      console.error("Erreur removeBranch:", err);
    }
  };

  const renameBranch = async (categoryId: string, subCategoryId: string, taskId: string, oldLabel: string, newLabel: string) => {
    try {
      const newPlanData = planData.map(cat => cat.id === categoryId ? {
        ...cat,
        subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? {
          ...sub,
          tasks: sub.tasks.map(function recurse(task) {
            if (task.id === taskId) {
              return { ...task, branches: (task.branches || []).map(b => b.label === oldLabel ? { ...b, label: newLabel } : b) } as ComplianceTask;
            }
            if (task.branches) {
              return { ...task, branches: task.branches.map(b => ({ ...b, tasks: b.tasks.map(recurse) })) };
            }
            return task;
          })
        } : sub)
      } : cat);
      await updatePlanInFirestore(newPlanData);
    } catch (err) {
      console.error("Erreur renameBranch:", err);
    }
  };

  const addTaskToBranch = async (categoryId: string, subCategoryId: string, taskId: string, branchLabel: string, task: Omit<ComplianceTask, 'id' | 'completed'>) => {
    const newTask: ComplianceTask = { ...task, id: Date.now().toString(), completed: false } as ComplianceTask;
    try {
      const newPlanData = planData.map(cat => cat.id === categoryId ? {
        ...cat,
        subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? {
          ...sub,
          tasks: sub.tasks.map(function recurse(t) {
            if (t.id === taskId) {
              const branches = t.branches || [];
              const idx = branches.findIndex(b => b.label === branchLabel);
              if (idx === -1) {
                return { ...t, branches: [...branches, { label: branchLabel, tasks: [newTask] }] } as ComplianceTask;
              }
              const newBranches = branches.map((b, i) => i === idx ? { ...b, tasks: [...b.tasks, newTask] } : b);
              return { ...t, branches: newBranches } as ComplianceTask;
            }
            if (t.branches) return { ...t, branches: t.branches.map(b => ({ ...b, tasks: b.tasks.map(recurse) })) };
            return t;
          })
        } : sub)
      } : cat);
      await updatePlanInFirestore(newPlanData);
    } catch (err) {
      console.error("Erreur addTaskToBranch:", err);
    }
  };

  const moveTaskIntoBranch = async (categoryId: string, subCategoryId: string, sourceTaskId: string, destParentTaskId: string, destBranchLabel: string) => {
    try {
      // First remove the source task from wherever it is inside the subcategory
      let removed: ComplianceTask | undefined;
      const newPlanData = planData.map(cat => {
        if (cat.id !== categoryId) return cat;
        return {
          ...cat,
          subCategories: cat.subCategories.map(sub => {
            if (sub.id !== subCategoryId) return sub;
            // remove the source task
            const { tasks: cleanedTasks, removed: r } = removeTaskById(sub.tasks, sourceTaskId);
            removed = r;
            // if nothing removed, we still continue
            return { ...sub, tasks: cleanedTasks } as ComplianceSubCategory;
          })
        };
      });

      if (!removed) {
        console.warn('moveTaskIntoBranch: source task not found', sourceTaskId);
        return;
      }

      // Then insert removed task into destination branch
      const finalPlan = newPlanData.map(cat => cat.id === categoryId ? {
        ...cat,
        subCategories: cat.subCategories.map(sub => sub.id === subCategoryId ? {
          ...sub,
          tasks: sub.tasks.map(function recurse(t) {
            if (t.id === destParentTaskId) {
              const branches = t.branches || [];
              const idx = branches.findIndex(b => b.label === destBranchLabel);
              if (idx === -1) {
                return { ...t, branches: [...branches, { label: destBranchLabel, tasks: [removed!] }] } as ComplianceTask;
              }
              const newBranches = branches.map((b, i) => i === idx ? { ...b, tasks: [...b.tasks, removed!] } : b);
              return { ...t, branches: newBranches } as ComplianceTask;
            }
            if (t.branches) return { ...t, branches: t.branches.map(b => ({ ...b, tasks: b.tasks.map(recurse) })) };
            return t;
          })
        } : sub)
      } : cat);

      await updatePlanInFirestore(finalPlan);
    } catch (err) {
      console.error('Erreur moveTaskIntoBranch:', err);
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
      addBranch,
      removeBranch,
      renameBranch,
      addTaskToBranch,
      moveTaskIntoBranch,
      resetToInitialData,
      activeWorkflows,
      workflowTasks,
      auditLogs,
      availableUsers,
      availableRoles,
      assignTask: async (task) => {
        if (!db) return;
        const taskId = `task-${Date.now()}`;
        const newTask: WorkflowTask = {
          ...task,
          id: taskId,
          assignedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'tasks', taskId), newTask);
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
