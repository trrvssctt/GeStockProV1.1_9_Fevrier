import { sequelize } from './config/database.js';

const quickCheck = async () => {
  try {
    console.log('🔍 Vérification de l\'état de la base de données...');

    // Vérifier la table payroll_settings
    try {
      const [payrollSettingsExists] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='payroll_settings' AND table_schema='public'
      `);
      console.log('📊 Colonnes payroll_settings:', payrollSettingsExists.map(r => r.column_name));
    } catch (error) {
      console.log('❌ Table payroll_settings non trouvée');
    }

    // Vérifier la table payroll_items
    try {
      const [payrollItemsExists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'payroll_items'
        );
      `);
      console.log('📊 Table payroll_items existe:', payrollItemsExists[0].exists);
    } catch (error) {
      console.log('❌ Erreur vérification payroll_items:', error.message);
    }

    // Si payroll_items n'existe pas, la créer seulement
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS payroll_items (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL,
            name varchar(255) NOT NULL,
            code varchar(50) NOT NULL,
            type varchar(20) NOT NULL CHECK (type IN ('EARNING', 'DEDUCTION')),
            category varchar(30) NOT NULL CHECK (category IN (
                'BASE_SALARY', 'ALLOWANCE', 'BONUS', 'OVERTIME', 
                'SOCIAL_CHARGE', 'TAX', 'ADVANCE', 'OTHER'
            )),
            calculation_type varchar(20) NOT NULL DEFAULT 'FIXED' CHECK (calculation_type IN ('FIXED', 'PERCENTAGE', 'FORMULA')),
            default_value decimal(15,2) DEFAULT 0,
            percentage decimal(5,2) DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
            formula text,
            is_active boolean DEFAULT true,
            is_system_item boolean DEFAULT false,
            description text,
            sort_order integer DEFAULT 0,
            created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Table payroll_items créée ou existe déjà');

      // Créer les index
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_payroll_items_tenant ON payroll_items(tenant_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_items_tenant_code ON payroll_items(tenant_id, code);
      `);
      console.log('✅ Index payroll_items créés');

    } catch (error) {
      console.log('⚠️  Erreur payroll_items (probablement existe déjà):', error.message);
    }

    // Ajouter les colonnes manquantes à payroll_settings
    try {
      await sequelize.query(`
        ALTER TABLE payroll_settings 
        ADD COLUMN IF NOT EXISTS employer_social_charge_rate DECIMAL(5,2) DEFAULT 18.5;
      `);
      console.log('✅ Colonne employer_social_charge_rate ajoutée');
    } catch (error) {
      console.log('⚠️  employer_social_charge_rate existe déjà');
    }

    try {
      await sequelize.query(`
        ALTER TABLE payroll_settings 
        ADD COLUMN IF NOT EXISTS employee_social_charge_rate DECIMAL(5,2) DEFAULT 8.2;
      `);
      console.log('✅ Colonne employee_social_charge_rate ajoutée');
    } catch (error) {
      console.log('⚠️  employee_social_charge_rate existe déjà');
    }

    console.log('🎉 Vérification et migration terminées !');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await sequelize.close();
  }
};

quickCheck();