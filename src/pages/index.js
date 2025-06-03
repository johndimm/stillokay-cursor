import Head from "next/head";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import styles from "@/styles/Home.module.css";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import homeStyles from "@/styles/HomePage.module.css";
import { DateTime } from "luxon";
import historyStyles from "@/styles/HistoryPage.module.css";
import EventTimeline from "@/components/EventTimeline";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  } else if (event_type === "checkin") {
    desc = "Checked in";
  } else if (event_type === "missed_checkin") {
    desc = "Missed check-in: user did not check in during the interval.";
  } else if (event_type === "caregiver_alert_email_sent") {
    desc = `Alert email sent to caregiver`;
  } else if (event_type === "reminder_email_sent") {
    desc = `Reminder email sent to user`;
  } else if (event_type === "caregiver_checkin_email_sent") {
    desc = "Caregiver notified: user checked in";
  } else if (event_type === "user_alert_email_sent") {
    desc = "User notified: caregiver was alerted";
  } else {
    desc = event_type;
  }
  return `${desc}`;
}

function Spinner() {
  return (
    <div className={homeStyles.spinner}>
      <div className={homeStyles.spinnerCircle} />
    </div>
  );
}

function IntervalTimelineBar({
  checkedIn,
  intervalStart,
  intervalEnd,
  intervalHours,
  nextIntervalStart,
  nextIntervalEnd,
  timelineNow,
  showNowTooltip,
  setShowNowTooltip,
  showReminderTooltip,
  setShowReminderTooltip
}) {
  const prevStart = DateTime.fromISO(intervalStart);
  const prevEnd = DateTime.fromISO(intervalEnd);
  const nextStart = DateTime.fromISO(nextIntervalStart);
  const nextEnd = DateTime.fromISO(nextIntervalEnd);
  const now = timelineNow.setZone(prevStart.zone);
  let leftMarker = null;
  let rightMarker = null;
  let singleMarker = null;
  let reminderMarker = null;
  // Left bar: previous interval
  if (checkedIn && now >= prevStart && now <= prevEnd) {
    const totalMs = prevEnd.toMillis() - prevStart.toMillis();
    let nowPct = ((now.toMillis() - prevStart.toMillis()) / totalMs) * 100;
    leftMarker = (
      <div
        className={homeStyles.timelineMarker}
        style={{ left: `${nowPct}%` }}
        onMouseEnter={() => { setShowNowTooltip(true); }}
        onMouseLeave={() => setShowNowTooltip(false)}
      >
        <div className={homeStyles.timelineMarkerBar} />
        {showNowTooltip && (
          <div className={homeStyles.timelineTooltip}>
            <div>Current time:</div>
            <div style={{ marginTop: 2, color: '#e53935', fontSize: 14, fontWeight: 700 }}>{now.toLocaleString(DateTime.TIME_SIMPLE)}</div>
          </div>
        )}
      </div>
    );
  }
  // Right bar: next interval
  if (checkedIn && now >= nextStart && now <= nextEnd) {
    const totalMs = nextEnd.toMillis() - nextStart.toMillis();
    let nowPct = ((now.toMillis() - nextStart.toMillis()) / totalMs) * 100;
    rightMarker = (
      <div
        className={homeStyles.timelineMarker}
        style={{ left: `${nowPct}%` }}
        onMouseEnter={() => { setShowNowTooltip(true); }}
        onMouseLeave={() => setShowNowTooltip(false)}
      >
        <div className={homeStyles.timelineMarkerBar} />
        {showNowTooltip && (
          <div className={homeStyles.timelineTooltip}>
            <div>Current time:</div>
            <div style={{ marginTop: 2, color: '#e53935', fontSize: 14, fontWeight: 700 }}>{now.toLocaleString(DateTime.TIME_SIMPLE)}</div>
          </div>
        )}
      </div>
    );
  }
  // Not checked in: single bar, use current interval
  if (!checkedIn) {
    const start = prevStart;
    const end = prevEnd;
    const totalMs = end.toMillis() - start.toMillis();
    let nowPct = ((now.toMillis() - start.toMillis()) / totalMs) * 100;
    nowPct = Math.max(0, Math.min(100, nowPct));
    singleMarker = (
      <div
        className={homeStyles.timelineMarker}
        style={{ left: `${nowPct}%` }}
        onMouseEnter={() => { setShowNowTooltip(true); }}
        onMouseLeave={() => setShowNowTooltip(false)}
      >
        <div className={homeStyles.timelineMarkerBar} />
        {showNowTooltip && (
          <div className={homeStyles.timelineTooltip}>
            <div>Current time:</div>
            <div style={{ marginTop: 2, color: '#e53935', fontSize: 14, fontWeight: 700 }}>{now.toLocaleString(DateTime.TIME_SIMPLE)}</div>
          </div>
        )}
      </div>
    );
    // Reminder marker (bell)
    const reminderTime = end.minus({ hours: 1 });
    if (reminderTime > start && reminderTime < end) {
      let reminderPct = ((reminderTime.toMillis() - start.toMillis()) / totalMs) * 100;
      reminderPct = Math.max(0, Math.min(100, reminderPct));
      reminderMarker = (
        <div
          className={homeStyles.timelineMarker}
          style={{ left: `${reminderPct}%`, zIndex: 3 }}
          onMouseEnter={() => setShowReminderTooltip(true)}
          onMouseLeave={() => setShowReminderTooltip(false)}
        >
          <div style={{ position: 'absolute', left: -10, top: 2, height: 28, width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Solid Bell SVG */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff9800" style={{ display: 'block' }}>
              <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6V11c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-1.29 1.29A1 1 0 0 0 6 19h12a1 1 0 0 0 .71-1.71L18 16z" />
            </svg>
          </div>
          {showReminderTooltip && (
            <div className={`${homeStyles.timelineTooltip} ${homeStyles.timelineTooltipReminder}`}>
              <div>Reminder will be sent at:</div>
              <div style={{ marginTop: 2, color: '#ff9800', fontSize: 14, fontWeight: 700 }}>{reminderTime.toLocaleString(DateTime.TIME_SIMPLE)}</div>
            </div>
          )}
        </div>
      );
    }
  }
  return (
    <div className={homeStyles.timelineBarContainer}>
      {checkedIn ? (
        <div className={homeStyles.timelineBar}>
          <div className={homeStyles.timelineBarGray}>{leftMarker}</div>
          <div className={homeStyles.timelineBarBlue}>{rightMarker}</div>
        </div>
      ) : (
        <div className={homeStyles.timelineBarSingle}>
          {singleMarker}
          {reminderMarker}
        </div>
      )}
      <div className={homeStyles.timelineLabelRow}>
        <span>{DateTime.fromISO(intervalStart).toLocaleString(DateTime.TIME_SIMPLE)}</span>
        {checkedIn && (
          <span style={{ color: '#888', fontWeight: 400 }}>
            {DateTime.fromISO(intervalStart).plus({ hours: intervalHours / 2 }).toLocaleString(DateTime.TIME_SIMPLE)}
          </span>
        )}
        <span style={{ color: checkedIn ? '#888' : '#2a5bd7', fontWeight: checkedIn ? 400 : 500 }}>
          {DateTime.fromISO(intervalEnd).toLocaleString(DateTime.TIME_SIMPLE)}
        </span>
        {checkedIn && (
          <span style={{ color: '#2a5bd7', fontWeight: 500 }}>
            {DateTime.fromISO(intervalEnd).plus({ hours: intervalHours / 2 }).toLocaleString(DateTime.TIME_SIMPLE)}
          </span>
        )}
        {checkedIn && (
          <span style={{ color: '#2a5bd7', fontWeight: 500 }}>
            {DateTime.fromISO(intervalEnd).plus({ hours: intervalHours }).toLocaleString(DateTime.TIME_SIMPLE)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { data: session } = useSession();
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [intervalStart, setIntervalStart] = useState(null);
  const [intervalEnd, setIntervalEnd] = useState(null);
  const [intervalHours, setIntervalHours] = useState(null);
  const [nextIntervalStart, setNextIntervalStart] = useState(null);
  const [nextIntervalEnd, setNextIntervalEnd] = useState(null);
  const [timerId, setTimerId] = useState(null);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [timelineNow, setTimelineNow] = useState(DateTime.now());
  const [showNowTooltip, setShowNowTooltip] = useState(false);
  const [showReminderTooltip, setShowReminderTooltip] = useState(false);

  async function fetchCheckinStatus() {
    const res = await fetch('/api/checkin-status');
    if (res.ok) {
      const data = await res.json();
      setCheckedIn(data.checkedIn);
      setNextIntervalStart(data.nextIntervalStart);
      setNextIntervalEnd(data.nextIntervalEnd);
      setIntervalStart(data.intervalStart);
      setIntervalEnd(data.intervalEnd);
      setIntervalHours(data.intervalHours);
      // Always set a timer to refresh at the next interval boundary
      if (data.nextIntervalStart) {
        const ms = DateTime.fromISO(data.nextIntervalStart).toMillis() - DateTime.now().toMillis();
        if (ms > 0) {
          if (timerId) clearTimeout(timerId);
          const id = setTimeout(() => fetchCheckinStatus(), ms + 1000);
          setTimerId(id);
        }
      }
    }
  }

  async function fetchHistory() {
    setLoadingEvents(true);
    const res = await fetch("/api/history");
    if (res.ok) {
      const data = await res.json();
      setEvents((data.events || []).map(e => ({ ...e, event_data: e.event_data || {} })).slice(0, 5));
    }
    setLoadingEvents(false);
  }

  useEffect(() => {
    fetchCheckinStatus();
    fetchHistory();
    return () => { if (timerId) clearTimeout(timerId); };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    // Update timeline every minute
    const interval = setInterval(() => {
      setTimelineNow(DateTime.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await fetch('/api/checkin', { method: 'POST' });
      if (res.ok) {
        await fetchCheckinStatus();
        await fetchHistory();
      }
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <>
      <Head>
        <title>Still Okay</title>
        <meta name="description" content="Still Okay app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={`${styles.page} ${geistSans.variable} ${geistMono.variable} ${homeStyles.container}`}>
        <main className={styles.main}>
          {!session ? (
            <button
              onClick={() => signIn("google")}
              className={homeStyles.signInBtn}
              onMouseOver={e => e.currentTarget.classList.add(homeStyles.signInBtnHover)}
              onMouseOut={e => e.currentTarget.classList.remove(homeStyles.signInBtnHover)}
            >
              <span className={homeStyles.googleIcon}>
                <svg width="22" height="22" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M44.5 20H24v8.5h11.7C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.5 4.5 29.6 2 24 2 12.9 2 4 10.9 4 22s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.2-4z"/><path fill="#34A853" d="M6.3 14.7l7 5.1C15.2 16.2 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.5 4.5 29.6 2 24 2 15.3 2 7.8 7.7 6.3 14.7z"/><path fill="#FBBC05" d="M24 44c5.6 0 10.5-1.8 14.3-4.9l-6.6-5.4C29.8 37 24 37 24 37c-5.8 0-10.7-3.1-13.2-7.6l-7 5.4C7.8 40.3 15.3 44 24 44z"/><path fill="#EA4335" d="M44.5 20H24v8.5h11.7c-1.6 4.1-6.1 8.5-11.7 8.5-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.5 4.5 29.6 2 24 2 12.9 2 4 10.9 4 22s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.2-4z"/></g></svg>
              </span>
              Sign in with Google
            </button>
          ) : (
            <div className={homeStyles.mainFlex}>
              <button
                className={[
                  homeStyles.checkInBtn,
                  checkedIn ? homeStyles.checkInBtnChecked : '',
                  (checkingIn || checkedIn) ? homeStyles.checkInBtnDisabled : ''
                ].join(' ')}
                onClick={handleCheckIn}
                disabled={checkingIn || checkedIn}
                onMouseDown={e => e.currentTarget.style.transform = 'translateY(2px)'}
                onMouseUp={e => e.currentTarget.style.transform = ''}
                onMouseLeave={e => e.currentTarget.style.transform = ''}
              >
                <span className={homeStyles.checkInBtnGradient} />
                <span style={{ position: 'relative', zIndex: 1 }}>Still Okay</span>
              </button>
              {checkedIn && nextIntervalStart && (
                <div className={homeStyles.checkedInMsg}>
                  {(() => {
                    const next = DateTime.fromISO(nextIntervalStart);
                    const now = DateTime.now().setZone(next.zoneName);
                    if (next.hasSame(now, 'day')) {
                      return <>Checked in! You can check in again at {next.toLocaleString(DateTime.TIME_SIMPLE)}</>;
                    } else {
                      // If next is this year, omit the year
                      const showYear = next.year !== now.year;
                      const dateOpts = showYear
                        ? DateTime.DATETIME_MED
                        : { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' };
                      return <>Checked in! You can check in again at {next.toLocaleString(dateOpts)}</>;
                    }
                  })()}
                </div>
              )}
              {/* Interval Timeline Bar */}
              {intervalStart && intervalEnd && intervalHours && (
                <IntervalTimelineBar
                  checkedIn={checkedIn}
                  intervalStart={intervalStart}
                  intervalEnd={intervalEnd}
                  intervalHours={intervalHours}
                  nextIntervalStart={nextIntervalStart}
                  nextIntervalEnd={nextIntervalEnd}
                  timelineNow={timelineNow}
                  showNowTooltip={showNowTooltip}
                  setShowNowTooltip={setShowNowTooltip}
                  showReminderTooltip={showReminderTooltip}
                  setShowReminderTooltip={setShowReminderTooltip}
                />
              )}
              {/* Timeline */}
              <div style={{ width: '100%', maxWidth: 480, margin: '0 auto 24px auto' }}>
                <div className={homeStyles.recentActivityHeader}>Recent Activity</div>
                {loadingEvents ? <Spinner /> : (
                  <EventTimeline events={events} limit={5} formatEvent={formatEvent} />
                )}
              </div>
              <div className={homeStyles.userInfo}>
                <p>Signed in as {session.user.name} ({session.user.email})</p>
              </div>
              <div className={homeStyles.navLinks}>
                <Link href="/settings" className={homeStyles.navLink}>Settings</Link>
                <Link href="/history" className={homeStyles.navLink}>History</Link>
                <Link href="/guide" className={homeStyles.navLink}>User's Guide</Link>
              </div>
              <button className={homeStyles.signOutBtn} onClick={() => signOut()}>Sign out</button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
