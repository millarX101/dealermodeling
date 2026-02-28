import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { session, signIn, signInWithMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('password') // 'password' | 'magic'
  const [error, setError] = useState(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Already logged in — bounce to estimator
  if (session) {
    return <Navigate to="/" replace />
  }

  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    setSubmitting(false)
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signInWithMagicLink(email)
    if (error) {
      setError(error.message)
    } else {
      setMagicLinkSent(true)
    }
    setSubmitting(false)
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>MX Dealer<span className="brand-accent">Advantage</span></h1>
        <p className="login-subtitle">Dealer Income Estimator</p>

        {magicLinkSent ? (
          <div className="magic-link-success">
            <p>Check your email for a login link!</p>
            <button onClick={() => setMagicLinkSent(false)} className="btn-link">
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="login-toggle">
              <button
                className={mode === 'password' ? 'active' : ''}
                onClick={() => setMode('password')}
              >
                Password
              </button>
              <button
                className={mode === 'magic' ? 'active' : ''}
                onClick={() => setMode('magic')}
              >
                Magic Link
              </button>
            </div>

            <form onSubmit={mode === 'password' ? handlePasswordLogin : handleMagicLink}>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="dealer@example.com"
                />
              </label>

              {mode === 'password' && (
                <label>
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </label>
              )}

              {error && <p className="error-msg">{error}</p>}

              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting
                  ? 'Please wait...'
                  : mode === 'password'
                    ? 'Sign In'
                    : 'Send Magic Link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
