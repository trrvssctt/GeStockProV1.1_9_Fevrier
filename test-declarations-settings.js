import { CompanyDeclarationSettings, Tenant } from './models/index.js';

const testDeclarationSettings = async () => {
  try {
    console.log('🔄 Test d accès aux paramètres de déclaration...');
    
    // Test 1: Vérifier si les modèles sont bien chargés
    console.log('CompanyDeclarationSettings:', CompanyDeclarationSettings ? '✅ OK' : '❌ Failed');
    console.log('Tenant:', Tenant ? '✅ OK' : '❌ Failed');
    
    // Test 2: Essayer de récupérer les paramètres existants
    console.log('\\n🔄 Recherche des paramètres existants...');
    const existingSettings = await CompanyDeclarationSettings.findAll({
      limit: 5
    });
    
    console.log(`Paramètres trouvés: ${existingSettings.length}`);
    if (existingSettings.length > 0) {
      console.log('Premier paramètre:', JSON.stringify(existingSettings[0].dataValues, null, 2));
    }
    
    // Test 3: Essayer de créer des paramètres de test
    const testTenantId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    console.log('\\n🔄 Test de création de paramètres...');
    
    try {
      const newSettings = await CompanyDeclarationSettings.create({
        tenant_id: testTenantId,
        company_name: 'Test Company',
        country: 'Sénégal',
        legal_form: 'SARL',
        tax_regime: 'RSI',
        ipres_employee_rate: 5.6,
        ipres_employer_rate: 8.4,
        css_employee_rate: 3.5,
        css_employer_rate: 7.0,
        cfce_employer_rate: 7.0,
        accident_work_rate: 3.0,
        declaration_day: 15,
        fiscal_year_start: new Date(`${new Date().getFullYear()}-01-01`),
        is_active: true
      });
      
      console.log('✅ Paramètres créés:', newSettings.id);
      
      // Test 4: Recherche avec include Tenant
      console.log('\\n🔄 Test avec include Tenant...');
      const settingsWithTenant = await CompanyDeclarationSettings.findOne({
        where: { id: newSettings.id },
        include: [{
          model: Tenant,
          attributes: ['id', 'name', 'domain']
        }]
      });
      
      console.log('✅ Recherche avec Tenant réussie:', settingsWithTenant ? 'OK' : 'Not found');
      
    } catch (createError) {
      console.error('❌ Erreur lors de la création:', createError.message);
      
      // Si la création échoue à cause d un doublon, essayons de récupérer les paramètres existants
      console.log('🔄 Tentative de récupération des paramètres existants pour ce tenant...');
      const existingSetting = await CompanyDeclarationSettings.findOne({
        where: { tenant_id: testTenantId }
      });
      
      if (existingSetting) {
        console.log('✅ Paramètres existants trouvés:', existingSetting.id);
      }
    }
    
    console.log('\\n✅ Test terminé avec succès');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

testDeclarationSettings();