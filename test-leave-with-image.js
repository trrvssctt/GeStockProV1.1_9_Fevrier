// Test congé maladie avec une vraie image JPG
import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';

async function testLeaveWithRealImage() {
    try {
        // Créer un petit fichier JPG binaire basique (1x1 pixel rouge)
        const jpegHeader = Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
            0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xFD
        ]);
        
        // Créer le fichier temporaire
        fs.writeFileSync('/tmp/test-medical.jpg', jpegHeader);
        
        const formData = new FormData();
        formData.append('employeeId', 'fedba5db-2224-4a93-b8d2-1000fb220ad0');
        formData.append('type', 'SICK');
        formData.append('startDate', '2026-03-10');
        formData.append('endDate', '2026-03-11');
        formData.append('reason', 'Test congé maladie avec image JPG');
        formData.append('document', fs.createReadStream('/tmp/test-medical.jpg'), {
            filename: 'justificatif-medical.jpg',
            contentType: 'image/jpeg'
        });

        console.log('Envoi congé maladie avec image JPG...');
        
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
        fs.unlinkSync('/tmp/test-medical.jpg');
        
    } catch (error) {
        console.error('Erreur lors du test:', error);
    }
}

testLeaveWithRealImage();