-- PATCH DE GESTION DES STATUTS CLIENTS
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'actif';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Index pour optimiser le filtrage des clients actifs
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status) WHERE status = 'actif';