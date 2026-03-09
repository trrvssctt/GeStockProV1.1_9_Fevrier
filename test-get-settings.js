import { CompanyDeclarationSettings, Tenant } from './models/index.js';

const testGetSettings = async () => {
  try {
    const tenantId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    
    console.log('🔄 Test de récupération des paramètres...');
    
    let settings = await CompanyDeclarationSettings.findOne({
      where: { tenantId },
      include: [{
        model: Tenant,
        attributes: ['id', 'name', 'domain']
      }]
    });
    
    console.log('Settings trouvées:', settings ? 'Oui' : 'Non');
    
    if (!settings) {
      console.log('🔄 Création de nouveaux paramètres...');
      const tenant = await Tenant.findByPk(tenantId);
      console.log('Tenant trouvé:', tenant ? tenant.name : 'Non trouvé');
      
      settings = await CompanyDeclarationSettings.create({
        tenantId,
        companyName: tenant?.name || 'Mon Entreprise',
        country: 'Sénégal',
        legalForm: 'SARL',
        taxRegime: 'RSI',
        ipresEmployeeRate: 5.6,
        ipresEmployerRate: 8.4,
        cssEmployeeRate: 3.5,
        cssEmployerRate: 7.0,
        cfceEmployerRate: 7.0,
        accidentWorkRate: 3.0,
        declarationDay: 15,
        fiscalYearStart: new Date(`${new Date().getFullYear()}-01-01`),
        isActive: true
      });
    }
    
    console.log('✅ Paramètres récupérés/créés:', settings.id);
    console.log('Contenu:', JSON.stringify(settings.dataValues, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

testGetSettings();