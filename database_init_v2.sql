
-- TABLE DES MOUVEMENTS DE STOCK (AUDIT LOGISTIQUE)
CREATE TABLE product_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stock_item_id UUID NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'IN', 'OUT', 'ADJUSTMENT'
    qty INTEGER NOT NULL,
    previous_level INTEGER NOT NULL,
    new_level INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL, -- 'Vente', 'Réapprovisionnement', 'Avarie', 'Inventaire'
    reference_id VARCHAR(100), -- ID de la vente ou du bon de réception
    user_ref VARCHAR(255), -- Nom ou ID de l'opérateur
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movements_tenant ON product_movements(tenant_id);
CREATE INDEX idx_movements_item ON product_movements(stock_item_id);
CREATE INDEX idx_movements_date ON product_movements(movement_date);
