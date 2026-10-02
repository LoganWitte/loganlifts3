'use client'
import { SessionProvider } from 'next-auth/react'
import { ExerciseProvider } from '@/app/components/contextProviders/ExerciseProvider';
import { LiftProvider } from '@/app/components/contextProviders/LiftProvider';
import { ProfileProvider } from '@/app/components/contextProviders/ProfileProvider';
import { UnitProvider } from '@/app/components/contextProviders/UnitProvider';


interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <UnitProvider>
        <ExerciseProvider>
          <LiftProvider>
            <ProfileProvider>
              {children}
            </ProfileProvider>
          </LiftProvider>
        </ExerciseProvider>
      </UnitProvider>
    </SessionProvider>
  )
}