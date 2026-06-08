import React from "react";
import PrintNFe from "./PrintNFe";

/**
 * PrintNFCe.tsx — delegado para o PrintNFe unificado.
 *
 * Garante compatibilidade com importações existentes de PrintNFCe no projeto
 * enquanto canaliza toda a lógica de renderização para o componente robusto PrintNFe com tipo="nfce".
 */

export default function PrintNFCe(props: any) {
  return <PrintNFe {...props} tipo="nfce" />;
}
