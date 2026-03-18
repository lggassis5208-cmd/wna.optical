import { supabase } from './supabase';

// Utility to check if Supabase is actually configured
const isSupabaseConfigured = () => {
  return import.meta.env.VITE_SUPABASE_URL && 
         import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co';
};

export const storage = {
  // --- CLIENTES ---
  async saveClient(client: any) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('clientes').insert([client]).select();
        if (!error) {
          console.log('Saved to Supabase');
          return data;
        }
        console.warn('Supabase insert error', error);
      } catch (e) {
        console.error('Supabase error, falling back to LocalStorage', e);
      }
    }
    
    // LocalStorage Fallback
    console.log('Saving to LocalStorage (Fallback)');
    const clients = JSON.parse(localStorage.getItem('lis_clientes') || '[]');
    const newClient = { ...client, id: Math.random().toString(36).substr(2, 9), criado_em: new Date().toISOString() };
    clients.push(newClient);
    localStorage.setItem('lis_clientes', JSON.stringify(clients));
    return newClient;
  },

  async getClients() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('clientes').select('*').order('criado_em', { ascending: false });
        if (!error) return data;
        console.warn('Supabase select error', error);
      } catch (e) {
        console.error('Supabase fetch error, using LocalStorage', e);
      }
    }
    console.log('Fetching from LocalStorage');
    return JSON.parse(localStorage.getItem('lis_clientes') || '[]');
  },

  // --- VENDAS ---
  async saveSale(sale: any) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('vendas').insert([sale]).select();
        if (!error) {
          console.log('Sale saved to Supabase');
          return data;
        }
        console.warn('Supabase insert error', error);
      } catch (e) {
        console.error('Supabase error, falling back to LocalStorage', e);
      }
    }

    // LocalStorage Fallback
    console.log('Saving sale to LocalStorage (Fallback)');
    const sales = JSON.parse(localStorage.getItem('lis_vendas') || '[]');
    const newSale = { 
      ...sale, 
      id: Math.random().toString(36).substr(2, 9), 
      os_number: `OS-${new Date().getFullYear()}-${(sales.length + 1).toString().padStart(3, '0')}`,
      criado_em: new Date().toISOString() 
    };
    sales.push(newSale);
    localStorage.setItem('lis_vendas', JSON.stringify(sales));
    return newSale;
  },

  async getSales() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('vendas').select('*').order('criado_em', { ascending: false });
        if (!error) return data;
        console.warn('Supabase select error', error);
      } catch (e) {
        console.error('Supabase fetch error, using LocalStorage', e);
      }
    }
    console.log('Fetching sales from LocalStorage');
    return JSON.parse(localStorage.getItem('lis_vendas') || '[]');
  },

  // --- AGENDA / EXAMES ---
  async saveExame(exame: any) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('exames').insert([exame]).select();
        if (!error) return data;
      } catch (e) {
        console.warn('Supabase error, falling back to LocalStorage', e);
      }
    }
    const exames = JSON.parse(localStorage.getItem('lis_exames') || '[]');
    const newExame = { 
      ...exame, 
      id: Math.random().toString(36).substr(2, 9), 
      criado_em: new Date().toISOString() 
    };
    exames.push(newExame);
    localStorage.setItem('lis_exames', JSON.stringify(exames));
    return newExame;
  },

  async getExames() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('exames').select('*').order('data', { ascending: true });
        if (!error) return data;
      } catch (e) {
        console.warn('Supabase error, using LocalStorage', e);
      }
    }
    return JSON.parse(localStorage.getItem('lis_exames') || '[]');
  },

  async updateExameStatus(id: string, status: string) {
    const exames = await this.getExames();
    const index = exames.findIndex((e: any) => e.id === id);
    if (index !== -1) {
      exames[index].status = status;
      localStorage.setItem('lis_exames', JSON.stringify(exames));
      return exames[index];
    }
    return null;
  },

  // --- CAIXA DIÁRIO ---
  async getCaixaAtual() {
    const todos = JSON.parse(localStorage.getItem('lis_caixas') || '[]');
    return todos.find((c: any) => c.status === 'ABERTO') || null;
  },

  async getHistoricoCaixa() {
    return JSON.parse(localStorage.getItem('lis_caixas') || '[]');
  },

  async abrirCaixa(saldoInicial: number) {
    const todos = JSON.parse(localStorage.getItem('lis_caixas') || '[]');
    const caixaAberto = todos.find((c: any) => c.status === 'ABERTO');
    
    if (caixaAberto) throw new Error('Já existe um caixa aberto.');

    const novoCaixa = {
      id: Math.random().toString(36).substr(2, 9),
      status: 'ABERTO',
      data_abertura: new Date().toISOString(),
      saldo_inicial: saldoInicial,
      entradas: { dinheiro: 0, pix: 0, cartao: 0 },
      saidas: 0,
      vendas: []
    };

    todos.push(novoCaixa);
    localStorage.setItem('lis_caixas', JSON.stringify(todos));
    return novoCaixa;
  },

  async fecharCaixa(id: string) {
    const todos = JSON.parse(localStorage.getItem('lis_caixas') || '[]');
    const index = todos.findIndex((c: any) => c.id === id);
    if (index !== -1) {
      todos[index].status = 'FECHADO';
      todos[index].data_fechamento = new Date().toISOString();
      localStorage.setItem('lis_caixas', JSON.stringify(todos));
      return todos[index];
    }
    return null;
  },

  // --- FINANCEIRO (PONTAS A PAGAR / RECEBER) ---
  async getFinanceiro() {
    const pagar = JSON.parse(localStorage.getItem('lis_contas_pagar') || '[]');
    const receber = JSON.parse(localStorage.getItem('lis_contas_receber') || '[]');
    return { pagar, receber };
  },

  async saveContaPagar(conta: any) {
    const contas = JSON.parse(localStorage.getItem('lis_contas_pagar') || '[]');
    const novaConta = { ...conta, id: Math.random().toString(36).substr(2, 9), status: 'PENDENTE' };
    contas.push(novaConta);
    localStorage.setItem('lis_contas_pagar', JSON.stringify(contas));
    return novaConta;
  },

  async saveContaReceber(conta: any) {
    const contas = JSON.parse(localStorage.getItem('lis_contas_receber') || '[]');
    const novaConta = { ...conta, id: Math.random().toString(36).substr(2, 9), status: 'PENDENTE' };
    contas.push(novaConta);
    localStorage.setItem('lis_contas_receber', JSON.stringify(contas));
    return novaConta;
  },

  // --- FISCAL ---
  async saveNotaFiscal(nota: any) {
    const notas = JSON.parse(localStorage.getItem('lis_notas_fiscais') || '[]');
    const novaNota = { 
      ...nota, 
      id: Math.random().toString(36).substr(2, 9), 
      numero: (notas.length + 1).toString().padStart(6, '0'),
      data_emissao: new Date().toISOString() 
    };
    notas.push(novaNota);
    localStorage.setItem('lis_notas_fiscais', JSON.stringify(notas));
    return novaNota;
  },

  async getNotasFiscais() {
    return JSON.parse(localStorage.getItem('lis_notas_fiscais') || '[]');
  },

  async registrarVenda(sale: any) {
    const caixa = await this.getCaixaAtual();
    if (!caixa) throw new Error('É necessário abrir o caixa antes de realizar uma venda.');

    // 1. Salva a venda
    const novaVenda = await this.saveSale(sale);

    // 2. Atualiza o caixa atual
    const todosCaixas = JSON.parse(localStorage.getItem('lis_caixas') || '[]');
    const caixaIndex = todosCaixas.findIndex((c: any) => c.id === caixa.id);
    
    if (caixaIndex !== -1) {
      const forma = sale.forma_pagamento.toLowerCase();
      const valor = Number(sale.valor_total);
      
      if (forma.includes('dinheiro')) todosCaixas[caixaIndex].entradas.dinheiro += valor;
      else if (forma.includes('pix')) todosCaixas[caixaIndex].entradas.pix += valor;
      else todosCaixas[caixaIndex].entradas.cartao += valor;
      
      todosCaixas[caixaIndex].vendas.push(novaVenda.id);
      localStorage.setItem('lis_caixas', JSON.stringify(todosCaixas));
    }

    // 3. Cria conta a receber (Automático para todas as vendas)
    await this.saveContaReceber({
      descricao: `Venda ${novaVenda.os_number}`,
      valor: sale.valor_total,
      vencimento: new Date().toISOString(),
      categoria: 'Venda de Produtos',
      status: sale.forma_pagamento === 'Crediário Lis' ? 'PENDENTE' : 'PAGO',
      venda_id: novaVenda.id
    });

    return novaVenda;
  },

  async registrarNotaFiscal(nota: any) {
    const caixa = await this.getCaixaAtual();
    if (!caixa) throw new Error('É necessário abrir o caixa antes de emitir uma nota fiscal.');

    // 1. Salva a Nota Fiscal
    const novaNota = await this.saveNotaFiscal(nota);

    // 2. Atualiza o caixa atual (Faturamento)
    const todosCaixas = JSON.parse(localStorage.getItem('lis_caixas') || '[]');
    const caixaIndex = todosCaixas.findIndex((c: any) => c.id === caixa.id);
    
    if (caixaIndex !== -1) {
      const valor = Number(nota.valor_total || 0);
      // Por padrão, notas manuais entram como faturamento geral no cartão/pix se não especificado
      // Mas aqui vamos apenas registrar no total de vendas do caixa para o gráfico
      if (!todosCaixas[caixaIndex].notas) todosCaixas[caixaIndex].notas = [];
      todosCaixas[caixaIndex].notas.push(novaNota.id);
      
      // Se a nota tiver valor, somamos no faturamento do dia (vamos usar pix como padrão se manual)
      todosCaixas[caixaIndex].entradas.pix += valor;
      
      localStorage.setItem('lis_caixas', JSON.stringify(todosCaixas));
    }

    // 3. Cria conta a receber
    await this.saveContaReceber({
      descricao: `NF-e ${novaNota.numero}`,
      valor: nota.valor_total || 0,
      vencimento: new Date().toISOString(),
      categoria: 'Venda Fiscal',
      status: 'PAGO', // Notas fiscais geralmente representam operações já liquidadas ou faturadas
      nota_id: novaNota.id
    });

    return novaNota;
  },

  // --- CONFIGURAÇÕES ---
  async getSettings() {
    const defaults = {
      empresa: {
        nome_fantasia: 'Ótica Lis',
        razao_social: '',
        cnpj: '',
        ie: '',
        endereco: ''
      },
      fiscal: {
        serie: '1',
        ambiente: 'homologacao'
      },
      certificado: {
        arquivo_nome: '',
        data_validade: '',
        configurado: false
      },
      sistema: {
        trava_caixa: true,
        termos_garantia: 'Garantia de 1 ano para defeitos de fabricação.'
      }
    };
    const settings = JSON.parse(localStorage.getItem('lis_settings') || 'null');
    return settings || defaults;
  },

  async saveSettings(settings: any) {
    localStorage.setItem('lis_settings', JSON.stringify(settings));
    return settings;
  }
};
