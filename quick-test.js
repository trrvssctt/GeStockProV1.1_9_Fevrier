// Test simple pour diagnostiquer l'erreur PUT
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

// Configuration de test
const API_BASE = 'http://localhost:3000/api';
const TEST_LEAVE_ID = 'd2a91fed-7e90-44a6-b881-b08f54b6342a'; // ID de test
const JWT_SECRET = 'GESTOCK_KERNEL_SECURE_2024_@PRIV';

// Générer un token de test simple
function generateTestToken() {
    return jwt.sign(
        {
            id: 'fedba5db-2224-4a93-b8d2-1000fb220ad0', // UUID valide d'employé de test
            username: 'test.employee', 
            tenantId: 'fedba5db-2224-4a93-b8d2-1000fb220ad0', // UUID valide pour tenant aussi
            role: 'EMPLOYEE'
        },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
}

async function testPutRequest() {
    console.log('🧪 Test de la requête PUT avec token...\n');
    
    const token = generateTestToken();
    console.log('🔑 Token généré:', token.substring(0, 50) + '...');
    
    try {
        // Test 1: Requête PUT simple sans FormData
        console.log('📤 Test 1: PUT avec JSON simple...');
        const response1 = await fetch(`${API_BASE}/hr/leaves/${TEST_LEAVE_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                reason: 'Test de modification simple - ' + new Date().toISOString()
            })
        });
        
        console.log('📥 Status JSON:', response1.status);
        const text1 = await response1.text();
        console.log('📥 Réponse JSON:', text1.substring(0, 500));
        
        // Test 2: Requête PUT avec FormData mais sans fichier
        console.log('\n📤 Test 2: PUT avec FormData sans fichier...');
        const formData = new FormData();
        formData.append('reason', 'Test FormData sans fichier - ' + new Date().toISOString());
        
        const response2 = await fetch(`${API_BASE}/hr/leaves/${TEST_LEAVE_ID}`, {
            method: 'PUT',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
                // Ne pas mettre Content-Type pour FormData
            },
            body: formData
        });
        
        console.log('📥 Status FormData:', response2.status);
        const text2 = await response2.text();
        console.log('📥 Réponse FormData:', text2.substring(0, 500));
        
    } catch (error) {
        console.error('❌ Erreur durant les tests:', error.message);
    }
}

async function checkServer() {
    console.log('🔍 Vérification du serveur...\n');
    
    const token = generateTestToken();
    
    try {
        const response = await fetch(`${API_BASE}/hr/leaves?perPage=1`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        console.log('📡 Status serveur:', response.status);
        if (response.ok) {
            console.log('✅ Serveur accessible\n');
            return true;
        } else {
            const errorText = await response.text();
            console.log('❌ Serveur non accessible:', errorText.substring(0, 200), '\n');
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur connexion serveur:', error.message, '\n');
        return false;
    }
}

// Exécuter les tests
async function runDiagnostic() {
    console.log('🚀 Diagnostic de l\'erreur PUT /hr/leaves/ID\n');
    
    const serverOk = await checkServer();
    if (serverOk) {
        await testPutRequest();
    }
    
    console.log('\n📋 Instructions pour la suite:');
    console.log('1. Vérifiez les logs dans le terminal du serveur backend');
    console.log('2. Les logs détaillés sont activés dans LeaveController.update()');
    console.log('3. L\'erreur exacte devrait apparaître dans ces logs');
    console.log('\n✅ Diagnostic terminé');
}

runDiagnostic();