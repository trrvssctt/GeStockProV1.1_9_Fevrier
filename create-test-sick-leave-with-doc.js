// Test pour créer un congé maladie simulé avec document pour tester l'affichage
import { sequelize } from './config/database.js';

async function createTestSickLeaveWithDocument() {
    try {
        // Simuler la création d'un congé maladie avec document
        const testLeave = {
            id: '550e8400-e29b-41d4-a716-446655440000',
            tenantId: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
            employeeId: 'fedba5db-2224-4a93-b8d2-1000fb220ad0',
            type: 'SICK',
            startDate: '2026-03-12',
            endDate: '2026-03-15', 
            daysCount: 4,
            status: 'PENDING',
            reason: 'Grippe saisonnière avec fièvre',
            documentUrl: 'https://res.cloudinary.com/test/image/upload/v1234567890/leave_documents/certificat_medical.pdf',
            documentName: 'certificat_medical_03-2026.pdf',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await sequelize.query(`
            INSERT INTO leaves (
                id, tenant_id, employee_id, type, start_date, end_date, days_count, 
                status, reason, document_url, document_name, created_at, updated_at
            ) VALUES (
                :id, :tenantId, :employeeId, :type, :startDate, :endDate, :daysCount,
                :status, :reason, :documentUrl, :documentName, :createdAt, :updatedAt
            )
        `, {
            replacements: testLeave,
            type: sequelize.QueryTypes.INSERT
        });

        console.log('✅ Congé maladie test avec document créé avec succès');
        console.log('ID:', testLeave.id);
        console.log('Document URL:', testLeave.documentUrl);
        
        await sequelize.close();
        
    } catch (error) {
        console.error('Erreur lors de la création du congé test:', error);
        await sequelize.close();
    }
}

createTestSickLeaveWithDocument();