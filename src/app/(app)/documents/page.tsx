"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSearchParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, PlusCircle, Search, ArrowUpDown, MoreHorizontal, Download, Edit, Trash2, CheckCircle, Edit3, Archive, FileX, ShieldCheck, Link as LinkIcon, AlertCircle, FileStack } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { Document, DocumentStatus, DocumentType } from '@/types/compliance';
import { useDocuments } from "@/contexts/DocumentsContext";
import { Logo } from "@/components/icons/Logo";
import { Suspense } from 'react';
import { useDocumentTypes } from "@/contexts/DocumentTypesContext";
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const documentSchema = z.object({
  name: z.string().min(1, "Le nom du document est requis."),
  type: z.string({ required_error: "Le type est requis." }).min(1, "Le type est requis."),
  version: z.string().min(1, "La version est requise."),
  owner: z.string().min(1, "Le propriétaire est requis."),
  tags: z.string().optional(),
  url: z.string().url("Veuillez entrer une URL valide.").optional().or(z.literal('')),
});
type DocumentFormValues = z.infer<typeof documentSchema>;


const statusColors: Record<DocumentStatus, string> = {
  "Validé": "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-800/30 dark:text-emerald-300 dark:border-emerald-700",
  "En Révision": "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-800/30 dark:text-amber-300 dark:border-amber-700",
  "Archivé": "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-800/30 dark:text-indigo-300 dark:border-indigo-700",
  "Obsolète": "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-800/30 dark:text-rose-300 dark:border-rose-700",
};

const allPossibleStatuses: DocumentStatus[] = ["Validé", "En Révision", "Archivé", "Obsolète"];

function DocumentsComponent() {
  const { documents, loading, updateDocumentStatus, addDocument, editDocument, removeDocument } = useDocuments();
  const { documentTypes, loading: typesLoading } = useDocumentTypes();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterType, setFilterType] = React.useState<string>("all");
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const { toast } = useToast();

  const [dialogState, setDialogState] = React.useState<{ mode: "add" | "edit" | null; data?: Document }>({ mode: null });
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    const statusFromQuery = searchParams.get('status');
    if (statusFromQuery && allPossibleStatuses.includes(statusFromQuery as DocumentStatus)) {
      setFilterStatus(statusFromQuery);
    }
  }, [searchParams]);

  const form = useForm<DocumentFormValues>({ resolver: zodResolver(documentSchema) });

  const openDialog = (mode: "add" | "edit", data?: Document) => {
    setDialogState({ mode, data });
    if (mode === "edit" && data) {
      form.reset({ ...data, tags: data.tags?.join(', ') || '', url: data.url || '' });
    } else {
      form.reset({ name: "", type: documentTypes[0]?.id || "", version: "1.0", owner: "", tags: "", url: "" });
    }
  };
  const closeDialog = () => setDialogState({ mode: null });

  const handleFormSubmit = async (values: DocumentFormValues) => {
    const documentData = {
      ...values,
      tags: values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
    };

    try {
      if (dialogState.mode === "add") {
        await addDocument(documentData);
        toast({ title: "Document ajouté", description: `Le document "${values.name}" a été ajouté.` });
      } else if (dialogState.mode === "edit" && dialogState.data?.id) {
        await editDocument(dialogState.data.id, documentData);
        toast({ title: "Document modifié", description: `Le document "${values.name}" a été mis à jour.` });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue." });
    }

    closeDialog();
  };

  const handleRemoveDocument = async (documentId: string) => {
    try {
      await removeDocument(documentId);
      toast({ title: "Document supprimé", description: "Le document a été supprimé avec succès." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer le document." });
    }
  };

  const handleChangeDocumentStatus = async (documentId: string, newStatus: DocumentStatus) => {
    try {
      await updateDocumentStatus(documentId, newStatus);
      toast({
        title: "Statut modifié",
        description: `Le statut du document a été changé en "${newStatus}".`,
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de modifier le statut." });
    }
  };

  const filteredDocuments = React.useMemo(() => documents.filter(doc => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = doc.name.toLowerCase().includes(searchLower) ||
      doc.owner.toLowerCase().includes(searchLower) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(searchLower));
    const matchesType = filterType === "all" || doc.type === filterType;
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  }), [documents, searchTerm, filterType, filterStatus]);

  const allFilterableTypes = ["all", ...documentTypes.map(t => t.id)];
  const documentStatuses = ["all", ...allPossibleStatuses];

  if (loading || typesLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Logo className="h-10 w-10 animate-spin" />
        <p className="ml-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">Coffre-fort Numérique...</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-8 pb-10">

        {/* Modern Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-black font-headline tracking-tighter text-slate-900 dark:text-white uppercase italic">
              Evidence <span className="text-primary">Vault</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Indexation et gestion sécurisée de vos preuves de conformité.
            </p>
          </div>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 h-12 px-8 rounded-xl"
            onClick={() => openDialog('add')}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Document
          </Button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={FileStack}
            label="Total Documents"
            value={documents.length.toString()}
            color="bg-indigo-500"
            description="Actifs dans le système"
          />
          <StatCard
            icon={ShieldCheck}
            label="Validés"
            value={documents.filter(d => d.status === "Validé").length.toString()}
            color="bg-emerald-500"
            description="Preuves de conformité OK"
          />
          <StatCard
            icon={AlertCircle}
            label="En Retard / Révision"
            value={documents.filter(d => d.status === "En Révision").length.toString()}
            color="bg-amber-500"
            description="Nécessite votre attention"
          />
        </div>

        {/* Action Bar & Table */}
        <Card className="shadow-2xl border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 dark:border-slate-800 p-8">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Scanner l'index par nom, propriétaire ou tag..."
                className="pl-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-950 border-none shadow-inner text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {isClient && (
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-10 w-full sm:w-[180px] rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-black uppercase tracking-tighter">
                    <SelectValue placeholder="TYPE" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {allFilterableTypes.map(type => (
                      <SelectItem key={type} value={type} className="text-xs font-bold">{type === "all" ? "TOUS LES TYPES" : type.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-10 w-full sm:w-[180px] rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-black uppercase tracking-tighter">
                    <SelectValue placeholder="STATUT" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {documentStatuses.map(status => (
                      <SelectItem key={status} value={status} className="text-xs font-bold">{status === "all" ? "TOUS LES STATUTS" : status.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                    <TableHead className="py-5 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Document / Version</TableHead>
                    <TableHead className="py-5 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Tags</TableHead>
                    <TableHead className="py-5 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Classification</TableHead>
                    <TableHead className="py-5 font-black uppercase tracking-widest text-[10px] text-muted-foreground">État</TableHead>
                    <TableHead className="py-5 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Propriétaire</TableHead>
                    <TableHead className="py-5 text-right font-black uppercase tracking-widest text-[10px] text-muted-foreground px-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isClient ? (
                    filteredDocuments.length > 0 ? (
                      filteredDocuments.map((doc) => (
                        <TableRow key={doc.id} className="group hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-all border-b border-slate-50 dark:border-slate-800/50">
                          <TableCell className="py-6 font-bold truncate max-w-[280px]">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div>
                                {doc.url ? (
                                  <Link href={doc.url} target="_blank" rel="noopener noreferrer" className="text-slate-900 dark:text-white hover:text-primary transition-colors flex items-center gap-1.5">
                                    {doc.name} <LinkIcon className="h-3 w-3 opacity-30" />
                                  </Link>
                                ) : (
                                  <span className="text-slate-900 dark:text-white">{doc.name}</span>
                                )}
                                <div className="text-[10px] font-black uppercase opacity-30 mt-0.5 tracking-tighter">v{doc.version} • {doc.lastUpdated}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-6">
                            <div className="flex flex-wrap gap-1.5">
                              {doc.tags?.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase border-none shadow-sm px-2">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="py-6 text-xs font-bold text-slate-500 uppercase tracking-tighter">{doc.type}</TableCell>
                          <TableCell className="py-6">
                            <Badge className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border-2 shadow-sm ${statusColors[doc.status]}`}>
                              {doc.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-6">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black">
                                {doc.owner[0].toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{doc.owner}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-6 text-right px-8">
                            <AlertDialog>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 group-hover:scale-110 transition-transform">
                                    <MoreHorizontal className="h-5 w-5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl p-2 border-slate-200 dark:border-slate-800">
                                  <DropdownMenuLabel className="text-[10px] font-black uppercase opacity-30 px-3 py-2">Fichier</DropdownMenuLabel>
                                  {doc.url ? (
                                    <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                                      <Link href={doc.url} target="_blank" rel="noopener noreferrer">
                                        <Download className="mr-3 h-4 w-4 text-emerald-500" /> Télécharger
                                      </Link>
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem disabled className="opacity-50"><Download className="mr-3 h-4 w-4" /> Aucun fichier</DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => openDialog('edit', doc)} className="rounded-xl cursor-pointer">
                                    <Edit className="mr-3 h-4 w-4 text-indigo-500" /> Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="mx-2 my-1" />
                                  <DropdownMenuLabel className="text-[10px] font-black uppercase opacity-30 px-3 py-2">Validation</DropdownMenuLabel>
                                  {allPossibleStatuses.map(statusValue => (
                                    doc.status !== statusValue && (
                                      <DropdownMenuItem
                                        key={statusValue}
                                        onClick={() => handleChangeDocumentStatus(doc.id, statusValue)}
                                        className="rounded-xl cursor-pointer"
                                      >
                                        {statusValue === "Validé" && <CheckCircle className="mr-3 h-4 w-4 text-emerald-500" />}
                                        {statusValue === "En Révision" && <Edit3 className="mr-3 h-4 w-4 text-amber-500" />}
                                        {statusValue === "Archivé" && <Archive className="mr-3 h-4 w-4 text-indigo-500" />}
                                        {statusValue === "Obsolète" && <FileX className="mr-3 h-4 w-4 text-rose-500" />}
                                        Marquer {statusValue}
                                      </DropdownMenuItem>
                                    )
                                  ))}
                                  <DropdownMenuSeparator className="mx-2 my-1" />
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 rounded-xl cursor-pointer">
                                      <Trash2 className="mr-3 h-4 w-4" /> Supprimer
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-2xl font-black tracking-tight">Supprimer l'archive ?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-base">
                                    Cette action est irréversible. Le document <strong className="text-slate-900 dark:text-white">"{doc.name}"</strong> sera définitivement retiré du vault.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="pt-6">
                                  <AlertDialogCancel className="rounded-xl font-bold h-12 border-slate-200">Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemoveDocument(doc.id)} className="rounded-xl font-bold h-12 bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-600/20">
                                    Confirmer la suppression
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center space-y-4 py-12">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full">
                              <Search className="h-10 w-10 text-slate-300" />
                            </div>
                            <div className="space-y-1">
                              <p className="font-black uppercase text-xs tracking-widest text-slate-400">Aucun résultat</p>
                              <p className="text-muted-foreground text-sm">Affinez vos filtres de recherche.</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-64 text-center">
                        <Logo className="h-10 w-10 animate-spin mx-auto opacity-20" />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="justify-between border-t border-slate-100 dark:border-slate-800 p-8 pt-6">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {filteredDocuments.length} document{filteredDocuments.length > 1 ? 's' : ''} indexé{filteredDocuments.length > 1 ? 's' : ''}.
            </div>
          </CardFooter>
        </Card>

        {/* Dialog Design Update */}
        <Dialog open={!!dialogState.mode} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
          <DialogContent className="rounded-[2rem] p-8 max-w-lg border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)]">
            <DialogHeader className="pb-6">
              <DialogTitle className="text-3xl font-black font-headline tracking-tighter uppercase italic">
                {dialogState.mode === "add" ? "Nouvel" : "Édition"} <span className="text-primary">Indice</span>
              </DialogTitle>
              <DialogDescription className="text-base pt-1">
                Enregistrez une nouvelle preuve de conformité.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Titre de l'archive</FormLabel>
                      <FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50 dark:bg-slate-950 border-none font-bold shadow-inner" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="url" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">URL Source (Cloud/Drive)</FormLabel>
                      <FormControl><Input {...field} placeholder="https://..." className="h-12 rounded-xl bg-slate-50 dark:bg-slate-950 border-none font-bold shadow-inner" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Classification</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-950 border-none font-bold shadow-inner"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent className="rounded-xl shadow-2xl border-none">{documentTypes.map(type => <SelectItem key={type.id} value={type.id} className="font-bold">{type.label}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="version" render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Sprint Version</FormLabel>
                        <FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50 dark:bg-slate-950 border-none font-bold shadow-inner" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="owner" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Responsable / Propriétaire</FormLabel>
                      <FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50 dark:bg-slate-950 border-none font-bold shadow-inner" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="tags" render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Tags Sémantiques</FormLabel>
                      <FormControl><Input {...field} placeholder="Garantie, KYC, Rapport..." className="h-12 rounded-xl bg-slate-50 dark:bg-slate-950 border-none font-bold shadow-inner" /></FormControl>
                      <FormDescription className="text-[10px] font-bold mt-1">Séparez par des virgules pour l'indexation.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <DialogFooter className="pt-4 gap-3">
                  <DialogClose asChild><Button type="button" variant="outline" className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest border-slate-200">Abandonner</Button></DialogClose>
                  <Button type="submit" className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
                    {dialogState.mode === "add" ? "Indexer le document" : "Sauvegarder les modifications"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

function StatCard({ icon: Icon, label, value, color, description }: { icon: any, label: string, value: string, color: string, description: string }) {
  return (
    <Card className="shadow-xl border-none bg-white dark:bg-slate-900 overflow-hidden relative group">
      <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-5 rounded-bl-[4rem] group-hover:scale-110 transition-transform`} />
      <CardContent className="p-8">
        <div className="flex items-center gap-5">
          <div className={`p-4 rounded-2xl ${color} text-white shadow-lg shadow-current/20 group-hover:rotate-12 transition-transform`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</p>
            <p className="text-4xl font-black tracking-tighter">{value}</p>
          </div>
        </div>
        <p className="mt-6 text-[11px] font-bold text-slate-400 border-t border-slate-50 dark:border-slate-800 pt-4 flex items-center gap-2">
          <ShieldCheck className="h-3 w-3 text-primary" /> {description}
        </p>
      </CardContent>
    </Card>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Logo className="h-12 w-12 animate-spin" /></div>}>
      <DocumentsComponent />
    </Suspense>
  );
}
