"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Trash2, Edit3, Save, X, Activity } from "lucide-react";
import { useLegalBases } from "@/contexts/LegalBasesContext";
import { useActivityLog } from "@/contexts/ActivityLogContext";
import { useUser } from "@/contexts/UserContext";
import { LegalBaseText } from "@/types/legal-base";
import { Switch } from "@/components/ui/switch";

export default function AdministrativeLegalBasesPage() {
  const { legalBases, addLegalBase, updateLegalBase, deleteLegalBase } = useLegalBases();
  const { logAction } = useActivityLog();
  const { user } = useUser();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    source: "",
    content: "",
    isActive: true,
  });

  const filteredBases = legalBases.filter(lb => 
    lb.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lb.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lb.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startAdd = () => {
    setFormData({ title: "", source: "", content: "", isActive: true });
    setIsAdding(true);
    setEditingId(null);
  };

  const startEdit = (lb: LegalBaseText) => {
    setFormData({ title: lb.title, source: lb.source, content: lb.content, isActive: lb.isActive });
    setEditingId(lb.id);
    setIsAdding(false);
  };

  const handleSave = () => {
    if (!formData.title || !formData.content) return;
    
    if (isAdding) {
      addLegalBase(formData);
      logAction({
        action: 'SETTINGS_UPDATE',
        label: `A ajouté une base légale : ${formData.title}`,
        module: 'Admin - Bases Légales',
        userName: user?.name || 'Inconnu',
        userEmail: user?.email || '',
      });
    } else if (editingId) {
      updateLegalBase(editingId, formData);
      logAction({
        action: 'SETTINGS_UPDATE',
        label: `A modifié la base légale : ${formData.title}`,
        module: 'Admin - Bases Légales',
        userName: user?.name || 'Inconnu',
        userEmail: user?.email || '',
      });
    }
    
    setIsAdding(false);
    setEditingId(null);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Bases Légales (IA & Réponses Rapides)
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Gérez les textes de référence qui alimentent le cerveau de l'IA.
          </p>
        </div>
        <Button onClick={startAdd} disabled={isAdding} className="shadow-lg shadow-primary/20">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un texte
        </Button>
      </div>

      <Card className="border-0 shadow-xl shadow-slate-200/40 dark:shadow-slate-900 overflow-hidden bg-white dark:bg-slate-950">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex w-full">
          <div className="relative w-full relative group">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Rechercher une loi, un article ou un mot-clé..."
              className="pl-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-primary transition-all rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="p-0">
          {isAdding && (
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-primary/5 dark:bg-primary/10">
               <h3 className="text-lg font-black tracking-tight text-primary mb-4 flex items-center">
                 <FileText className="mr-2 h-5 w-5" />
                 Nouveau Texte Réglementaire
               </h3>
               <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Titre / Référence</label>
                       <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Art. 12 — Loi NA-00" />
                     </div>
                     <div className="space-y-2">
                       <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Source Légale</label>
                       <Input value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} placeholder="Ex: Code des Assurances" />
                     </div>
                  </div>
                  
                  <div className="space-y-2">
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Contenu (Texte Verbatim)</label>
                     <Textarea 
                       value={formData.content} 
                       onChange={e => setFormData({...formData, content: e.target.value})} 
                       placeholder="Copiez le texte exact de la loi ici..." 
                       className="min-h-[150px]"
                     />
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Switch 
                      checked={formData.isActive} 
                      onCheckedChange={(v) => setFormData({...formData, isActive: v})}
                    />
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Activer ce texte dans le moteur IA</label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="ghost" onClick={handleCancel}>Annuler</Button>
                    <Button onClick={handleSave} className="bg-primary text-white">Sauvegarder</Button>
                  </div>
               </div>
            </div>
          )}

          {filteredBases.length === 0 && !isAdding ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center">
               <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
               <p className="font-bold text-lg text-slate-400">Aucun texte réglementaire trouvé.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBases.map((lb) => (
                <div key={lb.id} className="p-6 hover:bg-slate-50/80 dark:hover:bg-slate-900/80 transition-colors">
                  {editingId === lb.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Titre</label>
                           <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                         </div>
                         <div className="space-y-2">
                           <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Source</label>
                           <Input value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Contenu</label>
                         <Textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="min-h-[150px]"/>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-2">
                          <Switch 
                            checked={formData.isActive} 
                            onCheckedChange={(v) => setFormData({...formData, isActive: v})}
                          />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Activer</span>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="ghost" onClick={handleCancel}>Annuler</Button>
                          <Button onClick={handleSave}>Enregistrer</Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-200">{lb.title}</h4>
                            {lb.isActive ? (
                              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-900">
                                <Activity className="w-3 h-3 mr-1" /> Actif
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-500">Inactif</Badge>
                            )}
                          </div>
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">{lb.source}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(lb)} className="text-slate-400 hover:text-blue-500">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(lb.id, lb.title)} className="text-slate-400 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-pre-wrap line-clamp-3">
                          {lb.content}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
