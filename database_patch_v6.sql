
-- Rendre sale_id optionnel pour permettre le stockage des paiements d'abonnement direct
ALTER TABLE payments ALTER COLUMN sale_id DROP NOT NULL;

-- Ajout d'un index pour filtrer les paiements d'abonnement (ceux sans sale_id)
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(tenant_id) WHERE sale_id IS NULL;
