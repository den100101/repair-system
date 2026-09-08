import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Sidebar from '../components/Sidebar'
import client from '../api/client'

const SIDEBAR_ITEMS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/services', label: 'Services' },
  { to: '/admin/inventory', label: 'Inventory' },
  { to: '/admin/reports', label: 'Reports' },
]

const EMPTY_FORM = { name: '', description: '', base_price: '', is_active: true }

export default function AdminServices() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  const load = () => client.get('/admin/services').then((res) => setServices(res.data))

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  const handleEdit = (service) => {
    setForm({
      name: service.name,
      description: service.description || '',
      base_price: service.base_price ?? '',
      is_active: service.is_active,
    })
    setEditingId(service.id)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const payload = {
      ...form,
      base_price: form.base_price === '' ? null : Number(form.base_price),
    }
    try {
      if (editingId) {
        await client.put(`/admin/services/${editingId}`, payload)
      } else {
        await client.post('/admin/services', payload)
      }
      resetForm()
      await load()
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this service? If it is already used by a repair, it will be deactivated instead.')) return
    await client.delete(`/admin/services/${id}`)
    await load()
  }

  const toggleActive = async (service) => {
    await client.put(`/admin/services/${service.id}`, { is_active: !service.is_active })
    await load()
  }

  return (
    <div className="page">
      <Navbar />
      <main className="page-main dashboard-layout">
        <Sidebar items={SIDEBAR_ITEMS} />

        <div className="dashboard-main">
          <h1 className="dashboard-title">Service Management</h1>
          <p className="muted small">
            Add, edit, or retire the repair services offered on the site and booking wizard.
          </p>

          <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', marginTop: 24 }}>
            <form onSubmit={handleSubmit} className="card card-pad" style={{ height: 'fit-content' }}>
              <p className="panel-title mb-sm">{editingId ? 'Edit Service' : 'Add New Service'}</p>
              <div className="field">
                <label>Name</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Starting Price (PHP)</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={form.base_price}
                  onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                />
              </div>
              <label className="chip-toggle mb-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Active (visible to customers)
              </label>
              {error && <p className="error-text mb-sm">{error}</p>}
              <div className="flex gap-sm">
                <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                  {editingId ? 'Save Changes' : 'Add Service'}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="card card-pad">
              <p className="panel-title mb-sm">All Services</p>
              {loading ? (
                <p className="muted small">Loading...</p>
              ) : (
                <>
                  {services.map((s) => (
                    <div key={s.id} className="list-row" style={{ cursor: 'default', alignItems: 'flex-start' }}>
                      <div>
                        <div className="flex items-center gap-xs">
                          <p className="list-row-title">{s.name}</p>
                          <span className={`badge ${s.is_active ? 'badge-green' : 'badge-gray'}`}>
                            {s.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="list-row-sub">{s.description}</p>
                        {s.base_price != null && (
                          <p className="small muted mt-xs">Starting at PHP {s.base_price.toLocaleString()}</p>
                        )}
                      </div>
                      <div className="action-links" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                        <button onClick={() => handleEdit(s)}>Edit</button>
                        <button onClick={() => toggleActive(s)} style={{ color: 'var(--color-gray-500)' }}>
                          {s.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="danger">Delete</button>
                      </div>
                    </div>
                  ))}
                  {services.length === 0 && <p className="empty-row">No services yet.</p>}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
