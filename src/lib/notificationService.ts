import { storage } from './storage';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'EXAM' | 'STOCK' | 'FINANCIAL' | 'READY' | 'BIRTHDAY';
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  read: boolean;
  actionParam?: string;
  phone?: string;
  whatsappMessage?: string;
}

export const notificationService = {
  getReadNotifications(): string[] {
    return JSON.parse(localStorage.getItem('lis_read_notifications') || '[]');
  },

  markAsRead(id: string) {
    const read = this.getReadNotifications();
    if (!read.includes(id)) {
      read.push(id);
      localStorage.setItem('lis_read_notifications', JSON.stringify(read));
    }
  },

  async getActiveNotifications(): Promise<AppNotification[]> {
    const notifications: AppNotification[] = [];
    const readIds = this.getReadNotifications();
    const clients = await storage.getClients();
    const now = new Date();
    
    // 1. Verificar Aniversariantes do Dia
    const mesHoje = now.getMonth() + 1;
    const diaHoje = now.getDate();
    
    clients.forEach((client: any) => {
      if (!client.data_nascimento) return;
      // Assume o formato YYYY-MM-DD
      const parts = client.data_nascimento.split('-');
      if (parts.length < 3) return;
      
      const m = parseInt(parts[1]);
      const d = parseInt(parts[2]);
      
      if (m === mesHoje && d === diaHoje) {
        const id = `bday-${client.id}-${now.getFullYear()}`;
        if (!readIds.includes(id)) {
          notifications.push({
            id,
            title: '🎂 Aniversariando Hoje!',
            message: `${client.name} está completando mais um ano de vida. Envie um presente!`,
            type: 'BIRTHDAY',
            severity: 'medium',
            timestamp: now.toISOString(),
            read: false,
            actionParam: client.id,
            phone: client.whatsapp,
            whatsappMessage: `Parabéns pelo seu Aniversário! A Ótica Lìs gostaria de te presentear com um desconto especial, passe em nossa Ótica e confira agora!`
          });
        }
      }
    });

    // 2. Verificar Exames (Próximas 12 horas)
    const exames = await storage.getExames();
    const within12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    
    exames.forEach((exame: any) => {
      if (exame.status !== 'AGENDADO') return;
      
      const examDate = new Date(`${exame.data}T${exame.horario}:00`);
      const id = `exam-${exame.id}`;
      
      if (examDate > now && examDate <= within12h && !readIds.includes(id)) {
        notifications.push({
          id,
          title: 'Lembrete de Exame',
          message: `Paciente ${exame.paciente_nome} agendado para as ${exame.horario}. Enviar Zap!`,
          type: 'EXAM',
          severity: 'high',
          timestamp: new Date().toISOString(),
          read: false,
          actionParam: exame.id,
          phone: exame.paciente_whatsapp,
          whatsappMessage: `Olá ${exame.paciente_nome}, confirmamos seu exame na Ótica Lìs para amanhã às ${exame.horario}? Vila Concórdia aguarda você!`
        });
      }
    });

    // 3. Verificar Óculos Prontos (Vendas status PRONTA)
    const sales = await storage.getSales();
    sales.forEach((sale: any) => {
      if (sale.status !== 'PRONTA') return;
      
      const client = clients.find((c: any) => c.id === sale.cliente_id || c.cpf === sale.paciente_cpf);
      const clienteNome = client?.name || sale.cliente_nome || 'Cliente';
      const id = `ready-${sale.id}`;

      if (!readIds.includes(id)) {
        notifications.push({
          id,
          title: 'Óculos Pronto!',
          message: `O pedido de ${clienteNome} está pronto para entrega.`,
          type: 'READY',
          severity: 'medium',
          timestamp: sale.data_pronto || new Date().toISOString(),
          read: false,
          actionParam: sale.id,
          phone: client?.whatsapp || sale.cliente_whatsapp,
          whatsappMessage: `Olá ${clienteNome}! Boas notícias: seu óculos já está pronto na Ótica Lìs. Pode vir buscar! 👓`
        });
      }
    });

    // 4. Verificar Estoque Baixo
    const products = await storage.getProducts();
    products.forEach((prod: any) => {
      const stock = Number(prod.estoque) || 0;
      const min = Number(prod.stock_minimo) || 0;
      
      if (stock <= min) {
        notifications.push({
          id: `stock-${prod.id}`,
          title: 'Estoque Baixo',
          message: `${prod.nome} está com apenas ${stock} unidades.`,
          type: 'STOCK',
          severity: stock === 0 ? 'high' : 'medium',
          timestamp: new Date().toISOString(),
          read: false,
          actionParam: prod.id
        });
      }
    });

    return notifications;
  }
};
