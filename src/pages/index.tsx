import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [caregiverName, setCaregiverName] = useState("");
  const [caregiverPhone, setCaregiverPhone] = useState("");
  const [canCheckIn, setCanCheckIn] = useState(true);
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);
  const [formData, setFormData] = useState({ caregiverName: "", caregiverPhone: "" });

  useEffect(() => {
    if (status === "authenticated") {
      // Check if user has already set up caregiver info
      fetch("/api/user")
        .then((res) => res.json())
        .then((data) => {
          if (data.caregiverName) {
            setCaregiverName(data.caregiverName);
            setCaregiverPhone(data.caregiverPhone);
          }
        });

      // Check last check-in time
      fetch("/api/check-in/last")
        .then((res) => res.json())
        .then((data) => {
          if (data.lastCheckIn) {
            const lastCheckInDate = new Date(data.lastCheckIn);
            setLastCheckIn(lastCheckInDate);
            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(0, 0, 0, 0);
            setCanCheckIn(lastCheckInDate < midnight);
          }
        });
    }
  }, [status]);

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
      router.reload();
    }
  };

  const handleCheckIn = async () => {
    const response = await fetch("/api/check-in", {
      method: "POST",
    });
    if (response.ok) {
      setCanCheckIn(false);
      setLastCheckIn(new Date());
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
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
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
                {lastCheckIn && (
                  <p className="text-center text-gray-500">
                    Last check-in: {lastCheckIn.toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 