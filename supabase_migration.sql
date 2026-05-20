-- ============================================
-- ÓTICA LÌS — ESTRUTURA DO BANCO DE DADOS
-- Supabase (PostgreSQL)
-- ============================================

-- Habilitar UUID
create extension if not exists "uuid-ossp";

-- ============================================
-- TABELA: clientes
-- ============================================
create table if not exists clientes (
  id uuid primary key default uuid_generate_v4(),
  nome_completo text not null,
  cpf text unique,
  whatsapp text not null,
  data_nascimento date,
  lis_score integer default 850,
  criado_em timestamp with time zone default now()
);

-- Índices para performance
create index if not exists idx_clientes_cpf on clientes(cpf);
create index if not exists idx_clientes_nome on clientes(nome_completo);

-- ============================================
-- TABELA: agendamentos
-- ============================================
create table if not exists agendamentos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  data date not null,
  horario time not null,
  status text not null default 'AGENDADO',
  observacao text,
  criado_em timestamp with time zone default now()
);

-- Índice para busca por data
create index if not exists idx_agendamentos_data on agendamentos(data);

-- ============================================
-- RLS (Row Level Security) — Acesso público
-- ============================================
alter table clientes enable row level security;
alter table agendamentos enable row level security;

-- Política: permitir acesso total para o role anon (app frontend)
create policy "Acesso público clientes" on clientes
  for all using (true) with check (true);

create policy "Acesso público agendamentos" on agendamentos
  for all using (true) with check (true);
