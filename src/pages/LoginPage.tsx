import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulated login
    setTimeout(() => {
      if (email === 'admin@oticalis.com' && password === 'admin123') {
        localStorage.setItem('lis_auth', 'true');
        toast.success('Bem-vindo à Ótica Lis!');
        navigate('/');
      } else {
        toast.error('Credenciais inválidas. Tente admin@oticalis.com / admin123');
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden font-sans text-white">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="w-full max-w-[320px] mx-auto mb-4 animate-in slide-in-from-top duration-700">
            <img src="/otica.png" alt="Ótica Lis Logo" className="w-full h-auto object-contain drop-shadow-[0_0_20px_rgba(255,215,0,0.2)]" />
          </div>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mt-4">Enterprise Resource Planning</p>
        </div>

        <div className="bg-surface/50 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/30 uppercase tracking-widest ml-1">E-mail de Acesso</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors" size={20} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@oticalis.com"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-white placeholder:text-white/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white/30 uppercase tracking-widest ml-1">Senha</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors" size={20} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-white placeholder:text-white/10"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-black font-black py-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4 uppercase tracking-widest text-sm"
            >
              {loading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : (
                <>
                  Entrar no Sistema
                  <LogIn size={20} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-white/20 mt-8">
            Acesso restrito a colaboradores autorizados da Unidade Matriz.
          </p>
        </div>

        <div className="text-center mt-8 space-x-6">
          <a href="#" className="text-[10px] text-white/30 hover:text-primary transition-colors uppercase font-bold tracking-widest">Esqueci minha senha</a>
          <a href="#" className="text-[10px] text-white/30 hover:text-primary transition-colors uppercase font-bold tracking-widest">Suporte Técnico</a>
        </div>
      </div>
    </div>
  );
}
