import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Sidebar from '../components/Sidebar'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import client from '../api/client'

const SIDEBAR_ITEMS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/services', label: 'Services' },
  { to: '/admin/inventory', label: 'Inventory' },
  { to: '/admin/reports', label: 'Reports' },
]

const FILTERS = ['All', 'Submitted', 'Under Review', 'Approved & Scheduled', 'In Repair', 'Quality Check & Done']

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const LOGO_COLORS = ['#2740A8', '#E52629', '#F6C915']

function BarChart({ data, valueKey, format = (v) => v }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1)
  return (
    <div className="report-bars">
      {data.map((d, i) => (
        <div key={d.label} className="report-bar-col">
          <span className="report-bar-label">{format(d[valueKey])}</span>
          <div
            className="report-bar"
            style={{
              height: `${(d[valueKey] / max) * 70}%`,
              minHeight: 2,
              background: LOGO_COLORS[i % LOGO_COLORS.length],
            }}
          />
          <span className="report-bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function LineChart({ data, valueKey, format = (v) => v }) {
  const width = 460
  const height = 210
  const pad = { top: 28, right: 30, bottom: 30, left: 30 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const baseY = pad.top + innerH
  const max = Math.max(...data.map((d) => d[valueKey]), 1)
  const step = data.length > 1 ? innerW / (data.length - 1) : 0
  const points = data.map((d, i) => ({
    ...d,
    x: pad.left + i * step,
    y: baseY - (d[valueKey] / max) * innerH,
  }))
  const line = points.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `${points[0].x},${baseY} ${line} ${points[points.length - 1].x},${baseY}`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="line-chart" role="img">
      {[0, 0.5, 1].map((t) => (
        <line
          key={t}
          x1={pad.left}
          x2={width - pad.right}
          y1={baseY - t * innerH}
          y2={baseY - t * innerH}
          stroke="#DFE2EA"
          strokeDasharray="3 4"
        />
      ))}
      <polygon points={area} fill="rgba(39, 64, 168, 0.10)" />
      <polyline
        points={line}
        fill="none"
        stroke="#2740A8"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r="5" fill="#F6C915" stroke="#E52629" strokeWidth="2" />
          <text x={p.x} y={p.y - 11} textAnchor="middle" fontSize="11" fill="#363C4A">
            {format(p[valueKey])}
          </text>
          <text x={p.x} y={height - 8} textAnchor="middle" fontSize="11" fill="#6B7280">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [repairs, setRepairs] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [activity, setActivity] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadRepairs = () => {
    const params = {}
    if (search) params.search = search
    if (statusFilter !== 'All') params.status = statusFilter
    return client.get('/admin/repairs', { params }).then((res) => setRepairs(res.data.repairs))
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      client.get('/admin/stats').then((res) => setStats(res.data)),
      loadRepairs(),
      client.get('/admin/technicians').then((res) => setTechnicians(res.data)),
      client.get('/admin/activity').then((res) => setActivity(res.data)),
      client.get('/admin/analytics').then((res) => setAnalytics(res.data)),
    ]).finally(() => setLoading(false))

  }, [])

  useEffect(() => {
    loadRepairs()

  }, [search, statusFilter])

  return (
    <div className="page">
      <Navbar />
      <main className="page-main dashboard-layout">
        <Sidebar items={SIDEBAR_ITEMS} />

        <div className="dashboard-main">
          <div className="dashboard-header">
            <div>
              <h1 className="dashboard-title">Admin Dashboard</h1>
              <p className="muted small">Manage repair requests, communicate with clients, and monitor shop performance.</p>
            </div>
            <Link to="/admin/reports" className="btn btn-secondary btn-sm">Export Report</Link>
          </div>

          {loading ? (
            <p className="muted mt-lg">Loading...</p>
          ) : (
            <>
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
                <div className="card stat-card">
                  <p className="stat-label">New Requests</p>
                  <p className="stat-value">{stats.new_requests}</p>
                </div>
                <div className="card stat-card">
                  <p className="stat-label">In Progress</p>
                  <p className="stat-value">{stats.in_progress}</p>
                </div>
                <div className="card stat-card">
                  <p className="stat-label">Ready Pickup</p>
                  <p className="stat-value">{stats.ready_pickup}</p>
                </div>
                <div className="card stat-card">
                  <p className="stat-label">Mo. Revenue</p>
                  <p className="stat-value">PHP {stats.monthly_revenue.toLocaleString()}</p>
                </div>
                <Link to="/admin" className="card stat-card">
                  <p className="stat-label">Pending Quotes</p>
                  <p className="stat-value">{stats.pending_quotes}</p>
                </Link>
                <Link to="/admin/inventory" className="card stat-card">
                  <p className="stat-label">Low Stock Parts</p>
                  <p className={`stat-value${stats.low_stock_parts > 0 ? ' warn' : ''}`}>
                    {stats.low_stock_parts}
                  </p>
                </Link>
              </div>

              {analytics && (
                <>
                  <div className="grid grid-2" style={{ marginTop: 24 }}>
                    <div className="card panel" style={{ marginTop: 0 }}>
                      <p className="panel-title mb-xs">Requests, Last 7 Days</p>
                      <p className="panel-subtext">
                        Average turnaround: {analytics.avg_turnaround_days ?? 'N/A'} days
                      </p>
                      <BarChart data={analytics.daily_requests} valueKey="count" />
                    </div>
                    <div className="card panel" style={{ marginTop: 0 }}>
                      <p className="panel-title mb-xs">Revenue, Last 6 Months</p>
                      <p className="panel-subtext">Completed repairs only (PHP)</p>
                      <LineChart
                        data={analytics.monthly_revenue}
                        valueKey="amount"
                        format={(v) => v.toLocaleString()}
                      />
                    </div>
                  </div>
                  <div className="card panel">
                    <p className="panel-title mb-sm">Repairs by Service</p>
                    {Object.entries(analytics.by_category).map(([cat, count]) => (
                      <div key={cat} className="parts-row">
                        <span>{cat}</span>
                        <span style={{ fontWeight: 600 }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="card panel">
                <div className="toolbar">
                  <input
                    className="input"
                    style={{ flex: 1, minWidth: 200 }}
                    placeholder="Search customer, ID, or appliance..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className="filters-row">
                    {FILTERS.map((f) => (
                      <button
                        key={f}
                        onClick={() => setStatusFilter(f)}
                        className={`filter-chip${statusFilter === f ? ' active' : ''}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Appliance</th>
                        <th>Submitted</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Technician</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repairs.map((r) => (
                        <tr key={r.order_id} className="clickable" onClick={() => navigate(`/repairs/${r.order_id}`)}>
                          <td className="order-id">{r.order_id}</td>
                          <td>{r.customer_name}</td>
                          <td>{r.device_model}</td>
                          <td className="muted">
                            {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td><StatusBadge status={r.status} /></td>
                          <td><PriorityBadge priority={r.priority} /></td>
                          <td>{r.technician_name || <span className="muted">Unassigned</span>}</td>
                        </tr>
                      ))}
                      {repairs.length === 0 && (
                        <tr>
                          <td colSpan={7} className="empty-row">No requests match your filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-2" style={{ marginTop: 24 }}>
                <div className="card panel" style={{ marginTop: 0 }}>
                  <p className="panel-title mb-xs">Real-time Activity</p>
                  <p className="panel-subtext mb-sm">Live updates from customers and staff</p>
                  <ul className="activity-list">
                    {activity.map((a, i) => (
                      <li key={i}>
                        <span className="activity-bullet">-</span>
                        <span>
                          <strong>{a.actor}</strong> updated <strong>{a.repair_order_id}</strong> to &quot;{a.status}&quot;
                          <span className="muted"> ({timeAgo(a.timestamp)})</span>
                        </span>
                      </li>
                    ))}
                    {activity.length === 0 && <p className="muted">No recent activity.</p>}
                  </ul>
                </div>

                <div className="card panel" style={{ marginTop: 0 }}>
                  <p className="panel-title mb-xs">Shop Floor Status</p>
                  <p className="panel-subtext mb-sm">Current workload per technician</p>
                  {technicians.map((t) => (
                    <div className="workload-item" key={t.id}>
                      <div className="workload-header">
                        <span style={{ fontWeight: 600 }}>{t.name} <span className="muted small">({t.title})</span></span>
                        <span className="muted">{t.active_jobs} Active Jobs</span>
                      </div>
                      <div className="workload-bar-track">
                        <div className="workload-bar-fill" style={{ width: `${t.capacity_percent}%` }} />
                      </div>
                    </div>
                  ))}
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
