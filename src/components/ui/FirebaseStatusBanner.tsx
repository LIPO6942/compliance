'use client';

import React from 'react';
import { AlertTriangle, WifiOff, FlaskConical, Clock, RefreshCw, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DataStatus = "loading" | "real" | "demo" | "error" | "empty" | "stale";

interface FirebaseStatusBannerProps {
  /** Statut de la source de données */
  status: DataStatus;
  /** Nom du module affiché dans le message */
  moduleName?: string;
  /** Date de la dernière synchronisation réussie */
  lastSyncAt?: Date | null;
  /** Callback pour relancer la synchronisation */
  onRetry?: () => void;
  /** Classes CSS supplémentaires */
  className?: string;
}

/**
 * Bannière affichant l'état de la synchronisation Firebase.
 * À utiliser dans les pages/composants consommant des contextes Firebase.
 *
 * Ne s'affiche pas si status === "real" ou "loading" ou "empty".
 */
export const FirebaseStatusBanner: React.FC<FirebaseStatusBannerProps> = ({
  status,
  moduleName = "données",
  lastSyncAt,
  onRetry,
  className,
}) => {
  if (status === "real" || status === "loading" || status === "empty") return null;

  const formatDate = (d: Date) =>
    d.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  if (status === "demo") {
    return (
      <div className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium",
        "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
        className
      )}>
        <FlaskConical className="h-4 w-4 shrink-0" />
        <span>
          <strong>Mode Démonstration</strong> — Les {moduleName} affichés sont des données fictives.
          Firebase n&apos;est pas configuré dans cet environnement.
        </span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium",
        "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
        className
      )}>
        <WifiOff className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          <strong>Erreur de connexion Firebase</strong> —
          {lastSyncAt
            ? ` Dernières données synchronisées le ${formatDate(lastSyncAt)}. Les modifications ne sont pas sauvegardées.`
            : ` Impossible de charger les ${moduleName}. Vérifiez votre connexion.`
          }
        </span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-bold transition-colors shrink-0"
          >
            <RefreshCw className="h-3 w-3" />
            Réessayer
          </button>
        )}
      </div>
    );
  }

  if (status === "stale") {
    return (
      <div className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium",
        "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
        className
      )}>
        <Clock className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          <strong>Données non synchronisées</strong> —
          {lastSyncAt
            ? ` Dernière synchronisation : ${formatDate(lastSyncAt)}.`
            : ' Modifications locales en attente.'
          }
        </span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold transition-colors shrink-0"
          >
            <RefreshCw className="h-3 w-3" />
            Synchroniser
          </button>
        )}
      </div>
    );
  }

  return null;
};

/** Hook utilitaire : formate la date de lastSyncAt en chaîne lisible */
export const useLastSyncLabel = (lastSyncAt: Date | null): string => {
  if (!lastSyncAt) return '';
  const now = new Date();
  const diffMs = now.getTime() - lastSyncAt.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'à l\'instant';
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  return lastSyncAt.toLocaleDateString('fr-FR');
};

