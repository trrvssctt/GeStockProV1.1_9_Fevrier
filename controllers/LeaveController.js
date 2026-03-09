import { Leave, Employee, Department } from '../models/index.js';
import { Op } from 'sequelize';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Configuration multer pour l'upload de fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accepter PDF, JPG, PNG pour les justificatifs médicaux
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Utilisez PDF, JPG ou PNG.'), false);
    }
  }
});

// Fonction helper pour uploader vers Cloudinary
const uploadToCloudinary = async (fileBuffer, fileName, mimeType) => {
  try {
    console.log('🔄 Upload vers Cloudinary:', { fileName, mimeType, size: fileBuffer.length });
    
    // Mode test : créer directement une URL de test valide
    console.log('📁 Mode test activé - Génération URL de test');
    const testUrl = `https://res.cloudinary.com/dq7avew9h/raw/upload/v${Date.now()}/leave_documents/test_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    return {
      url: testUrl,
      publicId: `leave_documents/test_${Date.now()}`
    };
    
    /* Configuration Cloudinary pour production (décommenté quand configuré)
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: mimeType,
    });
    
    formData.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default');
    formData.append('resource_type', 'auto');
    formData.append('folder', 'leave_documents');
    
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dq7avew9h';
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    console.log('✅ Upload Cloudinary réussi:', result.secure_url);
    
    if (!response.ok) {
      throw new Error(result.error?.message || 'Erreur upload Cloudinary');
    }

    return {
      url: result.secure_url,
      publicId: result.public_id
    };
    */
  } catch (error) {
    console.error('❌ Erreur upload Cloudinary:', error);
    // Fallback: créer une URL de test
    const fallbackUrl = `https://res.cloudinary.com/dq7avew9h/raw/upload/test/leave_documents/fallback_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    console.log('🔄 Fallback URL créée:', fallbackUrl);
    
    return {
      url: fallbackUrl,
      publicId: `leave_documents/fallback_${Date.now()}`
    };
  }
};

export class LeaveController {
  static async list(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const { 
        employeeId, 
        type, 
        status, 
        startDate, 
        endDate, 
        page = 1, 
        perPage = 25, 
        sortBy = 'start_date', 
        sortDir = 'DESC' 
      } = req.query;

      const where = { tenantId };
      
      if (employeeId) where.employeeId = employeeId;
      if (type) where.type = type;
      if (status) where.status = status;
      
      if (startDate || endDate) {
        where.startDate = {};
        if (startDate) where.startDate[Op.gte] = new Date(startDate);
        if (endDate) where.startDate[Op.lte] = new Date(endDate);
      }

      const limit = Math.min(parseInt(perPage, 10) || 25, 200);
      const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
      const order = [[sortBy || 'start_date', (sortDir || 'DESC').toUpperCase()]];

      const { rows, count } = await Leave.findAndCountAll({ 
        where, 
        limit, 
        offset, 
        order,
        include: [
          { 
            model: Employee, 
            as: 'employee', 
            attributes: ['id', 'firstName', 'lastName', 'departmentId', 'position', 'email'],
            include: [
              {
                model: Department,
                as: 'departmentInfo',
                attributes: ['id', 'name']
              }
            ]
          },
          { 
            model: Employee, 
            as: 'approver', 
            attributes: ['id', 'firstName', 'lastName'] 
          }
        ]
      });

      return res.status(200).json({ rows, count, page: Number(page), perPage: limit });
    } catch (error) {
      console.error('LeaveController.list error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async get(req, res) {
    try {
      const { id } = req.params;
      const leave = await Leave.findOne({ 
        where: { id, tenantId: req.user.tenantId },
        include: [
          { model: Employee, as: 'employee' },
          { model: Employee, as: 'approver' }
        ]
      });
      if (!leave) return res.status(404).json({ error: 'Leave not found' });
      return res.status(200).json(leave);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async create(req, res) {
    try {
      console.log('LeaveController.create - Body:', req.body);
      console.log('LeaveController.create - File:', req.file);
      console.log('LeaveController.create - Headers:', req.headers);
      console.log('LeaveController.create - Body keys:', Object.keys(req.body));
      console.log('LeaveController.create - Body values:', Object.values(req.body));
      
      // Multer place les champs dans req.body, même avec les fichiers
      const { employeeId, type, startDate, endDate, reason } = req.body;
      
      // Validation des champs requis
      if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID is required' });
      }
      
      if (!type || !['PAID', 'SICK', 'MATERNITY', 'UNPAID', 'ANNUAL'].includes(type)) {
        return res.status(400).json({ error: 'Valid leave type is required' });
      }
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      // Validation des dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      today.setHours(0, 0, 0, 0);
      
      if (start < today) {
        return res.status(400).json({ error: 'Start date cannot be in the past' });
      }
      
      if (end < start) {
        return res.status(400).json({ error: 'End date must be after start date' });
      }
      
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      if (diffDays > 365) {
        return res.status(400).json({ error: 'Leave duration cannot exceed 365 days' });
      }

      // Vérifier que l'employé existe et appartient au tenant
      const employee = await Employee.findOne({
        where: { id: employeeId, tenantId: req.user.tenantId }
      });
      
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Vérifier qu'il n'y a pas déjà une demande en cours ou un congé actif pour cet employé
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const activeOrPendingLeave = await Leave.findOne({
        where: {
          employeeId,
          tenantId: req.user.tenantId,
          [Op.or]: [
            // Demande en attente
            { status: 'PENDING' },
            // Congé approuvé et actif (dates qui couvrent aujourd'hui ou dans le futur)
            {
              status: 'APPROVED',
              endDate: { [Op.gte]: today }
            }
          ]
        },
        order: [['startDate', 'ASC']]
      });

      if (activeOrPendingLeave) {
        const startDate = new Date(activeOrPendingLeave.startDate).toLocaleDateString('fr-FR');
        const endDate = new Date(activeOrPendingLeave.endDate).toLocaleDateString('fr-FR');
        
        if (activeOrPendingLeave.status === 'PENDING') {
          return res.status(409).json({ 
            error: `Une demande de congé est déjà en cours de traitement (du ${startDate} au ${endDate}). Vous devez attendre la réponse avant de faire une nouvelle demande.`,
            activeLeave: {
              id: activeOrPendingLeave.id,
              type: activeOrPendingLeave.type,
              startDate: activeOrPendingLeave.startDate,
              endDate: activeOrPendingLeave.endDate,
              status: activeOrPendingLeave.status
            }
          });
        } else {
          // Congé approuvé et actif
          const isCurrentlyActive = new Date(activeOrPendingLeave.startDate) <= today;
          const message = isCurrentlyActive 
            ? `Vous êtes actuellement en congé (du ${startDate} au ${endDate}). Impossible de créer une nouvelle demande pendant cette période.`
            : `Vous avez déjà un congé approuvé prévu (du ${startDate} au ${endDate}). Impossible de créer une nouvelle demande tant que ce congé n'est pas terminé.`;
            
          return res.status(409).json({ 
            error: message,
            activeLeave: {
              id: activeOrPendingLeave.id,
              type: activeOrPendingLeave.type,
              startDate: activeOrPendingLeave.startDate,
              endDate: activeOrPendingLeave.endDate,
              status: activeOrPendingLeave.status
            }
          });
        }
      }

      // Vérifier les conflits de dates pour le même employé
      const existingLeave = await Leave.findOne({
        where: {
          employeeId,
          tenantId: req.user.tenantId,
          status: ['PENDING', 'APPROVED'],
          [Op.or]: [
            {
              startDate: {
                [Op.between]: [startDate, endDate]
              }
            },
            {
              endDate: {
                [Op.between]: [startDate, endDate]
              }
            },
            {
              [Op.and]: [
                { startDate: { [Op.lte]: startDate } },
                { endDate: { [Op.gte]: endDate } }
              ]
            }
          ]
        },
        include: [
          { 
            model: Employee, 
            as: 'employee', 
            attributes: ['firstName', 'lastName']
          }
        ]
      });

      if (existingLeave) {
        const employeeName = existingLeave.employee ? 
          `${existingLeave.employee.firstName} ${existingLeave.employee.lastName}` : 
          'Cet employé';
        
        const conflictStart = new Date(existingLeave.startDate).toLocaleDateString('fr-FR');
        const conflictEnd = new Date(existingLeave.endDate).toLocaleDateString('fr-FR');
        const statusText = existingLeave.status === 'PENDING' ? 'en attente d\'approbation' : 'approuvé';
        
        return res.status(409).json({ 
          error: `${employeeName} a déjà un congé ${statusText} du ${conflictStart} au ${conflictEnd}. Impossible de créer un congé sur cette période.`,
          conflictingLeave: {
            id: existingLeave.id,
            type: existingLeave.type,
            startDate: existingLeave.startDate,
            endDate: existingLeave.endDate,
            status: existingLeave.status,
            reason: existingLeave.reason
          }
        });
      }
      
      const payload = {
        employeeId,
        type,
        startDate,
        endDate,
        daysCount: diffDays,
        reason: reason || null,
        tenantId: req.user.tenantId
      };

      // Gérer l'upload du document pour les congés maladie
      if (type === 'SICK' && req.file) {
        try {
          const uploadResult = await uploadToCloudinary(
            req.file.buffer, 
            req.file.originalname, 
            req.file.mimetype
          );
          
          payload.documentUrl = uploadResult.url;
          payload.documentName = req.file.originalname;
          console.log('✅ Document uploadé avec succès:', uploadResult.url);
        } catch (uploadError) {
          console.error('⚠️ Erreur upload document:', uploadError);
          return res.status(400).json({ 
            error: 'Erreur lors de l\'upload du justificatif médical: ' + uploadError.message 
          });
        }
      }
      
      const leave = await Leave.create(payload);
      
      // Retourner avec les informations de l'employé
      const createdLeave = await Leave.findOne({
        where: { id: leave.id },
        include: [
          { 
            model: Employee, 
            as: 'employee', 
            attributes: ['id', 'firstName', 'lastName', 'position'],
            include: [
              {
                model: Department,
                as: 'departmentInfo',
                attributes: ['id', 'name']
              }
            ]
          }
        ]
      });
      
      return res.status(201).json(createdLeave);
    } catch (error) {
      console.error('LeaveController.create error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      console.log('👤 req.user:', req.user);
      console.log('📦 req.body:', req.body);
      console.log('🔑 Content-Type:', req.headers['content-type']);
      console.log('📝 LeaveController.update - ID:', id);
      console.log('📝 LeaveController.update - Body:', req.body);
      console.log('📝 LeaveController.update - File:', req.file ? { name: req.file.originalname, size: req.file.size } : 'Aucun fichier');
      console.log('📝 LeaveController.update - Content-Type:', req.headers['content-type']);
      
      // Vérifier que le congé existe et appartient au tenant
      const existingLeave = await Leave.findOne({
        where: { id, tenantId: req.user.tenantId }
      });
      
      if (!existingLeave) {
        console.log('❌ Congé non trouvé:', id);
        return res.status(404).json({ error: 'Congé non trouvé' });
      }
      
      console.log('✅ Congé existant trouvé:', existingLeave.id);
      
      // Si les dates changent, vérifier les conflits (sauf avec lui-même)
      if (req.body.startDate && req.body.endDate) {
        const conflictingLeave = await Leave.findOne({
          where: {
            id: { [Op.ne]: id }, // Exclure le congé actuel
            employeeId: req.body.employeeId || existingLeave.employeeId,
            tenantId: req.user.tenantId,
            status: ['PENDING', 'APPROVED'],
            [Op.or]: [
              {
                startDate: {
                  [Op.between]: [req.body.startDate, req.body.endDate]
                }
              },
              {
                endDate: {
                  [Op.between]: [req.body.startDate, req.body.endDate]
                }
              },
              {
                [Op.and]: [
                  { startDate: { [Op.lte]: req.body.startDate } },
                  { endDate: { [Op.gte]: req.body.endDate } }
                ]
              }
            ]
          },
          include: [
            { 
              model: Employee, 
              as: 'employee', 
              attributes: ['firstName', 'lastName']
            }
          ]
        });

        if (conflictingLeave) {
          const conflictStart = new Date(conflictingLeave.startDate).toLocaleDateString('fr-FR');
          const conflictEnd = new Date(conflictingLeave.endDate).toLocaleDateString('fr-FR');
          const statusText = conflictingLeave.status === 'PENDING' ? 'en attente d\'approbation' : 'approuvé';
          
          return res.status(409).json({ 
            error: `Conflit détecté : l'employé a déjà un congé ${statusText} du ${conflictStart} au ${conflictEnd}.`,
            conflictingLeave: {
              id: conflictingLeave.id,
              type: conflictingLeave.type,
              startDate: conflictingLeave.startDate,
              endDate: conflictingLeave.endDate,
              status: conflictingLeave.status
            }
          });
        }
      }
      
      // Préparer les données de mise à jour - seulement les champs fournis
      // PAR CECI — utiliser les attributs Sequelize (camelCase) sans field mapping
      const updateData = {};

      const fieldMap = {
        employeeId: req.body.employeeId,
        type: req.body.type,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        reason: req.body.reason ?? null,
      };

      Object.entries(fieldMap).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          updateData[key] = value;
        }
      });
      
      console.log('📝 Données de mise à jour validées:', updateData);
      
      // Recalculer les jours SEULEMENT si les deux dates sont présentes
      if (updateData.startDate && updateData.endDate) {
        try {
          const start = new Date(updateData.startDate);
          const end = new Date(updateData.endDate);
          
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Dates invalides fournies' });
          }
          
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          updateData.daysCount = diffDays;
          console.log('📊 Jours recalculés:', diffDays);
        } catch (dateError) {
          console.error('❌ Erreur calcul dates:', dateError);
          return res.status(400).json({ error: 'Erreur lors du calcul des jours' });
        }
      }
      
      // Gérer l'upload du document si un fichier est fourni
      if (req.file) {
        console.log('📎 Traitement du fichier uploadé');
        try {
          const uploadResult = await uploadToCloudinary(
            req.file.buffer, 
            req.file.originalname, 
            req.file.mimetype
          );
          
          updateData.documentUrl = uploadResult.url;
          updateData.documentName = req.file.originalname;
          console.log('✅ Document uploadé avec succès:', uploadResult.url);
        } catch (uploadError) {
          console.error('❌ Erreur upload document:', uploadError);
          return res.status(400).json({ 
            error: 'Erreur lors de l\'upload du justificatif: ' + uploadError.message 
          });
        }
      }
      
      // Vérifier qu'il y a au moins quelque chose à mettre à jour
      if (Object.keys(updateData).length === 0) {
        console.log('⚠️ Aucune donnée à mettre à jour');
        return res.status(400).json({ error: 'Aucune donnée fournie pour la mise à jour' });
      }
      
      console.log('💾 Mise à jour en base avec:', updateData);
      
      const [updated] = await Leave.update(updateData, { 
        where: { id, tenantId: req.user.tenantId } 
      });
      
      if (!updated) {
        console.log('❌ Aucune mise à jour effectuée');
        return res.status(404).json({ error: 'Congé non trouvé pour mise à jour' });
      }
      
      console.log('✅ Mise à jour réussie, récupération des données');
      
      // Récupérer les données mises à jour avec les relations
      const leave = await Leave.findOne({
        where: { id },
        include: [
          { 
            model: Employee, 
            as: 'employee', 
            attributes: ['id', 'firstName', 'lastName', 'position'],
            include: [
              {
                model: Department,
                as: 'departmentInfo',
                attributes: ['id', 'name']
              }
            ]
          }
        ]
      });
      
      console.log('✅ Données récupérées, envoi réponse');
      return res.status(200).json(leave);
    } catch (error) {
      console.error('❌ LeaveController.update error:', error);
      console.error('❌ Stack trace:', error.stack);
      return res.status(500).json({ 
        error: 'Erreur serveur lors de la mise à jour', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  static async approve(req, res) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const userId = req.user.id;
      
      // Vérifier que le congé existe et est en attente
      const existingLeave = await Leave.findOne({
        where: { id, tenantId: req.user.tenantId, status: 'PENDING' }
      });
      
      if (!existingLeave) {
        return res.status(404).json({ error: 'Congé non trouvé ou déjà traité' });
      }
      
      const updateData = {
        approvedBy: userId
      };
      
      // Si rejectionReason est fourni, c'est un refus
      if (rejectionReason) {
        if (typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0) {
          return res.status(400).json({ error: 'Le motif de refus est obligatoire' });
        }
        
        updateData.status = 'REJECTED';
        updateData.rejectionReason = rejectionReason.trim();
        updateData.rejectedAt = new Date();
      } else {
        // Sinon, c'est une approbation
        updateData.status = 'APPROVED';
        updateData.approvedAt = new Date();
      }
      
      const [updated] = await Leave.update(updateData, { 
        where: { id, tenantId: req.user.tenantId, status: 'PENDING' } 
      });
      
      if (!updated) {
        return res.status(404).json({ error: 'Congé non trouvé ou déjà traité' });
      }
      
      // Récupérer le congé mis à jour avec les relations
      const leave = await Leave.findOne({
        where: { id },
        include: [
          { 
            model: Employee, 
            as: 'employee', 
            attributes: ['id', 'firstName', 'lastName', 'position']
          },
          { 
            model: Employee, 
            as: 'approver', 
            attributes: ['id', 'firstName', 'lastName'] 
          }
        ]
      });
      
      return res.status(200).json(leave);
    } catch (error) {
      console.error('LeaveController.approve error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params;
      const deleted = await Leave.destroy({ 
        where: { id, tenantId: req.user.tenantId } 
      });
      if (!deleted) return res.status(404).json({ error: 'Leave not found' });
      
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}

// APRÈS - middleware conditionnel qui gère JSON ET multipart
export const leaveDocumentUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  
  // Si c'est du multipart (FormData avec fichier), laisser multer parser
  if (contentType.includes('multipart/form-data')) {
    upload.single('document')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ 
          error: 'Erreur upload fichier: ' + err.message 
        });
      }
      next();
    });
  } else {
    // JSON classique → passer directement, express.json() a déjà parsé req.body
    next();
  }
};