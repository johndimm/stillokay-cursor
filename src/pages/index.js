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

export default function Home() {
  const { data: session } = useSession();
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [intervalStart, setIntervalStart] = useState(null);
  const [intervalEnd, setIntervalEnd] = useState(null);
  const [intervalHours, setIntervalHours] = useState(null);
  const [nextIntervalStart, setNextIntervalStart] = useState(null);
  const [timerId, setTimerId] = useState(null);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  async function fetchCheckinStatus() {
    const res = await fetch('/api/checkin-status');
    if (res.ok) {
      const data = await res.json();
      setCheckedIn(data.checkedIn);
      setNextIntervalStart(data.nextIntervalStart);
      setIntervalStart(data.intervalStart);
      setIntervalEnd(data.intervalEnd);
      setIntervalHours(data.intervalHours);
      if (data.checkedIn && data.nextIntervalStart) {
        const ms = DateTime.fromISO(data.nextIntervalStart).toMillis() - DateTime.now().toMillis();
        if (ms > 0) {
          const id = setTimeout(() => fetchCheckinStatus(), ms + 1000);
          setTimerId(id);
        }
      }
    }
  }

  useEffect(() => {
    fetchCheckinStatus();
    async function fetchHistory() {
      setLoadingEvents(true);
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setEvents((data.events || []).map(e => ({ ...e, event_data: e.event_data || {} })).slice(0, 5));
      }
      setLoadingEvents(false);
    }
    fetchHistory();
    return () => { if (timerId) clearTimeout(timerId); };
    // eslint-disable-next-line
  }, []);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await fetch('/api/checkin', { method: 'POST' });
      if (res.ok) {
        await fetchCheckinStatus();
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
          <h1>Still Okay</h1>
          {!session ? (
            <button onClick={() => signIn("google")}>Sign in with Google</button>
          ) : (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <button
                style={{
                  background: checkedIn ? 'linear-gradient(180deg, #f3f3f3 0%, #e0e0e0 100%)' : 'linear-gradient(180deg, #fffbe6 0%, #ffe066 100%)',
                  color: checkedIn ? '#aaa' : '#b88600',
                  fontSize: '2rem',
                  fontWeight: 700,
                  border: '2px solid #ffe066',
                  borderRadius: '18px',
                  padding: '36px 64px',
                  marginBottom: 32,
                  marginTop: 16,
                  boxShadow: checkedIn ? '0 4px 24px rgba(180,180,180,0.10), 0 2px 8px #f3f3f3 inset' : '0 4px 24px rgba(255, 224, 102, 0.18), 0 2px 8px #fffbe6 inset',
                  cursor: checkingIn || checkedIn ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.03em',
                  transition: 'background 0.15s, box-shadow 0.15s, transform 0.08s',
                  textShadow: checkedIn ? 'none' : '0 1px 0 #fffbe6, 0 2px 8px #ffe066',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: checkingIn || checkedIn ? 0.7 : 1,
                }}
                onClick={handleCheckIn}
                disabled={checkingIn || checkedIn}
                onMouseDown={e => e.currentTarget.style.transform = 'translateY(2px)'}
                onMouseUp={e => e.currentTarget.style.transform = ''}
                onMouseLeave={e => e.currentTarget.style.transform = ''}
              >
                <span style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: '40%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.2) 100%)',
                  borderTopLeftRadius: '18px',
                  borderTopRightRadius: '18px',
                  pointerEvents: 'none',
                }} />
                <span style={{ position: 'relative', zIndex: 1 }}>Still Okay</span>
              </button>
              {checkedIn && nextIntervalStart && (
                <div style={{ color: '#888', marginBottom: 16, fontSize: 16 }}>
                  Checked in! You can check in again at {DateTime.fromISO(nextIntervalStart).toLocaleString(DateTime.DATETIME_MED)}
                </div>
              )}
              {/* Interval Timeline Bar */}
              {intervalStart && intervalEnd && intervalHours && (
                <div style={{ width: '100%', maxWidth: 480, margin: '0 auto 24px auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', margin: '12px 0 8px 0' }}>
                    <div style={{ display: 'flex', width: '100%', height: 18, borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px #e6e6e6' }}>
                      {!checkedIn ? (
                        <div style={{ width: '100%', background: 'linear-gradient(90deg, #2a5bd7 60%, #5b8df7 100%)', transition: 'background 0.2s' }} />
                      ) : (
                        <>
                          <div style={{ width: '50%', background: 'linear-gradient(90deg, #bbb 60%, #e0e0e0 100%)', transition: 'background 0.2s' }} />
                          <div style={{ width: '50%', background: 'linear-gradient(90deg, #2a5bd7 60%, #5b8df7 100%)', transition: 'background 0.2s' }} />
                        </>
                      )}
                    </div>
                    {/* Timeline labels */}
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', fontSize: 13, color: '#2a5bd7', marginTop: 4, fontWeight: 500 }}>
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
                  <div style={{ textAlign: 'center', color: checkedIn ? '#888' : '#2a5bd7', fontWeight: 500, fontSize: 13, marginTop: 2 }}>
                    {!checkedIn ? `Current interval (${intervalHours}h)` : `Current + Upcoming interval (${intervalHours}h each)`}
                  </div>
                </div>
              )}
              {/* Timeline */}
              <div style={{ width: '100%', maxWidth: 480, margin: '0 auto 24px auto' }}>
                <div className={historyStyles.header} style={{ fontSize: '1.2rem', margin: '16px 0 12px 0' }}>Recent Activity</div>
                {loadingEvents ? <Spinner /> : (
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
                )}
              </div>
              <div className={homeStyles.userInfo}>
                <p>Signed in as {session.user.name} ({session.user.email})</p>
              </div>
              <div className={homeStyles.navLinks}>
                <Link href="/settings" className={homeStyles.navLink}>Settings</Link>
                <Link href="/history" className={homeStyles.navLink}>History</Link>
              </div>
              <button className={homeStyles.signOutBtn} onClick={() => signOut()}>Sign out</button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
