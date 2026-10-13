import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || '';

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

const sql = {
  async query(text: string, params: any[] = []) {
    const result = await getPool().query(text, params);
    return result.rows;
  }
};

  const { table, action, payload, filters, order, limit, offset, single, count } = req.body;

  if (!table || typeof table !== 'string') {
    return res.status(400).json({ error: 'Tabela inválida ou não especificada.' });
  }

  // Lista de tabelas e views permitidas para segurança
  const ALLOWED_TABLES = new Set([
    'tenants', 'usuarios', 'configuracoes_fiscais', 'categorias', 'produtos',
    'clientes', 'caixas', 'vendas', 'pagamentos_venda', 'itens_venda',
    'movimentos_caixa', 'agendamentos', 'agendamento_eventos', 'fichas_medicas',
    'refracoes', 'fichas_medicas_acesso_log', 'crm_funis', 'crm_etapas',
    'crm_leads', 'crm_lead_eventos', 'crm_tarefas', 'crm_followup_fila',
    'segmentos', 'campanhas', 'campanha_disparos', 'lista_supressao',
    'v_clientes_metricas'
  ]);

  if (!ALLOWED_TABLES.has(table.toLowerCase())) {
    return res.status(403).json({ error: `Acesso à tabela '${table}' não autorizado.` });
  }

  try {
    // 1. SELECT
    if (action === 'select') {
      let query = `SELECT * FROM ${table}`;
      const values: any[] = [];
      let valIdx = 1;

      // Filtros
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
        if (whereClauses.length > 0) {
          query += ` WHERE ${whereClauses.join(' AND ')}`;
        }
      }

      // Order
      if (order && order.column) {
        const orderCol = order.column.replace(/[^a-zA-Z0-9_]/g, '');
        const dir = order.ascending === false ? 'DESC' : 'ASC';
        query += ` ORDER BY ${orderCol} ${dir}`;
      }

      // Limit / Offset
      if (typeof limit === 'number') {
        query += ` LIMIT $${valIdx++}`;
        values.push(limit);
      }
      if (typeof offset === 'number') {
        query += ` OFFSET $${valIdx++}`;
        values.push(offset);
      }

      const rows = await sql.query(query, values);

      if (single) {
        return res.status(200).json({ data: rows[0] || null, error: null });
      }

      return res.status(200).json({ data: rows, error: null, count: rows.length });
    }

    // 2. INSERT
    if (action === 'insert') {
      const records = Array.isArray(payload) ? payload : [payload];
      if (records.length === 0) {
        return res.status(200).json({ data: [], error: null });
      }

      const insertedRows: any[] = [];

      for (const rec of records) {
        const keys = Object.keys(rec).filter(k => rec[k] !== undefined);
        const cols = keys.map(k => k.replace(/[^a-zA-Z0-9_]/g, '')).join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map(k => rec[k]);

        const insertQuery = `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *;`;
        const res = await sql.query(insertQuery, values);
        if (res && res[0]) {
          insertedRows.push(res[0]);
        }
      }

      return res.status(200).json({ data: insertedRows, error: null });
    }

    // 3. UPDATE
    if (action === 'update') {
      const keys = Object.keys(payload || {}).filter(k => payload[k] !== undefined);
      if (keys.length === 0) {
        return res.status(200).json({ data: [], error: null });
      }

      const setClauses: string[] = [];
      const values: any[] = [];
      let valIdx = 1;

      for (const k of keys) {
        const col = k.replace(/[^a-zA-Z0-9_]/g, '');
        setClauses.push(`${col} = $${valIdx++}`);
        values.push(payload[k]);
      }

      let query = `UPDATE ${table} SET ${setClauses.join(', ')}`;

      // Filtros
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
      return res.status(200).json({ data: rows, error: null });
    }

    // 4. DELETE
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
          } else if (f.operator === 'neq') {
            whereClauses.push(`${col} != $${valIdx++}`);
            values.push(f.value);
          }
        }
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      query += ` RETURNING *;`;
      const rows = await sql.query(query, values);
      return res.status(200).json({ data: rows, error: null });
    }

    // 5. UPSERT
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
        const res = await sql.query(upsertQuery, values);
        if (res && res[0]) results.push(res[0]);
      }

      return res.status(200).json({ data: results, error: null });
    }

    return res.status(400).json({ error: 'Ação não suportada.' });
  } catch (err: any) {
    console.error(`Erro na tabela ${table}:`, err);
    return res.status(500).json({ 
      data: null, 
      error: { message: err.message, code: err.code || 'NEON_ERROR' } 
    });
  }
}
