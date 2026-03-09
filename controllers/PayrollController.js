import { Payroll, Advance, Prime, Employee, Department, Contract } from '../models/index.js';
import { Op } from 'sequelize';
import { validateAmount, calculateAdvanceDeductions } from '../config/payroll.js';
import PayslipGeneratorService from '../services/PayslipGeneratorService.js';

export class PayrollController {
  static async list(req, res) {
    try {
      const items = await Payroll.findAll({ where: { tenantId: req.user.tenantId } });
      return res.status(200).json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async get(req, res) {
    try {
      const { id } = req.params;
      const item = await Payroll.findOne({ where: { id, tenantId: req.user.tenantId } });
      if (!item) return res.status(404).json({ error: 'NotFound' });
      return res.status(200).json(item);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async create(req, res) {
    try {
      const payload = { ...req.body, tenantId: req.user.tenantId };
      const item = await Payroll.create(payload);
      return res.status(201).json(item);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async generatePaystub(req, res) {
    try {
      // Minimal implementation: mark payroll as FINALIZED and return record
      const { id } = req.params;
      const item = await Payroll.findOne({ where: { id, tenantId: req.user.tenantId } });
      if (!item) return res.status(404).json({ error: 'NotFound' });
      item.status = 'FINALIZED';
      await item.save();
      return res.status(200).json(item);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // --- GESTION DES AVANCES ---

  static async listAdvances(req, res) {
    try {
      const advances = await Advance.findAll({ 
        where: { tenantId: req.user.tenantId },
        include: [
          {
            model: Employee,
            as: 'employee',
            include: [{ model: Department, as: 'departmentInfo' }]
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      return res.status(200).json(advances);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async createAdvance(req, res) {
    try {
      const { employeeId, amount, months, reason, currency } = req.body;

      // Validation
      if (!employeeId || !amount || !reason) {
        return res.status(400).json({ error: 'Champs obligatoires manquants' });
      }

      // Vérifier que l'employé existe et appartient au tenant
      const employee = await Employee.findOne({
        where: { id: employeeId, tenantId: req.user.tenantId },
        include: [{
          model: Contract,
          as: 'contracts',
          where: { status: 'ACTIVE' },
          required: false,
          attributes: ['id', 'salary', 'currency']
        }]
      });
      if (!employee) {
        return res.status(404).json({ error: 'Employé non trouvé' });
      }

      // Récupérer le salaire du contrat actif le plus récent
      const activeContracts = employee.contracts || [];
      const latestContract = activeContracts.length > 0 
        ? activeContracts.sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0))[0]
        : null;
      const currentSalary = latestContract?.salary || employee.baseSalary || 0;

      // Vérifier que le montant ne dépasse pas le salaire pour la période
      const totalAmount = amount * (months || 1);
      const maxAmount = currentSalary * (months || 1);
      if (totalAmount > maxAmount) {
        return res.status(400).json({ 
          error: `Le montant total (${totalAmount.toLocaleString()} F CFA) dépasse le salaire pour ${months || 1} mois (${maxAmount.toLocaleString()} F CFA)` 
        });
      }

      const advance = await Advance.create({
        employeeId,
        amount: parseFloat(amount),
        months: months || 1,
        reason,
        currency: currency || 'F CFA',
        tenantId: req.user.tenantId,
        status: 'PENDING',
        remainingAmount: parseFloat(amount) * (months || 1), // Montant total restant à déduire
        startDate: null, // Sera défini lors de l'approbation
        endDate: null    // Sera défini lors de l'approbation
      });

      // Recharger avec les associations
      const createdAdvance = await Advance.findByPk(advance.id, {
        include: [
          {
            model: Employee,
            as: 'employee',
            include: [{ model: Department, as: 'departmentInfo' }]
          }
        ]
      });

      return res.status(201).json(createdAdvance);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async approveAdvance(req, res) {
    try {
      const { id } = req.params;
      const advance = await Advance.findOne({ 
        where: { id, tenantId: req.user.tenantId } 
      });
      
      if (!advance) {
        return res.status(404).json({ error: 'Avance non trouvée' });
      }

      if (advance.status !== 'PENDING') {
        return res.status(400).json({ error: 'Cette avance a déjà été traitée' });
      }

      advance.status = 'APPROVED';
      advance.approvedBy = req.user.id;
      advance.approvedAt = new Date();
      advance.startDate = new Date();
      
      // Calculer la date de fin basée sur le nombre de mois
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + advance.months);
      advance.endDate = endDate;

      await advance.save();

      return res.status(200).json(advance);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async rejectAdvance(req, res) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      
      const advance = await Advance.findOne({ 
        where: { id, tenantId: req.user.tenantId } 
      });
      
      if (!advance) {
        return res.status(404).json({ error: 'Avance non trouvée' });
      }

      if (advance.status !== 'PENDING') {
        return res.status(400).json({ error: 'Cette avance a déjà été traitée' });
      }

      advance.status = 'REJECTED';
      advance.approvedBy = req.user.id;
      advance.approvedAt = new Date();
      advance.rejectionReason = rejectionReason;

      await advance.save();

      return res.status(200).json(advance);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // --- GESTION DES PRIMES ---

  static async listPrimes(req, res) {
    try {
      const primes = await Prime.findAll({ 
        where: { tenantId: req.user.tenantId },
        include: [
          {
            model: Employee,
            as: 'employee',
            include: [{ model: Department, as: 'departmentInfo' }]
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      return res.status(200).json(primes);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async createPrime(req, res) {
    try {
      const { employeeId, amount, reason, type, currency, category } = req.body;

      // Validation
      if (!employeeId || !amount || !reason) {
        return res.status(400).json({ error: 'Champs obligatoires manquants' });
      }

      // Vérifier que l'employé existe et appartient au tenant
      const employee = await Employee.findOne({
        where: { id: employeeId, tenantId: req.user.tenantId }
      });
      if (!employee) {
        return res.status(404).json({ error: 'Employé non trouvé' });
      }

      const prime = await Prime.create({
        employeeId,
        amount: parseFloat(amount),
        reason,
        type: type || 'PERFORMANCE',
        currency: currency || 'F CFA',
        category: category || null,
        tenantId: req.user.tenantId,
        status: 'APPROVED', // Les primes sont automatiquement approuvées
        approvedBy: req.user.id,
        approvedAt: new Date()
      });

      // Recharger avec les associations
      const createdPrime = await Prime.findByPk(prime.id, {
        include: [
          {
            model: Employee,
            as: 'employee',
            include: [{ model: Department, as: 'departmentInfo' }]
          }
        ]
      });

      return res.status(201).json(createdPrime);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async updatePrime(req, res) {
    try {
      const { id } = req.params;
      const { amount, reason, type, category } = req.body;

      const prime = await Prime.findOne({ 
        where: { id, tenantId: req.user.tenantId } 
      });
      
      if (!prime) {
        return res.status(404).json({ error: 'Prime non trouvée' });
      }

      if (prime.isPaid) {
        return res.status(400).json({ error: 'Cette prime a déjà été payée et ne peut plus être modifiée' });
      }

      if (amount !== undefined) prime.amount = parseFloat(amount);
      if (reason) prime.reason = reason;
      if (type) prime.type = type;
      if (category !== undefined) prime.category = category;

      await prime.save();

      return res.status(200).json(prime);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async deletePrime(req, res) {
    try {
      const { id } = req.params;
      
      const prime = await Prime.findOne({ 
        where: { id, tenantId: req.user.tenantId } 
      });
      
      if (!prime) {
        return res.status(404).json({ error: 'Prime non trouvée' });
      }

      if (prime.isPaid) {
        return res.status(400).json({ error: 'Cette prime a déjà été payée et ne peut plus être supprimée' });
      }

      await prime.destroy();

      return res.status(200).json({ message: 'Prime supprimée avec succès' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Calculer les déductions mensuelles en cours pour un employé
  static async getMonthlyDeductions(req, res) {
    try {
      const { employeeId } = req.params;
      const currentDate = new Date();
      
      // Récupérer les avances approuvées et en cours pour cet employé
      const activeAdvances = await Advance.findAll({
        where: {
          employeeId,
          tenantId: req.user.tenantId,
          status: 'APPROVED',
          startDate: { [Op.lte]: currentDate }, // Avance déjà commencée
          endDate: { [Op.gte]: currentDate }    // Avance pas encore finie
        },
        include: [{
          model: Employee,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName']
        }]
      });
      
      let totalMonthlyDeduction = 0;
      const deductionDetails = [];
      
      for (const advance of activeAdvances) {
        // Calculer combien de mois se sont écoulés depuis le début
        const startDate = new Date(advance.startDate);
        const monthsElapsed = Math.floor(
          (currentDate - startDate) / (1000 * 60 * 60 * 24 * 30)
        );
        
        // Si l'avance n'est pas encore terminée
        if (monthsElapsed < advance.months) {
          const monthlyAmount = parseFloat(advance.amount) || 0;
          
          // Validation du montant mensuel
          if (monthlyAmount > 0) {
            totalMonthlyDeduction += monthlyAmount;
            
            deductionDetails.push({
              id: advance.id,
              reason: advance.reason,
              monthlyAmount: Math.round(monthlyAmount * 100) / 100,
              totalAmount: Math.round((advance.amount * advance.months) * 100) / 100,
              remainingMonths: advance.months - monthsElapsed,
              startDate: advance.startDate,
              endDate: advance.endDate,
              currency: advance.currency
            });
          }
        }
      }
      
      return res.status(200).json({
        employeeId,
        totalMonthlyDeduction: Math.round(totalMonthlyDeduction * 100) / 100,
        deductionDetails,
        currency: activeAdvances[0]?.currency || 'F CFA'
      });
    } catch (error) {
      console.error('Error calculating monthly deductions:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Calculer le salaire net mensuel d'un employé
  static async calculateMonthlySalary(req, res) {
    try {
      const { employeeId } = req.params;
      const { month } = req.query; // Format: YYYY-MM, défaut = mois courant
      
      const targetMonth = month || new Date().toISOString().substring(0, 7);
      const targetDate = new Date(targetMonth + '-01');
      
      // Récupérer l'employé avec son contrat actif
      const employee = await Employee.findOne({
        where: { id: employeeId, tenantId: req.user.tenantId },
        include: [{
          model: Contract,
          as: 'contracts',
          where: { status: 'ACTIVE' },
          required: false
        }]
      });
      
      if (!employee) {
        return res.status(404).json({ error: 'Employé non trouvé' });
      }
      
      const activeContract = employee.contracts?.[0];
      if (!activeContract) {
        return res.status(400).json({ error: 'Aucun contrat actif trouvé' });
      }
      
      // Validation et normalisation du salaire de base
      const baseSalary = validateAmount(activeContract.salary);
      
      // Validation des données de base
      if (baseSalary <= 0) {
        return res.status(400).json({ error: 'Salaire de base invalide ou non défini' });
      }
      
      // Récupérer les primes du mois
      const monthStart = new Date(targetMonth + '-01');
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      
      const primes = await Prime.findAll({
        where: {
          employeeId,
          tenantId: req.user.tenantId,
          status: 'APPROVED',
          createdAt: {
            [Op.between]: [monthStart, monthEnd]
          }
        }
      });
      
      // Récupérer les déductions d'avances pour ce mois
      const advances = await Advance.findAll({
        where: {
          employeeId,
          tenantId: req.user.tenantId,
          status: 'APPROVED',
          startDate: { [Op.lte]: monthEnd },
          endDate: { [Op.gte]: monthStart }
        }
      });
      
      let totalPrimes = 0;
      let totalAdvanceDeductions = 0;
      
      // Calculer les primes avec validation
      primes.forEach(prime => {
        totalPrimes += validateAmount(prime.amount);
      });
      
      // Calculer les déductions d'avances pour ce mois avec la fonction utilitaire
      totalAdvanceDeductions = calculateAdvanceDeductions(advances, monthStart, monthEnd);
      
      // Validation finale des montants calculés
      totalPrimes = validateAmount(totalPrimes);
      totalAdvanceDeductions = validateAmount(totalAdvanceDeductions);
      
      // Calculs des charges sociales avec validation
      const socialChargesEmployee = validateAmount(baseSalary * 0.22); // 22% employé
      const socialChargesEmployer = validateAmount(baseSalary * 0.18); // 18% employeur
      
      const grossSalary = validateAmount(baseSalary + totalPrimes);
      const netSalary = validateAmount(grossSalary - socialChargesEmployee - totalAdvanceDeductions);
      
      return res.status(200).json({
        employeeId,
        month: targetMonth,
        baseSalary: Math.round(baseSalary * 100) / 100,
        totalPrimes: Math.round(totalPrimes * 100) / 100,
        totalAdvanceDeductions: Math.round(totalAdvanceDeductions * 100) / 100,
        socialChargesEmployee: Math.round(socialChargesEmployee * 100) / 100,
        socialChargesEmployer: Math.round(socialChargesEmployer * 100) / 100,
        grossSalary: Math.round(grossSalary * 100) / 100,
        netSalary: Math.round(netSalary * 100) / 100,
        currency: activeContract.currency || 'F CFA',
        details: {
          primesCount: primes.length,
          advancesCount: advances.length,
          contractType: activeContract.type
        }
      });
    } catch (error) {
      console.error('Error calculating monthly salary:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // --- GÉNÉRATION DE PAIE MENSUELLE ---
  static async generateMonthlyPayroll(req, res) {
    try {
      const { month, year, includeAdvances = true, generateFiles = true, fileFormat = 'png' } = req.body;
      const tenantId = req.user.tenantId;
      
      if (!month || !year) {
        return res.status(400).json({ error: 'Mois et année requis' });
      }

      console.log(`Génération paie mensuelle pour ${month}/${year}, tenant: ${tenantId}`);

      // 1. Récupérer tous les employés actifs avec contrats actifs
      const employeesWithActiveContracts = await Employee.findAll({
        where: { 
          tenantId: tenantId,
          status: 'ACTIVE'
        },
        include: [
          {
            model: Contract,
            as: 'contracts',
            where: { 
              status: 'ACTIVE',
              tenantId: tenantId
            },
            required: true // Only employees with active contracts
          },
          {
            model: Department,
            as: 'departmentInfo',
            required: false
          }
        ]
      });

      if (employeesWithActiveContracts.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'Aucun employé avec contrat actif trouvé',
          processedEmployees: 0,
          generatedFiles: 0,
          totalAmount: 0
        });
      }

      console.log(`Trouvé ${employeesWithActiveContracts.length} employé(s) avec contrat actif`);

      const processedEmployees = [];
      const skippedEmployees = [];
      let totalPayrollAmount = 0;
      let generatedFilesCount = 0;

      // 2. Traiter chaque employé
      for (const employee of employeesWithActiveContracts) {
        try {
          // Récupérer le contrat actif le plus récent
          const activeContract = employee.contracts
            .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];

          if (!activeContract) {
            skippedEmployees.push({ employeeId: employee.id, reason: 'Pas de contrat actif' });
            continue;
          }

          // Calculer le salaire pour ce mois
          const salaryCalculation = await this.calculateEmployeeSalary(employee.id, month, tenantId, includeAdvances);
          
          // 3. Créer ou mettre à jour l'enregistrement de paie
          const [payrollRecord, created] = await Payroll.findOrCreate({
            where: {
              employeeId: employee.id,
              tenantId: tenantId,
              month: month,
              year: year
            },
            defaults: {
              employeeId: employee.id,
              tenantId: tenantId,
              month: month,
              year: year,
              grossSalary: salaryCalculation.grossSalary,
              netSalary: salaryCalculation.netSalary,
              socialCharges: salaryCalculation.socialChargesEmployee,
              totalAdvances: salaryCalculation.totalAdvanceDeductions,
              totalPrimes: salaryCalculation.totalPrimes,
              currency: salaryCalculation.currency,
              status: 'GENERATED'
            }
          });

          if (!created) {
            // Mettre à jour si déjà existant
            await payrollRecord.update({
              grossSalary: salaryCalculation.grossSalary,
              netSalary: salaryCalculation.netSalary,
              socialCharges: salaryCalculation.socialChargesEmployee,
              totalAdvances: salaryCalculation.totalAdvanceDeductions,
              totalPrimes: salaryCalculation.totalPrimes,
              currency: salaryCalculation.currency,
              status: 'GENERATED',
              updatedAt: new Date()
            });
          }

          // 4. Générer le fichier de paie si demandé
          if (generateFiles) {
            try {
              await this.generatePayslipFile(employee, activeContract, salaryCalculation, month, year, fileFormat);
              generatedFilesCount++;
            } catch (fileError) {
              console.error(`Erreur génération fichier pour ${employee.firstName} ${employee.lastName}:`, fileError);
              // Continue même si la génération de fichier échoue
            }
          }

          processedEmployees.push({
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            netSalary: salaryCalculation.netSalary,
            payrollId: payrollRecord.id
          });

          totalPayrollAmount += salaryCalculation.netSalary;

        } catch (employeeError) {
          console.error(`Erreur traitement employé ${employee.id}:`, employeeError);
          skippedEmployees.push({ 
            employeeId: employee.id, 
            reason: employeeError.message || 'Erreur de calcul' 
          });
        }
      }

      console.log(`Traitement terminé: ${processedEmployees.length} succès, ${skippedEmployees.length} échecs`);

      return res.status(200).json({
        success: true,
        message: `Traitement de paie ${month}/${year} terminé`,
        processedEmployees: processedEmployees.length,
        generatedFiles: generatedFilesCount,
        totalAmount: Math.round(totalPayrollAmount * 100) / 100,
        skippedEmployees: skippedEmployees,
        details: processedEmployees
      });

    } catch (error) {
      console.error('Error in generateMonthlyPayroll:', error);
      return res.status(500).json({ 
        error: 'Erreur lors de la génération de paie mensuelle',
        details: error.message 
      });
    }
  }

  // Méthode utilitaire pour calculer le salaire d'un employé
  static async calculateEmployeeSalary(employeeId, month, tenantId, includeAdvances = true) {
    // Récupérer l'employé avec son contrat actif
    const employee = await Employee.findOne({
      where: { id: employeeId, tenantId: tenantId },
      include: [{
        model: Contract,
        as: 'contracts',
        where: { status: 'ACTIVE' },
        required: true
      }]
    });

    if (!employee || !employee.contracts || employee.contracts.length === 0) {
      throw new Error('Employé ou contrat actif non trouvé');
    }

    const activeContract = employee.contracts
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];
    
    const baseSalary = validateAmount(activeContract.salary || employee.baseSalary || 0);
    
    // Récupérer les primes du mois
    const primes = await Prime.findAll({
      where: {
        employeeId: employeeId,
        tenantId: tenantId,
        [Op.and]: [
          { createdAt: { [Op.gte]: new Date(`${month}-01`) } },
          { createdAt: { [Op.lt]: new Date(new Date(`${month}-01`).getFullYear(), new Date(`${month}-01`).getMonth() + 1, 1) } }
        ]
      }
    });

    const totalPrimes = primes.reduce((sum, prime) => sum + validateAmount(prime.amount), 0);

    // Récupérer les avances si incluses
    let totalAdvanceDeductions = 0;
    if (includeAdvances) {
      const advances = await calculateAdvanceDeductions(employeeId, month, tenantId);
      totalAdvanceDeductions = advances.monthlyDeduction || 0;
    }

    // Calculs des charges sociales (utiliser les taux par défaut ou récupérer de la config)
    const employeeSocialChargeRate = 8.2; // %
    const employerSocialChargeRate = 18.5; // %

    const grossSalary = baseSalary + totalPrimes;
    const socialChargesEmployee = Math.round(grossSalary * (employeeSocialChargeRate / 100) * 100) / 100;
    const socialChargesEmployer = Math.round(grossSalary * (employerSocialChargeRate / 100) * 100) / 100;
    const netSalary = Math.max(0, grossSalary - socialChargesEmployee - totalAdvanceDeductions);

    return {
      baseSalary: Math.round(baseSalary * 100) / 100,
      totalPrimes: Math.round(totalPrimes * 100) / 100,
      totalAdvanceDeductions: Math.round(totalAdvanceDeductions * 100) / 100,
      socialChargesEmployee: Math.round(socialChargesEmployee * 100) / 100,
      socialChargesEmployer: Math.round(socialChargesEmployer * 100) / 100,
      grossSalary: Math.round(grossSalary * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100,
      currency: activeContract.currency || 'F CFA'
    };
  }

  // Méthode utilitaire pour générer le fichier de paie
  static async generatePayslipFile(employee, contract, salaryCalculation, month, year, format = 'png') {
    try {
      // Récupérer les informations du tenant
      const tenantInfo = await PayslipGeneratorService.getTenantInfo(employee.tenantId);
      
      // Générer le fichier de paie
      const result = await PayslipGeneratorService.generatePayslipFile(
        employee, 
        contract, 
        tenantInfo, 
        salaryCalculation, 
        month, 
        year, 
        format
      );
      
      console.log(`Fichier de paie généré: ${result.fileName}`);
      
      return result;
    } catch (error) {
      console.error(`Erreur génération fichier de paie pour ${employee.firstName} ${employee.lastName}:`, error);
      throw error;
    }
  }
}
