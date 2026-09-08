import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Sidebar from '../components/Sidebar'
import StatusBadge from '../components/StatusBadge'
import client from '../api/client'

const SIDEBAR_ITEMS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/services', label: 'Services' },
  { to: '/admin/inventory', label: 'Inventory' },
  { to: '/admin/reports', label: 'Reports' },
]

function isoDaysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

export default function AdminReports() {
  const [start, setStart] = useState(isoDaysAgo(30))
  const [end, setEnd] = useState(isoDaysAgo(0))
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () =>
    client.get('/admin/reports', { params: { start, end } }).then((res) => setReport(res.data))

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilter = async () => {
    setLoading(true)
    await load()
    setLoading(false)
  }

  const handleExport = () => {
    const token = localStorage.getItem('tapalla_token')
    const params = new URLSearchParams({ start, end })
    // Fetch with auth header, then trigger a client-side download.
    fetch(`/api/admin/reports/export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `tapalla-repair-report_${start}_${end}.csv`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      })
  }

  return (
    <div className="page">
      <Navbar />
      <main className="page-main dashboard-layout">
        <Sidebar items={SIDEBAR_ITEMS} />

        <div className="dashboard-main">
          <div className="dashboard-header">
            <div>
              <h1 className="dashboard-title">Reports</h1>
              <p className="muted small">Performance summary for a chosen date range.</p>
            </div>
            <button onClick={handleExport} className="btn btn-primary btn-sm">Export CSV</button>
          </div>

          <div className="card card-pad date-range-row mt-lg">
            <div className="field">
              <label>From</label>
              <input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="field">
              <label>To</label>
              <input type="date" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <button onClick={handleFilter} className="btn btn-secondary btn-sm">Apply</button>
          </div>

          {loading || !report ? (
            <p className="muted mt-lg">Loading...</p>
          ) : (
            <>
              <div className="stat-grid cols-4">
                <div className="card stat-card">
                  <p className="stat-label">Total Requests</p>
                  <p className="stat-value">{report.total_requests}</p>
                </div>
                <div className="card stat-card">
                  <p className="stat-label">Completed</p>
                  <p className="stat-value">{report.completed}</p>
                </div>
                <div className="card stat-card">
                  <p className="stat-label">Cannot Process</p>
                  <p className="stat-value">{report.cannot_process}</p>
                </div>
                <div className="card stat-card">
                  <p className="stat-label">Revenue</p>
                  <p className="stat-value">PHP {report.revenue.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-2" style={{ marginTop: 24 }}>
                <div className="card panel" style={{ marginTop: 0 }}>
                  <p className="panel-title mb-sm">By Status</p>
                  {Object.entries(report.by_status).map(([status, count]) => (
                    <div key={status} className="parts-row">
                      <StatusBadge status={status} />
                      <span style={{ fontWeight: 600 }}>{count}</span>
                    </div>
                  ))}
                  {Object.keys(report.by_status).length === 0 && (
                    <p className="empty-row">No data in this range.</p>
                  )}
                </div>
                <div className="card panel" style={{ marginTop: 0 }}>
                  <p className="panel-title mb-sm">By Service Category</p>
                  {Object.entries(report.by_category).map(([category, count]) => (
                    <div key={category} className="parts-row">
                      <span>{category}</span>
                      <span style={{ fontWeight: 600 }}>{count}</span>
                    </div>
                  ))}
                  {Object.keys(report.by_category).length === 0 && (
                    <p className="empty-row">No data in this range.</p>
                  )}
                </div>
              </div>

              <div className="card panel">
                <p className="panel-title mb-sm">Requests in Range</p>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Category</th>
                        <th>Submitted</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.repairs.map((r) => (
                        <tr key={r.order_id}>
                          <td className="order-id">{r.order_id}</td>
                          <td>{r.customer_name}</td>
                          <td>{r.appliance_category}</td>
                          <td className="muted">
                            {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td><StatusBadge status={r.status} /></td>
                        </tr>
                      ))}
                      {report.repairs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="empty-row">No requests in this range.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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
