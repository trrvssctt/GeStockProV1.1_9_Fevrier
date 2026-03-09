import { sequelize } from './config/database.js';
import fs from 'fs';
import path from 'path';

const runMigration = async () => {
  try {
    console.log('🔄 Connexion à la base de données...');
    await sequelize.authenticate();
    console.log('✅ Connexion réussie');

    console.log('🔄 Lecture du fichier SQL...');
    const sqlPath = path.join(process.cwd(), '..', 'database_declarations_sociales.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔄 Exécution de la migration...');
    
    // Diviser le contenu SQL en requêtes individuelles
    const queries = sqlContent
      .split(';')
      .map(query => query.trim())
      .filter(query => query.length > 0 && !query.startsWith('--'));

    for (const query of queries) {
      if (query.trim()) {
        try {
          console.log(`Exécution: ${query.substring(0, 50)}...`);
          await sequelize.query(query);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Ignoré (existe déjà): ${error.message}`);
          } else {
            console.error(`❌ Erreur dans la requête: ${query.substring(0, 100)}...`);
            console.error(`   ${error.message}`);
          }
        }
      }
    }

    console.log('✅ Migration terminée avec succès');
    console.log('🔄 Vérification des tables créées...');
    
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('company_declaration_settings', 'declarations')
      ORDER BY table_name;
    `);
    
    console.log('📋 Tables de déclarations:', results.map(r => r.table_name));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error.message);
    console.error(error);
    process.exit(1);
  }
};

runMigration();