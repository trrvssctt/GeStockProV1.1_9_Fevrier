
import { Tenant } from '../models/Tenant.js';
import { AuditLog } from '../models/AuditLog.js';
import crypto from 'crypto';

// Defaults for tenant theming
const DEFAULT_PRIMARY_COLOR = '#0f172a';
const DEFAULT_BUTTON_COLOR = '#63452c';

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
      // Ensure frontend always receives sensible defaults for colors
      try {
        if (!tenant.primaryColor && !tenant.primary_color) tenant.primaryColor = DEFAULT_PRIMARY_COLOR;
        if (!tenant.buttonColor && !tenant.button_color) tenant.buttonColor = DEFAULT_BUTTON_COLOR;
        // Normalize name: some flows may send companyName/company_name
        if (!tenant.name && (tenant.companyName || tenant.company_name)) {
          tenant.name = tenant.companyName || tenant.company_name;
        }
      } catch (e) {
        // no-op
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
        name, companyName, company_name, siret, address, phone, email, 
        currency, taxRate, invoicePrefix, 
        invoiceFooter, primaryColor, 
        logoUrl, cachetUrl, onboardingCompleted,
        theme, fontFamily, baseFontSize,
        buttonColor, button_color
      } = req.body;

      // Mise à jour robuste avec vérification de présence
      const updatedTenant = await tenant.update({
        // Accept name or companyName/company_name from payload
        name: name ?? companyName ?? company_name ?? tenant.name,
        siret: siret ?? tenant.siret,
        address: address ?? tenant.address,
        phone: phone ?? tenant.phone,
        email: email ?? tenant.email,
        currency: currency ?? tenant.currency,
        taxRate: taxRate !== undefined ? parseFloat(taxRate) : tenant.taxRate,
        invoicePrefix: invoicePrefix ?? tenant.invoicePrefix,
        invoiceFooter: invoiceFooter ?? tenant.invoiceFooter,
        // Apply provided value, else keep existing, else default
        primaryColor: primaryColor ?? tenant.primaryColor ?? tenant.primary_color ?? DEFAULT_PRIMARY_COLOR,
        logoUrl: logoUrl ?? tenant.logoUrl,
        cachetUrl: cachetUrl ?? tenant.cachetUrl,
        onboardingCompleted: onboardingCompleted ?? tenant.onboardingCompleted,
        // UI preferences
        theme: theme ?? tenant.theme,
        fontFamily: fontFamily ?? tenant.fontFamily,
        baseFontSize: baseFontSize !== undefined ? parseInt(baseFontSize, 10) : tenant.baseFontSize,
        // Button color: accept either camelCase or snake_case from frontend
        buttonColor: (buttonColor ?? button_color) ?? tenant.buttonColor ?? tenant.button_color ?? DEFAULT_BUTTON_COLOR
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
        tenant: updatedTenant
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
