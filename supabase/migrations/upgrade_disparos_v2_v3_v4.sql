-- ============================================================
-- Agency-Hub: Upgrade disparos V2 + V3 + V4
-- Seguro para re-rodar (IF NOT EXISTS / EXCEPTION)
-- ============================================================

-- ═══ V2: Metricas de funil, logs, segmentacao, anon ═══

ALTER TABLE disparo_dispatches ADD COLUMN IF NOT EXISTS read_messages INT DEFAULT 0;
ALTER TABLE disparo_dispatches ADD COLUMN IF NOT EXISTS replied_messages INT DEFAULT 0;
ALTER TABLE disparo_dispatches ADD COLUMN IF NOT EXISTS clicked_messages INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS disparo_activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_email VARCHAR(320) NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id BIGINT NOT NULL,
  entity_name VARCHAR(255),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disparo_activity_logs_entity ON disparo_activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_disparo_activity_logs_created ON disparo_activity_logs(created_at DESC);

ALTER TABLE disparo_activity_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  BEGIN CREATE POLICY "Authenticated users can manage disparo_activity_logs" ON disparo_activity_logs FOR ALL USING (auth.role() = 'authenticated'); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE disparo_clients ADD COLUMN IF NOT EXISTS segment VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_disparo_clients_segment ON disparo_clients(segment);

-- Policies anon para /acompanhamento
DO $$
BEGIN
  BEGIN CREATE POLICY "Anon users can read disparo_clients" ON disparo_clients FOR SELECT USING (auth.role() = 'anon'); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Anon users can read disparo_packages" ON disparo_packages FOR SELECT USING (auth.role() = 'anon'); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Anon users can read disparo_dispatches" ON disparo_dispatches FOR SELECT USING (auth.role() = 'anon'); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Anon users can read disparo_results" ON disparo_results FOR SELECT USING (auth.role() = 'anon'); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ═══ V3: purchase_date nos pacotes ═══

ALTER TABLE disparo_packages ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMPTZ;

-- ═══ V4: Estorno a nivel de cliente + Custo de redirecionamento ═══

ALTER TABLE disparo_clients ADD COLUMN IF NOT EXISTS has_redirection_cost BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE disparo_clients ADD COLUMN IF NOT EXISTS redirection_cost_per_message NUMERIC(10,4) DEFAULT 0;

CREATE TABLE IF NOT EXISTS disparo_client_refunds (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES disparo_clients(id) ON DELETE CASCADE,
  refunded_messages INT NOT NULL,
  price_per_message NUMERIC(10,4) NOT NULL,
  platform_cost_per_message NUMERIC(10,4) NOT NULL DEFAULT 0.2000,
  refund_gross NUMERIC(12,2) NOT NULL,
  refund_company NUMERIC(12,2) NOT NULL,
  refund_partner NUMERIC(12,2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disparo_client_refunds_client ON disparo_client_refunds(client_id);

ALTER TABLE disparo_client_refunds ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  BEGIN CREATE POLICY "Authenticated users can manage disparo_client_refunds" ON disparo_client_refunds FOR ALL USING (auth.role() = 'authenticated'); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Anon users can read disparo_client_refunds" ON disparo_client_refunds FOR SELECT USING (auth.role() = 'anon'); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
