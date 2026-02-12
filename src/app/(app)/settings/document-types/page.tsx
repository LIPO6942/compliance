
"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Edit, Trash2, PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { DocumentTypeInfo } from '@/types/compliance';
import { useDocumentTypes } from "@/contexts/DocumentTypesContext";
import { Logo } from "@/components/icons/Logo";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const typeSchema = z.object({
  label: z.string().min(1, "Le nom du type est requis."),
});
type TypeFormValues = z.infer<typeof typeSchema>;

export default function DocumentTypesPage() {
  const { documentTypes, loading, addDocumentType, editDocumentType, removeDocumentType } = useDocumentTypes();
  const { toast } = useToast();
  
  const [dialogState, setDialogState] = React.useState<{ mode: "add" | "edit" | null; data?: DocumentTypeInfo }>({ mode: null });

  const form = useForm<TypeFormValues>({ resolver: zodResolver(typeSchema) });

  const openDialog = (mode: "add" | "edit", data?: DocumentTypeInfo) => {
    setDialogState({ mode, data });
    if (mode === "edit" && data) {
      form.reset({ label: data.label });
    } else {
      form.reset({ label: "" });
    }
  };
  const closeDialog = () => setDialogState({ mode: null });

  const handleFormSubmit = async (values: TypeFormValues) => {
    try {
      if (dialogState.mode === "add") {
        await addDocumentType(values.label);
        toast({ title: "Type ajouté", description: `Le type "${values.label}" a été ajouté.` });
      } else if (dialogState.mode === "edit" && dialogState.data?.id) {
        await editDocumentType(dialogState.data.id, values.label);
        toast({ title: "Type modifié", description: `Le type a été mis à jour.` });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue." });
    }
    closeDialog();
  };

  const handleRemove = async (typeId: string, typeLabel: string) => {
    try {
      await removeDocumentType(typeId);
      toast({ title: "Type supprimé", description: `Le type "${typeLabel}" a été supprimé.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: (error as Error).message });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Logo className="h-12 w-12 animate-spin" />
        <p className="ml-4 text-lg text-muted-foreground">Chargement des types...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-start">
          <div>
            <CardTitle>Types de Documents</CardTitle>
            <CardDescription>
              Gérez les types utilisés pour classifier les documents dans l'application.
            </CardDescription>
          </div>
          <Button onClick={() => openDialog('add')}>
            <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Type
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du Type</TableHead>
                  <TableHead className="text-right w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentTypes.length > 0 ? (
                  documentTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.label}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDialog('edit', type)}>
                                <Edit className="mr-2 h-4 w-4" /> Modifier
                              </DropdownMenuItem>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer ce type ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. Les documents utilisant ce type ne seront pas supprimés mais devront être re-classifiés.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemove(type.id, type.label)} className="bg-destructive text-destructive-foreground">
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
                    <TableCell colSpan={2} className="h-24 text-center">Aucun type de document.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={!!dialogState.mode} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.mode === "add" ? "Ajouter un type" : "Modifier le type"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du type</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Rapport d'Audit" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose>
                <Button type="submit">Enregistrer</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
