
import type { TrainingRegistryItem, UpcomingSession, SensitizationCampaign } from '@/types/compliance';

export const initialMockTrainingRegistry: TrainingRegistryItem[] = [
  {
    id: "reg-001",
    title: "Formation LAB-FT Fondamentale",
    objective: "Comprendre les bases de la lutte contre le blanchiment et le financement du terrorisme.",
    duration: "2h",
    support: "Présentation PPT, Quiz",
    lastUpdated: "2024-05-15",
    completionCriteria: [
      { id: 'c1-1', text: 'Visionnage de la présentation', isCompleted: true },
      { id: 'c1-2', text: 'Score de 80% au quiz', isCompleted: false }
    ],
    progress: 50,
    successRate: 0,
  },
  {
    id: "reg-002",
    title: "Protection des Données (RGPD)",
    objective: "Maîtriser les obligations liées à la protection des données personnelles.",
    duration: "1.5h",
    support: "Vidéo, e-learning",
    lastUpdated: "2024-06-01",
    completionCriteria: [
       { id: 'c2-1', text: 'Module e-learning terminé', isCompleted: true },
       { id: 'c2-2', text: 'Attestation générée', isCompleted: true },
    ],
    progress: 100,
    successRate: 92,
  },
  {
    id: "reg-003",
    title: "Déontologie et Ethique Professionnelle",
    objective: "Connaître et appliquer les règles de déontologie de l'entreprise.",
    duration: "1h",
    support: "Charte éthique, Scénarios",
    lastUpdated: "2024-02-10",
    completionCriteria: [
      { id: 'c3-1', text: 'Lecture de la charte', isCompleted: true },
      { id: 'c3-2', text: 'Validation des scénarios', isCompleted: true },
    ],
    progress: 100,
    successRate: 98,
  },
];

export const initialMockUpcomingSessions: UpcomingSession[] = [
  {
    id: "sess-001",
    title: "Session de rappel LAB-FT",
    date: "2024-09-10",
    type: "Obligatoire",
    department: "Commercial",
    logisticsConfirmed: true,
    materialsPrepared: true,
    invitationsSent: false,
    progress: 66,
    isCompleted: false,
    participants: 0,
    totalInvitees: 25,
  },
  {
    id: "sess-002",
    title: "Atelier sur la nouvelle politique de déontologie",
    date: "2024-10-05",
    type: "Recommandée",
    department: "Tous",
    logisticsConfirmed: false,
    materialsPrepared: false,
    invitationsSent: false,
    progress: 0,
    isCompleted: false,
    participants: 0,
    totalInvitees: 150,
  },
  {
    id: "sess-003",
    title: "Formation RGPD pour le service Marketing",
    date: "2024-08-22",
    type: "Obligatoire",
    department: "Marketing",
    logisticsConfirmed: true,
    materialsPrepared: true,
    invitationsSent: true,
    progress: 100,
    isCompleted: false,
    participants: 0,
    totalInvitees: 12,
  },
];

export const initialMockSensitizationCampaigns: SensitizationCampaign[] = [
  {
    id: "camp-001",
    name: "Campagne Phishing",
    status: "En cours",
    launchDate: "2024-07-01",
    target: "Tous les employés",
    completionCriteria: [
        {id: 'ca1-1', text: 'Envoi du mail de simulation', isCompleted: true},
        {id: 'ca1-2', text: 'Analyse des résultats', isCompleted: false},
    ],
    progress: 50,
  },
  {
    id: "camp-002",
    name: "Confidentialité des informations",
    status: "Planifiée",
    launchDate: "2024-11-01",
    target: "Nouveaux recrutés",
    completionCriteria: [],
    progress: 0,
  },
];
