import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Fallback para lis_auth temporário caso usem sem login
      if (session) setIsAuth(true);
      else setIsAuth(localStorage.getItem('lis_auth') === 'true');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setIsAuth(true);
      else setIsAuth(localStorage.getItem('lis_auth') === 'true');
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isAuth === null) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-primary/50" />
      </div>
    );
  }

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
