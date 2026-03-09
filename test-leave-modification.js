// Test simple et propre pour l'upload
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const API_BASE = 'http://localhost:3000/api';
const JWT_SECRET = 'GESTOCK_KERNEL_SECURE_2024_@PRIV';

function generateTestToken() {
    return jwt.sign(
        {
            id: 'fedba5db-2224-4a93-b8d2-1000fb220ad0',
            username: 'test.employee', 
            tenantId: 'fedba5db-2224-4a93-b8d2-1000fb220ad0',
            role: 'EMPLOYEE'
        },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
}

async function createTestLeave() {
    console.log('🏗️ Création d\'un congé de test...\n');
    
    const token = generateTestToken();
    
    try {
        const createData = {
            employeeId: 'fedba5db-2224-4a93-b8d2-1000fb220ad0',
            type: 'SICK',
            startDate: '2026-03-10',
            endDate: '2026-03-11',
            reason: 'Congé de test pour diagnostic upload'
        };
        
        console.log('📤 Création du congé...');
        
        const createResponse = await fetch(`${API_BASE}/hr/leaves`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(createData)
        });
        
        const createResult = await createResponse.text();
        console.log('📥 Status création:', createResponse.status);
        
        if (createResponse.ok) {
            const leave = JSON.parse(createResult);
            console.log('✅ Congé créé avec ID:', leave.id);
            return leave.id;
        } else {
            console.log('❌ Échec création:', createResult);
            return null;
        }
        
    } catch (error) {
        console.error('❌ Erreur création:', error.message);
        return null;
    }
}

async function testModification(leaveId) {
    console.log(`\\n🧪 Test modification du congé ${leaveId}...`);
    
    const token = generateTestToken();
    
    try {
        // Test 1: Modification avec JSON
        console.log('\\n📤 Test 1: Modification JSON...');
        const response1 = await fetch(`${API_BASE}/hr/leaves/${leaveId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                reason: 'Motif modifié via test JSON - ' + new Date().toLocaleTimeString()
            })
        });
        
        console.log('📥 Status JSON:', response1.status);
        const result1 = await response1.text();
        console.log('📥 Résultat JSON:', response1.ok ? '✅ Succès' : '❌ ' + result1.substring(0, 200));
        
        // Test 2: Modification avec FormData (sans fichier)
        console.log('\\n📤 Test 2: Modification FormData sans fichier...');
        const formData = new FormData();
        formData.append('reason', 'Motif modifié via FormData - ' + new Date().toLocaleTimeString());
        
        const response2 = await fetch(`${API_BASE}/hr/leaves/${leaveId}`, {
            method: 'PUT',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        console.log('📥 Status FormData:', response2.status);
        const result2 = await response2.text();
        console.log('📥 Résultat FormData:', response2.ok ? '✅ Succès' : '❌ ' + result2.substring(0, 200));
        
    } catch (error) {
        console.error('❌ Erreur test modification:', error.message);
    }
}

async function runCompleteTest() {
    console.log('🚀 Test complet de l\'API Leave Update\\n');
    
    // 1. Créer un congé de test
    const leaveId = await createTestLeave();
    
    if (leaveId) {
        // 2. Tester la modification
        await testModification(leaveId);
    }
    
    console.log('\\n✅ Tests terminés');
}

runCompleteTest();