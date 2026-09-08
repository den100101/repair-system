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

const EMPTY_FORM = { name: '', sku: '', stock_qty: '', reorder_level: '5', unit_cost: '', unit_price: '' }

export default function AdminInventory() {
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  const load = () => client.get('/admin/parts').then((res) => setParts(res.data))

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  const handleEdit = (part) => {
    setForm({
      name: part.name,
      sku: part.sku || '',
      stock_qty: part.stock_qty,
      reorder_level: part.reorder_level,
      unit_cost: part.unit_cost,
      unit_price: part.unit_price,
    })
    setEditingId(part.id)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const payload = {
      name: form.name,
      sku: form.sku,
      stock_qty: Number(form.stock_qty) || 0,
      reorder_level: Number(form.reorder_level) || 0,
      unit_cost: Number(form.unit_cost) || 0,
      unit_price: Number(form.unit_price) || 0,
    }
    try {
      if (editingId) {
        await client.put(`/admin/parts/${editingId}`, payload)
      } else {
        await client.post('/admin/parts', payload)
      }
      resetForm()
      await load()
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this part from inventory?')) return
    await client.delete(`/admin/parts/${id}`)
    await load()
  }

  const lowStockCount = parts.filter((p) => p.low_stock).length

  return (
    <div className="page">
      <Navbar />
      <main className="page-main dashboard-layout">
        <Sidebar items={SIDEBAR_ITEMS} />

        <div className="dashboard-main">
          <div className="dashboard-header">
            <div>
              <h1 className="dashboard-title">Inventory Management</h1>
              <p className="muted small">Track spare-part stock levels used across repair jobs.</p>
            </div>
            {lowStockCount > 0 && (
              <span className="badge badge-red">
                {lowStockCount} part{lowStockCount === 1 ? '' : 's'} low on stock
              </span>
            )}
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', marginTop: 24 }}>
            <form onSubmit={handleSubmit} className="card card-pad" style={{ height: 'fit-content' }}>
              <p className="panel-title mb-sm">{editingId ? 'Edit Part' : 'Add New Part'}</p>
              <div className="field">
                <label>Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="field">
                <label>SKU</label>
                <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Stock Qty</label>
                  <input type="number" min="0" className="input" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
                </div>
                <div className="field">
                  <label>Reorder Level</label>
                  <input type="number" min="0" className="input" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
                </div>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Unit Cost (PHP)</label>
                  <input type="number" min="0" className="input" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
                </div>
                <div className="field">
                  <label>Unit Price (PHP)</label>
                  <input type="number" min="0" className="input" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
                </div>
              </div>
              {error && <p className="error-text mb-sm">{error}</p>}
              <div className="flex gap-sm">
                <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                  {editingId ? 'Save Changes' : 'Add Part'}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="card card-pad">
              <p className="panel-title mb-sm">Parts Catalog</p>
              {loading ? (
                <p className="muted small">Loading...</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Part</th>
                        <th>SKU</th>
                        <th>Stock</th>
                        <th>Unit Price</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parts.map((p) => (
                        <tr key={p.id} className={p.low_stock ? 'low-stock-row' : ''}>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td className="muted">{p.sku || 'N/A'}</td>
                          <td>
                            <span style={{ fontWeight: p.low_stock ? 600 : 400, color: p.low_stock ? 'var(--color-red)' : 'inherit' }}>
                              {p.stock_qty}
                            </span>
                            {p.low_stock && <span className="small" style={{ color: 'var(--color-red)', marginLeft: 4 }}>(low)</span>}
                          </td>
                          <td>PHP {p.unit_price.toLocaleString()}</td>
                          <td>
                            <div className="action-links">
                              <button onClick={() => handleEdit(p)}>Edit</button>
                              <button onClick={() => handleDelete(p.id)} className="danger">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {parts.length === 0 && (
                        <tr>
                          <td colSpan={5} className="empty-row">No parts in inventory yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
