import { auth } from "@/auth";
import SignOutButton from "@/components/SignOutButton";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <main className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Welcome to TipApp
          </h1>
          {session?.user && (
            <>
              <p className="mt-2 text-gray-600">
                Signed in as <span className="font-semibold">{session.user.username || session.user.email}</span>
              </p>
              {session.user.isSuperadmin && (
                <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  Admin
                </span>
              )}
            </>
          )}
        </div>

        <div className="mt-8 space-y-4">
          <p className="text-gray-700">
            This is your authenticated dashboard. All routes are protected.
          </p>
          {session?.user && (
            <SignOutButton />
          )}
        </div>
      </main>
    </div>
  );
}
