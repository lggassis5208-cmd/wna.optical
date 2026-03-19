import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Package, 
  AlertTriangle,
  ArrowRightLeft,
  DollarSign,
  Barcode
} from 'lucide-react';
import { storage } from '../lib/storage';
import ProductModal from '../components/ProductModal';

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  const fetchProducts = async () => {
    const data = await storage.getProducts();
    setProducts(data);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleEdit = (product: any) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const filteredProducts = products.filter(p => 
    p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ncm?.includes(searchTerm)
  );

  const stats = {
    totalItens: products.reduce((acc, p) => acc + Number(p.estoque || 0), 0),
    valorTotal: products.reduce((acc, p) => acc + (Number(p.estoque || 0) * Number(p.preco_venda || 0)), 0),
    itensBaixo: products.filter(p => Number(p.estoque || 0) < 5).length
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Produtos & Estoque</h2>
          <p className="text-white/40 text-sm">Controle de inventário e parâmetros fiscais NFe</p>
        </div>
        <button 
          onClick={handleNew}
          className="bg-primary text-black font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
        >
          <Plus size={20} />
          Novo Produto
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<Package className="text-blue-400" />} 
          label="Total de Itens" 
          value={stats.totalItens} 
          subtext="Unidades em estoque"
        />
        <StatCard 
          icon={<DollarSign className="text-green-400" />} 
          label="Valor em Estoque" 
          value={`R$ ${stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          subtext="Preço de venda bruto"
        />
        <StatCard 
          icon={<AlertTriangle className="text-amber-400" />} 
          label="Estoque Baixo" 
          value={stats.itensBaixo} 
          subtext="Produtos com menos de 5 un."
          highlight={stats.itensBaixo > 0}
        />
      </div>

      {/* Search & Table */}
      <div className="bg-surface border border-white/5 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.01]">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome, marca ou NCM..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button className="flex-1 md:flex-none px-4 py-2 bg-white/5 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
               <ArrowRightLeft size={16} /> Movimentações
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-white/40 font-bold border-b border-white/5">
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Fiscal (NCM)</th>
                <th className="px-6 py-4">Unidade</th>
                <th className="px-6 py-4 text-right">Preço</th>
                <th className="px-6 py-4 text-center">Qtd Atual</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Package size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{p.nome}</p>
                        <p className="text-xs text-white/40">{p.marca}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-white/60">
                    <div className="flex items-center gap-1">
                       <Barcode size={14} className="text-white/20" />
                       {p.ncm}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-md bg-white/5 text-[10px] font-bold text-white/60">
                      {p.unidade}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-bold text-sm text-primary">R$ {Number(p.preco_venda).toFixed(2)}</p>
                    <p className="text-[10px] text-white/20 italic">Custo: R$ {Number(p.preco_custo).toFixed(2)}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`
                      font-bold px-3 py-1 rounded-full text-xs
                      ${Number(p.estoque) < 5 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}
                    `}>
                      {p.estoque} {p.unidade.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(p)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <MoreVertical size={18} className="text-white/40" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/20 italic text-sm">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          fetchProducts();
        }}
        product={selectedProduct}
      />
    </div>
  );
}

function StatCard({ icon, label, value, subtext, highlight = false }: any) {
  return (
    <div className={`p-6 bg-surface border rounded-3xl transition-all duration-300 ${highlight ? 'border-amber-500/30 bg-amber-500/[0.02]' : 'border-white/5 bg-white/[0.01]'}`}>
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white/5 rounded-2xl shadow-inner">
          {icon}
        </div>
        <div>
          <p className="text-xs font-black text-white/30 uppercase tracking-widest">{label}</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-2xl font-black">{value}</h4>
          </div>
          <p className="text-[10px] text-white/40 mt-1">{subtext}</p>
        </div>
      </div>
    </div>
  );
}
