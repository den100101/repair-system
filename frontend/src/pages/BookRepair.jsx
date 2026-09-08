import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import client from '../api/client'

const STEPS = ['Contact', 'Appliance', 'Schedule', 'Confirm']

export default function BookRepair() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmedOrderId, setConfirmedOrderId] = useState(null)

  const [services, setServices] = useState([])
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    service_id: '',
    device_model: '',
    reported_issue: '',
    preferred_date: '',
    preferred_slot: '',
  })

  useEffect(() => {
    client.get('/repairs/services').then((res) => setServices(res.data))
  }, [])

  useEffect(() => {
    if (!form.preferred_date) {
      setSlots([])
      return
    }
    setLoadingSlots(true)
    client
      .get('/repairs/availability', { params: { date: form.preferred_date } })
      .then((res) => setSlots(res.data.slots))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [form.preferred_date])

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const selectedService = services.find((s) => String(s.id) === String(form.service_id))

  const canNext = () => {
    if (step === 0) return form.full_name && form.phone && form.email
    if (step === 1) return form.service_id && form.device_model
    if (step === 2) return form.preferred_date && form.preferred_slot
    return true
  }

  const handleNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const handleBack = () => setStep((s) => Math.max(s - 1, 0))

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await client.post('/repairs', form)
      setConfirmedOrderId(res.data.order_id)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <Navbar />
      <main className="page-main container-narrow section-tight">
        <h1 className="section-heading">Schedule Your Repair</h1>
        <p className="section-subheading">
          Quick, reliable, and professional appliance services in just a few steps.
        </p>

        <div className="stepper">
          {STEPS.map((label, i) => (
            <div key={label} className="stepper-item">
              <div className="stepper-circle-wrap">
                <div className={`stepper-circle${i <= step ? ' active' : ''}`}>{i + 1}</div>
                <span className={`stepper-label${i <= step ? ' active' : ''}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`stepper-line${i < step ? ' active' : ''}`} />}
            </div>
          ))}
        </div>

        {confirmedOrderId ? (
          <div className="card confirm-box">
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-gray-800)' }}>Booking Confirmed</h2>
            <p className="muted mt-sm">
              Your repair request has been submitted. Your tracking number is:
            </p>
            <p className="confirm-order-id">{confirmedOrderId}</p>
            <div className="hero-actions" style={{ justifyContent: 'center' }}>
              <button onClick={() => navigate('/login')} className="btn btn-primary">
                Go to Customer Login
              </button>
              <button onClick={() => navigate('/')} className="btn btn-secondary">
                Back to Home
              </button>
            </div>
          </div>
        ) : (
          <div className="card card-pad">
            <div className="privacy-note">
              <strong>Important Data Privacy Note:</strong> Your personal information will be
              collected and used only for appointment and repair processing. It will be accessed
              only by authorized personnel and will not be shared with third parties except as
              required by law.
            </div>

            {step === 0 && (
              <div>
                <p className="step-heading">Personal Information</p>
                <p className="step-subtext">Tell us who you are so we can get in touch.</p>
                <div className="field">
                  <label>Full Name</label>
                  <input className="input" placeholder="e.g. Juan Dela Cruz" value={form.full_name} onChange={update('full_name')} />
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label>Phone Number</label>
                    <input className="input" placeholder="+63 9XX XXX XXXX" value={form.phone} onChange={update('phone')} />
                  </div>
                  <div className="field">
                    <label>Email Address</label>
                    <input className="input" placeholder="juan@example.com" value={form.email} onChange={update('email')} />
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <p className="step-heading">Appliance Details</p>
                <p className="step-subtext">What needs repairing?</p>
                <div className="field">
                  <label>Service Category</label>
                  <select className="input" value={form.service_id} onChange={update('service_id')}>
                    <option value="">Select a service</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.base_price ? ` - starting at PHP ${s.base_price}` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedService?.description && (
                    <p className="small muted mt-xs">{selectedService.description}</p>
                  )}
                </div>
                <div className="field">
                  <label>Device Model</label>
                  <input className="input" placeholder="e.g. Samsung 55 inch QLED TV" value={form.device_model} onChange={update('device_model')} />
                </div>
                <div className="field">
                  <label>Reported Issue</label>
                  <textarea className="input" rows={4} placeholder="Describe the problem..." value={form.reported_issue} onChange={update('reported_issue')} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="step-heading">Preferred Schedule</p>
                <p className="step-subtext">Pick a date and an available time slot. Capacity updates live.</p>
                <div className="field">
                  <label>Preferred Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    className="input"
                    value={form.preferred_date}
                    onChange={(e) => setForm({ ...form, preferred_date: e.target.value, preferred_slot: '' })}
                  />
                </div>

                {form.preferred_date && (
                  <div className="field">
                    <label>Available Time Slots</label>
                    {loadingSlots ? (
                      <p className="small muted mt-xs">Checking availability...</p>
                    ) : (
                      <div className="slot-grid">
                        {slots.map((s) => (
                          <button
                            key={s.slot}
                            type="button"
                            disabled={s.remaining === 0}
                            onClick={() => setForm({ ...form, preferred_slot: s.slot })}
                            className={`slot-btn${form.preferred_slot === s.slot ? ' selected' : ''}`}
                          >
                            <div style={{ fontWeight: 600 }}>{s.slot}</div>
                            <div className="small muted">
                              {s.remaining === 0 ? 'Full' : `${s.remaining} slot${s.remaining === 1 ? '' : 's'} left`}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div>
                <p className="step-heading">Review Your Request</p>
                <dl className="review-list">
                  <div className="review-row"><dt>Name</dt><dd>{form.full_name}</dd></div>
                  <div className="review-row"><dt>Phone</dt><dd>{form.phone}</dd></div>
                  <div className="review-row"><dt>Email</dt><dd>{form.email}</dd></div>
                  <div className="review-row"><dt>Service</dt><dd>{selectedService?.name}</dd></div>
                  <div className="review-row"><dt>Device</dt><dd>{form.device_model}</dd></div>
                  <div className="review-row"><dt>Date</dt><dd>{form.preferred_date}</dd></div>
                  <div className="review-row"><dt>Time Slot</dt><dd>{form.preferred_slot}</dd></div>
                </dl>
                {error && <p className="error-text mt-sm">{error}</p>}
              </div>
            )}

            <div className="wizard-footer">
              <button onClick={handleBack} disabled={step === 0} className="btn btn-secondary">
                Back
              </button>
              {step < STEPS.length - 1 ? (
                <button onClick={handleNext} disabled={!canNext()} className="btn btn-primary">
                  Next
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Submitting...' : 'Confirm Booking'}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
