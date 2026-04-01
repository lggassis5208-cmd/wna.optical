import { storage } from './storage';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'EXAM' | 'STOCK' | 'FINANCIAL';
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  read: boolean;
  actionParam?: string;
}

export const notificationService = {
  async getActiveNotifications(): Promise<AppNotification[]> {
    const notifications: AppNotification[] = [];
    
    // 1. Verificar Exames (Próximas 12 horas)
    const exames = await storage.getExames();
    const now = new Date();
    const within12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    
    exames.forEach((exame: any) => {
      if (exame.status !== 'AGENDADO') return;
      
      const examDate = new Date(`${exame.data}T${exame.horario}:00`);
      if (examDate > now && examDate <= within12h) {
        notifications.push({
          id: `exam-${exame.id}`,
          title: 'Lembrete de Exame',
          message: `Paciente ${exame.paciente_nome} agendado para as ${exame.horario}. Enviar Zap!`,
          type: 'EXAM',
          severity: 'high',
          timestamp: new Date().toISOString(),
          read: false,
          actionParam: exame.id
        });
      }
    });

    // 2. Verificar Estoque Baixo
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
