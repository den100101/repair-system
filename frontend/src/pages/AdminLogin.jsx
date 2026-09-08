import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../api/AuthContext'
import logo from '../assets/logo.png'

export default function AdminLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await login(form.email, form.password)
      if (user.role === 'admin' || user.role === 'technician') {
        navigate('/admin')
      } else {
        setError('This account does not have staff access.')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="auth-card-header">
          <img src={logo} alt="logo" className="auth-logo" />
          <p className="auth-title">Staff / Admin Login</p>
          <p className="auth-subtitle">Tapalla&apos;s Electronic Repair Portal</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" className="input" value={form.email} onChange={update('email')} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" className="input" value={form.password} onChange={update('password')} required />
          </div>
          {error && <p className="error-text mb-sm">{error}</p>}
          <button type="submit" disabled={submitting} className="btn btn-primary btn-block">
            {submitting ? 'Please wait...' : 'Log In'}
          </button>
        </form>
        <p className="text-center small muted mt-md">
          <Link to="/login" className="link-btn">Customer? Log in here</Link>
        </p>
      </div>
    </div>
  )
}
