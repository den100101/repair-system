import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

const PER_PAGE = 25
const EMPTY_FILTERS = { search: '', action: 'All', start: '', end: '' }

function badgeClass(action) {
  if (action === 'auth.login_failed') return 'badge-red'
  if (/(deleted|declined|removed|deactivated)$/.test(action)) return 'badge-red'
  if (action.startsWith('repair.')) return 'badge-blue'
  if (action.startsWith('quotation.')) return 'badge-amber'
  if (action.startsWith('service.') || action.startsWith('part.')) return 'badge-green'
  return 'badge-gray'
}

function actionLabel(action) {
  return action.replace('.', ': ').replace(/_/g, ' ')
}

export default function AdminAudit() {
  const [draft, setDraft] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ logs: [], total: 0, actions: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = { page, per_page: PER_PAGE }
    if (applied.search) params.search = applied.search
    if (applied.action !== 'All') params.action = applied.action
    if (applied.start) params.start = applied.start
    if (applied.end) params.end = applied.end
    client
      .get('/admin/audit', { params })
      .then((res) => {
        setData(res.data)
        setError('')
      })
      .catch((err) => setError(err.response?.data?.error || 'Could not load the audit trail.'))
      .finally(() => setLoading(false))
  }, [applied, page])

  const handleApply = (e) => {
    e.preventDefault()
    setPage(1)
    setApplied(draft)
  }

  const handleReset = () => {
    setDraft(EMPTY_FILTERS)
    setApplied(EMPTY_FILTERS)
    setPage(1)
  }

  const totalPages = Math.max(Math.ceil(data.total / PER_PAGE), 1)

  return (
    <div className="page">
      <Navbar />
      <main className="page-main dashboard-layout">
        <Sidebar items={SIDEBAR_ITEMS} />

        <div className="dashboard-main">
          <div className="dashboard-header">
            <div>
              <h1 className="dashboard-title">Audit Trail</h1>
              <p className="muted small">
                A record of who did what and when. The app has no way to edit or delete entries.
              </p>
            </div>
            <span className="badge badge-gray">{data.total} entries</span>
          </div>

          <form onSubmit={handleApply} className="card card-pad date-range-row mt-lg">
            <div className="field" style={{ flex: 1, minWidth: 180 }}>
              <label>Search</label>
              <input
                className="input"
                placeholder="Person, order ID, or details"
                value={draft.search}
                onChange={(e) => setDraft({ ...draft, search: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Action</label>
              <select
                className="input"
                value={draft.action}
                onChange={(e) => setDraft({ ...draft, action: e.target.value })}
              >
                <option value="All">All actions</option>
                {data.actions.map((a) => (
                  <option key={a} value={a}>{actionLabel(a)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>From</label>
              <input type="date" className="input" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
            </div>
            <div className="field">
              <label>To</label>
              <input type="date" className="input" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Apply</button>
            <button type="button" onClick={handleReset} className="btn btn-secondary btn-sm">Reset</button>
          </form>

          <div className="card panel">
            {error && <p className="error-text mb-sm">{error}</p>}
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Who</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map((l) => (
                    <tr key={l.id}>
                      <td className="audit-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
                      <td>
                        {l.actor_name}
                        <span className="small muted"> ({l.actor_role})</span>
                      </td>
                      <td>
                        <span className={`badge ${badgeClass(l.action)}`}>{actionLabel(l.action)}</span>
                      </td>
                      <td className="audit-nowrap">
                        {l.target_type === 'repair' && l.target_id ? (
                          <Link to={`/repairs/${l.target_id}`} className="order-id">{l.target_id}</Link>
                        ) : l.target_id ? (
                          `${l.target_type} #${l.target_id}`
                        ) : (
                          <span className="muted">N/A</span>
                        )}
                      </td>
                      <td className="audit-details">{l.details || ''}</td>
                      <td className="muted audit-nowrap">{l.ip_address || 'N/A'}</td>
                    </tr>
                  ))}
                  {!loading && data.logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="empty-row">No audit entries match your filters.</td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan={6} className="empty-row">Loading...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <span className="small muted">Page {page} of {totalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
