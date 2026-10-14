# Cœur de calcul électrique

Les modules de ce dossier contiennent uniquement des fonctions pures : aucune
entrée/sortie, dépendance Express, accès Prisma, lecture d'environnement ou
mutation d'état global. Les validateurs normatifs et les données de référence
restent séparés des calculs mathématiques.

Les erreurs métier partagées et leur traduction HTTP résident dans
`server/src/shared/errors/`, hors du cœur de calcul.
