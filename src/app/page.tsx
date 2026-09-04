'use client'
import { useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { loginWithMagicLink } from '@/lib/loginWithMagicLink'

const Page = () => {
  const { data: session, status } = useSession()
  const [credEmail, setCredEmail] = useState('')
  const [credPassword, setCredPassword] = useState('')
  const [credError, setCredError] = useState('')
  const [magicEmail, setMagicEmail] = useState('')
  const [magicMessage, setMagicMessage] = useState('')

  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupMessage, setSignupMessage] = useState('')

  // Forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMessage, setForgotMessage] = useState('')

  // Resend verification (shown when credError is email_not_verified)
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [resendMessage, setResendMessage] = useState('')

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setCredError('')
    setUnverifiedEmail('')
    setResendMessage('')

    const result = await signIn('credentials', {
      email: credEmail,
      password: credPassword,
      redirect: false,
    })

    if (result?.error) {
      if (result.code === 'email_not_verified') {
        setCredError('Please verify your email before signing in — check your inbox.')
        setUnverifiedEmail(credEmail)
      } else {
        setCredError('Invalid email or password.')
      }
    }
  }

  const handleResendVerification = async () => {
    setResendMessage('')

    const res = await fetch('/api/verify-email/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: unverifiedEmail }),
    })

    if (res.ok) {
      setResendMessage('Verification email sent — check your inbox.')
    } else {
      setResendMessage('Something went wrong. Please try again.')
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotMessage('')

    const res = await fetch('/api/reset-password/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail }),
    })

    if (res.ok) {
      setForgotMessage('If that email is registered, a reset link has been sent.')
      setForgotEmail('')
    } else {
      setForgotMessage('Something went wrong. Please try again.')
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignupMessage('')

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setSignupMessage(data.error ?? 'Something went wrong')
      return
    }

    setSignupMessage('Account created — check your email to verify before signing in.')
    setSignupName('')
    setSignupEmail('')
    setSignupPassword('')
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setMagicMessage('')

    const result = await loginWithMagicLink(magicEmail)
    setMagicMessage(
      result.success
        ? 'Check your email for the sign-in link.'
        : result.error,
    )
  }

  if (status === 'loading') {
    return (
      <div className="flex flex-col flex-1 items-center justify-center">
        <p className="">Loading...</p>
      </div>
    )
  }

  if (status === 'authenticated') {
    return (
      <div className="flex flex-col flex-1 items-center justify-center">
        <p className="mb-2 text-xl">
          Signed in as: {session.user?.email}
        </p>
        <p className="mb-2 text-xl">
          Provider: {session.provider ?? 'unknown'}
        </p>
        <button
          className="p-2 m-2 bg-white border-2 border-red-500 text-black rounded-lg hover:cursor-pointer hover:bg-gray-200"
          onClick={() => signOut()}
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <p className="mb-2 text-xl">Not signed in</p>

      <button
        className="p-2 m-2 bg-white border-2 border-orange-500 text-black rounded-lg hover:cursor-pointer hover:bg-gray-200"
        onClick={() => signIn('google')}
      >
        Sign in with Google
      </button>
      <button
        className="p-2 m-2 bg-white border-2 border-orange-500 text-black rounded-lg hover:cursor-pointer hover:bg-gray-200"
        onClick={() => signIn('github')}
      >
        Sign in with GitHub
      </button>

      <form
        className="flex flex-col items-center m-2"
        onSubmit={handleCredentialsSignIn}
      >
        <input
          type="email"
          placeholder="Email"
          value={credEmail}
          onChange={(e) => setCredEmail(e.target.value)}
          className="p-2 m-1 rounded-lg border-2 border-orange-500 bg-white text-black"
        />
        <input
          type="password"
          placeholder="Password"
          value={credPassword}
          onChange={(e) => setCredPassword(e.target.value)}
          className="p-2 m-1 rounded-lg border-2 border-orange-500 bg-white text-black"
        />
        <button
          type="submit"
          className="p-2 m-1 bg-white border-2 border-orange-500 text-black rounded-lg hover:cursor-pointer hover:bg-gray-200"
        >
          Sign in with Credentials
        </button>

        {credError && (
          <p className="text-red-200 mt-1 text-sm">{credError}</p>
        )}

        {unverifiedEmail && (
          <div className="flex flex-col items-center mt-1">
            <button
              type="button"
              onClick={handleResendVerification}
              className="text-sm underline hover:cursor-pointer"
            >
              Resend verification email
            </button>
            {resendMessage && (
              <p className="mt-1 text-sm">{resendMessage}</p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowForgotPassword((v) => !v)}
          className="text-sm underline mt-2 hover:cursor-pointer"
        >
          Forgot password?
        </button>
      </form>

      {showForgotPassword && (
        <form
          className="flex flex-col items-center m-2"
          onSubmit={handleForgotPassword}
        >
          <input
            type="email"
            placeholder="Email"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            className="p-2 m-1 rounded-lg border-2 border-orange-500 bg-white text-black"
          />
          <button
            type="submit"
            className="p-2 m-1 bg-white border-2 border-orange-500 text-black rounded-lg hover:cursor-pointer hover:bg-gray-200"
          >
            Send Reset Link
          </button>
          {forgotMessage && (
            <p className="mt-1 text-sm">{forgotMessage}</p>
          )}
        </form>
      )}

      <form
        className="flex flex-col items-center m-2"
        onSubmit={handleMagicLink}
      >
        <input
          type="email"
          placeholder="Email"
          value={magicEmail}
          onChange={(e) => setMagicEmail(e.target.value)}
          className="p-2 m-1 rounded-lg border-2 border-orange-500 bg-white text-black"
        />
        <button
          type="submit"
          className="p-2 m-1 bg-white border-2 border-orange-500 text-black rounded-lg hover:cursor-pointer hover:bg-gray-200"
        >
          Send Magic Link
        </button>
        {magicMessage && (
          <p className="mt-1 text-sm">{magicMessage}</p>
        )}
      </form>

      <form
        className="flex flex-col items-center m-2 pt-4 border-t-2 border-white/30"
        onSubmit={handleSignup}
      >
        <p className="mb-2 text-xl">Sign up (email & password)</p>
        <input
          type="text"
          placeholder="Name (optional)"
          value={signupName}
          onChange={(e) => setSignupName(e.target.value)}
          className="p-2 m-1 rounded-lg border-2 border-orange-500 bg-white text-black"
        />
        <input
          type="email"
          placeholder="Email"
          value={signupEmail}
          onChange={(e) => setSignupEmail(e.target.value)}
          className="p-2 m-1 rounded-lg border-2 border-orange-500 bg-white text-black"
        />
        <input
          type="password"
          placeholder="Password"
          value={signupPassword}
          onChange={(e) => setSignupPassword(e.target.value)}
          className="p-2 m-1 rounded-lg border-2 border-orange-500 bg-white text-black"
        />
        <button
          type="submit"
          className="p-2 m-1 bg-white border-2 border-orange-500 text-black rounded-lg hover:cursor-pointer hover:bg-gray-200"
        >
          Sign Up
        </button>
        {signupMessage && (
          <p className="mt-2 text-sm">{signupMessage}</p>
        )}
      </form>
    </div>
  )
}

export default Page