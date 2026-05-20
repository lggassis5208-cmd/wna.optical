import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as forge from 'node-forge';
import { SignedXml } from 'xml-crypto';

// Algoritmos fixos para SEFAZ-GO
const SIGNATURE_ALGORITHMS = {
  canonicalization: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
  signature: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
  digest: 'http://www.w3.org/2000/09/xmldsig#sha1'
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sale, settings, modelo } = req.body;

    if (!settings?.certificado?.pfx_base64 || !settings?.certificado?.senha) {
      return res.status(400).json({ 
        sucesso: false, 
        motivo_rejeicao: 'Certificado Digital (PFX) ou Senha ausente nas configurações.' 
      });
    }

    // 1. Decodificar PFX Base64
    const pfxDer = forge.util.decode64(settings.certificado.pfx_base64);
    const pfxAsn1 = forge.asn1.fromDer(pfxDer);
    
    // 2. Extrair Chave Privada e Certificado
    const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, settings.certificado.senha);
    
    // Pega as bags (certificados e chaves)
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    
    const certBag = certBags[forge.pki.oids.certBag]?.[0];
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

    if (!certBag || !keyBag) {
      throw new Error('Certificado inválido ou senha incorreta.');
    }

    const privateKey = forge.pki.privateKeyToPem(keyBag.key as forge.pki.PrivateKey);
    const certificate = forge.pki.certificateToPem(certBag.cert as forge.pki.Certificate);

    // Remove headers do certificado para o XML
    const certBase64 = certificate
      .replace('-----BEGIN CERTIFICATE-----', '')
      .replace('-----END CERTIFICATE-----', '')
      .replace(/[\r\n]/g, '');

    // 3. Montar o XML Bruto da NFe (Exemplo Base)
    // OBS: O ideal em produção real é ter uma lib focada em montar as tags NFe.
    // Aqui usamos um mock de XML válido para a simulação/testes no backend.
    const xmlBase = gerarXMLNfe(sale, settings, modelo);

    // 4. Assinar Digitalmente o XML usando xml-crypto
    const sig = new SignedXml();
    sig.addReference(
      `//*[@Id]`,
      [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
      ],
      SIGNATURE_ALGORITHMS.digest,
      '',
      '',
      '',
      true
    );

    sig.signingKey = privateKey;
    sig.signatureAlgorithm = SIGNATURE_ALGORITHMS.signature;

    // Configura o Node da chave pública que a SEFAZ exige
    sig.keyInfoProvider = {
      getKeyInfo: () => {
        return `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`;
      },
      getKey: () => certificate
    };

    sig.computeSignature(xmlBase);
    const xmlAssinado = sig.getSignedXml();

    // 5. Transmissão SOAP (mTLS simulado para a SEFAZ)
    // Na prática, faríamos:
    // const agent = new https.Agent({ cert: certificate, key: privateKey });
    // await fetch('https://nfe.sefaz.go.gov.br/nfe/services/NFeAutorizacao4?wsdl', { agent, ... })
    
    // Simula atraso da rede SEFAZ
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Extrair chave gerada
    const matchChave = xmlAssinado.match(/Id="NFe([0-9]{44})"/);
    const chaveAcesso = matchChave ? matchChave[1] : '00000000000000000000000000000000000000000000';

    return res.status(200).json({
      sucesso: true,
      status: 'autorizada',
      chave_acesso: chaveAcesso,
      protocolo: `15226${Math.floor(Math.random() * 900000 + 100000)}`,
      xml: xmlAssinado
    });

  } catch (error: any) {
    console.error('SEFAZ API Error:', error);
    return res.status(500).json({
      sucesso: false,
      motivo_rejeicao: error.message || 'Erro interno na Vercel Function (Assinatura XML)'
    });
  }
}

// Helper para gerar o XML Base da NFe
function gerarXMLNfe(sale: any, settings: any, modelo: string) {
  const mod = modelo || '55';
  const serie = '001';
  const numero = Math.floor(Math.random() * 900000 + 100000).toString();
  const cnpj = (settings?.empresa?.cnpj || '39156577000122').replace(/\D/g, '');
  const dataAnoMes = new Date().toISOString().slice(2, 7).replace('-', '');
  
  const chaveAcesso = `52${dataAnoMes}${cnpj}${mod}${serie}${numero}1${Math.floor(Math.random() * 90000000 + 10000000)}7`;
  const total = Number(sale.valor_total || 0).toFixed(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${chaveAcesso}" versao="4.00">
    <ide>
      <cUF>52</cUF>
      <cNF>12345678</cNF>
      <natOp>Venda de mercadoria</natOp>
      <mod>${mod}</mod>
      <serie>${serie}</serie>
      <nNF>${numero}</nNF>
      <dhEmi>${new Date().toISOString()}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>5208707</cMunFG>
      <tpImp>4</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>7</cDV>
      <tpAmb>1</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
      <procEmi>0</procEmi>
      <verProc>LisERP_v1.0</verProc>
    </ide>
    <emit>
      <CNPJ>${cnpj}</CNPJ>
      <xNome>${settings?.empresa?.nome_fantasia || 'ÓTICA LÌS'}</xNome>
      <enderEmit>
        <xlgr>Rua Teste</xlgr>
        <nro>123</nro>
        <xBairro>Centro</xBairro>
        <cMun>5208707</cMun>
        <xMun>Goiania</xMun>
        <UF>GO</UF>
        <CEP>74000000</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
      </enderEmit>
      <IE>${(settings?.empresa?.ie || '107849521').replace(/\D/g, '')}</IE>
      <CRT>1</CRT>
    </emit>
    <dest>
      <CPF>${(sale.paciente_cpf || '00000000000').replace(/\D/g, '')}</CPF>
      <xNome>${sale.paciente_nome || sale.cliente_nome || 'Consumidor Final'}</xNome>
      <indIEDest>9</indIEDest>
    </dest>
    <det nItem="1">
      <prod>
        <cProd>001</cProd>
        <cEAN>SEM GTIN</cEAN>
        <xProd>LENTE ${sale.tipo_lente || ''} ${sale.tratamento || ''}</xProd>
        <NCM>90031100</NCM>
        <CFOP>5102</CFOP>
        <uCom>UN</uCom>
        <qCom>1.0000</qCom>
        <vUnCom>${total}</vUnCom>
        <vProd>${total}</vProd>
        <cEANTrib>SEM GTIN</cEANTrib>
        <uTrib>UN</uTrib>
        <qTrib>1.0000</qTrib>
        <vUnTrib>${total}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <vTotTrib>0.00</vTotTrib>
        <ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS>
        <PIS><PISNT><CST>07</CST></PISNT></PIS>
        <COFINS><COFINSNT><CST>07</CST></COFINSNT></COFINS>
      </imposto>
    </det>
    <total>
      <ICMSTot>
        <vBC>0.00</vBC>
        <vICMS>0.00</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${total}</vProd>
        <vFrete>0.00</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>0.00</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>0.00</vPIS>
        <vCOFINS>0.00</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${total}</vNF>
      </ICMSTot>
    </total>
    <transp><modFrete>9</modFrete></transp>
    <pag>
      <detPag>
        <tPag>01</tPag>
        <vPag>${total}</vPag>
      </detPag>
    </pag>
  </infNFe>
</NFe>`;
}
