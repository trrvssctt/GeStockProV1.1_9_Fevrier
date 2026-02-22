
import { AIService } from '../services/AIService.js';
import { StockItem, Message, PromptTemplate } from '../models/index.js';
import { sequelize_db_template, sequelize } from '../config/database.js';
import axios from 'axios';

export class AIController {
  /**
   * Récupère l'historique des conversations pour le tenant actuel
   */
  static async getHistory(req, res) {
    try {
      // Respect tenant isolation provided by `tenantIsolation` middleware
      const sessionId = (req.tenantFilter && req.tenantFilter.tenantId) ? req.tenantFilter.tenantId : req.user.tenantId;

      // First, try reading from the primary ERP DB (Postgres) where n8n_chat_histories may live
      const sqlPg = `SELECT id, session_id, message, sender, created_at FROM n8n_chat_histories WHERE session_id = :sessionId ORDER BY created_at ASC LIMIT 2000`;
      try {
        const [rows] = await sequelize.query(sqlPg, { replacements: { sessionId } });
        const payload = (rows || []).map(r => {
          const ts = r.created_at || r.createdAt || null;
          const rawSender = (r.sender || r.session_sender || '').toString().toLowerCase();
          const sender = (rawSender === 'user' || rawSender === 'human') ? 'user' : (rawSender === 'assistant' || rawSender === 'ai' || rawSender === 'bot' ? 'ai' : 'ai');
          return {
            id: r.id,
            sender,
            message: typeof r.message === 'string' ? r.message : JSON.stringify(r.message || ''),
            metadata: {},
            created_at: ts ? new Date(ts).toISOString() : null,
            createdAt: ts ? new Date(ts).toISOString() : null
          };
        });
        return res.status(200).json(payload);
      } catch (pgErr) {
        // If table not found in Postgres, fallback to the IA registry MySQL database
        const isPgMissing = pgErr && pgErr.original && (pgErr.original.code === '42P01' || /does not exist/i.test(String(pgErr.message)));
        // eslint-disable-next-line no-console
        console.warn('[AI HISTORY] Postgres query failed, fallback?', isPgMissing, pgErr && pgErr.message);
        if (!isPgMissing) throw pgErr;

        // Fallback: attempt reading from the MySQL registry DB
        const sqlMy = `SELECT id, session_id, message, sender, created_at FROM n8n_chat_histories WHERE session_id = :sessionId ORDER BY created_at ASC LIMIT 2000`;
        const [rowsMy] = await sequelize.query(sqlMy, { replacements: { sessionId } });
        const payload = (rowsMy || []).map(r => {
          const ts = r.created_at || r.createdAt || null;
          const rawSender = (r.sender || r.session_sender || '').toString().toLowerCase();
          const sender = (rawSender === 'user' || rawSender === 'human') ? 'user' : (rawSender === 'assistant' || rawSender === 'ai' || rawSender === 'bot' ? 'ai' : 'ai');
          return {
            id: r.id,
            sender,
            message: typeof r.message === 'string' ? r.message : JSON.stringify(r.message || ''),
            metadata: {},
            created_at: ts ? new Date(ts).toISOString() : null,
            createdAt: ts ? new Date(ts).toISOString() : null
          };
        });
        return res.status(200).json(payload);
      }
    } catch (error) {
      // Log full error server-side, but return a sanitized message to the client
      // eslint-disable-next-line no-console
      console.error('[AI HISTORY ERROR]:', error);
      return res.status(500).json({ error: 'HistoryFetchError', message: 'Impossible de récupérer l\'historique des conversations.' });
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

  /**
   * Proxy for external AI webhook to avoid CORS issues from browser
   */
  static async bridgeWebhook(req, res) {
    const { chatInput, sessionId } = req.body || {};
    // Allow request-level override: body `orchestratorUrl` or header `x-orchestrator-url`
    const orchestratorOverride = (req.body && req.body.orchestratorUrl) ? req.body.orchestratorUrl : (req.headers['x-orchestrator-url'] || null);
    // Build ordered webhook candidates: prefer explicit env, then local dev endpoints, then ngrok fallback
    // Support multiple env var names used across deployments
    const envWebhook = process.env.WEBHOOK_URL || process.env.N8N_WEBHOOK_URL || process.env.N8N_AI_ORCHESTRATOR_URL || null;
    const envProd = process.env.PROD_WEBHOOK || process.env.N8N_PROD_WEBHOOK || process.env.N8N_AI_ORCHESTRATOR_URL || null;
    const localProd = 'https://n8n.realtechprint.com/webhook/chat-ia';
    const ngrokFallback = 'https://malvasian-pleonic-fatimah.ngrok-free.dev/webhook/chat-ia';

    const isProd = (process.env.NODE_ENV || 'development') === 'production';
    // If an orchestrator override is provided in the request, honor it as the highest priority
    const targetWebhook = orchestratorOverride
      ? orchestratorOverride
      : (isProd
        ? (envProd || envWebhook || localProd || ngrokFallback)
        : (envWebhook || localTest || localProd || envProd || ngrokFallback));
    // Track attempted URLs for diagnostics (include override if present)
    const tried = [];
    if (orchestratorOverride) tried.push(orchestratorOverride);
    tried.push(targetWebhook);
    // Log chosen target for debugging in prod
    // eslint-disable-next-line no-console
    console.info('[Bridge] chosen target webhook:', targetWebhook);

    // Try primary target first
    try {
      const resp = await axios.post(targetWebhook, { chatInput, sessionId, message: req.body.message, id: req.body.id }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
      return res.status(200).json(resp.data);
    } catch (error) {
      // Log full error details to server console for debugging
      // eslint-disable-next-line no-console
      console.error('Bridge webhook error:', {
        message: error.message, stack: error.stack, responseStatus: error.response && error.response.status, responseData: error.response && error.response.data
      });

      const remoteStatus = (error && error.response && error.response.status) ? error.response.status : 502;
      const remoteData = (error && error.response && error.response.data) ? error.response.data : (error.message || String(error));
      const isTimeout = error && error.code === 'ECONNABORTED';

      // Special-case: n8n returns 404 when the webhook name isn't registered
      if (remoteStatus === 404 && remoteData && (typeof remoteData === 'object' ? (remoteData.message || '').toString().toLowerCase() : String(remoteData).toLowerCase())) {
        const msg = (remoteData && remoteData.message) ? remoteData.message : 'Requested webhook not registered.';
        const hint = (remoteData && remoteData.hint) ? remoteData.hint : 'Activez le workflow dans l\'éditeur n8n (cliquez sur "Execute workflow" si nécessaire).';
        return res.status(404).json({ error: 'WebhookNotRegistered', message: msg, hint, attempted: targetWebhook });
      }

      // For timeouts, no response or gateway errors, try a sequence of fallbacks (local test/prod and env-specified)
      if (isTimeout || !error.response || remoteStatus === 502) {
        const fallbacks = [];
        if (envWebhook && !tried.includes(envWebhook)) fallbacks.push(envWebhook);
        if (envProd && !tried.includes(envProd)) fallbacks.push(envProd);
        //if (localTest !== targetWebhook) fallbacks.push(localTest);
        if (localProd !== targetWebhook) fallbacks.push(localProd);
        if (ngrokFallback !== targetWebhook) fallbacks.push(ngrokFallback);

        for (const fb of fallbacks) {
          try {
            // eslint-disable-next-line no-console
            console.info('[Bridge] attempting fallback webhook:', fb);
            tried.push(fb);
            const retry = await axios.post(fb, { chatInput, sessionId, message: req.body.message, id: req.body.id }, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
            return res.status(200).json({ fromFallback: true, fallbackUrl: fb, data: retry.data });
          } catch (retryErr) {
            // eslint-disable-next-line no-console
            console.warn('[Bridge] fallback attempt failed for', fb, retryErr && retryErr.message);
            // try next
          }
        }
      }

      // If the remote returned an HTML page (ngrok offline, proxy page), convert to a clear JSON error
      if (typeof remoteData === 'string' && (remoteData.includes('<!DOCTYPE') || /ngrok/i.test(remoteData) || remoteData.includes('The endpoint') || remoteData.includes('is not registered'))) {
        const hint = 'La cible n8n semble indisponible ou le workflow de production n\'est pas activé. Activez le workflow dans l\'éditeur n8n ou utilisez l\'URL de test (webhook-test) pendant le développement.';
        return res.status(remoteStatus).json({ error: 'WebhookUnavailable', message: 'External webhook unreachable or returned non-JSON HTML response', hint, details: String(remoteData).slice(0, 2000) });
      }

      // Forward other remote errors as-is, include attempted URLs to help debugging
      return res.status(remoteStatus).json({ error: 'BridgeError', message: 'Failed to call external webhook', details: remoteData, attempted: tried });
    }
  }
}
