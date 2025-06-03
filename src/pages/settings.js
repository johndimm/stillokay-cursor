import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import settingsStyles from "@/styles/SettingsPage.module.css";

const INTERVAL_OPTIONS = [2, 4, 6, 8, 10, 24];
const TIMEZONE_OPTIONS = [
  "America/Los_Angeles",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney"
];

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

export default function Settings() {
  const { data: session } = useSession();
  const [caregiverName, setCaregiverName] = useState("");
  const [caregiverEmail, setCaregiverEmail] = useState("");
  const [interval, setInterval] = useState(24);
  const [status, setStatus] = useState("");
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showImage, setShowImage] = useState(false);
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [sendCheckinEmail, setSendCheckinEmail] = useState(false);

  useEffect(() => {
    // Only show image if not already shown in this session
    if (typeof window !== 'undefined' && !sessionStorage.getItem('settingsImageShown')) {
      setShowImage(true);
      sessionStorage.setItem('settingsImageShown', '1');
    }
  }, []);

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setCaregiverName(data.caregiver_name || "");
        setCaregiverEmail(data.caregiver_email || "");
        setInterval(data.interval || 24);
        setEmailConfirmed(!!data.email_confirmed);
        setTimezone(data.timezone || "America/Los_Angeles");
        setSendCheckinEmail(!!data.send_checkin_email);
      }
      setLoading(false);
    }
    fetchSettings();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setStatus("Saving...");
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caregiver_name: caregiverName, caregiver_email: caregiverEmail, interval, timezone, send_checkin_email: sendCheckinEmail }),
    });
    if (res.ok) {
      setStatus("Saved!");
    } else {
      setStatus("Error saving settings");
    }
  }

  if (!session) return <p>Please sign in to view settings.</p>;
  if (loading) return <Spinner />;

  return (
    <div className={settingsStyles.container}>
      <div className={settingsStyles.backLink}>
        <Link href="/" style={{ color: '#2a5bd7', fontWeight: 700, fontSize: 20, fontFamily: 'Geist, Arial, sans-serif', letterSpacing: '0.01em', textDecoration: 'none', display: 'inline-block', padding: '2px 0' }}>&larr; Still Okay Home</Link>
      </div>
      <h1 className={settingsStyles.title}>Settings</h1>
      <div className={settingsStyles.profile}>
        {showImage && (
          <img src={session.user.image} alt={session.user.name} className={settingsStyles.profileImage} />
        )}
        <div>
          <div><b>{session.user.name}</b></div>
          <div>{session.user.email}</div>
        </div>
      </div>
      <form onSubmit={handleSave}>
        <div className={settingsStyles.formGroup}>
          <label className={settingsStyles.label}>Caregiver Name<br />
            <input type="text" value={caregiverName} onChange={e => {
              setCaregiverName(e.target.value);
            }} className={settingsStyles.input} />
          </label>
        </div>
        <div className={settingsStyles.formGroup}>
          <label className={settingsStyles.label}>Caregiver Email<br />
            <input type="email" value={caregiverEmail} onChange={e => {
              setCaregiverEmail(e.target.value);
            }} className={settingsStyles.input} />
          </label>
          <div className={settingsStyles.emailStatus}>
            {emailConfirmed ? 'Caregiver email confirmed' : 'Caregiver email not confirmed'}
          </div>
        </div>
        <div className={settingsStyles.formGroup}>
          <label className={settingsStyles.label}>Check-in Interval<br />
            <select value={interval} onChange={e => {
              setInterval(Number(e.target.value));
            }} className={settingsStyles.select}>
              {INTERVAL_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt} hours</option>
              ))}
            </select>
          </label>
        </div>
        <div className={settingsStyles.formGroup}>
          <label className={settingsStyles.label}>Timezone<br />
            <select value={timezone} onChange={e => {
              setTimezone(e.target.value);
            }} className={settingsStyles.select}>
              {TIMEZONE_OPTIONS.map(tz => (
                <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
              ))}
            </select>
          </label>
        </div>
        <div className={settingsStyles.formGroup}>
          <label className={settingsStyles.label}>
            <input type="checkbox" checked={sendCheckinEmail} onChange={e => {
              setSendCheckinEmail(e.target.checked);
            }} style={{ marginRight: 8 }} />
            Send email to caregiver when I check in
          </label>
        </div>
        <button type="submit" className={settingsStyles.saveBtn}>Save</button>
        <span className={settingsStyles.status}>{status}</span>
      </form>
    </div>
  );
} 