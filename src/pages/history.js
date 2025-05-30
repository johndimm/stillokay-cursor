import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import historyStyles from "@/styles/HistoryPage.module.css";
import Link from "next/link";

function formatEvent(event) {
  const { event_type, event_data, created_at } = event;
  let desc = "";
  if (event_type === "caregiver_email_sent") {
    desc = `Confirmation email sent to ${event_data.caregiver_email}`;
  } else if (event_type === "caregiver_updated") {
    desc = `Caregiver info updated: ${event_data.caregiver_name} (${event_data.caregiver_email}), interval: ${event_data.interval}h`;
  } else if (event_type === "caregiver_optin") {
    desc = `Caregiver opted in`;
  } else if (event_type === "caregiver_optout") {
    desc = `Caregiver opted out`;
  } else {
    desc = event_type;
  }
  return `${desc}`;
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}>
      <div style={{
        width: 40,
        height: 40,
        border: '4px solid #e0e0e0',
        borderTop: '4px solid #2a5bd7',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function History() {
  const { data: session } = useSession();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events.map(e => ({ ...e, event_data: e.event_data || {} })));
      }
      setLoading(false);
    }
    fetchHistory();
  }, []);

  if (!session) return <p>Please sign in to view history.</p>;
  if (loading) return <Spinner />;

  return (
    <div className={historyStyles.container}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/">&larr; Home</Link>
      </div>
      <div className={historyStyles.header}>History</div>
      <ul className={historyStyles.timeline}>
        {events.length === 0 && <li>No events yet.</li>}
        {events.map((event, i) => (
          <li
            key={i}
            className={
              historyStyles.event +
              ' ' +
              (historyStyles[event.event_type + 'Bg'] || historyStyles.eventBg)
            }
          >
            <span className={historyStyles.dot + ' ' + historyStyles[event.event_type]}></span>
            <div className={historyStyles.eventDetails}>
              <div className={historyStyles.eventType}>{formatEvent(event)}</div>
              <div className={historyStyles.eventTime}>{new Date(event.created_at).toLocaleString()}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
} 