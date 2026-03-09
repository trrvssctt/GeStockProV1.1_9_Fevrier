// Test simple sans fichier
import fetch from 'node-fetch';

async function testLeaveWithoutFile() {
    try {
        const leaveData = {
            employeeId: 'fedba5db-2224-4a93-b8d2-1000fb220ad0',
            type: 'PAID',  // Testons avec congés payés d'abord
            startDate: '2026-03-04',
            endDate: '2026-03-05',
            reason: 'Test congé payé sans document'
        };

        console.log('Envoi de la requête JSON...');
        
        const response = await fetch('http://localhost:3000/api/hr/leaves', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImEwZWViYzk5LTljMGItNGVmOC1iYjZkLTZiYjliZDM4MGExMSIsInRlbmFudElkIjoiYjFlZWJjOTktOWMwYi00ZWY4LWJiNmQtNmJiOWJkMzgwYTIyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6IkFETUlOIiwicGVybWlzc2lvbnMiOlsiQURNSU4iLCJBQ0NPVU5UQU5UIiwiU1RPQ0tfTUFOQUdFUiIsIkhSX01BTkFHRVIiXSwiaWF0IjoxNzcyNTQyNzY0LCJleHAiOjE3NzI1NDYzNjR9.ALv15FzmNgUZbUrGatiS__1RrtdpQQoEsyQF3YxFMgY'
            },
            body: JSON.stringify(leaveData)
        });

        console.log('Status:', response.status);
        const result = await response.text();
        console.log('Response:', result);
        
    } catch (error) {
        console.error('Erreur lors du test:', error);
    }
}

testLeaveWithoutFile();