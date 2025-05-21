import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function Settings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    caregiverName: "",
    caregiverPhone: "",
    caregiverEmail: "",
    checkInInterval: 24
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (status === "authenticated") {
      // Fetch current user settings
      fetch("/api/user")
        .then((res) => res.json())
        .then((data) => {
          if (data.caregiverName) {
            setFormData({
              caregiverName: data.caregiverName,
              caregiverPhone: data.caregiverPhone,
              caregiverEmail: data.caregiverEmail,
              checkInInterval: data.checkInInterval
            });
          }
        });
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await fetch("/api/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Settings saved successfully!" });
      } else {
        setMessage({ type: "error", text: "Failed to save settings. Please try again." });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Settings - Still Okay</title>
        <meta name="description" content="Manage your Still Okay settings" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Settings</h1>
            <button
              onClick={() => router.push("/")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Back to Home
            </button>
          </div>

          {message.text && (
            <div className={`mb-4 p-4 rounded ${
              message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}>
              {message.text}
            </div>
          )}

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
                Check-in Interval
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
              disabled={isSaving}
              className={`w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 ${
                isSaving ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
} 