import fetch from 'node-fetch';

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImEwZWViYzk5LTljMGItNGVmOC1iYjZkLTZiYjliZDM4MGExMSIsInRlbmFudElkIjoiYjFlZWJjOTktOWMwYi00ZWY4LWJiNmQtNmJiOWJkMzgwYTIyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6IkFETUlOIiwicGVybWlzc2lvbnMiOlsiQURNSU4iLCJBQ0NPVU5UQU5UIiwiU1RPQ0tfTUFOQUdFUiIsIkhSX01BTkFHRVIiXSwiaWF0IjoxNzcyNTQxOTk0LCJleHAiOjE3NzI1NDU1OTR9.fOQgHJhkHhUO6sYdrS3dMNHCWfjiRC5gqBg7TTIcZ-o';

const AUTH_HEADERS = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`
};

async function testLeaveAPI(employeeId) {
    console.log('🧪 Test de l\'API Leave Creation...');
    
    if (!employeeId) {
        console.log('❌ Aucun employé trouvé pour le test');
        return;
    }
    
    // Test data pour créer un congé
    const testData = {
        employeeId: employeeId, // Utiliser l'ID UUID récupéré
        type: 'ANNUAL',
        startDate: '2024-12-31',
        endDate: '2025-01-02',
        reason: 'Test de création de congé'
    };
    
    try {
        const response = await fetch('http://localhost:3000/api/hr/leaves', {
            method: 'POST',
            headers: AUTH_HEADERS,
            body: JSON.stringify(testData)
        });
        
        console.log('Response Status:', response.status);
        console.log('Response Headers:', response.headers.raw());
        
        const responseText = await response.text();
        console.log('Response Body:', responseText);
        
        if (response.ok) {
            const result = JSON.parse(responseText);
            console.log('✅ Succès! Leave créé:', result);
        } else {
            console.log('❌ Erreur:', response.statusText);
            console.log('Error body:', responseText);
        }
        
    } catch (error) {
        console.error('❌ Erreur de connexion:', error.message);
    }
}

// Test de vérification des employés d'abord
async function testEmployeesAPI() {
    try {
        console.log('🔍 Test de récupération des employés...');
        const response = await fetch('http://localhost:3000/api/hr/employees', {
            headers: AUTH_HEADERS
        });
        
        if (response.ok) {
            const employees = await response.json();
            console.log('✅ Employés trouvés:', employees?.length || 0);
            if (employees && employees.length > 0) {
                console.log('Premier employé:', employees[0]);
                return employees[0].id; // Retourner l'ID du premier employé
            }
        } else {
            console.log('❌ Erreur employees:', response.statusText);
        }
    } catch (error) {
        console.error('❌ Erreur employees:', error.message);
    }
    return null;
}

async function runTests() {
    const employeeId = await testEmployeesAPI();
    console.log('\n' + '='.repeat(50) + '\n');
    await testLeaveAPI(employeeId);
}

runTests();