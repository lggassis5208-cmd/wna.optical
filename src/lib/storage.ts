import { supabase } from './supabase';

// Utility to check if Supabase is actually configured
const isSupabaseConfigured = () => {
  return import.meta.env.VITE_SUPABASE_URL && 
         import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co';
};

// Auxiliar para pegar o endereço correto baseado na data
export const getEffectiveAddress = (dateStr?: string) => {
  // Ajuste para evitar shift de timezone em strings YYYY-MM-DD
  const dateStrFixed = (dateStr && dateStr.length === 10) ? `${dateStr}T12:00:00` : dateStr;
  const date = dateStrFixed ? new Date(dateStrFixed) : new Date();
  
  //getDay() retorna 5 para Sexta-feira
  if (date.getDay() === 5) {
    return "Av das Esmeraldas Qd 42 Lt 14 - Recanto das Minas Gerais";
  }
  return "Av Anápolis Qd 03 Lt 01 - Vila Concórdia";
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
      vendas: [],
      movimentacoes: []
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
      id: nota.id || Math.random().toString(36).substr(2, 9), 
      numero: nota.numero || (notas.length + 1).toString().padStart(6, '0'),
      data_emissao: nota.data_emissao || new Date().toISOString(),
      status: nota.status || 'PENDENTE'
    };
    
    const index = notas.findIndex((n: any) => n.id === novaNota.id);
    if (index !== -1) {
      notas[index] = novaNota;
    } else {
      notas.push(novaNota);
    }
    
    localStorage.setItem('lis_notas_fiscais', JSON.stringify(notas));
    return novaNota;
  },

  async getNotasFiscais() {
    const notas = JSON.parse(localStorage.getItem('lis_notas_fiscais') || '[]');
    return notas.sort((a: any, b: any) => new Date(b.data_emissao).getTime() - new Date(a.data_emissao).getTime());
  },

  async cancelarNotaFiscal(notaId: string) {
    const notas = await this.getNotasFiscais();
    const index = notas.findIndex((n: any) => n.id === notaId);
    if (index !== -1) {
      notas[index].status = 'CANCELADA';
      localStorage.setItem('lis_notas_fiscais', JSON.stringify(notas));
      return notas[index];
    }
    return null;
  },

  async gerarNotaDeVenda(saleId: string) {
    const [sales, clients] = await Promise.all([
      this.getSales(),
      this.getClients()
    ]);
    
    const sale = sales.find((s: any) => s.id === saleId);
    if (!sale) throw new Error('Venda não encontrada.');

    const client = clients.find((c: any) => c.id === sale.cliente_id || c.cpf === sale.paciente_cpf);
    const cliente_nome = client?.name || sale.paciente_nome || sale.tecnico || 'Consumidor Final';

    const novaNota = {
      cliente: cliente_nome,
      cliente_doc: client?.documento || client?.cpf || sale.paciente_cpf || '',
      valor_total: sale.valor_total || sale.total || 0,
      itens: sale.items || [],
      venda_id: sale.id,
      status: 'EMITIDA', // Na prática seria disparado para SEFAZ, aqui simulamos sucesso imediato
      natureza: 'Venda de Mercadoria',
      cfop: '5102'
    };

    return await this.registrarNotaFiscal(novaNota);
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
      if (!todosCaixas[caixaIndex].movimentacoes) todosCaixas[caixaIndex].movimentacoes = [];
      
      todosCaixas[caixaIndex].movimentacoes.push({
        id: Math.random().toString(36).substr(2, 9),
        horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        tipo: 'ENTRADA',
        descricao: `Venda ${novaVenda.os_number} - ${sale.paciente_nome || sale.tecnico || 'Cliente'}`,
        forma_pagamento: sale.forma_pagamento,
        valor: Number(sale.valor_total),
        cliente_whatsapp: sale.paciente_whatsapp || sale.cliente_whatsapp || null,
        status: 'concluído'
      });

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

  async darBaixaVenda(saleId: string) {
    const sales = await this.getSales();
    const index = sales.findIndex((s: any) => s.id === saleId);
    
    if (index === -1) throw new Error('Venda não encontrada');
    
    const sale = sales[index];
    if (sale.status === 'PRONTA' || sale.status === 'ENTREGUE') {
      return sale; // Já baixada
    }

    // 1. Atualizar Status
    sale.status = 'PRONTA';
    sale.data_pronto = new Date().toISOString();
    
    // 2. Registrar no Caixa (se for pagamento imediato e caixa aberto)
    try {
      const caixa = await this.getCaixaAtual();
      if (caixa) {
        const todosCaixas = JSON.parse(localStorage.getItem('lis_caixas') || '[]');
        const cIdx = todosCaixas.findIndex((c: any) => c.id === caixa.id);
        if (cIdx !== -1) {
          const forma = (sale.forma_pagamento || '').toLowerCase();
          const valor = Number(sale.valor_total || 0);
          
          if (forma.includes('dinheiro')) todosCaixas[cIdx].entradas.dinheiro += valor;
          else if (forma.includes('pix')) todosCaixas[cIdx].entradas.pix += valor;
          else todosCaixas[cIdx].entradas.cartao += valor;
          
          localStorage.setItem('lis_caixas', JSON.stringify(todosCaixas));
        }
      }
    } catch (e) {
      console.error('Erro ao atualizar caixa na baixa', e);
    }

    // 3. Atualizar Financeiro (Se era pendente, marcar como pago)
    const { receber } = await this.getFinanceiro();
    const contaIdx = receber.findIndex((r: any) => r.venda_id === saleId);
    if (contaIdx !== -1) {
      receber[contaIdx].status = 'PAGO';
      localStorage.setItem('lis_contas_receber', JSON.stringify(receber));
    }

    // 4. Salvar venda atualizada
    sales[index] = sale;
    localStorage.setItem('lis_vendas', JSON.stringify(sales));

    return sale;
  },

  async registrarSaida(caixaId: string, descricao: string, valor: number, formaPagamento: string) {
    const todosCaixas = JSON.parse(localStorage.getItem('lis_caixas') || '[]');
    const index = todosCaixas.findIndex((c: any) => c.id === caixaId);
    
    if (index !== -1) {
      todosCaixas[index].saidas += Number(valor);
      
      if (!todosCaixas[index].movimentacoes) todosCaixas[index].movimentacoes = [];
      
      todosCaixas[index].movimentacoes.push({
        id: Math.random().toString(36).substr(2, 9),
        horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        tipo: 'SAIDA',
        descricao: descricao,
        forma_pagamento: formaPagamento,
        valor: Number(valor),
        status: 'concluído'
      });

      localStorage.setItem('lis_caixas', JSON.stringify(todosCaixas));
      return todosCaixas[index];
    }
    return null;
  },

  async updateSaleStatus(saleId: string, newStatus: string) {
    const sales = await this.getSales();
    const index = sales.findIndex((s: any) => s.id === saleId);
    
    if (index !== -1) {
      const oldStatus = sales[index].status;
      sales[index].status = newStatus;
      
      // Lógica de Baixa Automática (Trigger Manual no Backend/Storage)
      if ((newStatus === 'MONTAGEM' || newStatus === 'FINALIZADO') && oldStatus !== 'MONTAGEM' && oldStatus !== 'FINALIZADO') {
        const products = await this.getProducts();
        // Busca produto pelo tipo e tratamento da venda
        const sale = sales[index];
        const prodIndex = products.findIndex((p: any) => 
          p.nome.toLowerCase().includes((sale.tipo_lente || '').toLowerCase()) && 
          p.nome.toLowerCase().includes((sale.tratamento || '').toLowerCase())
        );

        if (prodIndex !== -1) {
          products[prodIndex].estoque = Math.max(0, (Number(products[prodIndex].estoque) || 0) - 1);
          localStorage.setItem('lis_produtos', JSON.stringify(products));
          console.log(`Baixa de estoque realizada para: ${products[prodIndex].nome}`);
        }
      }

      localStorage.setItem('lis_vendas', JSON.stringify(sales));
      return sales[index];
    }
    return null;
  },

  async registrarNotaFiscal(nota: any) {
    const caixa = await this.getCaixaAtual();
    if (!caixa) throw new Error('É necessário abrir o caixa antes de emitir uma nota fiscal.');

    // --- SIMULAÇÃO TRANSMISSÃO SEFAZ ---
    // Simula atraso de rede/processamento da SEFAZ
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simula erro de CNPJ Inválido se o documento for composto por zeros
    const docDigits = (nota.cliente_doc || '').replace(/\D/g, '');
    if (docDigits === '00000000000' || docDigits === '00000000000000') {
      throw new Error('Erro SEFAZ (Rejeição 207): CNPJ do Destinatário Inválido.');
    }
    // -----------------------------------

    // 1. Salva a Nota Fiscal
    const novaNota = await this.saveNotaFiscal(nota);

    // 2. Atualiza o caixa atual (Faturamento)
    const todosCaixas = JSON.parse(localStorage.getItem('lis_caixas') || '[]');
    const caixaIndex = todosCaixas.findIndex((c: any) => c.id === caixa.id);
    
    if (caixaIndex !== -1) {
      const valor = Number(nota.valor_total || 0);
      if (!todosCaixas[caixaIndex].notas) todosCaixas[caixaIndex].notas = [];
      todosCaixas[caixaIndex].notas.push(novaNota.id);
      
      todosCaixas[caixaIndex].entradas.pix += valor;
      
      localStorage.setItem('lis_caixas', JSON.stringify(todosCaixas));
    }

    // 3. Cria conta a receber
    await this.saveContaReceber({
      descricao: `NF-e ${novaNota.numero}`,
      valor: nota.valor_total || 0,
      vencimento: new Date().toISOString(),
      categoria: 'Venda Fiscal',
      status: 'PAGO',
      nota_id: novaNota.id
    });

    return novaNota;
  },

  // --- PRODUTOS & ESTOQUE ---
  async getProducts() {
    return JSON.parse(localStorage.getItem('lis_produtos') || '[]');
  },

  async saveProduct(product: any) {
    const products = await this.getProducts();
    const newProduct = { 
      ...product, 
      id: product.id || Math.random().toString(36).substr(2, 9),
      criado_em: product.criado_em || new Date().toISOString()
    };
    
    const index = products.findIndex((p: any) => p.id === newProduct.id);
    if (index !== -1) {
      products[index] = newProduct;
    } else {
      products.push(newProduct);
    }
    
    localStorage.setItem('lis_produtos', JSON.stringify(products));
    return newProduct;
  },

  async seedDemoProducts() {
    const products = await this.getProducts();
    if (products.length === 0) {
      const demo = [
        { id: 'p1', nome: 'Lente BVS Crizal Sapphire', categoria: 'Visão Simples', material: 'Resina 1.56', preco_venda: 450.00, preco_custo: 200.00, estoque: 12, stock_minimo: 5, unidade: 'Par' },
        { id: 'p2', nome: 'Lente LP Video Filter Blue', categoria: 'Lente Pronta', material: 'Policarbonato', preco_venda: 280.00, preco_custo: 120.00, estoque: 4, stock_minimo: 10, unidade: 'Par' },
        { id: 'p3', nome: 'Lente LP Easy Clean', categoria: 'Lente Pronta', material: 'Resina 1.50', preco_venda: 150.00, preco_custo: 60.00, estoque: 0, stock_minimo: 3, unidade: 'Par' }
      ];
      localStorage.setItem('lis_produtos', JSON.stringify(demo));
      return demo;
    }
    return products;
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
      },
      sicoob: {
        clientId: '',
        certificateName: '',
        configured: false,
        lastSync: null
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
