# Attention Utilisateur

J'ai recréé le fichier `src/app/(app)/admin/workflows/new/page.tsx` pour corriger l'erreur de build Vercel :
`useSearchParams() should be wrapped in a suspense boundary`

Le fichier contient maintenant une redirection côté client avec un ID généré aléatoirement, enveloppée dans `<Suspense>`.

Veuillez relancer le build ou faire un commit de ce nouveau fichier.
