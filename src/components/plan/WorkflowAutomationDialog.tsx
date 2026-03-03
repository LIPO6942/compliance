'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { parseMermaidNodes, generateTasksFromNodes, type GeneratedTask, type MermaidNode } from '@/lib/mermaidParser';

interface WorkflowAutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mermaidCode: string;
  workflowName: string;
  workflowId: string;
  onTasksGenerated: (tasks: Array<{ name: string; description: string; deadline?: string; frequency: string }>) => Promise<void>;
}

export function WorkflowAutomationDialog({
  open,
  onOpenChange,
  mermaidCode,
  workflowName,
  workflowId,
  onTasksGenerated,
}: WorkflowAutomationDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [deadline, setDeadline] = useState<string>('');
  const [parsedNodes, setParsedNodes] = useState<MermaidNode[]>([]);

  React.useEffect(() => {
    if (open && mermaidCode) {
      try {
        const nodes = parseMermaidNodes(mermaidCode);
        setParsedNodes(nodes);
        // Select all by default
        setSelectedNodes(new Set(nodes.map(n => n.id)));
      } catch (error) {
        console.error('Error parsing Mermaid code:', error);
        toast({ title: 'Erreur', description: 'Impossible de parser le diagramme', variant: 'destructive' });
      }
    }
  }, [open, mermaidCode, toast]);

  const handleNodeToggle = (nodeId: string) => {
    const newSet = new Set(selectedNodes);
    if (newSet.has(nodeId)) {
      newSet.delete(nodeId);
    } else {
      newSet.add(nodeId);
    }
    setSelectedNodes(newSet);
  };

  const handleSelectAll = () => {
    if (selectedNodes.size === parsedNodes.length) {
      setSelectedNodes(new Set());
    } else {
      setSelectedNodes(new Set(parsedNodes.map(n => n.id)));
    }
  };

  const handleGenerate = async () => {
    try {
      setIsLoading(true);

      const nodesToProcess = parsedNodes.filter(n => selectedNodes.has(n.id));

      if (nodesToProcess.length === 0) {
        toast({ title: 'Erreur', description: 'Veuillez sélectionner au moins une tâche', variant: 'destructive' });
        return;
      }

      const deadlineDate = deadline ? new Date(deadline) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 jours par défaut
      const tasks = generateTasksFromNodes(nodesToProcess, workflowName, deadlineDate);

      await onTasksGenerated(tasks);

      toast({
        title: '✅ Succès',
        description: `${tasks.length} tâches ont été créées à partir du workflow`,
      });

      onOpenChange(false);
      setParsedNodes([]);
      setSelectedNodes(new Set());
      setDeadline('');
    } catch (error: any) {
      console.error('Error generating tasks:', error);
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible de créer les tâches',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2rem] p-0 max-w-2xl border-none shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 p-8 border-b border-indigo-100 dark:border-indigo-900/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <Zap className="h-6 w-6 text-amber-500" />
              Générer les tâches du workflow
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
              Workflow: <span className="font-bold text-slate-900 dark:text-slate-200">{workflowName}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
          {parsedNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Aucune tâche détectée dans le diagramme</p>
            </div>
          ) : (
            <>
              {/* Select all button */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedNodes.size === parsedNodes.length && parsedNodes.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label className="font-bold text-sm cursor-pointer">Sélectionner tout</Label>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {selectedNodes.size}/{parsedNodes.length} sélectionnées
                </span>
              </div>

              {/* Nodes list */}
              <div className="space-y-2">
                {parsedNodes.map((node) => (
                  <div
                    key={node.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Checkbox
                      checked={selectedNodes.has(node.id)}
                      onCheckedChange={() => handleNodeToggle(node.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{node.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        ID: <span className="font-mono">{node.id}</span> • Type: {node.nodeType}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Deadline input */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <Label htmlFor="deadline" className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-2 block">
                  📅 Date limite pour les tâches
                </Label>
                <div className="flex gap-3">
                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="rounded-xl h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const date = new Date();
                      date.setDate(date.getDate() + 90);
                      setDeadline(date.toISOString().split('T')[0]);
                    }}
                    className="rounded-xl"
                  >
                    +90j
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Si vide, les tâches auront une date limite de 90 jours
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="bg-slate-50 dark:bg-slate-900/50 p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
            Annuler
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isLoading || selectedNodes.size === 0}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isLoading ? 'Génération...' : `Créer ${selectedNodes.size} tâche${selectedNodes.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
