'use client'
import { SessionProvider } from 'next-auth/react'
import { ExerciseProvider } from '@/app/components/contextProviders/ExerciseProvider';
import { LiftProvider } from '@/app/components/contextProviders/LiftProvider';
import { ProfileProvider } from '@/app/components/contextProviders/ProfileProvider';


interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ExerciseProvider>
        <LiftProvider>
          <ProfileProvider>
            {children}
          </ProfileProvider>
        </LiftProvider>
      </ExerciseProvider>
    </SessionProvider>
  )
}