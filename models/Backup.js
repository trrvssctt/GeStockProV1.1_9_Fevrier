
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Backup extends Model {}

Backup.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.ENUM('AUTOMATIC', 'MANUAL', 'SYSTEM'), defaultValue: 'AUTOMATIC' },
  status: { type: DataTypes.ENUM('SUCCESS', 'FAILED', 'RESTORED'), defaultValue: 'SUCCESS' },
  size: { type: DataTypes.INTEGER }, // Taille en octets
  storagePath: { type: DataTypes.STRING },
  checksum: { type: DataTypes.STRING }, // Hash global pour intégrité du backup
  metadata: { type: DataTypes.JSONB } // Statistiques au moment du backup (nb articles, factures)
}, { 
  sequelize, 
  modelName: 'backup',
  indexes: [{ fields: ['tenantId', 'createdAt'] }]
});
