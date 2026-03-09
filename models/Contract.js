import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Contract extends Model {}

Contract.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  employeeId: { type: DataTypes.UUID, allowNull: false, field: 'employee_id' },
  type: { 
    type: DataTypes.ENUM('CDI', 'CDD', 'STAGE', 'FREELANCE'), 
    field: 'contract_type' 
  },
  startDate: { type: DataTypes.DATE, field: 'start_date' },
  endDate: { type: DataTypes.DATE, field: 'end_date' },
  salary: { type: DataTypes.DECIMAL },
  workingHours: { type: DataTypes.INTEGER, defaultValue: 40, field: 'working_hours' },
  currency: { type: DataTypes.STRING, defaultValue: 'F CFA' },
  status: { 
    type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'TERMINATED', 'SUSPENDED'), 
    defaultValue: 'ACTIVE' 
  },
  terminationDate: { type: DataTypes.DATE, field: 'termination_date' },
  terminationReason: { type: DataTypes.TEXT, field: 'termination_reason' },
  suspensionDate: { type: DataTypes.DATE, field: 'suspension_date' },
  suspensionReason: { type: DataTypes.TEXT, field: 'suspension_reason' },
  trialPeriodEnd: { type: DataTypes.DATE, field: 'trial_period_end' },
  documentUrl: { type: DataTypes.TEXT, field: 'document_url' },
  signedDate: { type: DataTypes.DATE, field: 'signed_date' },
  // Backward compatibility
  contractType: { type: DataTypes.STRING, field: 'contract_type' },
  meta: { type: DataTypes.JSONB, allowNull: true }
}, {
  sequelize,
  modelName: 'contract',
  tableName: 'contracts',
  underscored: true
});

export default Contract;
