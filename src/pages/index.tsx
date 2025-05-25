import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import React from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [caregiverName, setCaregiverName] = useState("");
  const [caregiverPhone, setCaregiverPhone] = useState("");
  const [caregiverEmail, setCaregiverEmail] = useState("");
  const [checkInInterval, setCheckInInterval] = useState(24);
  const [canCheckIn, setCanCheckIn] = useState(true);
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);
  const [nextCheckIn, setNextCheckIn] = useState<Date | null>(null);
  const [nextWindowStart, setNextWindowStart] = useState<Date | null>(null);
  const [formData, setFormData] = useState({ 
    caregiverName: "", 
    caregiverPhone: "",
    caregiverEmail: "",
    checkInInterval: 24
  });
  const [nowTime, setNowTime] = useState(new Date());

  useEffect(() => {
    if (status === "authenticated") {
      console.log("User is authenticated, fetching data...");
      
      // Check if user has already set up caregiver info
      fetch("/api/user")
        .then((res) => res.json())
        .then((data) => {
          console.log("User data received:", data);
          if (data.caregiverName) {
            setCaregiverName(data.caregiverName);
            setCaregiverPhone(data.caregiverPhone);
            setCaregiverEmail(data.caregiverEmail);
            setCheckInInterval(data.checkInInterval);
          }
        })
        .catch(error => {
          console.error("Error fetching user data:", error);
        });

      // Check last check-in time
      fetch("/api/check-in/last")
        .then((res) => res.json())
        .then((data) => {
          console.log("Last check-in data received:", data);
          if (data.lastCheckIn) {
            const lastCheckInDate = new Date(data.lastCheckIn);
            console.log("Setting last check-in to:", lastCheckInDate);
            setLastCheckIn(lastCheckInDate);

            // Calculate window and due times based on interval
            const now = nowTime;
            if (checkInInterval === 1) {
              // 1-hour interval: fixed clock-hour window
              const windowStart = new Date(now);
              windowStart.setMinutes(0, 0, 0); // top of the hour
              const windowEnd = new Date(windowStart);
              windowEnd.setHours(windowEnd.getHours() + 1);
              setNextWindowStart(windowEnd); // next window start is next top of the hour
              setNextCheckIn(windowEnd); // due at the end of the window
              // If lastCheckIn is within the current window, disable button
              if (lastCheckInDate >= windowStart && lastCheckInDate < windowEnd) {
                setCanCheckIn(false);
              } else {
                setCanCheckIn(true);
              }
            } else {
              // 24-hour interval (midnight-to-midnight)
              const windowStart = new Date(now);
              windowStart.setHours(0, 0, 0, 0);
              const windowEnd = new Date(windowStart);
              windowEnd.setDate(windowEnd.getDate() + 1);
              if (lastCheckInDate >= windowStart && lastCheckInDate < windowEnd) {
                setCanCheckIn(false);
              } else {
                setCanCheckIn(true);
              }
              // Next check-in due is the end of the next window (midnight after tomorrow)
              const nextWindowEnd = new Date(windowEnd);
              nextWindowEnd.setDate(nextWindowEnd.getDate() + 1);
              setNextCheckIn(nextWindowEnd);
              setNextWindowStart(windowEnd);
            }
          } else {
            console.log("No last check-in found");
            setCanCheckIn(true);
            // Next check-in due is the end of the current window
            const now = new Date();
            if (checkInInterval === 1) {
              const windowStart = new Date(now);
              windowStart.setMinutes(0, 0, 0);
              const windowEnd = new Date(windowStart);
              windowEnd.setHours(windowEnd.getHours() + 1);
              setNextCheckIn(windowEnd);
              setNextWindowStart(windowEnd);
            } else {
              const windowStart = new Date(now);
              windowStart.setHours(0, 0, 0, 0);
              const windowEnd = new Date(windowStart);
              windowEnd.setDate(windowEnd.getDate() + 1);
              setNextCheckIn(windowEnd);
              setNextWindowStart(windowEnd);
            }
          }
        })
        .catch(error => {
          console.error("Error fetching last check-in:", error);
        });
    }
  }, [status, checkInInterval, nowTime]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 10000); // update every 10 seconds
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch("/api/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
    if (response.ok) {
      setCaregiverName(formData.caregiverName);
      setCaregiverPhone(formData.caregiverPhone);
      setCaregiverEmail(formData.caregiverEmail);
      setCheckInInterval(formData.checkInInterval);
      router.reload();
    }
  };

  const handleCheckIn = async () => {
    const response = await fetch("/api/check-in", {
      method: "POST",
    });
    if (response.ok) {
      const now = new Date();
      console.log("New check-in recorded at:", now);
      setLastCheckIn(now);
      
      // After check-in, disable button until next window (midnight)
      setCanCheckIn(false);
      // Next check-in due is the end of the current window
      const windowStart = new Date(now);
      windowStart.setHours(0, 0, 0, 0);
      const windowEnd = new Date(windowStart);
      windowEnd.setDate(windowEnd.getDate() + 1);
      setNextCheckIn(windowEnd);
      setNextWindowStart(windowEnd);
    }
  };

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Still Okay</title>
        <meta name="description" content="Daily check-in service for peace of mind" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        {!session ? (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold mb-4">Welcome to Still Okay</h1>
            <p className="mb-4">Sign in to get started with your daily check-ins.</p>
            <button
              onClick={() => signIn("google")}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              Sign in with Google
            </button>
          </div>
        ) : (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">Still Okay</h1>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/settings')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Settings
                </button>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Sign out
                </button>
              </div>
            </div>

            {!caregiverName ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Caregiver Name
                  </label>
                  <input
                    type="text"
                    value={formData.caregiverName}
                    onChange={(e) => setFormData(prev => ({ ...prev, caregiverName: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Caregiver Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.caregiverPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, caregiverPhone: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Caregiver Email
                  </label>
                  <input
                    type="email"
                    value={formData.caregiverEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, caregiverEmail: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Check-in Interval (hours)
                  </label>
                  <select
                    value={formData.checkInInterval}
                    onChange={(e) => setFormData(prev => ({ ...prev, checkInInterval: parseInt(e.target.value) }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="1">Every hour</option>
                    <option value="2">Every 2 hours</option>
                    <option value="4">Every 4 hours</option>
                    <option value="8">Every 8 hours</option>
                    <option value="12">Every 12 hours</option>
                    <option value="24">Every 24 hours</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                >
                  Save Caregiver Info
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-gray-600">Your caregiver: {caregiverName}</p>
                  <p className="text-gray-600">Phone: {caregiverPhone}</p>
                  <p className="text-gray-600">Email: {caregiverEmail}</p>
                  <p className="text-gray-600">Check-in interval: {checkInInterval} {checkInInterval === 1 ? 'hour' : 'hours'}</p>
                </div>
                <button
                  onClick={handleCheckIn}
                  disabled={!canCheckIn}
                  className={`w-full py-4 px-6 rounded text-xl font-bold ${
                    canCheckIn
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Still Okay
                </button>
                {/* Graphical check-in window */}
                {nextWindowStart && nextCheckIn && (() => {
                  // Define barMid, barStart, barEnd for both cases
                  let barMid, barStart, barEnd;
                  if (checkInInterval === 1) {
                    barMid = new Date(nextWindowStart); // current interval start
                    barStart = new Date(barMid.getTime() - 60 * 60 * 1000); // previous interval start
                    barEnd = new Date(barMid.getTime() + 60 * 60 * 1000);   // next interval start
                  } else {
                    barMid = new Date(nextWindowStart);
                    barStart = new Date(barMid.getTime() - 24 * 60 * 60 * 1000);
                    barEnd = new Date(barMid.getTime() + 24 * 60 * 60 * 1000);
                  }
                  const total = barEnd.getTime() - barStart.getTime();
                  // Now render the correct case
                  return canCheckIn ? (() => {
                    // CASE 1: Only a single blue bar for the current interval
                    const intervalStart = new Date(nowTime);
                    intervalStart.setMinutes(0, 0, 0);
                    const intervalEnd = new Date(intervalStart);
                    intervalEnd.setHours(intervalEnd.getHours() + 1);
                    const intervalTotal = intervalEnd.getTime() - intervalStart.getTime();
                    const nowInInterval = Math.max(0, Math.min(1, (nowTime.getTime() - intervalStart.getTime()) / intervalTotal));
                    const nowPercent = nowInInterval * 100;
                    return (
                      <>
                        <div className="flex justify-between text-xs text-gray-700 mb-1 px-2">
                          <span>{intervalStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>{intervalEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="relative w-full h-10 bg-blue-400" style={{ opacity: 0.5 }}>
                          <div
                            className="absolute"
                            style={{
                              left: `calc(${nowPercent}% - 14px)`,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              zIndex: 3,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <div className="h-7 w-7 bg-green-500 rounded-full border-4 border-white shadow-lg"></div>
                          </div>
                        </div>
                      </>
                    );
                  })() : (() => {
                    // CASE 2: Existing split bar logic
                    const completedPercent = Math.max(0, Math.min(100, ((barMid.getTime() - barStart.getTime()) / total) * 100));
                    const nowPercent = Math.max(0, Math.min(100, ((nowTime.getTime() - barStart.getTime()) / total) * 100));
                    let lastCheckInPercent = null;
                    if (lastCheckIn && lastCheckIn >= barStart && lastCheckIn <= barEnd) {
                      lastCheckInPercent = ((lastCheckIn.getTime() - barStart.getTime()) / total) * 100;
                    }
                    // Determine if the user checked in during the previous window
                    let checkedInPrev = false;
                    if (lastCheckIn) {
                      const prevWindowStart = new Date(barMid.getTime() - 60 * 60 * 1000);
                      const prevWindowEnd = new Date(barMid);
                      checkedInPrev = lastCheckIn >= prevWindowStart && lastCheckIn < prevWindowEnd;
                    }
                    return (
                      <>
                        <div className="flex justify-between text-xs text-gray-700 mb-1 px-2">
                          <span>{barStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>{barMid.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>{barEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="relative h-10 bg-gray-300">
                          <div
                            className="absolute top-0 left-0 h-10 bg-gray-400"
                            style={{ width: `${completedPercent}%`, zIndex: 1, opacity: 0.5 }}
                          ></div>
                          <div
                            className="absolute top-0 left-0 h-10 bg-blue-400"
                            style={{ left: `${completedPercent}%`, width: `${100 - completedPercent}%`, zIndex: 1, opacity: 0.5 }}
                          ></div>
                          <div
                            className="absolute top-0 h-10 border-l-2 border-gray-500"
                            style={{ left: `calc(${completedPercent}% - 1px)`, zIndex: 2 }}
                          ></div>
                          {/* Green 'Now' marker inside the bar, vertically centered, no label */}
                          {(() => {
                            const clampedNowPercent = Math.max(0, Math.min(100, nowPercent));
                            if (nowTime >= barStart && nowTime <= barEnd) {
                              return (
                                <div
                                  className="absolute flex items-center justify-center"
                                  style={{ left: `calc(${clampedNowPercent}% - 14px)`, top: '50%', transform: 'translateY(-50%)', zIndex: 3 }}
                                >
                                  <div className="h-7 w-7 bg-green-500 rounded-full border-4 border-white shadow-lg"></div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        {/* Check in checkbox and label below the bar, centered under the divider */}
                        <div className="flex justify-center mt-2" style={{ position: 'relative' }}>
                          <div style={{ position: 'absolute', left: `${completedPercent}%`, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input type="checkbox" checked={checkedInPrev} readOnly style={{ width: 20, height: 20 }} />
                            <span className="text-xs text-gray-700">Check in</span>
                          </div>
                        </div>
                      </>
                    );
                  })();
                })()}
                <div className="text-center space-y-2">
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 