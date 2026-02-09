
import { Tenant } from '../models/Tenant.js';
import { AuditLog } from '../models/AuditLog.js';
import crypto from 'crypto';

export class TenantController {
  /**
   * Récupère les paramètres complets du Tenant
   */
  static async getSettings(req, res) {
    try {
      const tenant = await Tenant.findByPk(req.user.tenantId);
      if (!tenant) {
        return res.status(404).json({ error: 'TenantNotFound', message: 'Instance introuvable.' });
      }
      return res.status(200).json(tenant);
    } catch (error) {
      return res.status(500).json({ error: 'InternalError', message: error.message });
    }
  }

  /**
   * Met à jour les paramètres de l'entreprise (Branding, Fiscalité, Coordonnées)
   */
  static async updateSettings(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const tenant = await Tenant.findByPk(tenantId);

      if (!tenant) {
        return res.status(404).json({ error: 'NotFound', message: 'Instance introuvable.' });
      }

      // Extraction de TOUS les champs de paramétrage
      const { 
        name, siret, address, phone, email, 
        currency, taxRate, invoicePrefix, 
        invoiceFooter, primaryColor, 
        logoUrl, cachetUrl, onboardingCompleted 
      } = req.body;

      // Mise à jour robuste avec vérification de présence
      await tenant.update({
        name: name ?? tenant.name,
        siret: siret ?? tenant.siret,
        address: address ?? tenant.address,
        phone: phone ?? tenant.phone,
        email: email ?? tenant.email,
        currency: currency ?? tenant.currency,
        taxRate: taxRate !== undefined ? parseFloat(taxRate) : tenant.taxRate,
        invoicePrefix: invoicePrefix ?? tenant.invoicePrefix,
        invoiceFooter: invoiceFooter ?? tenant.invoiceFooter,
        primaryColor: primaryColor ?? tenant.primaryColor,
        logoUrl: logoUrl ?? tenant.logoUrl,
        cachetUrl: cachetUrl ?? tenant.cachetUrl,
        onboardingCompleted: onboardingCompleted ?? tenant.onboardingCompleted
      });

      // Audit de la modification des paramètres critiques
      await AuditLog.create({
        tenantId,
        userId: req.user.id,
        action: 'TENANT_SETTINGS_UPDATED',
        resource: 'Settings',
        severity: 'MEDIUM',
        sha256Signature: crypto.createHash('sha256').update(`${tenantId}:${req.user.id}:settings:${Date.now()}`).digest('hex')
      });

      return res.status(200).json({
        message: 'Paramètres mis à jour avec succès.',
        tenant
      });
    } catch (error) {
      console.error("[KERNEL SETTINGS ERROR]:", error);
      return res.status(500).json({ error: 'UpdateSettingsError', message: error.message });
    }
  }

  /**
   * Upload de logo (Simulation ou intégration cloud)
   */
  static async uploadLogo(req, res) {
    try {
      const { logoData } = req.body;
      const tenant = await Tenant.findByPk(req.user.tenantId);
      
      await tenant.update({ logoUrl: logoData });
      
      return res.status(200).json({ message: 'Logo mis à jour', logoUrl: logoData });
    } catch (error) {
      return res.status(500).json({ error: 'UploadError', message: error.message });
    }
  }
}
