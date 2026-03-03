'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  Users,
  MessageSquare,
  BarChart3,
  Play,
  Award,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useTeam } from '@/contexts/TeamContext';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


interface TrainingSession {
  id: string;
  title: string;
  description: string;
  date: string; // ISO date
  duration: number; // minutes
  trainer: string; // Member ID
  participants: string[]; // Member IDs
  status: 'planned' | 'in-progress' | 'completed';
  materials: string[];
  feedback?: string;
  completionRate?: number;
}

interface TrainingResource {
  id: string;
  title: string;
  category: 'policy' | 'procedure' | 'guide' | 'video' | 'course';
  url: string;
  createdBy: string; // Member ID
  createdAt: string; // ISO date
  views: number;
  comments: Array<{
    id: string;
    author: string; // Member ID
    text: string;
    createdAt: string;
  }>;
}

const sessionSchema = z.object({
  title: z.string().min(1, 'Titre requis'),
  description: z.string().min(1, 'Description requise'),
  date: z.string().min(1, 'Date requise'),
  duration: z.coerce.number().min(15, 'Minimum 15 minutes'),
  trainer: z.string().min(1, 'Formateur requis'),
  status: z.enum(['planned', 'in-progress', 'completed']),
});

type SessionFormValues = z.infer<typeof sessionSchema>;

export default function TrainingV2Page() {
  const { teamMembers } = useTeam();
  const { toast } = useToast();

  // Mock data - remplacer par Firestore plus tard
  const [sessions, setSessions] = useState<TrainingSession[]>([
    {
      id: '1',
      title: 'RGPD - Introduction',
      description: 'Formation introductive sur le RGPD et ses principes fondamentaux',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 120,
      trainer: '2', // Sarah
      participants: ['1', '3', '4'],
      status: 'planned',
      materials: ['https://example.com/rgpd-intro.pdf'],
      completionRate: 0,
    },
    {
      id: '2',
      title: 'LCB-FT - Lutte Anti-Blanchiment',
      description: 'Protocoles de conformité AML/CFT dans notre organisation',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 90,
      trainer: '4', // Karim
      participants: ['1', '2', '3'],
      status: 'completed',
      materials: [],
      feedback: 'Formation très bien reçue par l\'équipe',
      completionRate: 95,
    },
  ]);

  const [resources, setResources] = useState<TrainingResource[]>([
    {
      id: 'r1',
      title: 'Politique RGPD',
      category: 'policy',
      url: 'https://example.com/rgpd-policy.pdf',
      createdBy: '2',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      views: 42,
      comments: [],
    },
  ]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      title: '',
      description: '',
      date: '',
      duration: 60,
      trainer: '',
      status: 'planned',
    },
  });

  const handleOpenDialog = (session?: TrainingSession) => {
    if (session) {
      setEditingSession(session);
      form.reset({
        title: session.title,
        description: session.description,
        date: session.date.split('T')[0],
        duration: session.duration,
        trainer: session.trainer,
        status: session.status,
      });
    } else {
      setEditingSession(null);
      form.reset();
    }
    setDialogOpen(true);
  };

  const onSubmit = async (values: SessionFormValues) => {
    try {
      if (editingSession) {
        setSessions(sessions.map(s => s.id === editingSession.id ? { ...s, ...values, date: new Date(values.date).toISOString() } : s));
        toast({ title: 'Formation mise à jour' });
      } else {
        setSessions([
          ...sessions,
          {
            id: Math.random().toString(),
            ...values,
            date: new Date(values.date).toISOString(),
            participants: [],
            materials: [],
            completionRate: 0,
          },
        ]);
        toast({ title: 'Formation créée' });
      }
      setDialogOpen(false);
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    }
  };

  const trainer = (trainerId: string) => teamMembers.find(m => m.id === trainerId);
  const statusColor: Record<TrainingSession['status'], string> = {
    planned: 'bg-blue-50 text-blue-700 border-blue-200',
    'in-progress': 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Learning & Development</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Centre de <span className="text-primary">Formation</span>
          </h1>
          <p className="text-slate-500 text-sm max-w-2xl mt-2">Espace collaboratif de partage des savoirs en conformité</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs">
          <Plus className="mr-2 h-5 w-5" /> Nouvelle Formation
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Formations Total</p>
                <p className="text-3xl font-black">{sessions.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Complétées</p>
                <p className="text-3xl font-black">{sessions.filter(s => s.status === 'completed').length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">En Préparation</p>
                <p className="text-3xl font-black">{sessions.filter(s => s.status === 'planned').length}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Ressources</p>
                <p className="text-3xl font-black">{resources.length}</p>
              </div>
              <Award className="h-8 w-8 text-indigo-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formations Planifiées */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-black tracking-tight mb-2">📅 Calendrier des Formations</h2>
          <p className="text-slate-500 text-sm">Sessions à venir et historique</p>
        </div>

        <div className="space-y-4">
          {sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((session) => {
            const trainerInfo = trainer(session.trainer);
            const isUpcoming = new Date(session.date) > new Date();

            return (
              <Card key={session.id} className="rounded-[2rem] border-none shadow-lg overflow-hidden hover:shadow-xl transition-all group">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge className={`rounded-full ${statusColor[session.status]} border`}>
                          {session.status === 'planned' && '🔵 Planifiée'}
                          {session.status === 'in-progress' && '🟡 En cours'}
                          {session.status === 'completed' && '✅ Complétée'}
                        </Badge>
                      </div>
                      <h3 className="text-xl font-black mb-2">{session.title}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{session.description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-xs font-bold text-slate-500 uppercase">📅 Date</span>
                          <p className="font-bold">{new Date(session.date).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-500 uppercase">⏱️ Durée</span>
                          <p className="font-bold">{session.duration}min</p>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-500 uppercase">👤 Formateur</span>
                          <p className="font-bold">{trainerInfo?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-500 uppercase">👥 Participants</span>
                          <p className="font-bold">{session.participants.length}</p>
                        </div>
                      </div>

                      {session.status === 'completed' && session.completionRate !== undefined && (
                        <div className="mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-500">Taux de complétion</span>
                            <span className="font-black text-sm">{session.completionRate}%</span>
                          </div>
                          <Progress value={session.completionRate} className="h-2" />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleOpenDialog(session)}
                        className="rounded-xl h-10 w-10"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" className="rounded-xl h-10 w-10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette formation ?</AlertDialogTitle>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                setSessions(sessions.filter(s => s.id !== session.id)) ||
                                toast({ title: 'Formation supprimée' })
                              }
                              className="bg-destructive text-destructive-foreground"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Ressources Partagées*/}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-black tracking-tight mb-2">📚 Ressources & Documentations</h2>
          <p className="text-slate-500 text-sm">Politiques, procédures et supports de formation partagés</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((resource) => (
            <Card key={resource.id} className="rounded-2xl border-none shadow-lg hover:shadow-xl transition-all group overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Badge variant="secondary" className="mb-2 rounded-md capitalize">
                      {resource.category}
                    </Badge>
                    <CardTitle className="text-lg">{resource.title}</CardTitle>
                  </div>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Play className="h-6 w-6 text-primary" />
                  </a>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>👤 {trainer(resource.createdBy)?.name}</span>
                  <span>👁️ {resource.views} vues</span>
                </div>
                <Separator />
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
                    💬 {resource.comments.length} commentaires
                  </p>
                  {resource.comments.slice(0, 2).map((comment) => (
                    <div key={comment.id} className="text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded-lg mb-2">
                      <p className="font-bold">{trainer(comment.author)?.name}</p>
                      <p className="text-slate-600 dark:text-slate-400">{comment.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Dialog Nouvelle Formation */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-[2.5rem] p-0 max-w-2xl border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-950">
          <div className="bg-slate-50/50 dark:bg-slate-900/50 p-10 border-b border-slate-100 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {editingSession ? '✏️ Modifier' : '➕ Nouvelle'} <span className="text-primary italic">Formation</span>
              </DialogTitle>
            </DialogHeader>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-10 max-h-[60vh] overflow-y-auto">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase">Titre</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Formation RGPD" className="h-12 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase">Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Objectifs de la formation..." className="min-h-[100px] rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase">Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" className="h-12 rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase">Durée (min)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="60" className="h-12 rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="trainer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase">Formateur</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Sélectionner un formateur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase">Statut</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planned">Planifiée</SelectItem>
                        <SelectItem value="in-progress">En cours</SelectItem>
                        <SelectItem value="completed">Complétée</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          <DialogFooter className="bg-slate-50 dark:bg-slate-900/50 p-8 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end">
            <DialogClose asChild>
              <Button variant="ghost" className="rounded-xl">
                Annuler
              </Button>
            </DialogClose>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px]"
            >
              {editingSession ? 'Mettre à jour' : 'Créer Formation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
