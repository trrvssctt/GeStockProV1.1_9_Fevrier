
import { Router } from 'express';
import { AIController } from '../controllers/AIController.js';
import { checkPermission } from '../middlewares/rbac.js';

const router = Router();

/**
 * @route GET /api/ai/history
 * @desc  Récupère l'historique des messages pour le tenant
 */
router.get('/history', checkPermission(['ADMIN', 'SALES', 'ACCOUNTANT', 'STOCK_MANAGER']), AIController.getHistory);

/**
 * @route GET /api/ai/templates
 * @desc  Récupère la bibliothèque de prompts templates
 */
router.get('/templates', checkPermission(['ADMIN', 'SALES', 'ACCOUNTANT', 'STOCK_MANAGER']), AIController.getTemplates);

/**
 * @route GET /api/ai/insights
 * @desc  Récupère les recommandations IA pour le dashboard
 */
router.get('/insights', checkPermission(['ADMIN', 'STOCK_MANAGER']), AIController.getDashboardInsights);

/**
 * @route POST /api/ai/forecast-sync
 * @desc  Point d'entrée pour n8n pour injecter les prédictions
 */
router.post('/forecast-sync', checkPermission(['ADMIN']), AIController.updateForecasts);

/**
 * Proxy endpoint to call external AI webhook from server (avoids CORS)
 */
router.post('/bridge', AIController.bridgeWebhook);

export default router;
