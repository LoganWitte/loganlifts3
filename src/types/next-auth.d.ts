import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    provider?: string
    user: {
      hasPassword?: boolean
      isAdmin: boolean
      bodyWeight?: number | null
      bodyWeightAutoUpdate?: boolean
      bio?: string | null
      profilePublic?: boolean
      profilePhotoPublic?: boolean
      bioPublic?: boolean
      bodyWeightPublic?: boolean
      liftsPublic?: boolean
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    provider?: string
  }
}