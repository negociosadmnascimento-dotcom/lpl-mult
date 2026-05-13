export type Brinde = {
  id: string;
  nome: string;
  categoria: string | null;
  descricao: string | null;
  imagem_url: string | null;
  estoque_atual: number;
  estoque_reservado: number;
  estoque_minimo: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type EntradaEstoque = {
  id: string;
  brinde_id: string;
  quantidade: number;
  data_entrada: string;
  responsavel: string;
  observacoes: string | null;
  imagem_url: string | null;
  custo_unitario: number | null;
  nota_fiscal: string | null;
  loja_nome: string | null;
  cidade: string | null;
  uf: string | null;
  contato: string | null;
  created_at: string;
  updated_at: string;
  brinde?: Brinde;
};

export type Pedido = {
  id: string;
  numero_pedido: string | null;
  nota_fiscal: string | null;
  nome_distribuidor: string;
  industria: string | null;
  nome_vendedor: string;
  nome_supervisor: string | null;
  campanha: string | null;
  data_pedido: string;
  quantidade_pedidos: number;
  total_pedido: number | null;
  observacoes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  pedido_brindes?: PedidoBrinde[];
};

export type PedidoBrinde = {
  id: string;
  pedido_id: string;
  brinde_id: string;
  quantidade: number;
  data_entrega: string | null;
  status_brinde: "entregue" | "pendente";
  created_at: string;
  updated_at: string;
  brinde?: Brinde;
  pedido?: Pedido;
};

export type Movimentacao = {
  id: string;
  brinde_id: string | null;
  pedido_id: string | null;
  tipo: "entrada" | "saida" | "reserva" | "cancelamento";
  quantidade: number;
  descricao: string | null;
  responsavel: string | null;
  created_at: string;
  brinde?: Brinde;
  pedido?: Pedido;
};

export type Notificacao = {
  id: string;
  tipo:
    | "entrada_pedido"
    | "brinde_reservado"
    | "saida_brinde"
    | "estoque_baixo"
    | "nova_entrada";
  titulo: string;
  mensagem: string | null;
  lida: boolean;
  dados: Record<string, unknown> | null;
  created_at: string;
};

export type Campanha = {
  id: string;
  nome: string;
  descricao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  ativa: boolean;
  created_at: string;
  updated_at: string;
};

export type DashboardStats = {
  totalBrindesEstoque: number;
  totalBrindesDistribuidos: number;
  totalPedidos: number;
  brindesReservados: number;
  alertasEstoqueBaixo: number;
};
