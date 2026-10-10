import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";

const POLL_MS = 30000;

export default function NotificationBell() {
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState({ total: 0, repairs: [] });

  const load = () =>
    client
      .get("/admin/repairs", { params: { status: "Submitted", per_page: 5 } })
      .then((res) =>
        setPending({ total: res.data.total, repairs: res.data.repairs }),
      )
      .catch(() => {});

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="bell-wrap" ref={wrapRef}>
      <button className="bell-btn" onClick={() => setOpen(!open)}>
        Pending
        {pending.total > 0 && (
          <span className="bell-count">{pending.total}</span>
        )}
      </button>
      {open && (
        <div className="bell-menu">
          <p className="bell-menu-header">Pending Requests ({pending.total})</p>
          {pending.repairs.length === 0 && (
            <p className="bell-empty">No pending requests.</p>
          )}
          {pending.repairs.map((r) => (
            <button
              key={r.order_id}
              className="bell-item"
              onClick={() => {
                setOpen(false);
                navigate(`/repairs/${r.order_id}`);
              }}
            >
              <p className="list-row-title">
                {r.order_id} - {r.customer_name}
              </p>
              <p className="list-row-sub">{r.device_model}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
