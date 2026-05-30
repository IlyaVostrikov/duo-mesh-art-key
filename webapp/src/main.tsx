import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { TooltipProvider } from '@/components/ui/tooltip'
import { LenisProvider } from '@/components/motion/LenisProvider'
import { CustomCursor } from '@/components/motion/CustomCursor'
import { Preloader } from '@/components/motion/Preloader'
import { ScrollToTop } from '@/components/motion/ScrollToTop'
import App from './App'
import { AuthProvider } from './lib/auth'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <LenisProvider>
            <Preloader />
            <CustomCursor />
            <ScrollToTop />
            <App />
          </LenisProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
)
