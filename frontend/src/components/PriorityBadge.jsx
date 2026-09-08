const DOT_CLASS = {
  High: 'high',
  Medium: 'medium',
  Low: 'low',
}

export default function PriorityBadge({ priority }) {
  return (
    <span className="priority">
      <span className={`priority-dot ${DOT_CLASS[priority] || 'low'}`} />
      {priority}
    </span>
  )
}
