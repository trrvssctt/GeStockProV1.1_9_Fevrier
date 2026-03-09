// Test congé maladie sans document
import fetch from 'node-fetch';

async function testLeaveWithoutDocument() {
    try {
        const leaveData = {
            employeeId: 'fedba5db-2224-4a93-b8d2-1000fb220ad0',
            type: 'SICK',  // Congé maladie sans document
            startDate: '2026-03-08',
            endDate: '2026-03-09',
            reason: 'Test congé maladie sans document (moins de 3 jours)'
        };

        console.log('Envoi congé maladie sans document...');
        
        const response = await fetch('http://localhost:3000/api/hr/leaves', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImEwZWViYzk5LTljMGItNGVmOC1iYjZkLTZiYjliZDM4MGExMSIsInRlbmFudElkIjoiYjFlZWJjOTktOWMwYi00ZWY4LWJiNmQtNmJiOWJkMzgwYTIyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6IkFETUlOIiwicGVybWlzc2lvbnMiOlsiQURNSU4iLCJBQ0NPVU5UQU5UIiwiU1RPQ0tfTUFOQUdFUiIsIkhSX01BTkFHRVIiXSwiaWF0IjoxNzcyNTcyMjY5LCJleHAiOjE3NzI1NzU4Njl9.uRBH1V-hJlFjsYiECyh9Lnr59PfwH7w8m0oimWSSXHc'
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

testLeaveWithoutDocument();