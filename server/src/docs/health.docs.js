/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Santé]
 *     summary: Liveness - le processus est vivant
 *     responses:
 *       200:
 *         description: Service en cours d'exécution
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 uptime: { type: number, example: 128.4 }
 *                 timestamp: { type: string, format: date-time }
 *
 * /ready:
 *   get:
 *     tags: [Santé]
 *     summary: Readiness - le service et la base de données sont opérationnels
 *     responses:
 *       200:
 *         description: Prêt à traiter des requêtes
 *       503:
 *         description: Base de données injoignable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: unavailable }
 *                 checks:
 *                   type: object
 *                   properties:
 *                     database: { type: string, example: down }
 */
