# LPL mult - Gestão de Brindes

Sistema premium de gestão de brindes, estoque e vendas vinculadas a campanhas promocionais.

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Glassmorphism
- **Database**: Supabase (PostgreSQL + Realtime)
- **Charts**: Recharts
- **Deploy**: Vercel

## Configuração

### 1. Clonar e instalar
```bash
npm install
```

### 2. Configurar Supabase
1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute o arquivo `supabase/schema.sql` no SQL Editor do Supabase
3. Copie as credenciais do projeto

### 3. Variáveis de ambiente
Crie o arquivo `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
```

### 4. Rodar localmente
```bash
npm run dev
```

## Acesso
- **Usuário**: `lplmult`
- **Senha**: `lpl2025`

## Deploy no Vercel
1. Push para GitHub
2. Importe o projeto no Vercel
3. Configure as variáveis de ambiente
4. Deploy automático!

## Funcionalidades

- ✅ Dashboard com gráficos interativos em tempo real
- ✅ Entrada de brindes no estoque
- ✅ Registro completo de pedidos
- ✅ Detalhes do pedido com controle de entrega
- ✅ Gestão de estoque (cards visuais)
- ✅ Relatórios com exportação PDF e Excel
- ✅ Sistema de notificações em tempo real
- ✅ Modo Escuro / Claro
- ✅ Layout responsivo (desktop, tablet, mobile)
- ✅ Alertas automáticos de estoque baixo
- ✅ Campanhas promocionais configuráveis
