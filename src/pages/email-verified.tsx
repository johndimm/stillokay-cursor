import { useRouter } from "next/router";
import Head from "next/head";

export default function EmailVerified() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Email Verified - Still Okay</title>
        <meta name="description" content="Email verification successful" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-2xl font-bold text-green-600 mb-4">Email Verified Successfully!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for verifying your email address. You will now receive notifications about check-ins.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Return to Home
          </button>
        </div>
      </main>
    </div>
  );
} 