# Modules fonctionnels

Chaque module sépare les routes, contrôleurs, services, repositories et
validateurs Zod. Les routes versionnées sont montées après les middlewares
d'authentification et de contexte tenant.

Les repositories doivent appliquer `req.tenantId` à chaque lecture et écriture
de données tenant-scoped. Ne jamais accepter l'identifiant du tenant depuis un
paramètre libre de requête pour déterminer le périmètre d'accès.
