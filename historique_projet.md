# Historique du Projet Compliance

Ce document retrace les principales évolutions, ajouts de fonctionnalités et corrections apportées à l'application.

## Mars 2026

### Amélioration de l'Historisation (Journal d'Activité)
- **Traçabilité complète** : Ajout de la journalisation pour les modifications des risques via formulaires (Inventaire et DMR) et éditions en ligne (Tableau de Plan d'actions).
- **Historisation des paramètres** : Suivi des modifications des positions de la MAE Assurance et des liaisons de documents globaux.
- **Historisation des alertes** : Enregistrement de la création et suppression d'alertes associées aux risques.
- **Journal Admin** : Mise à jour de la page d'administration (`/settings/admin/activity`) avec de nouveaux filtres (Ajouts, Suppressions, Alertes, Paramétrages) pour un suivi granulaire de chaque action.

### Notifications et Alertes
- **Notifications Push Riches** : Implémentation de notifications Push (Firebase Cloud Messaging) envoyées en temps réel gérées via Webhook.
- **Messages Aléatoires** : Création d'un système générant des messages de notification dynamiques et variés pour éviter la répétition auprès des utilisateurs.

### Refonte et Évolution de la Cartographie des Risques
- **Modernisation UI** : Amélioration du design et de l'ergonomie des tableaux de risques (En-têtes modernes, structure).
- **Nouvelles Données** : 
    - Séparation entre "Facteurs de risques" et "Sous-facteurs de risques".
    - Regroupement des listes par catégorie (Pays, Canaux de distribution, etc.).
    - Ajout de l'affichage de la date de création / dernière modification.
- **DMR (Dispositif de Management des Risques)** : Ajout de l'évaluation du risque résiduel (Impact x Probabilité) avec positionnement de la MAE Assurance.
- **Plan d'Actions** : Organisation des mesures d'atténuation en points et suivi direct des responsables, échéances et avancements.

### Déploiement et Infrastructure
- Amélioration de la gestion des clés API et résolution des conflits de déploiement sur Vercel.
- Gestion des permissions Web Push pour les utilisateurs de l'application.

---
*Fin du journal.*
