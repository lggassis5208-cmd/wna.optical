import { neonClient, isNeonConfigured } from './neon';

// Redireciona transparentemente todas as operações para o Neon PostgreSQL Serverless
export const supabase: any = neonClient;

export const isSupabaseConfigured = () => {
  return isNeonConfigured();
};
