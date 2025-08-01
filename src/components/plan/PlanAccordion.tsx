
"use client";

import * as React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger as ShadcnAccordionTrigger } from "@/components/ui/accordion";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import type { ComplianceCategory, ComplianceSubCategory, ComplianceTask } from "@/types/compliance";
import { ListTodo, PlusCircle, Edit2, Trash2, MoreVertical, ChevronDown, Clock } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

const iconMap: Record<string, LucideIcons.LucideIcon> = {
  Gavel: LucideIcons.Gavel, ShieldAlert: LucideIcons.ShieldAlert, SearchCheck: LucideIcons.SearchCheck, ClipboardCheck: LucideIcons.ClipboardCheck,
  Users: LucideIcons.Users, MessageSquareWarning: LucideIcons.MessageSquareWarning, FolderKanban: LucideIcons.FolderKanban, ListTodo: LucideIcons.ListTodo,
  CheckSquare: LucideIcons.CheckSquare, Activity: LucideIcons.Activity, Archive: LucideIcons.Archive, Award: LucideIcons.Award, BarChart3: LucideIcons.BarChart3,
  Bell: LucideIcons.Bell, BookOpen: LucideIcons.BookOpen, Briefcase: LucideIcons.Briefcase, Building: LucideIcons.Building, CalendarDays: LucideIcons.CalendarDays,
  Edit3: LucideIcons.Edit3, FileDigit: LucideIcons.FileDigit, Filter: LucideIcons.Filter, Flag: LucideIcons.Flag, FolderOpen: LucideIcons.FolderOpen,
  Globe2: LucideIcons.Globe2, Grid: LucideIcons.Grid, HardDrive: LucideIcons.HardDrive, HelpCircle: LucideIcons.HelpCircle, Home: LucideIcons.Home,
  Info: LucideIcons.Info, KeyRound: LucideIcons.KeyRound, Layers2: LucideIcons.Layers2, LayoutGrid: LucideIcons.LayoutGrid, LifeBuoy: LucideIcons.LifeBuoy,
  Link2: LucideIcons.Link2, ListChecks: LucideIcons.ListChecks, Lock: LucideIcons.Lock, Mail: LucideIcons.Mail, Map: LucideIcons.Map, Menu: LucideIcons.Menu,
  MessageCircleQuestion: LucideIcons.MessageCircleQuestion, PenLine: LucideIcons.PenLine, PieChart: LucideIcons.PieChart, PlayCircle: LucideIcons.PlayCircle,
  PlusCircle: LucideIcons.PlusCircle, Printer: LucideIcons.Printer, RadioTower: LucideIcons.RadioTower, Save: LucideIcons.Save, Search: LucideIcons.Search,
  Settings2: LucideIcons.Settings2, Share2: LucideIcons.Share2, Sheet: LucideIcons.Sheet, SlidersHorizontal: LucideIcons.SlidersHorizontal, Star: LucideIcons.Star,
  Table: LucideIcons.Table, Tag: LucideIcons.Tag, Target: LucideIcons.Target, TerminalSquare: LucideIcons.TerminalSquare, ThumbsUp: LucideIcons.ThumbsUp,
  Trash: LucideIcons.Trash, UserCog: LucideIcons.UserCog, Video: LucideIcons.Video, WalletCards: LucideIcons.WalletCards, Zap: LucideIcons.Zap,
  Eye: LucideIcons.Eye, FileSearch: LucideIcons.FileSearch, PackageCheck: LucideIcons.PackageCheck, Megaphone: LucideIcons.Megaphone, MailWarning: LucideIcons.MailWarning,
  Siren: LucideIcons.Siren, Projector: LucideIcons.Projector, Wrench: LucideIcons.Wrench, MoreVertical: LucideIcons.MoreVertical, ChevronDown: LucideIcons.ChevronDown,
  Clock: LucideIcons.Clock,
};

const getIconComponent = (iconName?: string): LucideIcons.LucideIcon => (iconName && iconMap[iconName]) || LucideIcons.ListTodo;
const isTaskOverdue = (task: ComplianceTask) => task.deadline && !task.completed && new Date(task.deadline) < new Date();

interface PlanAccordionProps {
    planData: ComplianceCategory[];
    activeAccordionItems: string[];
    setActiveAccordionItems: React.Dispatch<React.SetStateAction<string[]>>;
    isClient: boolean;
    onEditCategory: (category: ComplianceCategory) => void;
    onRemoveCategory: (categoryId: string) => void;
    onAddSubCategory: (categoryId: string) => void;
    onEditSubCategory: (subCategory: ComplianceSubCategory, categoryId: string) => void;
    onRemoveSubCategory: (categoryId: string, subCategoryId: string) => void;
    onAddTask: (subCategoryId: string, categoryId: string) => void;
    onEditTask: (task: ComplianceTask, subCategoryId: string, categoryId: string) => void;
    onRemoveTask: (categoryId: string, subCategoryId: string, taskId: string) => void;
    onToggleTask: (categoryId: string, subCategoryId: string, taskId: string) => void;
}

export function PlanAccordion({
    planData, activeAccordionItems, setActiveAccordionItems, isClient,
    onEditCategory, onRemoveCategory, onAddSubCategory, onEditSubCategory, onRemoveSubCategory,
    onAddTask, onEditTask, onRemoveTask, onToggleTask
}: PlanAccordionProps) {
  return (
    <Accordion 
      type="multiple" 
      className="w-full space-y-4" 
      value={activeAccordionItems}
      onValueChange={setActiveAccordionItems}
    >
      {planData.length > 0 ? planData.map((category: ComplianceCategory) => {
          const Icon = getIconComponent(category.icon);
          return (
          <AccordionItem key={category.id} value={category.id} id={category.id} className="bg-card border rounded-lg shadow-md overflow-hidden">
             <AccordionPrimitive.Header className="flex items-center px-6 py-4 hover:bg-muted/50 transition-colors group">
              <ShadcnAccordionTrigger className="p-0 hover:no-underline flex-1 [&>svg]:ml-auto">
                <div className="flex items-center space-x-3">
                  <Icon className="h-6 w-6 text-primary" />
                  <span className="text-xl font-headline font-medium">{category.name}</span>
                </div>
              </ShadcnAccordionTrigger>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity pl-3">
                <AlertDialog>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditCategory(category); }}>
                        <Edit2 className="mr-2 h-4 w-4" /> Modifier
                      </DropdownMenuItem>
                      <AlertDialogTrigger asChild>
                         <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette catégorie ?</AlertDialogTitle>
                      <AlertDialogDescription>Cette action est irréversible et supprimera "{category.name}" et toutes ses sous-catégories et tâches.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={(e) => { e.stopPropagation(); onRemoveCategory(category.id); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </AccordionPrimitive.Header>
            <AccordionContent className="px-6 pt-0 pb-6">
              <div className="space-y-4 mt-4">
                {category.subCategories.map((subCategory: ComplianceSubCategory) => {
                   const SubIcon = getIconComponent(subCategory.icon);
                   return (
                  <Card key={subCategory.id} className="bg-background/50 shadow-sm group">
                    <CardHeader className="pb-3 pt-4 px-4 flex flex-row justify-between items-center">
                      <div className="flex items-center">
                        <SubIcon className="h-5 w-5 mr-2 text-accent" />
                        <CardTitle className="text-lg font-medium font-headline">{subCategory.name}</CardTitle>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <AlertDialog>
                         <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditSubCategory(subCategory, category.id);}}><Edit2 className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                             <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem></AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                         <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette sous-catégorie ?</AlertDialogTitle>
                            <AlertDialogDescription>Cette action est irréversible et supprimera "{subCategory.name}" et toutes ses tâches.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={(e) => { e.stopPropagation(); onRemoveSubCategory(category.id, subCategory.id);}} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <ul className="space-y-3 list-inside">
                        {subCategory.tasks.map((task: ComplianceTask) => (
                          <li key={task.id} className="flex items-start text-sm text-muted-foreground group/task relative pr-10">
                             <Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => onToggleTask(category.id, subCategory.id, task.id)} className="mr-2.5 mt-1 flex-shrink-0 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" aria-labelledby={`task-label-${task.id}`}/>
                            <label htmlFor={`task-${task.id}`} id={`task-label-${task.id}`} className="cursor-pointer flex-grow">
                              <div>
                                <span className={`${task.completed ? 'line-through text-muted-foreground/70' : ''} ${isClient && isTaskOverdue(task) ? "text-destructive font-medium" : "text-foreground"}`}>{task.name}</span>
                                {task.description && <span className="text-xs text-muted-foreground italic"> - {task.description}</span>}
                              </div>
                              {task.deadline && (isClient ? (<div className={`text-xs mt-0.5 flex items-center ${isTaskOverdue(task) ? 'text-destructive' : 'text-muted-foreground'}`}><Clock className="h-3 w-3 mr-1" /><span>Échéance: {format(parseISO(task.deadline), 'dd/MM/yyyy', { locale: fr })}</span></div>) : (<div className="text-xs mt-0.5 flex items-center text-muted-foreground"><Clock className="h-3 w-3 mr-1" /><span>Échéance: ...</span></div>))}
                            </label>
                             <div className="absolute right-0 top-0 opacity-0 group-hover/task:opacity-100 transition-opacity">
                               <AlertDialog>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" side="left">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditTask(task, subCategory.id, category.id);}}><Edit2 className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                                    <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem></AlertDialogTrigger>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette tâche ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible et supprimera la tâche "{task.name}".</AlertDialogDescription></AlertDialogHeader>
                                  <AlertDialogFooter><AlertDialogCancel onClick={(e) => e.stopPropagation()}>Annuler</AlertDialogCancel><AlertDialogAction onClick={(e) => { e.stopPropagation(); onRemoveTask(category.id, subCategory.id, task.id);}} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => onAddTask(subCategory.id, category.id)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une tâche
                      </Button>
                    </CardContent>
                  </Card>
                  );
                })}
                <Button variant="default" className="mt-4" onClick={() => onAddSubCategory(category.id)}>
                  <PlusCircle className="mr-2 h-5 w-5" /> Ajouter une sous-catégorie
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        )})
      ) : (
           <Card className="text-center p-8 border-dashed shadow-none">
              <CardTitle className="text-xl font-medium">Aucun plan de conformité défini</CardTitle>
              <CardDescription className="mt-2">Commencez par ajouter votre première catégorie pour construire votre plan.</CardDescription>
          </Card>
        )}
    </Accordion>
  );
}

    