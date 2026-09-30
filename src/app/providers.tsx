'use client'
import { SessionProvider } from 'next-auth/react'
import { ExerciseProvider } from '@/app/components/contextProviders/ExerciseProvider';


interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ExerciseProvider>
        {children}
      </ExerciseProvider>
    </SessionProvider>
  )
}