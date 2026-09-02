'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RegulatoryWatchItem, ComplianceState, ApplicabilityState, ActionStatus, REFERENCE_LISTS } from '@/types/regulatoryWatch';
import { Save, PlusCircle, Edit3, X } from 'lucide-react';

interface EditRegulatoryTextModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: RegulatoryWatchItem | null;
  onSave: (savedItem: RegulatoryWatchItem) => void;
  nextId: number;
}

export function EditRegulatoryTextModal({
  open,
  onOpenChange,
  item,
  onSave,
  nextId,
}: EditRegulatoryTextModalProps) {
  const [formData, setFormData] = useState<RegulatoryWatchItem>({
    id: nextId,
    domaine: '',
    sousDomaine: '',
    typeTexte: 'Règlement CGA',
    referenceTexte: '',
    dateTexte: '',
    autorite: 'CGA',
    objet: '',
    articlesCles: '',
    processus: '',
    obligation: '',
    responsable: '',
    controleConformite: '',
    frequence: 'Annuelle',
    preuve: '',
    etatConformite: 'À déterminer',
    applicabilite: 'Oui',
    ecartConstat: '',
    actionCorrective: '',
    responsableAction: '',
    echeance: '',
    statutAction: 'Non démarrée',
    source: '',
    observations: '',
  });

  useEffect(() => {
    if (item) {
      setFormData({ ...item });
    } else {
      setFormData({
        id: nextId,
        domaine: 'Assurance Vie / Capitalisation',
        sousDomaine: '',
        typeTexte: 'Règlement CGA',
        referenceTexte: '',
        dateTexte: new Date().toISOString().split('T')[0],
        autorite: 'CGA',
        objet: '',
        articlesCles: '',
        processus: '',
        obligation: '',
        responsable: '',
        controleConformite: '',
        frequence: 'Annuelle',
        preuve: '',
        etatConformite: 'À déterminer',
        applicabilite: 'Oui',
        ecartConstat: '',
        actionCorrective: '',
        responsableAction: '',
        echeance: '',
        statutAction: 'Non démarrée',
        source: 'CGA',
        observations: '',
      });
    }
  }, [item, nextId, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.referenceTexte.trim() || !formData.domaine.trim()) {
      return;
    }
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
              {item ? <Edit3 className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              {item ? `Modifier le texte N°${item.id}` : `Ajouter un nouveau texte réglementaire (N°${nextId})`}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Complétez ou mettez à jour les informations, obligations et plan d'action de mise en conformité.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Section 1 : Identification du texte */}
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              1. Identification & Référence du Texte
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Domaine *</Label>
                <Input
                  value={formData.domaine}
                  onChange={(e) => setFormData({ ...formData, domaine: e.target.value })}
                  placeholder="ex: Assurance Vie / Capitalisation"
                  className="mt-1 h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Sous-domaine</Label>
                <Input
                  value={formData.sousDomaine}
                  onChange={(e) => setFormData({ ...formData, sousDomaine: e.target.value })}
                  placeholder="ex: Provisions techniques, KYC..."
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Type de texte</Label>
                <Input
                  value={formData.typeTexte}
                  onChange={(e) => setFormData({ ...formData, typeTexte: e.target.value })}
                  placeholder="ex: Loi, Décret, Arrêté, Règlement CGA..."
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs font-semibold">Référence complète du texte *</Label>
                <Input
                  value={formData.referenceTexte}
                  onChange={(e) => setFormData({ ...formData, referenceTexte: e.target.value })}
                  placeholder="ex: Règlement CGA n°01/2016 du 13 juillet 2016..."
                  className="mt-1 h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Date du texte</Label>
                <Input
                  value={formData.dateTexte}
                  onChange={(e) => setFormData({ ...formData, dateTexte: e.target.value })}
                  placeholder="YYYY-MM-DD"
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Autorité émettrice</Label>
                <Input
                  value={formData.autorite}
                  onChange={(e) => setFormData({ ...formData, autorite: e.target.value })}
                  placeholder="ex: CGA, Ministère des Finances..."
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Source / Référentiel</Label>
                <Input
                  value={formData.source || ''}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="ex: CGA, FTUSA, JORT..."
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Objet / Intitulé</Label>
              <Input
                value={formData.objet}
                onChange={(e) => setFormData({ ...formData, objet: e.target.value })}
                placeholder="ex: Réglementation des opérations d'assurance-vie..."
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Articles / Dispositions clés</Label>
              <Textarea
                value={formData.articlesCles}
                onChange={(e) => setFormData({ ...formData, articlesCles: e.target.value })}
                placeholder="Détail des dispositions et articles applicables..."
                className="mt-1 text-xs rounded-xl min-h-[60px]"
              />
            </div>
          </div>

          {/* Section 2 : Processus & Contrôle de conformité */}
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-400">
              2. Processus, Responsabilité & Contrôles
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Processus / Activité concerné</Label>
                <Input
                  value={formData.processus}
                  onChange={(e) => setFormData({ ...formData, processus: e.target.value })}
                  placeholder="ex: KYC / Gestion financière / Sinistres"
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Responsable du contrôle</Label>
                <Input
                  value={formData.responsable}
                  onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                  placeholder="ex: Direction Conformité / DSI"
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Fréquence de contrôle</Label>
                <Select
                  value={formData.frequence}
                  onValueChange={(val) => setFormData({ ...formData, frequence: val })}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Sélectionner une fréquence" />
                  </SelectTrigger>
                  <SelectContent>
                    {REFERENCE_LISTS.frequence.map((f, idx) => (
                      <SelectItem key={idx} value={f} className="text-xs">
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Obligation / Exigence à contrôler</Label>
                <Textarea
                  value={formData.obligation}
                  onChange={(e) => setFormData({ ...formData, obligation: e.target.value })}
                  placeholder="Description précise de l'exigence légale..."
                  className="mt-1 text-xs rounded-xl min-h-[50px]"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Preuve / Justificatif attendu</Label>
                <Textarea
                  value={formData.preuve}
                  onChange={(e) => setFormData({ ...formData, preuve: e.target.value })}
                  placeholder="Documents, rapports, PV, extraits RNE..."
                  className="mt-1 text-xs rounded-xl min-h-[50px]"
                />
              </div>
            </div>
          </div>

          {/* Section 3 : État de conformité & Plan d'action */}
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              3. État de Conformité & Plan d'Action Correctif
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">État de conformité</Label>
                <Select
                  value={formData.etatConformite}
                  onValueChange={(val: ComplianceState) => setFormData({ ...formData, etatConformite: val })}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Conforme" className="text-xs text-emerald-600 font-bold">🟢 Conforme</SelectItem>
                    <SelectItem value="En cours de mise en conformité" className="text-xs text-blue-600 font-bold">🔵 En cours de mise en conformité</SelectItem>
                    <SelectItem value="Partiellement conforme" className="text-xs text-amber-600 font-bold">🟠 Partiellement conforme</SelectItem>
                    <SelectItem value="Non conforme" className="text-xs text-rose-600 font-bold">🔴 Non conforme</SelectItem>
                    <SelectItem value="Non applicable" className="text-xs text-slate-500 font-bold">⚪ Non applicable</SelectItem>
                    <SelectItem value="À déterminer" className="text-xs text-purple-600 font-bold">🟣 À déterminer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Applicabilité</Label>
                <Select
                  value={formData.applicabilite || 'Oui'}
                  onValueChange={(val: ApplicabilityState) => setFormData({ ...formData, applicabilite: val })}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFERENCE_LISTS.applicabilite.map((a, idx) => (
                      <SelectItem key={idx} value={a} className="text-xs">
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Statut de l'action</Label>
                <Select
                  value={formData.statutAction || 'Non démarrée'}
                  onValueChange={(val: ActionStatus) => setFormData({ ...formData, statutAction: val })}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFERENCE_LISTS.statutAction.map((s, idx) => (
                      <SelectItem key={idx} value={s} className="text-xs">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Écart / Constat</Label>
                <Input
                  value={formData.ecartConstat || ''}
                  onChange={(e) => setFormData({ ...formData, ecartConstat: e.target.value })}
                  placeholder="Constat d'écart éventuel..."
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Action corrective</Label>
                <Input
                  value={formData.actionCorrective || ''}
                  onChange={(e) => setFormData({ ...formData, actionCorrective: e.target.value })}
                  placeholder="Mesure de remédiation..."
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Responsable de l'action</Label>
                <Input
                  value={formData.responsableAction || ''}
                  onChange={(e) => setFormData({ ...formData, responsableAction: e.target.value })}
                  placeholder="ex: Conformité / DSI"
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Échéance</Label>
                <Input
                  value={formData.echeance || ''}
                  onChange={(e) => setFormData({ ...formData, echeance: e.target.value })}
                  placeholder="YYYY-MM-DD"
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Observations</Label>
                <Input
                  value={formData.observations || ''}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Commentaires / historique..."
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl gap-2 font-bold shadow-md shadow-indigo-500/20"
            >
              <Save className="h-4 w-4" />
              {item ? 'Enregistrer les modifications' : 'Ajouter le texte'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
