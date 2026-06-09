import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurações de CORS para a Vercel Serverless Function
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Obter variáveis de ambiente secretas
  const ambiente = process.env.FOCUS_NFE_AMBIENTE || 'homologacao';
  const token = ambiente === 'producao'
    ? process.env.FOCUS_NFE_TOKEN_PRODUCAO
    : process.env.FOCUS_NFE_TOKEN_HOMALOGACAO || process.env.FOCUS_NFE_TOKEN_HOMOLOGACAO;

  if (!token) {
    return res.status(500).json({ 
      error: `Configuração secreta ausente: FOCUS_NFE_TOKEN_${ambiente.toUpperCase()} no servidor.` 
    });
  }

  const baseUrl = ambiente === 'producao'
    ? 'https://api.focusnfe.com.br/v2'
    : 'https://homologacao.focusnfe.com.br/v2';

  const authHeader = `Basic ${Buffer.from(token + ':').toString('base64')}`;

  try {
    if (req.method === 'POST') {
      const { ref, mod, payload } = req.body;

      if (!ref || !mod || !payload) {
        return res.status(400).json({ error: 'Parâmetros ref, mod e payload são obrigatórios.' });
      }

      const response = await fetch(`${baseUrl}/${mod}?ref=${ref}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      // Mapeia e resolve danfe_url absoluta
      if (data.status === 'autorizado' || data.caminho_danfe) {
        const host = ambiente === 'producao' ? 'https://api.focusnfe.com.br' : 'https://homologacao.focusnfe.com.br';
        const danfe = data.caminho_danfe || data.caminho_pdf_danfe;
        if (danfe) {
          data.danfe_url = danfe.startsWith('/') ? `${host}${danfe}` : danfe;
        } else if (data.chave_nfe) {
          data.danfe_url = `${baseUrl}/${mod}/${ref}/danfe?token=${token}`;
        }
      }

      return res.status(response.status).json(data);
    } 

    if (req.method === 'GET') {
      const { ref, mod } = req.query;

      if (!ref || !mod) {
        return res.status(400).json({ error: 'Parâmetros ref e mod são obrigatórios.' });
      }

      const response = await fetch(`${baseUrl}/${mod}/${ref}`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        }
      });

      const data = await response.json();

      // Mapeia e resolve danfe_url absoluta
      if (data.status === 'autorizado' || data.caminho_danfe) {
        const host = ambiente === 'producao' ? 'https://api.focusnfe.com.br' : 'https://homologacao.focusnfe.com.br';
        const danfe = data.caminho_danfe || data.caminho_pdf_danfe;
        if (danfe) {
          data.danfe_url = danfe.startsWith('/') ? `${host}${danfe}` : danfe;
        } else if (data.chave_nfe) {
          data.danfe_url = `${baseUrl}/${mod}/${ref}/danfe?token=${token}`;
        }
      }

      return res.status(response.status).json(data);
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error: any) {
    console.error('Erro no Proxy Focus NFe:', error);
    return res.status(500).json({ error: error.message || 'Erro de rede ao contatar a Focus NFe.' });
  }
}
