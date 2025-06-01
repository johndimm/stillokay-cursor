import Link from "next/link";

export default function Guide() {
  return (
    <div style={{ maxWidth: 700, margin: '60px auto', background: '#fff', borderRadius: 18, boxShadow: '0 4px 32px rgba(0,0,0,0.08)', padding: '36px 28px', color: '#222' }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/" style={{ color: '#2a5bd7', fontWeight: 600, fontSize: 16, fontFamily: 'Geist, Arial, sans-serif', letterSpacing: '0.01em', textDecoration: 'none', display: 'inline-block', padding: '2px 0' }}>&larr; Still Okay Home</Link>
      </div>
      <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: 18, color: '#2a5bd7' }}>Still Okay User's Guide</h1>
      <h2 style={{ fontSize: '1.3rem', marginTop: 24, color: '#2a5bd7' }}>What is Still Okay?</h2>
      <p>Still Okay is a simple, friendly service for people who live alone and want peace of mind. You check in regularly, and if you miss a check-in, your chosen caregiver is notified so they can check on you.</p>
      <h2 style={{ fontSize: '1.3rem', marginTop: 24, color: '#2a5bd7' }}>Getting Started</h2>
      <ol style={{ marginLeft: 20 }}>
        <li>Sign in with your Google account.</li>
        <li>Go to <b>Settings</b> and enter your caregiver's name and email.</li>
        <li>Select how often you want to check in (every 2, 4, 6, 8, 10, or 24 hours).</li>
        <li>Choose your timezone (defaults to America/Los_Angeles).</li>
        <li>Optionally, enable "Send email to caregiver when I check in" if you want your caregiver to be notified every time you check in.</li>
        <li>Your caregiver will receive a confirmation email and must opt in.</li>
      </ol>
      <h2 style={{ fontSize: '1.3rem', marginTop: 24, color: '#2a5bd7' }}>How Check-Ins Work</h2>
      <ul style={{ marginLeft: 20 }}>
        <li>On the Home page, click the big <b>Still Okay</b> button to check in.</li>
        <li>You can only check in once per interval (e.g., once every 24 hours, or whatever interval you set).</li>
        <li>If you don't check in by the end of your interval, your caregiver will be notified.</li>
        <li>If your caregiver is alerted about a missed check-in, you will also receive an email letting you know your caregiver has been notified.</li>
        <li>If you check in after missing an interval (and your caregiver was alerted), your caregiver will be notified right away that you are okay, even if you don't have the regular check-in notification enabled.</li>
        <li>One hour before your interval ends, you'll get a reminder email if you haven't checked in yet.</li>
        <li>If you enabled the setting, your caregiver will get an email every time you check in.</li>
        <li>All significant emails and events (check-ins, reminders, alerts, notifications) are logged in your History for your records.</li>
      </ul>
      <h2 style={{ fontSize: '1.3rem', marginTop: 24, color: '#2a5bd7' }}>What Does the Caregiver Do?</h2>
      <ul style={{ marginLeft: 20 }}>
        <li>When you add a caregiver, they receive an email to confirm and opt in.</li>
        <li>If you miss a check-in, your caregiver gets an alert email.</li>
        <li>Caregivers can opt out at any time using a link in the email.</li>
      </ul>
      <h2 style={{ fontSize: '1.3rem', marginTop: 24, color: '#2a5bd7' }}>Frequently Asked Questions</h2>
      <ul style={{ marginLeft: 20 }}>
        <li><b>What if I check in late?</b> — You can only check in once per interval. If you miss the window, your caregiver will be notified.</li>
        <li><b>Can I change my caregiver?</b> — Yes! Update their info in <b>Settings</b>. They'll get a new confirmation email.</li>
        <li><b>What if my caregiver doesn't confirm?</b> — No alerts will be sent until your caregiver confirms and opts in.</li>
        <li><b>Is my data private?</b> — Yes. Your info is only used for check-ins and notifications.</li>
      </ul>
      <div style={{ marginTop: 36, textAlign: 'center' }}>
        <Link href="/" style={{ color: '#2a5bd7', fontWeight: 600, fontSize: 16, fontFamily: 'Geist, Arial, sans-serif', letterSpacing: '0.01em', textDecoration: 'none', display: 'inline-block', padding: '2px 0' }}>&larr; Still Okay Home</Link>
      </div>
      <div style={{ marginTop: 48, borderTop: '1px solid #e0e0e0', paddingTop: 24 }}>
        <h2 style={{ fontSize: '1.1rem', color: '#2a5bd7', marginBottom: 8 }}>Credits</h2>
        <ul style={{ color: '#222', fontSize: '1rem', listStyle: 'none', padding: 0, margin: 0 }}>
          <li>Concept by <b>Neola Mace</b></li>
          <li>Code 100% by <b>Cursor</b></li>
          <li>Prompts by <b>John Dimm</b></li>
          <li>GitHub: <a href="https://github.com/johndimm/stillokay-cursor" style={{ color: '#2a5bd7', textDecoration: 'underline' }}>https://github.com/johndimm/stillokay-cursor</a></li>
        </ul>
      </div>
    </div>
  );
} 