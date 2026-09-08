import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Sidebar from '../components/Sidebar'
import StatusBadge from '../components/StatusBadge'
import client from '../api/client'
import { useAuth } from '../api/AuthContext'
import { STATUS_FLOW } from '../constants'

const STAFF_SIDEBAR = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/services', label: 'Services' },
  { to: '/admin/inventory', label: 'Inventory' },
  { to: '/admin/reports', label: 'Reports' },
]
const CUSTOMER_SIDEBAR = [{ to: '/dashboard', label: 'My Repairs', end: true }]

const POLL_INTERVAL_MS = 15000

export default function RepairDetail() {
  const { orderId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const isStaff = user?.role === 'admin' || user?.role === 'technician'

  const [repair, setRepair] = useState(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)
  const [zoomedPhoto, setZoomedPhoto] = useState(null)

  // Parts-used (inventory) controls
  const [parts, setParts] = useState([])
  const [selectedPartId, setSelectedPartId] = useState('')
  const [partQty, setPartQty] = useState(1)

  // Quotation builder (staff)
  const [quoteItems, setQuoteItems] = useState([{ description: '', amount: '' }])
  const [quoteNotes, setQuoteNotes] = useState('')
  const [savingQuote, setSavingQuote] = useState(false)
  const [decidingQuote, setDecidingQuote] = useState(false)

  const load = () =>
    client.get(`/repairs/${orderId}`).then((res) => {
      setRepair(res.data)
      setLastSynced(new Date())
    })

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  // Real-Time Repair Tracking: poll for updates so both sides see changes
  // without a manual refresh.
  useEffect(() => {
    const interval = setInterval(() => {
      load()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  useEffect(() => {
    if (isStaff) {
      client.get('/admin/parts').then((res) => setParts(res.data))
    }
  }, [isStaff])

  // Close the photo lightbox on Escape.
  useEffect(() => {
    if (!zoomedPhoto) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setZoomedPhoto(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [zoomedPhoto])

  const handleStatusChange = async (status) => {
    setUpdatingStatus(true)
    try {
      await client.patch(`/admin/repairs/${orderId}/status`, { status, actor: `${user.role} (${user.full_name})` })
      await load()
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAddNote = async (internalOnly) => {
    if (!note.trim()) return
    setSavingNote(true)
    try {
      await client.post(`/admin/repairs/${orderId}/notes`, {
        content: note,
        internal_only: internalOnly,
        visible_to_customer: !internalOnly,
      })
      setNote('')
      await load()
    } finally {
      setSavingNote(false)
    }
  }

  const handleUploadPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    await client.post(`/repairs/${orderId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    await load()
  }

  const handleAddPart = async () => {
    if (!selectedPartId) return
    await client.post(`/admin/repairs/${orderId}/parts`, {
      part_id: selectedPartId,
      quantity: Number(partQty) || 1,
    })
    setSelectedPartId('')
    setPartQty(1)
    await load()
    client.get('/admin/parts').then((res) => setParts(res.data))
  }

  const handleRemovePart = async (repairPartId) => {
    await client.delete(`/admin/repairs/${orderId}/parts/${repairPartId}`)
    await load()
    client.get('/admin/parts').then((res) => setParts(res.data))
  }

  const updateQuoteItem = (i, field, value) => {
    const next = [...quoteItems]
    next[i] = { ...next[i], [field]: value }
    setQuoteItems(next)
  }

  const addQuoteItemRow = () => setQuoteItems([...quoteItems, { description: '', amount: '' }])
  const removeQuoteItemRow = (i) => setQuoteItems(quoteItems.filter((_, idx) => idx !== i))

  const handleSaveQuote = async () => {
    const items = quoteItems
      .filter((i) => i.description.trim())
      .map((i) => ({ description: i.description, amount: Number(i.amount) || 0 }))
    if (items.length === 0) return
    setSavingQuote(true)
    try {
      await client.post(`/admin/repairs/${orderId}/quotation`, { items, notes: quoteNotes })
      setQuoteItems([{ description: '', amount: '' }])
      setQuoteNotes('')
      await load()
    } finally {
      setSavingQuote(false)
    }
  }

  const handleQuoteDecision = async (decision) => {
    setDecidingQuote(true)
    try {
      await client.patch(`/repairs/${orderId}/quotation`, { decision })
      await load()
    } finally {
      setDecidingQuote(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <Navbar />
        <main className="page-main container section-tight muted">Loading...</main>
        <Footer />
      </div>
    )
  }

  if (!repair) {
    return (
      <div className="page">
        <Navbar />
        <main className="page-main container section-tight text-center muted">
          Repair not found. <button className="link-btn" onClick={() => navigate(-1)}>Go back</button>
        </main>
        <Footer />
      </div>
    )
  }

  const quoteStatusBadge = repair.quotation
    ? repair.quotation.status === 'Approved'
      ? 'badge-green'
      : repair.quotation.status === 'Declined'
      ? 'badge-red'
      : 'badge-amber'
    : 'badge-gray'

  return (
    <div className="page">
      <Navbar />
      <main className="page-main dashboard-layout">
        <Sidebar items={isStaff ? STAFF_SIDEBAR : CUSTOMER_SIDEBAR} />

        <div className="dashboard-main">
          <div className="detail-header">
            <div>
              <div className="detail-title-row">
                <h1 className="detail-title">{repair.order_id}</h1>
                <StatusBadge status={repair.status} />
                <span className="small" style={{ color: 'var(--color-green)' }}>
                  Live{lastSynced ? ` (synced ${lastSynced.toLocaleTimeString()})` : ''}
                </span>
              </div>
              <p className="muted small mt-xs">
                Scheduled: {repair.preferred_date || 'Not yet scheduled'}
                {repair.preferred_slot ? ` - ${repair.preferred_slot}` : ''}
              </p>
            </div>
            {isStaff && (
              <select
                value={repair.status}
                disabled={updatingStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="input"
                style={{ width: 'auto' }}
              >
                {[...STATUS_FLOW, 'Cannot Process'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>

          <div className="detail-grid">
            <div>
              <div className="card panel" style={{ marginTop: 0 }}>
                <p className="panel-title mb-sm">Customer Uploads</p>
                <div className="photo-grid">
                  {repair.photos.map((p) => (
                    <button key={p.filename} type="button" onClick={() => setZoomedPhoto(p)} className="photo-thumb">
                      <img src={p.url} alt="upload" />
                    </button>
                  ))}
                  <button onClick={() => fileInputRef.current?.click()} className="photo-add-btn">
                    Add Photo
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleUploadPhoto} />
                </div>
              </div>

              <div className="grid grid-2 mt-lg">
                <div className="card card-pad">
                  <p className="panel-title mb-sm">Repair Information</p>
                  <p className="info-label">Service</p>
                  <p className="info-value">{repair.service?.name || repair.appliance_category}</p>
                  <p className="info-label">Device Model</p>
                  <p className="info-value">{repair.device_model}</p>
                  <p className="info-label">Reported Issue</p>
                  <p className="small">{repair.reported_issue || 'No description provided.'}</p>
                  {repair.free_checkup_eligible && (
                    <span className="badge badge-green mt-sm">Free Check-up Eligible</span>
                  )}
                </div>
                <div className="card card-pad">
                  <p className="panel-title mb-sm">Customer Details</p>
                  <p style={{ fontWeight: 600 }}>{repair.customer?.full_name}</p>
                  <p className="small muted">{repair.customer?.email}</p>
                  <p className="small muted">{repair.customer?.phone}</p>
                  <p className="small muted">{repair.customer?.address}</p>
                </div>
              </div>

              <div className="card panel">
                <p className="panel-title mb-xs">Status Timeline</p>
                <p className="panel-subtext mb-sm">Visual progress of the repair journey. Updates live.</p>
                <div className="timeline">
                  {repair.status_history.map((h, i) => (
                    <div key={i} className="timeline-item">
                      <span className="timeline-dot" />
                      <div>
                        <p className="timeline-status">{h.status}</p>
                        <p className="timeline-meta">{new Date(h.timestamp).toLocaleString()} - {h.actor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quotation Approval System */}
              <div className="card panel">
                <p className="panel-title mb-sm">Quotation</p>
                {repair.quotation ? (
                  <div>
                    <div className="flex items-center justify-between mb-sm">
                      <span className={`badge ${quoteStatusBadge}`}>{repair.quotation.status}</span>
                      <span className="small muted">
                        Sent by {repair.quotation.created_by} on {new Date(repair.quotation.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <table className="quote-table">
                      <tbody>
                        {repair.quotation.items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.description}</td>
                            <td style={{ textAlign: 'right' }}>PHP {item.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="quote-total-row">
                          <td>Total</td>
                          <td style={{ textAlign: 'right' }}>PHP {repair.quotation.total_amount.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                    {repair.quotation.notes && (
                      <p className="small muted mt-sm">{repair.quotation.notes}</p>
                    )}
                    {!isStaff && repair.quotation.status === 'Pending' && (
                      <div className="quote-actions">
                        <button
                          disabled={decidingQuote}
                          onClick={() => handleQuoteDecision('Approved')}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1 }}
                        >
                          Approve Quote
                        </button>
                        <button
                          disabled={decidingQuote}
                          onClick={() => handleQuoteDecision('Declined')}
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1 }}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="small muted">
                    {isStaff ? 'No quotation sent yet. Build one below.' : 'No quotation has been sent yet.'}
                  </p>
                )}

                {isStaff && (
                  <div className="mt-md" style={{ borderTop: '1px solid var(--color-gray-100)', paddingTop: 16 }}>
                    <p className="small" style={{ fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: 8 }}>
                      {repair.quotation ? 'Send Updated Quotation' : 'Build Quotation'}
                    </p>
                    <div className="flex flex-col gap-sm">
                      {quoteItems.map((item, i) => (
                        <div key={i} className="flex gap-sm">
                          <input
                            className="input"
                            style={{ flex: 1 }}
                            placeholder="Line item description"
                            value={item.description}
                            onChange={(e) => updateQuoteItem(i, 'description', e.target.value)}
                          />
                          <input
                            type="number"
                            min="0"
                            className="input"
                            style={{ width: 110 }}
                            placeholder="Amount"
                            value={item.amount}
                            onChange={(e) => updateQuoteItem(i, 'amount', e.target.value)}
                          />
                          {quoteItems.length > 1 && (
                            <button onClick={() => removeQuoteItemRow(i)} className="link-btn" style={{ color: 'var(--color-red)' }}>
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button onClick={addQuoteItemRow} className="link-btn small mt-sm">Add line item</button>
                    <textarea
                      className="input mt-sm"
                      rows={2}
                      placeholder="Notes for the customer (optional)"
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                    />
                    <button disabled={savingQuote} onClick={handleSaveQuote} className="btn btn-primary btn-sm mt-sm">
                      {savingQuote ? 'Sending...' : 'Send Quotation to Customer'}
                    </button>
                  </div>
                )}
              </div>

              <div className="card panel">
                <p className="panel-title mb-sm">Latest Updates from Shop</p>
                {repair.messages.length === 0 && <p className="small muted">No updates yet.</p>}
                {repair.messages.map((m, i) => (
                  <div key={i} className="message-bubble">
                    {m.content}
                    <p className="message-meta">{m.sender_name}, {new Date(m.timestamp).toLocaleString()}</p>
                  </div>
                ))}
                {isStaff && (
                  <div className="flex gap-sm mt-sm">
                    <input
                      className="input"
                      style={{ flex: 1 }}
                      placeholder="Post an update visible to the customer..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <button disabled={savingNote} onClick={() => handleAddNote(false)} className="btn btn-primary btn-sm">
                      Send
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              {isStaff && (
                <div className="card panel" style={{ marginTop: 0 }}>
                  <p className="panel-title mb-xs">Admin Controls</p>
                  <p className="panel-subtext mb-sm">Internal Technician Notes</p>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Technical findings, parts ordered, etc. (Not visible to customer)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="flex gap-sm mt-sm">
                    <button disabled={savingNote} onClick={() => handleAddNote(true)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                      Save Note
                    </button>
                    <button onClick={() => handleStatusChange('Cannot Process')} className="btn btn-danger-outline">
                      Cannot Repair
                    </button>
                  </div>
                  {repair.internal_notes && (
                    <p className="small muted mt-sm" style={{ whiteSpace: 'pre-line', borderTop: '1px solid var(--color-gray-100)', paddingTop: 10 }}>
                      {repair.internal_notes}
                    </p>
                  )}
                  <p className="small muted mt-sm">Updates here will trigger automated notifications.</p>
                </div>
              )}

              {isStaff && (
                <div className="card panel">
                  <p className="panel-title mb-sm">Parts Used</p>
                  {repair.parts_used?.map((pu) => (
                    <div key={pu.id} className="parts-row">
                      <span>{pu.part_name} x {pu.quantity}</span>
                      <div className="flex items-center gap-sm">
                        <span className="muted">PHP {pu.line_total.toLocaleString()}</span>
                        <button onClick={() => handleRemovePart(pu.id)} className="link-btn small" style={{ color: 'var(--color-red)' }}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!repair.parts_used || repair.parts_used.length === 0) && (
                    <p className="small muted">No parts recorded yet.</p>
                  )}
                  <div className="flex gap-sm mt-sm">
                    <select className="input" style={{ flex: 1 }} value={selectedPartId} onChange={(e) => setSelectedPartId(e.target.value)}>
                      <option value="">Select a part...</option>
                      {parts.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.stock_qty === 0}>
                          {p.name} ({p.stock_qty} in stock)
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      style={{ width: 64 }}
                      value={partQty}
                      onChange={(e) => setPartQty(e.target.value)}
                    />
                    <button onClick={handleAddPart} className="btn btn-secondary btn-sm">Add</button>
                  </div>
                </div>
              )}

              {isStaff && repair.notifications && (
                <div className="card panel">
                  <p className="panel-title mb-sm">Notification History</p>
                  {repair.notifications?.map((n, i) => (
                    <div key={i} className="notify-row">
                      <div>
                        <p className="small" style={{ color: 'var(--color-gray-800)' }}>{n.label}</p>
                        <p className="small muted">{new Date(n.timestamp).toLocaleString()}</p>
                      </div>
                      <span className="badge badge-gray">{n.delivery_status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {zoomedPhoto && (
        <div className="lightbox-overlay" onClick={() => setZoomedPhoto(null)}>
          <button onClick={() => setZoomedPhoto(null)} className="lightbox-close" aria-label="Close">
            Close
          </button>
          <img src={zoomedPhoto.url} alt="upload full size" className="lightbox-image" />
        </div>
      )}
    </div>
  )
}
