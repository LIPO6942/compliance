
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { usePlanData } from "@/contexts/PlanDataContext";
import { useToast } from "@/hooks/use-toast";
import type { ComplianceTask } from "@/types/compliance";
import type { DialogState } from "@/components/plan/types";
import { PlanHeader } from "@/components/plan/PlanHeader";
import { PlanAccordion } from "@/components/plan/PlanAccordion";
import { PlanDialogs } from "@/components/plan/PlanDialogs";

const categorySchema = z.object({ name: z.string().min(1, "Le nom de la catégorie est requis."), icon: z.string().min(1, "L'icône de la catégorie est requise.") });
const subCategorySchema = z.object({ name: z.string().min(1, "Le nom de la sous-catégorie est requis."), icon: z.string().optional() });
const taskSchema = z.object({ name: z.string().min(1, "Le nom de la tâche est requis."), description: z.string().optional(), deadline: z.string().optional() });

type CategoryFormValues = z.infer<typeof categorySchema>;
type SubCategoryFormValues = z.infer<typeof subCategorySchema>;
type TaskFormValues = z.infer<typeof taskSchema>;


export default function PlanPage() {
  const { 
    planData, 
    updateTaskCompletion,
    addCategory,
    editCategory: editCategoryContext,
    removeCategory: removeCategoryContext,
    addSubCategory: addSubCategoryContext,
    editSubCategory: editSubCategoryContext,
    removeSubCategory: removeSubCategoryContext,
    addTask: addTaskContext,
    editTask: editTaskContext,
    removeTask: removeTaskContext,
  } = usePlanData();

  const [activeAccordionItems, setActiveAccordionItems] = React.useState<string[]>([]);
  const { toast } = useToast();
  
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (planData.length > 0 && activeAccordionItems.length === 0) {
      setActiveAccordionItems(planData.map(cat => cat.id));
    }
  }, [planData, activeAccordionItems.length]);

  const [dialogState, setDialogState] = React.useState<DialogState>({ type: null, mode: null });

  const openDialog = (type: "category" | "subCategory" | "task", mode: "add" | "edit", data?: any, parentId?: string, grandParentId?: string) => {
    setDialogState({ type, mode, data, parentId, grandParentId });
  };
  
  const closeDialog = () => setDialogState({ type: null, mode: null });

  const handleAddCategory = async (values: CategoryFormValues) => {
    await addCategory(values);
    toast({ title: "Catégorie ajoutée", description: `La catégorie "${values.name}" a été ajoutée.` });
    closeDialog();
  };

  const handleEditCategory = async (values: CategoryFormValues) => {
    if(dialogState.data?.id) {
      await editCategoryContext(dialogState.data.id, values);
      toast({ title: "Catégorie modifiée", description: `La catégorie "${values.name}" a été modifiée.` });
    }
    closeDialog();
  };
  
  const onSubmitCategory = (values: CategoryFormValues) => {
    if (dialogState.mode === 'add') {
      handleAddCategory(values);
    } else {
      handleEditCategory(values);
    }
  };

  const handleRemoveCategory = async (categoryId: string) => {
    await removeCategoryContext(categoryId);
    toast({ title: "Catégorie supprimée", description: `La catégorie a été supprimée.` });
  };

  const handleAddSubCategory = async (values: SubCategoryFormValues) => {
    if(dialogState.parentId) {
      await addSubCategoryContext(dialogState.parentId, values);
      toast({ title: "Sous-catégorie ajoutée", description: `La sous-catégorie "${values.name}" a été ajoutée.` });
    }
    closeDialog();
  };

  const handleEditSubCategory = async (values: SubCategoryFormValues) => {
    if(dialogState.grandParentId && dialogState.data?.id) {
      await editSubCategoryContext(dialogState.grandParentId, dialogState.data.id, values);
      toast({ title: "Sous-catégorie modifiée", description: `La sous-catégorie "${values.name}" a été modifiée.` });
    }
    closeDialog();
  };
  
  const onSubmitSubCategory = (values: SubCategoryFormValues) => {
    if (dialogState.mode === 'add') {
      handleAddSubCategory(values);
    } else {
      handleEditSubCategory(values);
    }
  };

  const handleRemoveSubCategory = async (categoryId: string, subCategoryId: string) => {
    await removeSubCategoryContext(categoryId, subCategoryId);
    toast({ title: "Sous-catégorie supprimée", description: `La sous-catégorie a été supprimée.` });
  };

  const handleAddTask = async (values: TaskFormValues) => {
    if(dialogState.grandParentId && dialogState.parentId) {
      const taskData = { ...values, deadline: values.deadline ? new Date(values.deadline).toISOString() : undefined };
      await addTaskContext(dialogState.grandParentId, dialogState.parentId, taskData);
      toast({ title: "Tâche ajoutée", description: `La tâche "${values.name}" a été ajoutée.` });
    }
    closeDialog();
  };
  
  const handleEditTask = async (values: TaskFormValues) => {
     if(dialogState.grandParentId && dialogState.parentId && dialogState.data?.id) {
      const taskData = { ...values, deadline: values.deadline ? new Date(values.deadline).toISOString() : undefined };
      await editTaskContext(dialogState.grandParentId, dialogState.parentId, dialogState.data.id, taskData);
      toast({ title: "Tâche modifiée", description: `La tâche "${values.name}" a été modifiée.` });
    }
    closeDialog();
  };
  
  const onSubmitTask = (values: TaskFormValues) => {
    if (dialogState.mode === 'add') {
      handleAddTask(values);
    } else {
      handleEditTask(values);
    }
  };

  const handleRemoveTask = async (categoryId: string, subCategoryId: string, taskId: string) => {
    await removeTaskContext(categoryId, subCategoryId, taskId);
    toast({ title: "Tâche supprimée", description: `La tâche a été supprimée.` });
  };

  const handleToggleTaskCompletion = async (categoryId: string, subCategoryId: string, taskId: string) => {
    const task = planData.find(c => c.id === categoryId)?.subCategories.find(sc => sc.id === subCategoryId)?.tasks.find(t => t.id === taskId);
    if (task) {
        await updateTaskCompletion(categoryId, subCategoryId, taskId, !task.completed);
        toast({
            title: "Statut de la tâche modifié",
            description: `La tâche "${task.name}" est maintenant ${!task.completed ? "complétée" : "non complétée"}.`,
        });
    }
  };

  return (
    <div className="space-y-6">
      <PlanHeader onAddCategory={() => openDialog("category", "add")} />

      <PlanAccordion
        planData={planData}
        activeAccordionItems={activeAccordionItems}
        setActiveAccordionItems={setActiveAccordionItems}
        isClient={isClient}
        onEditCategory={(cat) => openDialog("category", "edit", cat)}
        onRemoveCategory={handleRemoveCategory}
        onAddSubCategory={(catId) => openDialog("subCategory", "add", undefined, catId, catId)}
        onEditSubCategory={(subCat, catId) => openDialog("subCategory", "edit", subCat, catId, catId)}
        onRemoveSubCategory={handleRemoveSubCategory}
        onAddTask={(subCatId, catId) => openDialog("task", "add", undefined, subCatId, catId)}
        onEditTask={(task, subCatId, catId) => openDialog("task", "edit", task, subCatId, catId)}
        onRemoveTask={handleRemoveTask}
        onToggleTask={handleToggleTaskCompletion}
      />
      
      <PlanDialogs
        dialogState={dialogState}
        closeDialog={closeDialog}
        onSubmitCategory={onSubmitCategory}
        onSubmitSubCategory={onSubmitSubCategory}
        onSubmitTask={onSubmitTask}
      />
    </div>
  );
}

    