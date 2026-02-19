-- PATCH DE GESTION DES STATUTS CATÉGORIES
ALTER TABLE categories ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'actif';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Index pour optimiser le filtrage des catégories actives
CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status) WHERE status = 'actif';