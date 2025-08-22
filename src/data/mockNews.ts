
import type { NewsItem } from '@/types/compliance';

// Les données sont triées par date, du plus récent au plus ancien.
export const initialMockNews: NewsItem[] = [
  {
    id: 'news-1',
    title: "L'OFAC met à jour sa liste de sanctions, impactant le filtrage des tiers.",
    date: '2024-08-05',
    source: 'OFAC',
    description: "De nouvelles entités et individus ont été ajoutés, nécessitant une vigilance accrue lors de l'entrée en relation et des transactions.",
    url: '#',
  },
  {
    id: 'news-2',
    title: "Le CGA publie une nouvelle circulaire sur la gouvernance des produits d'assurance.",
    date: '2024-07-28',
    source: 'CGA',
    description: "La circulaire détaille les attentes du régulateur en matière de conception, de surveillance et de distribution des produits d'assurance.",
    url: '#',
  },
  {
    id: 'news-3',
    title: "Le GAFI publie un rapport sur les nouvelles typologies de blanchiment dans le secteur de l'assurance.",
    date: '2024-07-22',
    source: 'GAFI',
    description: "Le rapport met en lumière des schémas émergents utilisant des produits d'assurance-vie et de capitalisation complexes.",
     url: '#',
  },
  {
    id: 'news-4',
    title: "L'UE finalise les textes techniques de la réglementation DORA sur la résilience opérationnelle numérique.",
    date: '2024-07-18',
    source: 'UE',
    description: 'Les assureurs doivent se préparer à de nouvelles exigences strictes en matière de gestion des risques informatiques et de reporting des incidents.',
    url: '#',
  },
  {
    id: 'news-5',
    title: "Publication au JORT de la nouvelle loi sur la protection des consommateurs de produits financiers.",
    date: '2024-06-30',
    source: 'JORT',
    description: 'La loi introduit de nouvelles obligations de transparence et de conseil pour les distributeurs de produits d\'assurance.',
    url: '#',
  }
];
