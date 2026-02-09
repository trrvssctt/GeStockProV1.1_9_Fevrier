
import axios from 'axios';

export class NotificationService {
  /**
   * Dispatcher universel vers le webhook n8n
   */
  static async send(type, recipient, data) {
    const webhookUrl = process.env.N8N_NOTIF_WEBHOOK;
    if (!webhookUrl) {
      console.warn('[NOTIF] Webhook n8n non configuré, notification annulée.');
      return;
    }

    try {
      await axios.post(webhookUrl, {
        channel: type, // 'EMAIL', 'SMS', 'SLACK'
        to: recipient,
        payload: {
          ...data,
          system: 'GeStockPro-Kernel-v3.1',
          priority: data.priority || 'NORMAL'
        },
        timestamp: new Date()
      });
    } catch (e) {
      console.error('[NOTIF] Erreur lors de l\'appel au webhook n8n:', e.message);
    }
  }

  /**
   * Alerte spécifique pour les stocks critiques
   */
  static async alertStockLow(productName, currentLevel, adminEmail) {
    await this.send('EMAIL', adminEmail, {
      subject: `🚨 ALERTE STOCK : ${productName}`,
      priority: 'HIGH',
      message: `Le produit "${productName}" vient de franchir son seuil d'alerte. Niveau actuel : ${currentLevel} unités. Veuillez prévoir un réapprovisionnement immédiat via le panneau logistique.`
    });
  }
}
