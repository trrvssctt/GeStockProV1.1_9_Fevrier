-- PATCH DE GESTION DES STATUTS SERVICES
ALTER TABLE services ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'actif';
ALTER TABLE services ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Index pour optimiser le filtrage des services actifs
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status) WHERE status = 'actif';