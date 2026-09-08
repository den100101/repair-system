import { createContext, useContext, useEffect, useState } from 'react'
import client from './client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('tapalla_token')
    if (!token) {
      setLoading(false)
      return
    }
    client
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('tapalla_token')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const res = await client.post('/auth/login', { email, password })
    localStorage.setItem('tapalla_token', res.data.token)
    setUser(res.data.user)
    return res.data.user
  }

  const register = async (payload) => {
    const res = await client.post('/auth/register', payload)
    localStorage.setItem('tapalla_token', res.data.token)
    setUser(res.data.user)
    return res.data.user
  }

  const logout = () => {
    localStorage.removeItem('tapalla_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
