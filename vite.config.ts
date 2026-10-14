/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

let devPool: Pool | null = null;
function getDevPool(connectionString: string) {
  if (!devPool) {
    devPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
  }
  return devPool;
}

function neonDevApiPlugin() {
  return {
    name: 'neon-dev-api',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith('/api/auth') && !req.url?.startsWith('/api/db')) {
          return next();
        }

        const env = loadEnv('development', process.cwd(), '');
        const connectionString = env.DATABASE_URL || process.env.DATABASE_URL || '';
        const JWT_SECRET = env.JWT_SECRET || 'oticalis-neon-jwt-secret-2026';

        if (!connectionString) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'DATABASE_URL não configurada no .env' }));
        }

        const pool = getDevPool(connectionString);
        const sql = {
          async query(text: string, params: any[] = []) {
            const result = await pool.query(text, params);
            return result.rows;
          }
        };

        // Ler body da requisição
        const buffers: Buffer[] = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        const bodyStr = Buffer.concat(buffers).toString('utf-8');
        let body: any = {};
        try {
          body = bodyStr ? JSON.parse(bodyStr) : {};
        } catch {
          body = {};
        }

        res.setHeader('Content-Type', 'application/json');

        if (req.url.startsWith('/api/auth')) {
          const { action, email, password, token } = body;

          if (action === 'login') {
            try {
              const userRes = await pool.query(
                'SELECT id, tenant_id, nome, email, senha_hash, role, ativo FROM usuarios WHERE LOWER(email) = LOWER($1) LIMIT 1',
                [email?.trim() || '']
              );
              const users = userRes.rows;
              if (users.length === 0) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'Credenciais inválidas.' }));
              }
              const user = users[0];
              const match = await bcrypt.compare(password, user.senha_hash);
              if (!match) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'Credenciais inválidas.' }));
              }
              const tokenPayload = { id: user.id, email: user.email, nome: user.nome, role: user.role };
              const jwtToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
              res.statusCode = 200;
              return res.end(JSON.stringify({
                user: tokenPayload,
                session: { access_token: jwtToken, user: tokenPayload }
              }));
            } catch (err: any) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ error: err.message }));
            }
          }

          if (action === 'getSession') {
            res.statusCode = 200;
            return res.end(JSON.stringify({ session: token ? { access_token: token } : null }));
          }

          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true }));
        }

        if (req.url.startsWith('/api/db')) {
          const { table, action, payload, filters, order, limit, offset, single } = body;
          try {
            if (action === 'select') {
              let query = `SELECT * FROM ${table}`;
              const values: any[] = [];
              let valIdx = 1;

              if (Array.isArray(filters) && filters.length > 0) {
                const whereClauses: string[] = [];
                for (const f of filters) {
                  const col = f.column.replace(/[^a-zA-Z0-9_]/g, '');
                  if (f.operator === 'eq') {
                    if (f.value === null) {
                      whereClauses.push(`${col} IS NULL`);
                    } else {
                      whereClauses.push(`${col} = $${valIdx++}`);
                      values.push(f.value);
                    }
                  } else if (f.operator === 'neq') {
                    if (f.value === null) {
                      whereClauses.push(`${col} IS NOT NULL`);
                    } else {
                      whereClauses.push(`${col} != $${valIdx++}`);
                      values.push(f.value);
                    }
                  } else if (f.operator === 'in') {
                    if (Array.isArray(f.value) && f.value.length > 0) {
                      const inPlaceholders = f.value.map(() => `$${valIdx++}`).join(', ');
                      whereClauses.push(`${col} IN (${inPlaceholders})`);
                      values.push(...f.value);
                    }
                  } else if (f.operator === 'gt') {
                    whereClauses.push(`${col} > $${valIdx++}`);
                    values.push(f.value);
                  } else if (f.operator === 'gte') {
                    whereClauses.push(`${col} >= $${valIdx++}`);
                    values.push(f.value);
                  } else if (f.operator === 'lt') {
                    whereClauses.push(`${col} < $${valIdx++}`);
                    values.push(f.value);
                  } else if (f.operator === 'lte') {
                    whereClauses.push(`${col} <= $${valIdx++}`);
                    values.push(f.value);
                  } else if (f.operator === 'like' || f.operator === 'ilike') {
                    whereClauses.push(`${col} ILIKE $${valIdx++}`);
                    values.push(f.value);
                  }
                }
                if (whereClauses.length > 0) query += ` WHERE ${whereClauses.join(' AND ')}`;
              }

              if (order?.column) {
                const orderCol = order.column.replace(/[^a-zA-Z0-9_]/g, '');
                const dir = order.ascending === false ? 'DESC' : 'ASC';
                query += ` ORDER BY ${orderCol} ${dir}`;
              }

              if (typeof limit === 'number') {
                query += ` LIMIT $${valIdx++}`;
                values.push(limit);
              }

              if (typeof offset === 'number') {
                query += ` OFFSET $${valIdx++}`;
                values.push(offset);
              }

              const rows = await sql.query(query, values);
              res.statusCode = 200;
              return res.end(JSON.stringify({ data: single ? (rows[0] || null) : rows, error: null, count: rows.length }));
            }

            if (action === 'insert') {
              const records = Array.isArray(payload) ? payload : [payload];
              const inserted: any[] = [];
              for (const rec of records) {
                const keys = Object.keys(rec).filter(k => rec[k] !== undefined);
                const cols = keys.map(k => k.replace(/[^a-zA-Z0-9_]/g, '')).join(', ');
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                const values = keys.map(k => rec[k]);
                const insertQuery = `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *;`;
                const result = await sql.query(insertQuery, values);
                if (result[0]) inserted.push(result[0]);
              }
              res.statusCode = 200;
              return res.end(JSON.stringify({ data: single ? (inserted[0] || null) : inserted, error: null }));
            }

            if (action === 'upsert') {
              const records = Array.isArray(payload) ? payload : [payload];
              const results: any[] = [];
              for (const rec of records) {
                const keys = Object.keys(rec).filter(k => rec[k] !== undefined);
                const cols = keys.map(k => k.replace(/[^a-zA-Z0-9_]/g, '')).join(', ');
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                const updateSets = keys.filter(k => k !== 'id').map(k => `${k} = EXCLUDED.${k}`).join(', ');
                const values = keys.map(k => rec[k]);
                const upsertQuery = `
                  INSERT INTO ${table} (${cols})
                  VALUES (${placeholders})
                  ON CONFLICT (id) DO UPDATE SET ${updateSets}
                  RETURNING *;
                `;
                const result = await sql.query(upsertQuery, values);
                if (result && result[0]) results.push(result[0]);
              }
              res.statusCode = 200;
              return res.end(JSON.stringify({ data: results, error: null }));
            }

            if (action === 'update') {
              const keys = Object.keys(payload || {}).filter(k => payload[k] !== undefined);
              const setClauses: string[] = [];
              const values: any[] = [];
              let valIdx = 1;
              for (const k of keys) {
                const col = k.replace(/[^a-zA-Z0-9_]/g, '');
                setClauses.push(`${col} = $${valIdx++}`);
                values.push(payload[k]);
              }
              let query = `UPDATE ${table} SET ${setClauses.join(', ')}`;
              if (Array.isArray(filters) && filters.length > 0) {
                const whereClauses: string[] = [];
                for (const f of filters) {
                  const col = f.column.replace(/[^a-zA-Z0-9_]/g, '');
                  if (f.operator === 'eq') {
                    whereClauses.push(`${col} = $${valIdx++}`);
                    values.push(f.value);
                  }
                }
                query += ` WHERE ${whereClauses.join(' AND ')}`;
              }
              query += ` RETURNING *;`;
              const rows = await sql.query(query, values);
              res.statusCode = 200;
              return res.end(JSON.stringify({ data: single ? (rows[0] || null) : rows, error: null }));
            }

            if (action === 'delete') {
              let query = `DELETE FROM ${table}`;
              const values: any[] = [];
              let valIdx = 1;
              if (Array.isArray(filters) && filters.length > 0) {
                const whereClauses: string[] = [];
                for (const f of filters) {
                  const col = f.column.replace(/[^a-zA-Z0-9_]/g, '');
                  if (f.operator === 'eq') {
                    whereClauses.push(`${col} = $${valIdx++}`);
                    values.push(f.value);
                  }
                }
                query += ` WHERE ${whereClauses.join(' AND ')}`;
              }
              query += ` RETURNING *;`;
              const rows = await sql.query(query, values);
              res.statusCode = 200;
              return res.end(JSON.stringify({ data: rows, error: null }));
            }

            res.statusCode = 200;
            return res.end(JSON.stringify({ data: [], error: null }));
          } catch (err: any) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ data: null, error: { message: err.message } }));
          }
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), neonDevApiPlugin()],
  server: {
    port: 4021,
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    testTimeout: 15000,
    fileParallelism: false,
  },
})

