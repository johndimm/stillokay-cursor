import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import historyStyles from "@/styles/HistoryPage.module.css";
import Link from "next/link";
import { DateTime } from "luxon";
import homeStyles from "@/styles/HomePage.module.css";
import EventTimeline from "@/components/EventTimeline";

function formatEvent(event) {
  const { event_type, event_data } = event;
  const eventTypeDescriptions = {
    caregiver_email_sent: e => `Confirmation email sent to ${e.caregiver_email}`,
    caregiver_updated: e => `Caregiver info updated: ${e.caregiver_name} (${e.caregiver_email}), interval: ${e.interval}h`,
    caregiver_optin: () => `Caregiver opted in`,
    caregiver_optout: () => `Caregiver opted out`,
    checkin: () => "Checked in",
    missed_checkin: () => "Missed check-in: user did not check in during the interval.",
    caregiver_alert_email_sent: () => `Alert email sent to caregiver`,
    reminder_email_sent: () => `Reminder email sent to user`,
    caregiver_checkin_email_sent: () => `Caregiver notified: user checked in`,
    user_alert_email_sent: () => `Alert email sent to user`,
  };
  const descFn = eventTypeDescriptions[event_type];
  return descFn ? descFn(event_data || {}) : event_type;
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
  const [calendarMonth, setCalendarMonth] = useState(DateTime.now().startOf('month'));
  const [selectedDay, setSelectedDay] = useState(null);

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

  // --- Calendar logic ---
  const monthStart = calendarMonth.startOf('month');
  const monthEnd = calendarMonth.endOf('month');
  const startDay = monthStart.startOf('week'); // Sunday
  const endDay = monthEnd.endOf('week'); // Saturday
  const days = [];
  let day = startDay;
  while (day <= endDay) {
    days.push(day);
    day = day.plus({ days: 1 });
  }
  // Map events by date string (yyyy-MM-dd)
  const eventsByDay = {};
  for (const event of events) {
    const d = DateTime.fromISO(event.created_at).toISODate();
    if (!eventsByDay[d]) eventsByDay[d] = [];
    eventsByDay[d].push(event);
  }
  // --- End calendar logic ---

  return (
    <div className={historyStyles.container}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/" style={{ color: '#2a5bd7', fontWeight: 700, fontSize: 20, fontFamily: 'Geist, Arial, sans-serif', letterSpacing: '0.01em', textDecoration: 'none', display: 'inline-block', padding: '2px 0' }}>&larr; Still Okay Home</Link>
      </div>
      <h1 className={historyStyles.title}>History</h1>
      {/* Calendar View */}
      <div style={{ maxWidth: 420, margin: '0 auto 24px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #eee', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button onClick={() => setCalendarMonth(calendarMonth.minus({ months: 1 }))} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#2a5bd7' }}>&lt;</button>
          <span className={historyStyles.calendarMonth}>{calendarMonth.toFormat('MMMM yyyy')}</span>
          <button onClick={() => setCalendarMonth(calendarMonth.plus({ months: 1 }))} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#2a5bd7' }}>&gt;</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center', fontWeight: 500, color: '#2a5bd7', marginBottom: 4 }}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {days.map((d, i) => {
            const iso = d.toISODate();
            const isCurrentMonth = d.month === calendarMonth.month;
            const hasEvents = !!eventsByDay[iso];
            return (
              <div
                key={iso}
                onClick={() => hasEvents ? setSelectedDay(iso === selectedDay ? null : iso) : null}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  padding: '7px 0 4px 0',
                  borderRadius: 7,
                  background: selectedDay === iso ? '#e3f0ff' : isCurrentMonth ? '#fff' : '#f5f5f5',
                  color: isCurrentMonth ? '#222' : '#bbb',
                  border: selectedDay === iso ? '2px solid #2a5bd7' : '1px solid #eee',
                  cursor: hasEvents ? 'pointer' : 'default',
                  minHeight: 40,
                  fontWeight: isCurrentMonth ? 500 : 400,
                  boxShadow: selectedDay === iso ? '0 2px 8px #e0eaff' : 'none',
                  transition: 'background 0.12s, border 0.12s',
                }}
              >
                <span style={{ lineHeight: 1, fontSize: 16 }}>{d.day}</span>
                {hasEvents && (
                  <span style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: 4,
                    marginTop: 6,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 16,
                  }}>
                    {eventsByDay[iso].slice(0,3).map((ev, idx) => (
                      <span key={idx} style={{
                        display: 'inline-block',
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background:
                          ev.event_type === 'checkin' ? '#43a047' :
                          ev.event_type === 'reminder' ? '#ff9800' :
                          ev.event_type === 'missed_checkin_alert' ? '#e53935' :
                          ev.event_type === 'caregiver_email_sent' ? '#1976d2' :
                          ev.event_type === 'caregiver_updated' ? '#8e24aa' :
                          ev.event_type === 'caregiver_optin' ? '#009688' :
                          ev.event_type === 'caregiver_optout' ? '#757575' :
                          ev.event_type === 'user_alert_email_sent' ? '#e53935' :
                          '#bdbdbd',
                        border: '2px solid #fff',
                        marginLeft: idx > 0 ? 0 : 0,
                        boxShadow: '0 1px 2px #eee',
                      }} />
                    ))}
                    {eventsByDay[iso].length > 3 && <span style={{ fontSize: 11, color: '#888', marginLeft: 2 }}>+{eventsByDay[iso].length - 3}</span>}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {/* Inline event list for selected day */}
        {selectedDay && eventsByDay[selectedDay] && (
          <div style={{ marginTop: 10, background: '#f8faff', borderRadius: 8, padding: 10, boxShadow: '0 1px 4px #e0eaff', border: '1.5px solid #e3f0ff', color: '#222' }}>
            <div style={{ fontWeight: 600, color: '#2a5bd7', marginBottom: 4 }}>{DateTime.fromISO(selectedDay).toLocaleString(DateTime.DATE_FULL)}</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {eventsByDay[selectedDay].map((event, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background:
                      event.event_type === 'checkin' ? '#43a047' :
                      event.event_type === 'reminder' ? '#ff9800' :
                      event.event_type === 'missed_checkin_alert' ? '#e53935' :
                      event.event_type === 'caregiver_email_sent' ? '#1976d2' :
                      event.event_type === 'caregiver_updated' ? '#8e24aa' :
                      event.event_type === 'caregiver_optin' ? '#009688' :
                      event.event_type === 'caregiver_optout' ? '#757575' :
                      event.event_type === 'user_alert_email_sent' ? '#e53935' :
                      '#bdbdbd',
                    border: '2px solid #fff',
                    marginRight: 2,
                  }} />
                  <span style={{ flex: 1, fontSize: 14, minWidth: 0, overflowWrap: 'anywhere' }}>{formatEvent(event)}</span>
                  <span style={{ fontSize: 13, color: '#888', marginLeft: 6, minWidth: 56, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {DateTime.fromISO(event.created_at).toLocaleString(DateTime.TIME_SIMPLE)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {/* Timeline List */}
      <EventTimeline events={events} formatEvent={formatEvent} />
      <div className={homeStyles.userInfo}>
        <p>Signed in as {session.user.name} ({session.user.email})</p>
      </div>
    </div>
  );
} 