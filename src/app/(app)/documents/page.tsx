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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, PlusCircle, Search, ArrowUpDown, MoreHorizontal, Download, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type DocumentStatus = "Validé" | "En Révision" | "Archivé" | "Obsolète";
type DocumentType = "Politique" | "Procédure" | "Rapport" | "Support de Formation" | "Veille";

interface Document {
  id: string;
  name: string;
  type: DocumentType;
  version: string;
  status: DocumentStatus;
  lastUpdated: string;
  owner: string;
}

const mockDocuments: Document[] = [
  { id: "doc001", name: "Politique LAB-FT", type: "Politique", version: "2.1", status: "Validé", lastUpdated: "2024-07-15", owner: "Alice Dupont" },
  { id: "doc002", name: "Procédure KYC", type: "Procédure", version: "1.5", status: "En Révision", lastUpdated: "2024-06-20", owner: "Bob Martin" },
  { id: "doc003", name: "Rapport de Conformité Annuel 2023", type: "Rapport", version: "1.0", status: "Archivé", lastUpdated: "2024-01-30", owner: "Alice Dupont" },
  { id: "doc004", name: "Support Formation MIFID II", type: "Support de Formation", version: "3.0", status: "Validé", lastUpdated: "2024-05-10", owner: "Charles Petit" },
  { id: "doc005", name: "Analyse d'impact DORA", type: "Veille", version: "0.8", status: "En Révision", lastUpdated: "2024-07-25", owner: "Diana Moreau" },
  { id: "doc006", name: "Politique de Protection des Données", type: "Politique", version: "4.2", status: "Validé", lastUpdated: "2023-11-01", owner: "Bob Martin" },
  { id: "doc007", name: "Procédure de Gestion des Incidents", type: "Procédure", version: "2.0", status: "Obsolète", lastUpdated: "2022-08-15", owner: "Alice Dupont" },
];

const statusColors: Record<DocumentStatus, string> = {
  "Validé": "bg-green-100 text-green-800 border-green-300 dark:bg-green-800/30 dark:text-green-300 dark:border-green-700",
  "En Révision": "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-800/30 dark:text-yellow-300 dark:border-yellow-700",
  "Archivé": "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-800/30 dark:text-blue-300 dark:border-blue-700",
  "Obsolète": "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/30 dark:text-gray-400 dark:border-gray-600",
};


export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterType, setFilterType] = React.useState<string>("all");
  const [filterStatus, setFilterStatus] = React.useState<string>("all");

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || doc.type === filterType;
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });
  
  const documentTypes = ["all", ...Array.from(new Set(mockDocuments.map(doc => doc.type)))] as ("all" | DocumentType)[];
  const documentStatuses = ["all", ...Array.from(new Set(mockDocuments.map(doc => doc.status)))] as ("all" | DocumentStatus)[];


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
              placeholder="Rechercher un document, un propriétaire..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Type de document" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map(type => (
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
            <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              <PlusCircle className="mr-2 h-5 w-5" /> Nouveau Document
            </Button>
          </div>
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
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Version</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière MàJ</TableHead>
                  <TableHead>Propriétaire</TableHead>
                  <TableHead className="text-right w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length > 0 ? (
                  filteredDocuments.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium py-3">{doc.name}</TableCell>
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Ouvrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem><Download className="mr-2 h-4 w-4" /> Télécharger</DropdownMenuItem>
                            <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Aucun document ne correspond à vos critères de recherche.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
         {filteredDocuments.length > 0 && (
          <CardFooter className="justify-between text-sm text-muted-foreground pt-4">
             <div>
              {filteredDocuments.length} document{filteredDocuments.length > 1 ? 's' : ''} trouvé{filteredDocuments.length > 1 ? 's' : ''}.
            </div>
            {/* Add pagination controls here if needed */}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
