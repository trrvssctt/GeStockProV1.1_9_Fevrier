import { sequelize } from './config/database.js';
import fs from 'fs';
import path from 'path';

const applyMigrations = async () => {
  try {
    console.log('🔄 Application des migrations...');

    // Migration 1: Mise à jour des paramètres de paie
    console.log('📋 Application de la migration payroll_settings...');
    const migration1 = fs.readFileSync(
      path.join(process.cwd(), 'migrations/20260303-update-payroll-settings-social-charges.sql'), 
      'utf8'
    );
    await sequelize.query(migration1);
    console.log('✅ Migration payroll_settings appliquée');

    // Migration 2: Création de la table payroll_items
    console.log('📋 Application de la migration payroll_items...');
    const migration2 = fs.readFileSync(
      path.join(process.cwd(), 'migrations/20260303-create-payroll-items-table.sql'), 
      'utf8'
    );
    await sequelize.query(migration2);
    console.log('✅ Migration payroll_items appliquée');

    console.log('🎉 Toutes les migrations ont été appliquées avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de l\'application des migrations:', error);
  } finally {
    await sequelize.close();
  }
};

applyMigrations();