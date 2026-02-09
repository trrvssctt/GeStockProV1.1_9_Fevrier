
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User } from '../models/User.js';

// Utilisation d'une clé unique partagée par tout le Kernel AlwaysData
const JWT_SECRET = process.env.JWT_SECRET || 'GESTOCK_KERNEL_SECURE_2024_@PRIV';

export class AuthService {
  /**
   * Valide les identifiants email/password via bcrypt
   */
  static async validateCredentials(email, password) {
    const user = await User.findOne({ where: { email } });
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    return user;
  }

  /**
   * Génère un token JWT contenant le payload d'isolation (tenantId)
   * Inclut impérativement le tableau 'roles' pour le middleware RBAC.
   */
  static generateToken(user) {
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role || 'EMPLOYEE'];
    
    return jwt.sign(
      { 
        id: user.id, 
        tenantId: user.tenantId, 
        roles: userRoles, 
        role: userRoles[0], // Compatibilité descendante
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  /**
   * Décodage et vérification du token
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return null;
    }
  }
}
