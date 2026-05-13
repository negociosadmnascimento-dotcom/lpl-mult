-- LPL mult - Gestão de Brindes
-- Database Schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: campanhas (Campaigns)
-- ============================================
CREATE TABLE IF NOT EXISTS campanhas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  data_inicio DATE,
  data_fim DATE,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: brindes (Gift items catalog)
-- ============================================
CREATE TABLE IF NOT EXISTS brindes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  descricao TEXT,
  imagem_url TEXT,
  estoque_atual INTEGER DEFAULT 0,
  estoque_reservado INTEGER DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 10,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: entradas_estoque (Stock entries)
-- ============================================
CREATE TABLE IF NOT EXISTS entradas_estoque (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  brinde_id UUID REFERENCES brindes(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL,
  data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  responsavel VARCHAR(255) NOT NULL,
  observacoes TEXT,
  imagem_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: pedidos (Orders)
-- ============================================
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero_pedido VARCHAR(100),
  nota_fiscal VARCHAR(100),
  nome_distribuidor VARCHAR(255) NOT NULL,
  industria VARCHAR(255),
  nome_vendedor VARCHAR(255) NOT NULL,
  nome_supervisor VARCHAR(255),
  campanha VARCHAR(255),
  data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade_pedidos INTEGER DEFAULT 1,
  total_pedido DECIMAL(10,2),
  observacoes TEXT,
  status VARCHAR(50) DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: pedido_brindes (Order items - gifts per order)
-- ============================================
CREATE TABLE IF NOT EXISTS pedido_brindes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  brinde_id UUID REFERENCES brindes(id),
  quantidade INTEGER NOT NULL DEFAULT 1,
  data_entrega DATE,
  status_brinde VARCHAR(50) DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: movimentacoes (Stock movements history)
-- ============================================
CREATE TABLE IF NOT EXISTS movimentacoes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  brinde_id UUID REFERENCES brindes(id) ON DELETE SET NULL,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  tipo VARCHAR(50) NOT NULL, -- 'entrada', 'saida', 'reserva', 'cancelamento'
  quantidade INTEGER NOT NULL,
  descricao TEXT,
  responsavel VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: notificacoes (Notifications)
-- ============================================
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL, -- 'entrada_pedido', 'brinde_reservado', 'saida_brinde', 'estoque_baixo', 'nova_entrada'
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT,
  lida BOOLEAN DEFAULT false,
  dados JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_brindes_updated_at BEFORE UPDATE ON brindes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pedido_brindes_updated_at BEFORE UPDATE ON pedido_brindes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entradas_estoque_updated_at BEFORE UPDATE ON entradas_estoque FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update stock on entry
CREATE OR REPLACE FUNCTION update_stock_on_entry()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE brindes
  SET estoque_atual = estoque_atual + NEW.quantidade
  WHERE id = NEW.brinde_id;

  INSERT INTO movimentacoes (brinde_id, tipo, quantidade, descricao, responsavel)
  VALUES (NEW.brinde_id, 'entrada', NEW.quantidade, 'Entrada de estoque', NEW.responsavel);

  INSERT INTO notificacoes (tipo, titulo, mensagem, dados)
  SELECT
    'nova_entrada',
    'Nova entrada no estoque',
    'Entrada de ' || NEW.quantidade || ' unidade(s) de ' || b.nome,
    jsonb_build_object('brinde_id', NEW.brinde_id, 'quantidade', NEW.quantidade, 'responsavel', NEW.responsavel)
  FROM brindes b WHERE b.id = NEW.brinde_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_on_entry
AFTER INSERT ON entradas_estoque
FOR EACH ROW EXECUTE FUNCTION update_stock_on_entry();

-- Function to update stock status on pedido_brindes
CREATE OR REPLACE FUNCTION update_stock_on_pedido_brinde()
RETURNS TRIGGER AS $$
BEGIN
  -- On insert: reserve stock
  IF TG_OP = 'INSERT' THEN
    UPDATE brindes
    SET estoque_reservado = estoque_reservado + NEW.quantidade
    WHERE id = NEW.brinde_id;

    INSERT INTO movimentacoes (brinde_id, pedido_id, tipo, quantidade, descricao)
    VALUES (NEW.brinde_id, NEW.pedido_id, 'reserva', NEW.quantidade, 'Brinde reservado para pedido');
  END IF;

  -- On update: if status changed to 'entregue', deduct from stock
  IF TG_OP = 'UPDATE' AND NEW.status_brinde = 'entregue' AND OLD.status_brinde = 'pendente' THEN
    UPDATE brindes
    SET estoque_atual = estoque_atual - NEW.quantidade,
        estoque_reservado = estoque_reservado - NEW.quantidade
    WHERE id = NEW.brinde_id;

    INSERT INTO movimentacoes (brinde_id, pedido_id, tipo, quantidade, descricao)
    VALUES (NEW.brinde_id, NEW.pedido_id, 'saida', NEW.quantidade, 'Brinde entregue');

    INSERT INTO notificacoes (tipo, titulo, mensagem, dados)
    SELECT
      'saida_brinde',
      'Brinde entregue',
      'Saída de ' || NEW.quantidade || ' unidade(s) de ' || b.nome,
      jsonb_build_object('brinde_id', NEW.brinde_id, 'pedido_id', NEW.pedido_id, 'quantidade', NEW.quantidade)
    FROM brindes b WHERE b.id = NEW.brinde_id;

    -- Check for low stock
    INSERT INTO notificacoes (tipo, titulo, mensagem, dados)
    SELECT
      'estoque_baixo',
      'Alerta: Estoque Baixo',
      b.nome || ' está com estoque baixo: ' || (b.estoque_atual - NEW.quantidade) || ' unidade(s)',
      jsonb_build_object('brinde_id', b.id, 'estoque_atual', b.estoque_atual - NEW.quantidade, 'estoque_minimo', b.estoque_minimo)
    FROM brindes b
    WHERE b.id = NEW.brinde_id
      AND (b.estoque_atual - NEW.quantidade) <= b.estoque_minimo;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_on_pedido_brinde
AFTER INSERT OR UPDATE ON pedido_brindes
FOR EACH ROW EXECUTE FUNCTION update_stock_on_pedido_brinde();

-- Function: auto update status_brinde based on data_entrega
CREATE OR REPLACE FUNCTION compute_status_brinde()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.data_entrega IS NOT NULL THEN
    NEW.status_brinde = 'entregue';
  ELSE
    NEW.status_brinde = 'pendente';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_compute_status_brinde
BEFORE INSERT OR UPDATE ON pedido_brindes
FOR EACH ROW EXECUTE FUNCTION compute_status_brinde();

-- Notification for new pedido
CREATE OR REPLACE FUNCTION notify_new_pedido()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notificacoes (tipo, titulo, mensagem, dados)
  VALUES (
    'entrada_pedido',
    'Novo pedido registrado',
    'Pedido de ' || NEW.nome_distribuidor || ' - ' || NEW.nome_vendedor || ' foi cadastrado',
    jsonb_build_object('pedido_id', NEW.id, 'distribuidor', NEW.nome_distribuidor, 'vendedor', NEW.nome_vendedor)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_pedido
AFTER INSERT ON pedidos
FOR EACH ROW EXECUTE FUNCTION notify_new_pedido();

-- ============================================
-- ENABLE ROW LEVEL SECURITY (permissive for shared access)
-- ============================================
ALTER TABLE brindes ENABLE ROW LEVEL SECURITY;
ALTER TABLE entradas_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_brindes ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;

-- Policies: allow all operations (single shared user system)
CREATE POLICY "Allow all brindes" ON brindes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all entradas_estoque" ON entradas_estoque FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all pedidos" ON pedidos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all pedido_brindes" ON pedido_brindes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all movimentacoes" ON movimentacoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all notificacoes" ON notificacoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all campanhas" ON campanhas FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- REALTIME: Enable for live updates
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE brindes;
ALTER PUBLICATION supabase_realtime ADD TABLE pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE pedido_brindes;
ALTER PUBLICATION supabase_realtime ADD TABLE entradas_estoque;
ALTER PUBLICATION supabase_realtime ADD TABLE movimentacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;

-- ============================================
-- SEED: Sample data
-- ============================================
INSERT INTO campanhas (nome, descricao, data_inicio, data_fim) VALUES
('Campanha Verão 2025', 'Promoção de verão com brindes exclusivos', '2025-01-01', '2025-03-31'),
('Campanha Dia dos Pais', 'Especial Dia dos Pais', '2025-07-01', '2025-08-15'),
('Campanha Black Friday', 'Promoção Black Friday', '2025-11-01', '2025-11-30');

INSERT INTO brindes (nome, categoria, descricao, estoque_atual, estoque_minimo) VALUES
('Camiseta LPL mult', 'Vestuário', 'Camiseta personalizada da marca', 150, 20),
('Caneca Personalizada', 'Utensílios', 'Caneca com logo LPL mult', 200, 30),
('Boné LPL mult', 'Vestuário', 'Boné bordado com logo', 80, 15),
('Chaveiro LPL', 'Acessórios', 'Chaveiro metálico personalizado', 500, 50),
('Agenda 2025', 'Papelaria', 'Agenda executiva personalizada', 100, 20),
('Guarda-chuva LPL', 'Acessórios', 'Guarda-chuva com logo', 60, 10),
('Garrafa Térmica', 'Utensílios', 'Garrafa térmica 500ml', 75, 15),
('Kit Escritório', 'Papelaria', 'Kit com caneta e bloco', 120, 25);
