import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    provider?: string
    user: {
      hasPassword?: boolean
      isAdmin: boolean
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    provider?: string
  }
}