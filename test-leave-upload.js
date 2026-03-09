// Test script pour l'upload de congé maladie
import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';

async function testLeaveWithDocument() {
    try {
        // D'abord, créer un fichier test
        const testFileContent = Buffer.from('Test medical document content');
        fs.writeFileSync('/tmp/test-medical.pdf', testFileContent);
        
        const formData = new FormData();
        formData.append('employeeId', 'fedba5db-2224-4a93-b8d2-1000fb220ad0'); // ID de l'employé créé
        formData.append('type', 'SICK');
        formData.append('startDate', '2026-03-06');  // Dates différentes pour éviter conflit
        formData.append('endDate', '2026-03-07');
        formData.append('reason', 'Test congé maladie avec document');
        formData.append('document', fs.createReadStream('/tmp/test-medical.pdf'), {
            filename: 'justificatif-medical.pdf',
            contentType: 'application/pdf'
        });

        console.log('Envoi de la requête...');
        
        const response = await fetch('http://localhost:3000/api/hr/leaves', {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImEwZWViYzk5LTljMGItNGVmOC1iYjZkLTZiYjliZDM4MGExMSIsInRlbmFudElkIjoiYjFlZWJjOTktOWMwYi00ZWY4LWJiNmQtNmJiOWJkMzgwYTIyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6IkFETUlOIiwicGVybWlzc2lvbnMiOlsiQURNSU4iLCJBQ0NPVU5UQU5UIiwiU1RPQ0tfTUFOQUdFUiIsIkhSX01BTkFHRVIiXSwiaWF0IjoxNzcyNTcyMjY5LCJleHAiOjE3NzI1NzU4Njl9.uRBH1V-hJlFjsYiECyh9Lnr59PfwH7w8m0oimWSSXHc'
            }
        });

        console.log('Status:', response.status);
        const result = await response.text();
        console.log('Response:', result);
        
        // Nettoyer le fichier test
        fs.unlinkSync('/tmp/test-medical.pdf');
        
    } catch (error) {
        console.error('Erreur lors du test:', error);
    }
}

testLeaveWithDocument();