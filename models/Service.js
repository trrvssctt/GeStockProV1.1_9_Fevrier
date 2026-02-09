
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Service extends Model {}

Service.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  imageUrl: { type: DataTypes.TEXT, field: 'image_url' },
  price: { type: DataTypes.NUMERIC(15, 2), allowNull: false, defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  status: { 
    type: DataTypes.STRING(20), 
    defaultValue: 'actif',
    allowNull: false 
  },
  deletedAt: { 
    type: DataTypes.DATE, 
    field: 'deleted_at' 
  }
}, { 
  sequelize, 
  modelName: 'service',
  tableName: 'services',
  underscored: true,
  timestamps: true
});

export default Service;