import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-600 mb-8">
            Welcome to Kairos Member App
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Your gateway to church community and engagement
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/login"
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
