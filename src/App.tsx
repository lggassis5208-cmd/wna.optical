import { 
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Outlet
} from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Calendar,
  TrendingUp,
  Settings,
  Bell,
  Search,
  Wallet,
  Package
} from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import SalesPage from './pages/SalesPage';
import AgendaPage from './pages/AgendaPage';
import CaixaPage from './pages/CaixaPage';
import FinanceiroPage from './pages/FinanceiroPage';
import InventoryPage from './pages/InventoryPage';
import FiscalPage from './pages/FiscalPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-surface border-r border-white/5 flex flex-col shrink-0">
        <div className="p-8 flex flex-col items-center">
          <Link to="/" className="w-full group">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.05] hover:border-primary/20 transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(255,191,0,0.05)]">
               <img src="/otica.png" alt="Ótica Lis Logo" className="w-full h-auto object-contain group-hover:scale-[1.02] transition-transform duration-500" />
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          <NavItem 
            to="/" 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={location.pathname === '/'} 
          />
          <NavItem 
            to="/vendas" 
            icon={<Receipt size={20} />} 
            label="Vendas & O.S" 
            active={location.pathname === '/vendas'} 
          />
          <NavItem 
            to="/clientes" 
            icon={<Users size={20} />} 
            label="Clientes" 
            active={location.pathname === '/clientes'} 
          />
          <NavItem 
            to="/agenda" 
            icon={<Calendar size={20} />} 
            label="Agenda" 
            active={location.pathname === '/agenda'} 
          />
          <NavItem 
            to="/caixa" 
            icon={<Wallet size={20} />} 
            label="Caixa Diário" 
            active={location.pathname === '/caixa'} 
          />
          <NavItem 
            to="/financeiro" 
            icon={<TrendingUp size={20} />} 
            label="Financeiro" 
            active={location.pathname === '/financeiro'} 
          />
          <NavItem 
            to="/estoque" 
            icon={<Package size={20} />} 
            label="Produtos & Estoque" 
            active={location.pathname === '/estoque'} 
          />
          <NavItem 
            to="/fiscal" 
            icon={<Receipt size={20} />} 
            label="Fiscal / NF-e" 
            active={location.pathname === '/fiscal'} 
          />
          <div className="pt-4 pb-2 px-3 text-xs font-semibold text-white/40 uppercase tracking-widest">
            Sistema
          </div>
          <NavItem 
            to="/settings" 
            icon={<Settings size={20} />} 
            label="Configurações" 
            active={location.pathname === '/settings'} 
          />
        </nav>

        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              AD
            </div>
            <div className="flex-1 overflow-hidden text-sm">
              <p className="font-medium truncate">Administrador</p>
              <p className="text-white/40 text-xs truncate">Unidade Matriz</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-surface/50 backdrop-blur-md shrink-0">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por cliente, pedido ou O.S..." 
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-white/5 transition-colors relative">
              <Bell size={20} className="text-white/70" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-surface"></span>
            </button>
            <div className="h-8 w-px bg-white/10 mx-2"></div>
            <div className="text-right">
              <p className="text-xs text-white/40">Sábado, 14 de Março</p>
              <p className="text-sm font-semibold">11:00</p>
            </div>
          </div>
        </header>

        {/* Page Container */}
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon, label, active = false }: { to: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link 
      to={to} 
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
        ${active 
          ? 'bg-primary text-black font-semibold shadow-lg shadow-primary/20' 
          : 'text-white/60 hover:text-white hover:bg-white/5'}
      `}
    >
      <span className={active ? 'text-black' : 'group-hover:text-primary transition-colors'}>
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="clientes" element={<ClientsPage />} />
          <Route path="vendas" element={<SalesPage />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="caixa" element={<CaixaPage />} />
          <Route path="financeiro" element={<FinanceiroPage />} />
          <Route path="estoque" element={<InventoryPage />} />
          <Route path="fiscal" element={<FiscalPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<div className="flex items-center justify-center h-full text-white/20 italic">Módulo em desenvolvimento...</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
