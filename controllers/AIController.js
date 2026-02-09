
import { AIService } from '../services/AIService.js';
import { StockItem, Message, PromptTemplate } from '../models/index.js';

export class AIController {
  /**
   * Récupère l'historique des conversations pour le tenant actuel
   */
  static async getHistory(req, res) {
    try {
      const messages = await Message.findAll({
        where: { tenantId: req.user.tenantId },
        order: [['createdAt', 'ASC']]
      });
      return res.status(200).json(messages);
    } catch (error) {
      return res.status(500).json({ error: 'HistoryFetchError', message: error.message });
    }
  }

  /**
   * Récupère la bibliothèque de prompts prédéfinis
   */
  static async getTemplates(req, res) {
    try {
      const templates = await PromptTemplate.findAll({
        where: { isActive: true },
        order: [['category', 'ASC'], ['title', 'ASC']]
      });
      return res.status(200).json(templates);
    } catch (error) {
      return res.status(500).json({ error: 'TemplateFetchError', message: error.message });
    }
  }

  /**
   * Insights pour le dashboard
   */
  static async getDashboardInsights(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const lowStocks = await StockItem.findAll({
        where: { tenantId },
        order: [['currentLevel', 'ASC']],
        limit: 5
      });

      const insights = [];
      for (const item of lowStocks) {
        const prediction = await AIService.predictStockOut(tenantId, item.id);
        if (prediction && prediction.daysRemaining < 7) {
          insights.push({
            productId: item.id,
            productName: item.name,
            sku: item.sku,
            message: `Risque de rupture dans ${prediction.daysRemaining} jours.`,
            severity: prediction.daysRemaining < 3 ? 'CRITICAL' : 'HIGH',
            velocity: prediction.velocity.toFixed(2)
          });
        }
      }

      return res.status(200).json({
        engine: 'Gemini-Flash-Native',
        timestamp: new Date(),
        insights
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async updateForecasts(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const { predictions, period } = req.body;
      let preds = predictions;
      if (!preds || !Array.isArray(preds)) {
        if (period) {
          preds = await AIService.generateForecasts(tenantId, period);
        } else {
          return res.status(400).json({ error: 'BadRequest' });
        }
      }
      for (const pred of preds) {
        if (!pred || !pred.sku) continue;
        await StockItem.update(
          { forecastedLevel: pred.forecastedLevel },
          { where: { sku: pred.sku, tenantId } }
        );
      }
      return res.status(200).json({ status: 'SUCCESS', count: preds.length });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}
