import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

export default function ConnectorDialog({
  open,
  onOpenChange,
  mode,
  initialValue,
  initialTaskName,
  branchLabel,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  mode: 'addBranch' | 'renameBranch' | 'addTask' | null;
  initialValue?: string;
  initialTaskName?: string;
  branchLabel?: string;
  onCancel: () => void;
  onSubmit: (values: { value: string; taskName?: string }) => void | Promise<void>;
}) {
  const schema = z.object({
    value: z.string().min(1, "Le libellé est requis"),
    taskName: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (mode === 'addTask' && (!data.taskName || data.taskName.trim().length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Le nom de la tâche est requis', path: ['taskName'] });
    }
  });

  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { value: initialValue || '', taskName: initialTaskName || '' } });

  const handleSubmit = async (vals: z.infer<typeof schema>) => {
    await onSubmit(vals);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => onOpenChange && onOpenChange(isOpen)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'addBranch' && 'Ajouter une branche'}
            {mode === 'renameBranch' && 'Renommer une branche'}
            {mode === 'addTask' && 'Ajouter une tâche cible'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'addBranch' && 'Saisissez le libellé de la nouvelle branche.'}
            {mode === 'renameBranch' && `Renommer "${branchLabel || ''}"`}
            {mode === 'addTask' && 'Saisissez le libellé de la branche et le nom de la tâche cible.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
          {(mode === 'addBranch' || mode === 'renameBranch' || mode === 'addTask') && (
            <div>
              <Input placeholder="Label de la branche" {...form.register('value')} />
              {form.formState.errors.value && <p className="text-destructive text-xs mt-1">{String(form.formState.errors.value?.message)}</p>}
            </div>
          )}
          {mode === 'addTask' && (
            <div>
              <Input placeholder="Nom de la tâche cible" {...form.register('taskName')} />
              {form.formState.errors.taskName && <p className="text-destructive text-xs mt-1">{String(form.formState.errors.taskName?.message)}</p>}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
            <Button type="submit">{mode === 'renameBranch' ? 'Renommer' : mode === 'addTask' ? 'Ajouter tâche' : 'Ajouter'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
