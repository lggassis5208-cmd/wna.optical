import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { Toaster } from 'sonner'

// Recarrega automaticamente a página caso o navegador do usuário tente carregar um chunk antigo pós-deploy
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', () => {
    console.warn('Novo deploy na Vercel detectado via vite:preloadError. Atualizando aplicação...');
    window.location.reload();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Toaster position="top-right" theme="dark" richColors />
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

