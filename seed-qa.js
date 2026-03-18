const seedData = () => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  oneYearAgo.setHours(oneYearAgo.getHours() - 1); // Ensure it's slightly older than exactly 1 year

  const oldSale = {
    id: 'test-old-sale',
    cliente_nome: 'João Silva (Teste)',
    cliente_cpf: '123.456.789-00',
    tecnico: 'Dr. Teste',
    valor_total: 1000,
    forma_pagamento: 'Dinheiro',
    status: 'ENTREGUE',
    criado_em: oneYearAgo.toISOString(),
    od_esferico: '+1.50',
    oe_esferico: '+1.75'
  };

  const sales = JSON.parse(localStorage.getItem('lis_vendas') || '[]');
  if (!sales.find(s => s.id === 'test-old-sale')) {
    sales.push(oldSale);
    localStorage.setItem('lis_vendas', JSON.stringify(sales));
  }

  const clients = JSON.parse(localStorage.getItem('lis_clientes') || '[]');
  if (!clients.find(c => c.cpf === '123.456.789-00')) {
    clients.push({
      id: 'test-client',
      name: 'João Silva (Teste)',
      cpf: '123.456.789-00',
      whatsapp: '(62) 98888-7777',
      criado_em: oneYearAgo.toISOString()
    });
    localStorage.setItem('lis_clientes', JSON.stringify(clients));
  }
};

seedData();
console.log('Test data seeded for 1-year return alert.');
