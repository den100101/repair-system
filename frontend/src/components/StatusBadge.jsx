const STYLES = {
  Submitted: 'badge-gray',
  'Under Review': 'badge-amber',
  'Approved & Scheduled': 'badge-blue',
  'In Repair': 'badge-blue',
  'Quality Check & Done': 'badge-green',
  'Cannot Process': 'badge-red',
}

export default function StatusBadge({ status }) {
  const style = STYLES[status] || 'badge-gray'
  return <span className={`badge ${style}`}>{status}</span>
}
