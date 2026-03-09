import PayslipGeneratorService from './services/PayslipGeneratorService.js';
import path from 'path';
import fs from 'fs/promises';

// Test data similar to what would come from the database
const testPayslipData = {
    employee: {
        firstName: 'Jean',
        lastName: 'Durand',  
        matricule: 'EMP001',
        address: '123 rue de la Paix, Paris 75001',
        email: 'jean.durand@example.com',
        position: 'Développeur'
    },
    contract: {
        contract_type: 'CDI',
        salary: 3500.00,
        start_date: '2022-01-15'
    },
    department: {
        name: 'Informatique'
    },
    tenant: {
        name: 'Mon Entreprise SARL',
        siret: '12345678901234',
        address: '456 Avenue des Affaires, Paris 75008',
        email: 'contact@monentreprise.fr',
        phone: '01 23 45 67 89'
    },
    payslip: {
        month: 1,
        year: 2025,
        base_salary: 3500.00,
        bonus: 200.00,
        overtime_hours: 5,
        overtime_rate: 25.00,
        deductions: 150.00,
        net_salary: 3700.00,
        employee_contributions: 800.00,
        employer_contributions: 1200.00,
        created_at: new Date()
    }
};

// Test data with special characters in name
const testPayslipDataSpecial = {
    employee: {
        firstName: 'Aminata',
        lastName: "N'DIAYE",  // Test special character handling
        matricule: 'EMP002',
        address: '789 rue de l\'École, Dakar',
        email: 'aminata.ndiaye@example.com',
        position: 'Chef de Projet'
    },
    contract: {
        contract_type: 'CDI',
        salary: 4200.00,
        start_date: '2021-03-10'
    },
    department: {
        name: 'Direction'
    },
    tenant: {
        name: 'Mon Entreprise SARL',
        siret: '12345678901234',
        address: '456 Avenue des Affaires, Paris 75008',
        email: 'contact@monentreprise.fr',
        phone: '01 23 45 67 89'
    },
    payslip: {
        month: 1,
        year: 2025,
        base_salary: 4200.00,
        bonus: 500.00,
        overtime_hours: 0,
        overtime_rate: 0,
        deductions: 250.00,
        net_salary: 4450.00,
        employee_contributions: 950.00,
        employer_contributions: 1400.00,
        created_at: new Date()
    }
};

async function testPayslipGeneration() {
    console.log('🔍 Testing PayslipGeneratorService...\n');
    
    // Test 1: Standard name PDF generation
    console.log('1️⃣ Testing PDF generation with standard name...');
    try {
        const pdfResult = await PayslipGeneratorService.generatePayslipFile(
            testPayslipData.employee,
            testPayslipData.contract,
            testPayslipData.tenant,
            testPayslipData.payslip,
            testPayslipData.payslip.month,
            testPayslipData.payslip.year,
            'pdf'
        );
        console.log('✅ PDF generated successfully:', pdfResult.relativePath);
        
        // Check if file exists and has content
        const stats = await fs.stat(pdfResult.fullPath);
        console.log(`📄 File size: ${stats.size} bytes`);
        
    } catch (error) {
        console.error('❌ PDF generation failed:', error.message);
    }
    
    console.log('\n---\n');
    
    // Test 2: Special character name PNG generation
    console.log('2️⃣ Testing PNG generation with special character name...');
    try {
        const pngResult = await PayslipGeneratorService.generatePayslipFile(
            testPayslipDataSpecial.employee,
            testPayslipDataSpecial.contract,
            testPayslipDataSpecial.tenant,
            testPayslipDataSpecial.payslip,
            testPayslipDataSpecial.payslip.month,
            testPayslipDataSpecial.payslip.year,
            'png'
        );
        console.log('✅ PNG generated successfully:', pngResult.relativePath);
        
        // Check if file exists and has content
        const stats = await fs.stat(pngResult.fullPath);
        console.log(`🖼️  File size: ${stats.size} bytes`);
        
    } catch (error) {
        console.error('❌ PNG generation failed:', error.message);
    }
    
    console.log('\n---\n');
    
    // Test 3: HTML generation (fallback)
    console.log('3️⃣ Testing HTML generation (fallback)...');
    try {
        const htmlResult = await PayslipGeneratorService.generatePayslipFile(
            testPayslipData.employee,
            testPayslipData.contract,
            testPayslipData.tenant,
            testPayslipData.payslip,
            testPayslipData.payslip.month,
            testPayslipData.payslip.year,
            'html'
        );
        console.log('✅ HTML generated successfully:', htmlResult.relativePath);
        
        // Check if file exists and has content
        const stats = await fs.stat(htmlResult.fullPath);
        console.log(`📝 File size: ${stats.size} bytes`);
        
    } catch (error) {
        console.error('❌ HTML generation failed:', error.message);
    }
    
    console.log('\n---\n');
    
    // Test 4: HTML content verification  
    console.log('4️⃣ Testing HTML content structure...');
    try {
        // Use static method directly
        const html = PayslipGeneratorService.generatePayslipHTML(
            testPayslipData.employee,
            testPayslipData.contract,
            testPayslipData.tenant,
            testPayslipData.payslip,
            testPayslipData.payslip.month,
            testPayslipData.payslip.year
        );
        
        // Check if HTML contains expected elements
        const checks = [
            { name: 'Employee name', test: html.includes('Jean Durand') },
            { name: 'Company info', test: html.includes('Mon Entreprise SARL') },
            { name: 'Salary info', test: html.includes('3500.00') },
            { name: 'CSS styles', test: html.includes('font-family') },
            { name: 'Table structure', test: html.includes('<table') }
        ];
        
        checks.forEach(check => {
            console.log(`${check.test ? '✅' : '❌'} ${check.name}`);
        });
        
    } catch (error) {
        console.error('❌ HTML content generation failed:', error.message);
    }
    
    console.log('\n🎯 Test completed! Check the uploads/fiches_paiement folder for generated files.');
}

// Run the test
testPayslipGeneration().catch(console.error);