import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Sidebar from '../components/Sidebar'
import StatusBadge from '../components/StatusBadge'
import client from '../api/client'
import { useAuth } from '../api/AuthContext'

const SIDEBAR_ITEMS = [
  { to: '/dashboard', label: 'My Repairs', end: true },
  { to: '/book-repair', label: 'Book New' },
]

export default function CustomerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client
      .get('/repairs/my')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false))
  }, [])

  const repairs = (data?.repairs || []).filter((r) =>
    r.order_id.toLowerCase().includes(search.toLowerCase()) ||
    (r.device_model || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page">
      <Navbar />
      <main className="page-main dashboard-layout">
        <Sidebar items={SIDEBAR_ITEMS} />

        <div className="dashboard-main">
          <div className="dashboard-header">
            <div>
              <h1 className="dashboard-title">Customer Dashboard</h1>
              <p className="muted small">Track your appliance repairs and manage your appointments.</p>
            </div>
            <Link to="/book-repair" className="btn btn-primary btn-sm">Book New Repair</Link>
          </div>

          {loading ? (
            <p className="muted mt-lg">Loading...</p>
          ) : (
            <>
              <div className="stat-grid cols-4">
                <div className="card stat-card">
                  <p className="stat-label">Active Tracking</p>
                  <p className="stat-value">{data.counts.active} Items</p>
                </div>
                <div className="card stat-card">
                  <p className="stat-label">Completed Repairs</p>
                  <p className="stat-value">{data.counts.completed} Items</p>
                </div>
                <div className="card stat-card">
                  <p className="stat-label">Under Review</p>
                  <p className="stat-value">{data.counts.under_review} Item</p>
                </div>
                <div className="card stat-card">
                  <p className="stat-label">Quotes Awaiting You</p>
                  <p className={`stat-value${data.counts.pending_quotes > 0 ? ' warn' : ''}`}>
                    {data.counts.pending_quotes}
                  </p>
                </div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', marginTop: 24 }}>
                <div className="card panel" style={{ marginTop: 0 }}>
                  <div className="panel-header">
                    <div>
                      <p className="panel-title">Recent Appointments</p>
                      <p className="panel-subtext">Click on a repair to view live progress details.</p>
                    </div>
                    <input
                      className="input"
                      style={{ width: 200 }}
                      placeholder="Search job ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  {repairs.length === 0 && <p className="empty-row">No repairs found.</p>}
                  {repairs.map((r) => (
                    <button
                      key={r.order_id}
                      onClick={() => navigate(`/repairs/${r.order_id}`)}
                      className="list-row"
                    >
                      <div>
                        <p className="list-row-title">{r.device_model} <span className="muted">({r.order_id})</span></p>
                        <p className="list-row-sub">{r.appliance_category}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </button>
                  ))}
                </div>

                <div>
                  <div className="card panel" style={{ marginTop: 0 }}>
                    <p className="panel-title mb-sm">Account Summary</p>
                    <div className="account-card">
                      <div className="avatar">{user?.full_name?.[0]}</div>
                      <div>
                        <p style={{ fontWeight: 600 }}>{user?.full_name}</p>
                        <p className="small muted">{user?.email}</p>
                        <p className="small muted">{user?.phone}</p>
                      </div>
                    </div>
                    <div className="account-details-grid">
                      <div>
                        <p className="label">Customer Since</p>
                        <p className="value">{user?.customer_since || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="label">Default Address</p>
                        <p className="value">{user?.address || 'Not set'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="important-note mt-lg">
                    <p style={{ fontWeight: 700, marginBottom: 6 }}>Important Note</p>
                    <p>
                      This system does not accept repair services for smartphones and tablets. It
                      is limited to computers, laptops, CCTV, electronic devices, and selected
                      household appliances only.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
