import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import * as bcryptModule from 'bcryptjs';
import * as jwtModule from 'jsonwebtoken';

const bcryptLib: any = (bcryptModule as any).default || bcryptModule;
const jwtLib: any = (jwtModule as any).default || jwtModule;

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_IUO8NdES9lRB@ep-spring-art-ayncu70h-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const JWT_SECRET = process.env.JWT_SECRET || 'oticalis-neon-jwt-secret-2026';


let pool: Pool | null = null;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!connectionString) {
    return res.status(500).json({ error: 'DATABASE_URL não configurada no servidor.' });
  }

  const { action, email, password, nome } = req.body;

  try {
    if (action === 'login') {
      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      }

      const usersResult = await getPool().query(
        'SELECT id, tenant_id, nome, email, senha_hash, role, ativo FROM usuarios WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [email.trim()]
      );
      const users = usersResult.rows;

      if (users.length === 0) {
        return res.status(401).json({ error: 'Credenciais inválidas ou usuário não encontrado.' });
      }

      const user = users[0];
      if (!user.ativo) {
        return res.status(403).json({ error: 'Usuário inativo. Contate o administrador.' });
      }

      const validPassword = await bcryptLib.compare(password, user.senha_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }

      const tokenPayload = {
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        nome: user.nome,
        role: user.role
      };

      const token = jwtLib.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

      return res.status(200).json({
        user: tokenPayload,
        session: {
          access_token: token,
          token_type: 'bearer',
          user: tokenPayload
        }
      });
    }

    if (action === 'signup') {
      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      }

      const existingResult = await getPool().query(
        'SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [email.trim()]
      );

      if (existingResult.rows.length > 0) {
        return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
      }

      const senhaHash = await bcryptLib.hash(password, 10);
      const nomeUsuario = nome || email.split('@')[0];

      const insertResult = await getPool().query(
        'INSERT INTO usuarios (nome, email, senha_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, tenant_id, nome, email, role',
        [nomeUsuario, email.trim(), senhaHash, 'admin']
      );

      const newUser = insertResult.rows[0];
      const token = jwtLib.sign(newUser, JWT_SECRET, { expiresIn: '7d' });

      return res.status(200).json({
        user: newUser,
        session: {
          access_token: token,
          token_type: 'bearer',
          user: newUser
        }
      });
    }

    if (action === 'getSession') {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.body.token;

      if (!token) {
        return res.status(200).json({ session: null });
      }

      try {
        const decoded = jwtLib.verify(token, JWT_SECRET) as any;
        return res.status(200).json({
          session: {
            access_token: token,
            user: decoded
          }
        });
      } catch {
        return res.status(200).json({ session: null });
      }
    }

    return res.status(400).json({ error: 'Ação não reconhecida.' });
  } catch (err: any) {
    console.error('Erro no /api/auth:', err);
    return res.status(500).json({ error: err.message || 'Erro interno no servidor de autenticação.' });
  }
}
