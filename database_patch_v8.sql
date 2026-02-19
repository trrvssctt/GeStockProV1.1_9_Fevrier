-- PATCH DE GESTION DES STATUTS SOUS-CATÉGORIES
ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'actif';
ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Index pour optimiser le filtrage des sous-catégories actives
CREATE INDEX IF NOT EXISTS idx_subcategories_status ON subcategories(status) WHERE status = 'actif';