// Créer un employé de test
import fetch from 'node-fetch';

async function createTestEmployee() {
    try {
        const employeeData = {
            firstName: 'Test',
            lastName: 'Employee',
            email: 'test.employee@gestockpro.com',
            phone: '+33123456789',
            address: '123 Test Street',
            departmentId: null, // On peut laisser null pour ce test
            position: 'Employé Test',
            salary: 2500,
            hireDate: '2024-01-01',
            contractType: 'CDI',
            status: 'ACTIVE'
        };

        const response = await fetch('http://localhost:3000/api/hr/employees', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImEwZWViYzk5LTljMGItNGVmOC1iYjZkLTZiYjliZDM4MGExMSIsInRlbmFudElkIjoiYjFlZWJjOTktOWMwYi00ZWY4LWJiNmQtNmJiOWJkMzgwYTIyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6IkFETUlOIiwicGVybWlzc2lvbnMiOlsiQURNSU4iLCJBQ0NPVU5UQU5UIiwiU1RPQ0tfTUFOQUdFUiIsIkhSX01BTkFHRVIiXSwiaWF0IjoxNzcyNTQyNzY0LCJleHAiOjE3NzI1NDYzNjR9.ALv15FzmNgUZbUrGatiS__1RrtdpQQoEsyQF3YxFMgY'
            },
            body: JSON.stringify(employeeData)
        });

        const result = await response.json();
        
        console.log('Status:', response.status);
        console.log('Employee créé:', result);
        
        return result;
        
    } catch (error) {
        console.error('Erreur lors de création d\'employé:', error);
    }
}

createTestEmployee();