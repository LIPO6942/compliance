
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
import { FileText, PlusCircle, Search, ArrowUpDown, MoreHorizontal, Download, Edit, Trash2, CheckCircle, Edit3, Archive, FileX, Tags, Link as LinkIcon } from "lucide-react";
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
  "Validé": "bg-green-100 text-green-800 border-green-300 dark:bg-green-800/30 dark:text-green-300 dark:border-green-700",
  "En Révision": "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-800/30 dark:text-yellow-300 dark:border-yellow-700",
  "Archivé": "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-800/30 dark:text-blue-300 dark:border-blue-700",
  "Obsolète": "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/30 dark:text-gray-400 dark:border-gray-600",
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
        <Logo className="h-12 w-12 animate-spin" />
        <p className="ml-4 text-lg text-muted-foreground">Chargement des documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center">
            <FileText className="mr-3 h-8 w-8 text-primary" />
            Gestion Documentaire Centralisée
          </CardTitle>
          <CardDescription className="text-lg">
            Accédez, gérez et suivez tous les documents relatifs à la conformité de votre organisation.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="shadow-md">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Rechercher (nom, propriétaire, tag...)" 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isClient && (
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Type de document" />
                </SelectTrigger>
                <SelectContent>
                  {allFilterableTypes.map(type => (
                    <SelectItem key={type} value={type}>{type === "all" ? "Tous les types" : type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  {documentStatuses.map(status => (
                    <SelectItem key={status} value={status}>{status === "all" ? "Tous les statuts" : status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => openDialog('add')}>
                <PlusCircle className="mr-2 h-5 w-5" /> Nouveau Document
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[250px]">
                    <Button variant="ghost" size="sm" className="pl-0">
                      Nom du Document <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Version</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière MàJ</TableHead>
                  <TableHead>Propriétaire</TableHead>
                  <TableHead className="text-right w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isClient ? (
                  filteredDocuments.length > 0 ? (
                    filteredDocuments.map((doc) => (
                      <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium py-3">
                          <div className="flex items-center gap-2">
                             {doc.url ? (
                              <Link href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                {doc.name}
                              </Link>
                            ) : (
                              doc.name
                            )}
                            {doc.url && <LinkIcon className="h-3 w-3 text-muted-foreground" />}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {doc.tags?.map((tag, index) => <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>)}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-muted-foreground">{doc.type}</TableCell>
                        <TableCell className="py-3 text-center text-muted-foreground">{doc.version}</TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className={`text-xs px-2.5 py-1 ${statusColors[doc.status]}`}>
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-muted-foreground">{doc.lastUpdated}</TableCell>
                        <TableCell className="py-3 text-muted-foreground">{doc.owner}</TableCell>
                        <TableCell className="py-3 text-right">
                          <AlertDialog>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Ouvrir menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions Document</DropdownMenuLabel>
                                {doc.url ? (
                                  <DropdownMenuItem asChild>
                                    <Link href={doc.url} target="_blank" rel="noopener noreferrer">
                                      <Download className="mr-2 h-4 w-4" /> Télécharger
                                    </Link>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem disabled><Download className="mr-2 h-4 w-4" /> Télécharger</DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => openDialog('edit', doc)}><Edit className="mr-2 h-4 w-4" /> Modifier les détails</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Changer le statut</DropdownMenuLabel>
                                {allPossibleStatuses.map(statusValue => (
                                  doc.status !== statusValue && (
                                    <DropdownMenuItem
                                      key={statusValue}
                                      onClick={() => handleChangeDocumentStatus(doc.id, statusValue)}
                                    >
                                      {statusValue === "Validé" && <CheckCircle className="mr-2 h-4 w-4 text-green-500" />}
                                      {statusValue === "En Révision" && <Edit3 className="mr-2 h-4 w-4 text-yellow-500" />}
                                      {statusValue === "Archivé" && <Archive className="mr-2 h-4 w-4 text-blue-500" />}
                                      {statusValue === "Obsolète" && <FileX className="mr-2 h-4 w-4 text-gray-500" />}
                                      Marquer comme {statusValue}
                                    </DropdownMenuItem>
                                  )
                                ))}
                                <DropdownMenuSeparator />
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                              </DropdownMenuContent>
                            </DropdownMenu>
                             <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce document ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible et supprimera "{doc.name}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveDocument(doc.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        Aucun document ne correspond à vos critères de recherche.
                      </TableCell>
                    </TableRow>
                  )
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Chargement des documents...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
         {isClient && filteredDocuments.length > 0 && (
          <CardFooter className="justify-between text-sm text-muted-foreground pt-4">
             <div>
              {filteredDocuments.length} document{filteredDocuments.length > 1 ? 's' : ''} trouvé{filteredDocuments.length > 1 ? 's' : ''}.
            </div>
          </CardFooter>
        )}
      </Card>

      <Dialog open={!!dialogState.mode} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.mode === "add" ? "Ajouter un nouveau document" : "Modifier le document"}
            </DialogTitle>
            <DialogDescription>
              Remplissez les informations ci-dessous.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nom du document</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="url" render={({ field }) => (
                <FormItem><FormLabel>URL du document (Optionnel)</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{documentTypes.map(type => <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="version" render={({ field }) => (
                  <FormItem><FormLabel>Version</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="owner" render={({ field }) => (
                <FormItem><FormLabel>Propriétaire</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="tags" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags / Mots-clés</FormLabel>
                  <FormControl><Input {...field} placeholder="LAB-FT, RGPD, Audit..." /></FormControl>
                  <FormDescription>Séparez les tags par des virgules.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose>
                <Button type="submit">{dialogState.mode === "add" ? "Ajouter" : "Enregistrer les modifications"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


export default function DocumentsPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <DocumentsComponent />
    </Suspense>
  );
}
