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
    caregiver_optin: "Caregiver opted in",
    caregiver_optout: "Caregiver opted out",
    checkin: "Checked in",
    missed_checkin: "Missed check-in: user did not check in during the interval.",
    caregiver_alert_email_sent: "Alert email sent to caregiver",
    reminder_email_sent: "Reminder email sent to user",
    caregiver_checkin_email_sent: "Caregiver notified: user checked in",
    user_alert_email_sent: "Alert email sent to user",
  };
  const desc = typeof eventTypeDescriptions[event_type] === "function"
    ? eventTypeDescriptions[event_type](event_data || {})
    : eventTypeDescriptions[event_type] || event_type;
  return desc;
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

  // Dot class lookup for event types
  const eventTypeToDotClass = {
    checkin: historyStyles.calendarEventDotCheckin,
    reminder: historyStyles.calendarEventDotReminder,
    missed_checkin_alert: historyStyles.calendarEventDotMissed,
    caregiver_email_sent: historyStyles.calendarEventDotCaregiverEmail,
    caregiver_updated: historyStyles.calendarEventDotCaregiverUpdated,
    caregiver_optin: historyStyles.calendarEventDotCaregiverOptin,
    caregiver_optout: historyStyles.calendarEventDotCaregiverOptout,
    user_alert_email_sent: historyStyles.calendarEventDotUserAlert,
  };
  // --- End calendar logic ---

  return (
    <div className={historyStyles.container}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/" style={{ color: '#2a5bd7', fontWeight: 700, fontSize: 20, fontFamily: 'Geist, Arial, sans-serif', letterSpacing: '0.01em', textDecoration: 'none', display: 'inline-block', padding: '2px 0' }}>&larr; Still Okay Home</Link>
      </div>
      <h1 className={historyStyles.title}>History</h1>
      {/* Calendar View */}
      <div className={historyStyles.calendarContainer}>
        <div className={historyStyles.calendarNav}>
          <button onClick={() => setCalendarMonth(calendarMonth.minus({ months: 1 }))} className={historyStyles.calendarNavBtn}>&lt;</button>
          <span className={historyStyles.calendarMonthLabel}>{calendarMonth.toFormat('MMMM yyyy')}</span>
          <button onClick={() => setCalendarMonth(calendarMonth.plus({ months: 1 }))} className={historyStyles.calendarNavBtn}>&gt;</button>
        </div>
        <div className={historyStyles.calendarWeekdays}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className={historyStyles.calendarDays}>
          {days.map((d, i) => {
            const iso = d.toISODate();
            const isCurrentMonth = d.month === calendarMonth.month;
            const hasEvents = !!eventsByDay[iso];
            let dayClass = historyStyles.calendarDay;
            if (!isCurrentMonth) dayClass += ' ' + historyStyles.calendarDayOtherMonth;
            if (selectedDay === iso) dayClass += ' ' + historyStyles.calendarDaySelected;
            if (hasEvents) dayClass += ' ' + historyStyles.calendarDayHasEvents;
            return (
              <div
                key={iso}
                onClick={() => hasEvents ? setSelectedDay(iso === selectedDay ? null : iso) : null}
                className={dayClass}
              >
                <span className={historyStyles.calendarDayNumber}>{d.day}</span>
                {hasEvents && (
                  <span className={historyStyles.calendarEventDots}>
                    {eventsByDay[iso].slice(0,3).map((ev, idx) => {
                      const dotClass = [
                        historyStyles.calendarEventDot,
                        eventTypeToDotClass[ev.event_type] || historyStyles.calendarEventDotDefault
                      ].join(' ');
                      return <span key={idx} className={dotClass} />;
                    })}
                    {eventsByDay[iso].length > 3 && <span className={historyStyles.calendarEventDotExtra}>+{eventsByDay[iso].length - 3}</span>}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {/* Inline event list for selected day */}
        {selectedDay && eventsByDay[selectedDay] && (
          <div className={historyStyles.selectedDayEventList}>
            <div className={historyStyles.selectedDayEventListTitle}>{DateTime.fromISO(selectedDay).toLocaleString(DateTime.DATE_FULL)}</div>
            <ul className={historyStyles.selectedDayEventListUl}>
              {eventsByDay[selectedDay].map((event, i) => {
                const dotClass = [
                  historyStyles.selectedDayEventListDot,
                  eventTypeToDotClass[event.event_type] || historyStyles.calendarEventDotDefault
                ].join(' ');
                return (
                  <li key={i} className={historyStyles.selectedDayEventListItem}>
                    <span className={dotClass} />
                    <span className={historyStyles.selectedDayEventListDesc}>{formatEvent(event)}</span>
                    <span className={historyStyles.selectedDayEventListTime}>
                      {DateTime.fromISO(event.created_at).toLocaleString(DateTime.TIME_SIMPLE)}
                    </span>
                  </li>
                );
              })}
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