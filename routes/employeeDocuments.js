const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /hr/employee-documents/:employeeId - Récupérer tous les documents d'un employé
router.get('/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const query = `
      SELECT 
        id,
        employee_id,
        name,
        category,
        file_url,
        file_type,
        file_size,
        original_name,
        created_at,
        updated_at
      FROM employee_documents 
      WHERE employee_id = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await db.query(query, [employeeId]);
    
    res.json({
      success: true,
      rows: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching employee documents:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des documents',
      details: error.message 
    });
  }
});

// POST /hr/employee-documents - Créer un nouveau document
router.post('/', async (req, res) => {
  try {
    const { employeeId, name, category, fileUrl, fileType, fileSize, originalName } = req.body;
    
    // Validation des données
    if (!employeeId || !name || !category || !fileUrl) {
      return res.status(400).json({ 
        error: 'Données manquantes: employeeId, name, category et fileUrl sont requis' 
      });
    }

    // Vérifier que l'employé existe
    const employeeCheck = await db.query('SELECT id FROM employees WHERE id = $1', [employeeId]);
    if (employeeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }

    // Validation de la catégorie
    const validCategories = ['IDENTITY', 'CONTRACT', 'DIPLOMA', 'FINANCIAL', 'MEDICAL', 'REFERENCE', 'OTHER'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Catégorie invalide' });
    }
    
    const query = `
      INSERT INTO employee_documents (
        employee_id, name, category, file_url, file_type, file_size, original_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      employeeId, 
      name.trim(), 
      category, 
      fileUrl, 
      fileType || null, 
      fileSize || null, 
      originalName || null
    ];
    
    const result = await db.query(query, values);
    
    res.status(201).json({
      success: true,
      document: result.rows[0],
      message: 'Document ajouté avec succès'
    });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'ajout du document',
      details: error.message 
    });
  }
});

// DELETE /hr/employee-documents/:id - Supprimer un document
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM employee_documents WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }
    
    res.json({
      success: true,
      message: 'Document supprimé avec succès'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression du document',
      details: error.message 
    });
  }
});

module.exports = router;