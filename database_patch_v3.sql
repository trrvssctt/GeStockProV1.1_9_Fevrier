
-- PATCH DE RÉPARATION DU KERNEL
-- 1. Ajout de la colonne de cloisonnement (Tenant Isolation)
ALTER TABLE product_movements ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;

-- 2. Création des index pour accélérer les rapports logistiques
CREATE INDEX idx_movements_tenant_v3 ON product_movements(tenant_id);
CREATE INDEX idx_movements_item_v3 ON product_movements(stock_item_id);
CREATE INDEX idx_movements_date_v3 ON product_movements(movement_date);

-- Note: Ce script doit être exécuté dans votre console SQL AlwaysData
