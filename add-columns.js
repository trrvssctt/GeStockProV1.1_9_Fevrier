// Script pour ajouter les colonnes document aux congés
import { sequelize } from './config/database.js';
import { QueryTypes } from 'sequelize';

async function addDocumentColumns() {
    try {
        console.log('Vérification des colonnes existantes...');
        
        // Vérifier si les colonnes existent déjà
        const columns = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'leaves' 
            AND column_name IN ('document_url', 'document_name')
        `, { type: QueryTypes.SELECT });
        
        console.log('Colonnes existantes:', columns);
        
        if (columns.length === 0) {
            console.log('Ajout des colonnes document_url et document_name...');
            
            // Ajouter les colonnes
            await sequelize.query(`
                ALTER TABLE leaves 
                ADD COLUMN IF NOT EXISTS document_url VARCHAR(500),
                ADD COLUMN IF NOT EXISTS document_name VARCHAR(255)
            `);
            
            console.log('✅ Colonnes ajoutées avec succès');
        } else {
            console.log('✅ Les colonnes existent déjà');
        }
        
        // Vérifier la structure finale
        const finalColumns = await sequelize.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'leaves'
            ORDER BY ordinal_position
        `, { type: QueryTypes.SELECT });
        
        console.log('Structure finale de la table leaves:');
        finalColumns.forEach(col => {
            console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
        
        await sequelize.close();
        
    } catch (error) {
        console.error('Erreur lors de l\'ajout des colonnes:', error);
        await sequelize.close();
    }
}

addDocumentColumns();