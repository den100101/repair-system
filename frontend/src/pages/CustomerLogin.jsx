import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../api/AuthContext'

export default function CustomerLogin() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // login | register
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' })

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        await register(form)
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <Navbar />
      <main className="page-main container-narrow section-tight">
        <h1 className="section-heading">
          {mode === 'login' ? 'Customer Login' : 'Create an Account'}
        </h1>
        <p className="section-subheading">
          Track your repairs and manage your appointments.
        </p>

        <form onSubmit={handleSubmit} className="card card-pad mt-lg">
          {mode === 'register' && (
            <div className="field">
              <label>Full Name</label>
              <input className="input" value={form.full_name} onChange={update('full_name')} required />
            </div>
          )}
          <div className="field">
            <label>Email Address</label>
            <input type="email" className="input" value={form.email} onChange={update('email')} required />
          </div>
          {mode === 'register' && (
            <div className="field">
              <label>Phone Number</label>
              <input className="input" value={form.phone} onChange={update('phone')} />
            </div>
          )}
          <div className="field">
            <label>Password</label>
            <input type="password" className="input" value={form.password} onChange={update('password')} required />
          </div>

          {error && <p className="error-text mb-sm">{error}</p>}

          <button type="submit" disabled={submitting} className="btn btn-primary btn-block">
            {submitting ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center small muted mt-md">
          {mode === 'login' ? (
            <>Don&apos;t have an account?{' '}
              <button className="link-btn" onClick={() => setMode('register')}>Sign up</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button className="link-btn" onClick={() => setMode('login')}>Log in</button>
            </>
          )}
        </p>
        <p className="text-center small muted mt-xs">
          Staff member? <Link to="/admin-login" className="link-btn">Go to staff login</Link>
        </p>
      </main>
      <Footer />
    </div>
  )
}
