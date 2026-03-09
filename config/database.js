
import { Sequelize } from 'sequelize';

// Instance ERP Principale (PostgreSQL AlwaysData)
export const sequelize = new Sequelize('gestionapp_stockgestion_13_janv_2026', 'gestionapp', 'Dianka16', {
  host: 'postgresql-gestionapp.alwaysdata.net',
  port: 5432,
  dialect: 'postgres',
  logging: false,  // Désactiver les logs SQL
  define: {
    underscored: true,
    timestamps: true
  },
  retry: {
    match: [
      /ConnectionError/,
      /ConnectionRefusedError/,
      /ConnectionTimedOutError/,
      /TimeoutError/,
      /SequelizeConnectionError/,
      /ETIMEDOUT/,
      /ECONNRESET/,
      /ENOTFOUND/,
      /ENETUNREACH/,
      /ECONNREFUSED/
    ],
    max: 3
  },
  pool: {
    max: 8, // Augmenté pour gérer plus de connexions simultanées
    min: 2, // Maintenir quelques connexions ouvertes
    acquire: 60000, // Augmenté à 60 secondes
    idle: 20000 // Augmenté à 20 secondes avant fermeture
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// Instance Registry IA (MySQL AlwaysData)
export const sequelize_db_template = new Sequelize('gestionapp_saas_gestockpro_bot', '385922', 'Dianka16', {
  host: 'mysql-gestionapp.alwaysdata.net',
  port: 3306,
  dialect: 'mysql',
  logging: false,
  retry: {
    match: [
      /ConnectionError/,
      /ConnectionRefusedError/,
      /ConnectionTimedOutError/,
      /TimeoutError/,
      /SequelizeConnectionError/,
      /ETIMEDOUT/,
      /ECONNRESET/,
      /ENOTFOUND/,
      /ENETUNREACH/,
      /ECONNREFUSED/
    ],
    max: 3
  },
  pool: {
    max: 8, // Augmenté pour gérer plus de connexions simultanées
    min: 2, // Maintenir quelques connexions ouvertes
    acquire: 60000, // Augmenté à 60 secondes
    idle: 20000 // Augmenté à 20 secondes avant fermeture
  }
});

export const connectDB = async () => {
  try {
    // 1. Connexion & Sync ERP (PostgreSQL)
    await sequelize.authenticate();
    console.log('✅ Kernel ERP Connecté (PostgreSQL)');
    
    try {
      // alter: false pour éviter de modifier des colonnes existantes
      await sequelize.sync({ alter: false }); 
      console.log('✅ Schéma ERP Synchronisé');
    } catch (syncErr) {
      console.warn('⚠️ Note sync ERP:', syncErr.message);
    }
    
    // 2. Connexion & Sync Registry IA (MySQL)
    await sequelize_db_template.authenticate();
    console.log('✅ Registry IA Connecté (MySQL)');
    
    try {
      // alter: false est CRITIQUE ici pour éviter l'erreur sur conversation_id
      await sequelize_db_template.sync({ alter: false }); 
      console.log('✅ Schéma IA Synchronisé');
    } catch (syncErr) {
      console.error('❌ Erreur sync IA:', syncErr.message);
    }

  } catch (error) {
    console.error('❌ Erreur critique Kernel Database:', error.message);
  }
};


// 9F/uJ/mreE7=jHcE

// FJrL$C.!y9^17G&S SECK