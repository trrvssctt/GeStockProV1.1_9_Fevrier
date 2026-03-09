import { Tenant } from './models/index.js';

const listTenants = async () => {
  try {
    console.log('🔄 Liste des tenants disponibles...');
    
    const tenants = await Tenant.findAll({
      attributes: ['id', 'name', 'domain'],
      limit: 10
    });
    
    console.log(`Tenants trouvés: ${tenants.length}`);
    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ID: ${tenant.id} | Nom: ${tenant.name} | Domain: ${tenant.domain}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
};

listTenants();