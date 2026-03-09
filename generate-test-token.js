import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'GESTOCK_KERNEL_SECURE_2024_@PRIV';

// Créer un token de test avec des UUID valides
const testUser = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  tenantId: '5d7b2a24-f0bb-4e18-92f4-d8d513e10b6c', // Tenant existant: Khalifa SALL
  email: 'test@example.com',
  role: 'ADMIN',
  permissions: ['ADMIN','ACCOUNTANT','STOCK_MANAGER','HR_MANAGER']
};

const token = jwt.sign(testUser, SECRET, { expiresIn: '1h' });
console.log('Token de test généré:');
console.log(token);
console.log('\nUtilisez ce token dans les headers:');
console.log(`Authorization: Bearer ${token}`);