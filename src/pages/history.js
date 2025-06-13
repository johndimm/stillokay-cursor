import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import historyStyles from "@/styles/HistoryPage.module.css";
import Link from "next/link";
import { DateTime } from "luxon";
import homeStyles from "@/styles/HomePage.module.css";
import EventTimeline from "@/components/EventTimeline";

function formatEvent(event) {
  const { event_type, event_data, feeling_level, note } = event;
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
  let desc = typeof eventTypeDescriptions[event_type] === "function"
    ? eventTypeDescriptions[event_type](event_data || {})
    : eventTypeDescriptions[event_type] || event_type;
  
  // Add feeling level and note for check-in events
  if (event_type === "checkin") {
    if (feeling_level) {
      desc += ` (feeling: ${feeling_level}/10)`;
    }
    if (note) {
      desc += ` - "${note}"`;
    }
  }
  
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

function getSegmentTooltip(seg) {
  // Group and filter events for tooltip clarity, but only count check-ins within the segment interval
  const { events, segStart, segEnd } = seg;
  if (!events || events.length === 0) return seg.tooltip;
  const eventGroups = {
    checkin: [],
    missed: [],
    info: [],
    email: [],
    other: []
  };
  events.forEach(ev => {
    if (ev.event_type === 'checkin') {
      // Only count check-ins within this segment's interval
      const t = DateTime.fromISO(ev.created_at).setZone(timezone);
      if (t >= segStart && t < segEnd) eventGroups.checkin.push(ev);
    } else if (ev.event_type === 'missed_checkin' || ev.event_type === 'missed_checkin_alert') eventGroups.missed.push(ev);
    else if (ev.event_type === 'caregiver_updated') eventGroups.info.push(ev);
    else if (ev.event_type.endsWith('_email_sent')) eventGroups.email.push(ev);
    else eventGroups.other.push(ev);
  });
  const lines = [];
  if (eventGroups.checkin.length > 0) lines.push('✅ Checked in');
  if (eventGroups.missed.length > 0 && eventGroups.checkin.length === 0) lines.push('❌ Missed check-in');
  if (eventGroups.info.length > 0) lines.push('ℹ️ Caregiver info updated');
  if (eventGroups.email.length > 0) lines.push('📧 Email(s) sent');
  if (eventGroups.other.length > 0) lines.push('• Other activity');
  return lines.length > 0 ? lines.join('\n') : seg.tooltip;
}

export default function History() {
  const { data: session } = useSession();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(DateTime.now().startOf('month'));
  const [selectedDay, setSelectedDay] = useState(null);
  const [interval, setInterval] = useState(24); // default
  const [timezone, setTimezone] = useState('local');
  const [barTooltip, setBarTooltip] = useState({ day: null, seg: null });

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events.map(e => ({ ...e, event_data: e.event_data || {} })));
        // Debug: log missed_checkin events for the current month
        const missed = (data.events || []).filter(ev =>
          (ev.event_type === 'missed_checkin' || ev.event_type === 'missed_checkin_alert') &&
          ev.event_data && ev.event_data.interval_end
        );
        if (missed.length > 0) {
          console.log('Missed checkin events:', missed.map(ev => ({
            created_at: ev.created_at,
            interval_end: ev.event_data.interval_end,
            event_type: ev.event_type
          })));
        } else {
          console.log('No missed_checkin events found');
        }
      }
      setLoading(false);
    }
    async function fetchInterval() {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setInterval(data.interval || 24);
        setTimezone(data.timezone || DateTime.local().zoneName);
      }
    }
    fetchHistory();
    fetchInterval();
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
    let d;
    if ((event.event_type === 'missed_checkin' || event.event_type === 'missed_checkin_alert') && event.event_data && event.event_data.interval_end) {
      let end = DateTime.fromISO(event.event_data.interval_end).setZone(timezone);
      // If interval_end is exactly midnight, group under previous day
      if (end.hour === 0 && end.minute === 0 && end.second === 0 && end.millisecond === 0) {
        end = end.minus({ days: 1 });
      }
      d = end.toISODate();
    } else {
      d = DateTime.fromISO(event.created_at).setZone(timezone).toISODate();
    }
    if (!eventsByDay[d]) eventsByDay[d] = [];
    eventsByDay[d].push(event);
  }
  // Debug: log eventsByDay for June
  if (Object.keys(eventsByDay).length > 0) {
    console.log('eventsByDay:', Object.fromEntries(Object.entries(eventsByDay).filter(([k]) => k.startsWith('2025-06'))));
  }

  // Dot class lookup for event types
  const eventTypeToDotClass = {
    checkin: historyStyles.calendarEventDotCheckin,
    reminder: historyStyles.calendarEventDotReminder,
    missed_checkin: historyStyles.calendarEventDotMissed,
    caregiver_email_sent: historyStyles.calendarEventDotCaregiverEmail,
    caregiver_updated: historyStyles.calendarEventDotCaregiverUpdated,
    caregiver_optin: historyStyles.calendarEventDotCaregiverOptin,
    caregiver_optout: historyStyles.calendarEventDotCaregiverOptout,
    user_alert_email_sent: historyStyles.calendarEventDotUserAlert,
  };

  // Helper: get interval segments for a day
  function getDaySegments(day, events, interval) {
    const userToday = DateTime.now().setZone(timezone).startOf('day');
    const isPast = day < userToday;
    const isToday = day.hasSame(userToday, 'day');
    if (interval >= 24) {
      // 24h: one segment for the whole day
      const checkinEvent = events.find(ev => ev.event_type === 'checkin');
      const hasCheckin = !!checkinEvent;
      // Missed: just check if any event is missed_checkin or missed_checkin_alert
      const hasMissed = events.some(ev => ev.event_type === 'missed_checkin' || ev.event_type === 'missed_checkin_alert');
      let color = 'gray';
      if (hasCheckin) {
        // Use feeling level to determine shade of green
        const feelingLevel = checkinEvent.feeling_level;
        if (feelingLevel) {
          // Map 1-10 to light to dark green
          if (feelingLevel <= 3) color = 'green-light';
          else if (feelingLevel <= 6) color = 'green-medium';
          else color = 'green-dark';
        } else {
          color = 'green'; // default green for no feeling level
        }
      } else if (hasMissed && isPast) color = 'red';
      // today or future: never red
      let tooltip = hasCheckin ? 'Checked in' : (hasMissed && isPast) ? 'Missed check-in' : 'No data';
      if (hasCheckin && checkinEvent.feeling_level) {
        tooltip += ` (feeling: ${checkinEvent.feeling_level}/10)`;
      }
      if (hasCheckin && checkinEvent.note) {
        tooltip += `\nNote: ${checkinEvent.note}`;
      }
      return [{
        color,
        tooltip,
        events: events,
      }];
    } else {
      // Shorter: split day into segments
      const segments = [];
      const start = day.startOf('day');
      for (let i = 0; i < 24 / interval; ++i) {
        const segStart = start.plus({ hours: i * interval });
        const segEnd = segStart.plus({ hours: interval });
        const segEvents = (events || []).filter(ev => {
          const t = DateTime.fromISO(ev.created_at).setZone(timezone);
          return t >= segStart && t < segEnd;
        });
        // Missed: look for missed_checkin/missed_checkin_alert with interval_end in this segment
        const segHasMissed = (events || []).some(ev => {
          if (ev.event_type === 'missed_checkin' || ev.event_type === 'missed_checkin_alert') {
            const end = ev.event_data && ev.event_data.interval_end;
            if (end) {
              const endTime = DateTime.fromISO(end).setZone(timezone);
              // Inclusive of both boundaries
              return endTime >= segStart && endTime <= segEnd;
            }
          }
          return false;
        });
        const segIsPast = segEnd < DateTime.now().setZone(timezone);
        const checkinEvent = segEvents.find(ev => ev.event_type === 'checkin');
        const hasCheckin = !!checkinEvent;
        let color = 'gray';
        if (hasCheckin) {
          // Use feeling level to determine shade of green
          const feelingLevel = checkinEvent.feeling_level;
          if (feelingLevel) {
            // Map 1-10 to light to dark green
            if (feelingLevel <= 3) color = 'green-light';
            else if (feelingLevel <= 6) color = 'green-medium';
            else color = 'green-dark';
          } else {
            color = 'green'; // default green for no feeling level
          }
        } else if (segHasMissed && segIsPast) color = 'red';
        // today/future: never red
        let tooltip = '';
        if (hasCheckin) {
          tooltip = 'Checked in';
          if (checkinEvent.feeling_level) {
            tooltip += ` (feeling: ${checkinEvent.feeling_level}/10)`;
          }
          if (checkinEvent.note) {
            tooltip += `\nNote: ${checkinEvent.note}`;
          }
        } else if (segHasMissed && segIsPast) tooltip = 'Missed check-in';
        else if (segEvents.length > 0) tooltip = segEvents.map(ev => ev.event_type).join(', ');
        else tooltip = 'No data';
        segments.push({
          color,
          tooltip,
          events: segEvents,
          segStart,
          segEnd,
        });
      }
      return segments;
    }
  }
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
            // Bar segments
            const segments = getDaySegments(d, eventsByDay[iso] || [], interval);
            // Debug for June 4, 2025
            if (iso === '2025-06-04') {
              const events = eventsByDay[iso] || [];
              const hasCheckin = events.some(ev => ev.event_type === 'checkin');
              const hasMissed = events.some(ev => ev.event_type === 'missed_checkin' || ev.event_type === 'missed_checkin_alert');
              const userToday = DateTime.now().setZone(timezone).startOf('day');
              const isPast = d < userToday;
              console.log('JUNE 4 FULL EVENTS:', events);
              console.log('JUNE 4 DEBUG:', {
                eventTypes: events.map(ev => ev.event_type),
                hasCheckin,
                hasMissed,
                isPast,
                today: userToday.toISODate(),
                d: d.toISODate(),
              });
            }
            return (
              <div
                key={iso}
                onClick={() => hasEvents ? setSelectedDay(iso === selectedDay ? null : iso) : null}
                className={dayClass}
                style={{ background: 'none', paddingBottom: 0 }}
              >
                <span className={historyStyles.calendarDayNumber}>{d.day}</span>
                <div className={historyStyles.calendarDayBar}>
                  {segments.map((seg, segIdx) => (
                    <div
                      key={segIdx}
                      className={[
                        historyStyles.calendarDayBarSegment,
                        seg.color === 'green' ? historyStyles.calendarDayBarSegmentGreen :
                        seg.color === 'green-light' ? historyStyles.calendarDayBarSegmentGreenLight :
                        seg.color === 'green-medium' ? historyStyles.calendarDayBarSegmentGreenMedium :
                        seg.color === 'green-dark' ? historyStyles.calendarDayBarSegmentGreenDark :
                        seg.color === 'red' ? historyStyles.calendarDayBarSegmentRed :
                        historyStyles.calendarDayBarSegmentGray,
                        barTooltip.day === iso && barTooltip.seg === segIdx ? 'active' : ''
                      ].join(' ')}
                      onMouseEnter={() => setBarTooltip({ day: iso, seg: segIdx })}
                      onMouseLeave={() => setBarTooltip({ day: null, seg: null })}
                      onTouchStart={e => { e.stopPropagation(); setBarTooltip({ day: iso, seg: segIdx }); }}
                      tabIndex={0}
                      onFocus={() => setBarTooltip({ day: iso, seg: segIdx })}
                      onBlur={() => setBarTooltip({ day: null, seg: null })}
                    >
                      {(barTooltip.day === iso && barTooltip.seg === segIdx) && (
                        <div className={historyStyles.calendarDayBarTooltip}>
                          {getSegmentTooltip(seg).split('\n').map((line, i) => (
                            <div key={i}>{line}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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