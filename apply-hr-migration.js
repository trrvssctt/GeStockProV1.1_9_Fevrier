import { sequelize } from './config/database.js';
import fs from 'fs';
import path from 'path';

async function applyMigration() {
  try {
    // Lire le fichier de migration simplifié
    const migrationPath = path.join(process.cwd(), 'migrations', 'hr-simple.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Exécuter la migration
    await sequelize.query(migrationSQL);
    console.log('✅ Migration HR appliquée avec succès');

    // Fermer la connexion
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la migration:', error);
    process.exit(1);
  }
}

applyMigration();