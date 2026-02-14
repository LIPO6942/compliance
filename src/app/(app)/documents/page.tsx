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
import { Separator } from "@/components/ui/separator";

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
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight">
              <span className="text-slate-900 dark:text-white">Gestion</span>{" "}
              <span className="text-primary">Documentaire</span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
              Indexation et gestion sécurisée de vos preuves de conformité et archives GRC.
            </p>
          </div>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-primary/20 h-14 px-10 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 border-none"
            onClick={() => openDialog('add')}
          >
            <PlusCircle className="mr-3 h-5 w-5" /> NOUVEAU DOCUMENT
          </Button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={FileStack}
            label="Total Documents"
            value={documents.length.toString()}
            color="bg-indigo-600"
            description="Actifs dans le système"
          />
          <StatCard
            icon={ShieldCheck}
            label="Validés"
            value={documents.filter(d => d.status === "Validé").length.toString()}
            color="bg-emerald-600"
            description="Preuves de conformité OK"
          />
          <StatCard
            icon={AlertCircle}
            label="En Retard / Révision"
            value={documents.filter(d => d.status === "En Révision").length.toString()}
            color="bg-amber-600"
            description="Nécessite votre attention"
          />
        </div>

        {/* Action Bar & Table */}
        <Card className="shadow-2xl border-none bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 dark:border-slate-800 p-10 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Scanner l'index par nom, propriétaire ou tag..."
                className="pl-12 h-12 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 font-bold shadow-sm focus:border-primary/50 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {isClient && (
              <div className="flex flex-wrap gap-4 w-full md:w-auto">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-12 w-full sm:w-[180px] rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] font-black uppercase tracking-widest shadow-sm">
                    <SelectValue placeholder="TYPE" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl">
                    {allFilterableTypes.map(type => (
                      <SelectItem key={type} value={type} className="text-xs font-bold">{type === "all" ? "TOUS LES TYPES" : type.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-12 w-full sm:w-[180px] rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] font-black uppercase tracking-widest shadow-sm">
                    <SelectValue placeholder="STATUT" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl">
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
                  <TableRow className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                    <TableHead className="py-3 px-8 font-black uppercase tracking-widest text-[9px] text-muted-foreground border-r border-slate-100 dark:border-slate-800/50">Document / Version</TableHead>
                    <TableHead className="py-3 px-6 font-black uppercase tracking-widest text-[9px] text-muted-foreground border-r border-slate-100 dark:border-slate-800/50">Tags</TableHead>
                    <TableHead className="py-3 px-6 font-black uppercase tracking-widest text-[9px] text-muted-foreground border-r border-slate-100 dark:border-slate-800/50">Classification</TableHead>
                    <TableHead className="py-3 px-6 font-black uppercase tracking-widest text-[9px] text-muted-foreground border-r border-slate-100 dark:border-slate-800/50">État</TableHead>
                    <TableHead className="py-3 px-6 font-black uppercase tracking-widest text-[9px] text-muted-foreground border-r border-slate-100 dark:border-slate-800/50">Propriétaire</TableHead>
                    <TableHead className="py-3 text-right font-black uppercase tracking-widest text-[9px] text-muted-foreground px-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!loading ? (
                    filteredDocuments.length > 0 ? (
                      filteredDocuments.map((doc) => (
                        <TableRow key={doc.id} className="group hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-all border-b border-slate-100 dark:border-slate-800/50">
                          <TableCell className="py-3 px-8 border-r border-slate-100 dark:border-transparent">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors cursor-pointer" onClick={() => openDialog('edit', doc)}>
                                {doc.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">V{doc.version}</span>
                                {doc.url && (
                                  <Link href={doc.url} target="_blank" className="text-[9px] font-bold text-indigo-500 hover:underline flex items-center gap-1">
                                    <LinkIcon className="h-2 w-2" /> SOURCE
                                  </Link>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-6 border-r border-slate-100 dark:border-transparent">
                            <div className="flex flex-wrap gap-1">
                              {doc.tags?.length ? doc.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[8px] font-black tracking-widest px-1.5 py-0 rounded border-none">
                                  {tag.toUpperCase()}
                                </Badge>
                              )) : (
                                <span className="text-[10px] font-medium italic text-slate-300">N/A</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-6 border-r border-slate-100 dark:border-transparent text-center">
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-0.5 rounded shadow-none text-slate-500">
                              {doc.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-6 border-r border-slate-100 dark:border-transparent">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className={`h-7 rounded-lg border shadow-none font-black text-[8px] tracking-[0.2em] px-3 ${statusColors[doc.status]}`}>
                                  {doc.status.toUpperCase()}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="rounded-[1.5rem] border-none shadow-2xl p-3 bg-white dark:bg-slate-900">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-3 py-2">Flux de Validation</DropdownMenuLabel>
                                {allPossibleStatuses.map(statusValue => (
                                  doc.status !== statusValue && (
                                    <DropdownMenuItem
                                      key={statusValue}
                                      onClick={() => handleChangeDocumentStatus(doc.id, statusValue)}
                                      className="rounded-xl cursor-pointer font-bold text-xs py-2.5"
                                    >
                                      {statusValue === "Validé" && <CheckCircle className="mr-3 h-4 w-4 text-emerald-500" />}
                                      {statusValue === "En Révision" && <Edit3 className="mr-3 h-4 w-4 text-amber-500" />}
                                      {statusValue === "Archivé" && <Archive className="mr-3 h-4 w-4 text-indigo-500" />}
                                      {statusValue === "Obsolète" && <FileX className="mr-3 h-4 w-4 text-rose-500" />}
                                      Marquer comme {statusValue}
                                    </DropdownMenuItem>
                                  )
                                ))}
                                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-2" />
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-3 py-2">Actions Fichier</DropdownMenuLabel>
                                {doc.url ? (
                                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer font-bold text-xs py-2.5 text-indigo-500">
                                    <Link href={doc.url} target="_blank" rel="noopener noreferrer">
                                      <Download className="mr-3 h-4 w-4" /> Download Source
                                    </Link>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem disabled className="opacity-50 font-bold text-xs py-2.5"><Download className="mr-3 h-4 w-4" /> Aucun fichier</DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          <TableCell className="py-3 px-6 border-r border-slate-100 dark:border-transparent">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                <span className="text-[9px] font-black text-slate-400 uppercase">{doc.owner.charAt(0)}</span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{doc.owner}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-right px-8">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-white dark:hover:bg-slate-800 shadow-sm" onClick={() => openDialog('edit', doc)}>
                                    <Edit3 className="h-4 w-4 text-emerald-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Modifier l'archive</TooltipContent>
                              </Tooltip>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 shadow-sm">
                                    <Trash2 className="h-4 w-4 text-rose-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl">
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
                            </div>
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
          <DialogContent className="rounded-[2.5rem] p-0 max-w-2xl border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden bg-white dark:bg-slate-950">
            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-10 border-b border-slate-100 dark:border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {dialogState.mode === "add" ? "Nouvel" : "Édition"} <span className="text-primary italic">Indice</span>
                </DialogTitle>
                <DialogDescription className="text-slate-500 font-medium italic">
                  Enregistrez et classifiez une nouvelle preuve de conformité dans le Evidence Vault.
                </DialogDescription>
              </DialogHeader>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)}>
                <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {/* Section: Identification */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-1 bg-primary rounded-full" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Identification du Document</h3>
                    </div>

                    <div className="space-y-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Titre de l'archive</FormLabel>
                          <FormControl><Input {...field} className="h-12 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 font-bold shadow-sm focus:border-primary/50" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="url" render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">URL Source (Cloud/Drive)</FormLabel>
                          <FormControl><Input {...field} placeholder="https://..." className="h-12 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 font-bold shadow-sm focus:border-primary/50" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <Separator className="bg-slate-100 dark:bg-slate-800" />

                  {/* Section: Classification */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-1 bg-amber-500 rounded-full" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Classification & Versioning</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="version" render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Version</FormLabel>
                          <FormControl><Input {...field} placeholder="1.0" className="h-12 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 font-bold shadow-sm focus:border-primary/50" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Type de fichier</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 font-bold shadow-sm focus:border-primary/50"><SelectValue placeholder="PDF, XLSX..." /></SelectTrigger></FormControl>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                              {documentTypes.map(type => (
                                <SelectItem key={type.id} value={type.id} className="font-bold">{type.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <Separator className="bg-slate-100 dark:bg-slate-800" />

                  {/* Section: Responsabilité */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-1 bg-emerald-500 rounded-full" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Gouvernance & Mots-clés</h3>
                    </div>

                    <div className="space-y-4">
                      <FormField control={form.control} name="owner" render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Propriétaire / Indexeur</FormLabel>
                          <FormControl><Input {...field} placeholder="Nom du responsable..." className="h-12 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 font-bold shadow-sm focus:border-primary/50" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="tags" render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tags Sémantiques</FormLabel>
                          <FormControl><Input {...field} placeholder="Garantie, KYC, Rapport..." className="h-12 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 font-bold shadow-sm focus:border-primary/50" /></FormControl>
                          <FormDescription className="text-[10px] font-bold mt-1 text-slate-400">Séparez par des virgules pour l'indexation.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-8 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <DialogClose asChild>
                    <Button type="button" variant="ghost" className="h-12 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest text-slate-500">Abandonner</Button>
                  </DialogClose>
                  <Button type="submit" className="h-12 px-10 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl transition-all active:scale-95">
                    {dialogState.mode === "add" ? "Indexer le document" : "Sauvegarder l'évolution"}
                  </Button>
                </div>
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
