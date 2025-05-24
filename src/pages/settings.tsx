import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { validateCaregiverInfo } from "../utils/validation";

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEmailVerified, setIsEmailVerified] = useState(false);

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
            setIsEmailVerified(data.caregiverEmailVerified);
          }
        });
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: "", text: "" });
    setErrors({});

    // Validate caregiver information
    const validation = validateCaregiverInfo({
      caregiverName: formData.caregiverName,
      caregiverPhone: formData.caregiverPhone,
      caregiverEmail: formData.caregiverEmail
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("User data saved:", data);
        setMessage({ type: "success", text: "Settings saved successfully!" });
        setIsEmailVerified(data.caregiverEmailVerified);
        
        // Automatically send verification email if not verified
        if (!data.caregiverEmailVerified) {
          console.log("Sending verification email with data:", {
            userId: data.id,
            caregiverEmail: formData.caregiverEmail,
            caregiverName: formData.caregiverName
          });
          
          const verificationResponse = await fetch("/api/send-verification-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: data.id,
              caregiverEmail: formData.caregiverEmail,
              caregiverName: formData.caregiverName
            })
          });
          
          const verificationData = await verificationResponse.json();
          console.log("Verification email response:", verificationData);
          
          if (!verificationResponse.ok) {
            throw new Error(verificationData.error || "Failed to send verification email");
          }
          
          setMessage({
            type: "success",
            text: `Verification email sent to ${formData.caregiverEmail}. Please check your inbox.`
          });
        }
      } else {
        const errorData = await response.json();
        console.error("Failed to save settings:", errorData);
        setMessage({ type: "error", text: "Failed to save settings. Please try again." });
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
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
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.caregiverName ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              />
              {errors.caregiverName && (
                <p className="mt-1 text-sm text-red-600">{errors.caregiverName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Caregiver Phone Number
              </label>
              <input
                type="tel"
                value={formData.caregiverPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, caregiverPhone: e.target.value }))}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.caregiverPhone ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              />
              {errors.caregiverPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.caregiverPhone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Caregiver Email
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  value={formData.caregiverEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, caregiverEmail: e.target.value }))}
                  className={`block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                    errors.caregiverEmail ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {isEmailVerified ? (
                  <p className="mt-1 text-sm text-green-600">✓ Email verified</p>
                ) : (
                  <p className="mt-1 text-sm text-yellow-600">Verification email sent to {formData.caregiverEmail}</p>
                )}
              </div>
              {errors.caregiverEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.caregiverEmail}</p>
              )}
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