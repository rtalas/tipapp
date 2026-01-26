"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, Suspense } from "react";
import { AlertCircle } from "lucide-react";
import { useTranslations } from 'next-intl';

function LoginForm() {
  const t = useTranslations('auth.login');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get callback URL from search params
  // Note: Don't default to /admin here - let the signIn result determine the redirect
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      // Auth.js v5 bug: ok can be true even with errors
      if (result?.error || !result?.ok) {
        setError(t('invalidCredentials'));
        setIsLoading(false);
        return;
      }

      // If no specific callback URL, check if user is admin and redirect accordingly
      if (callbackUrl === "/") {
        // Fetch session to check if user is superadmin
        const response = await fetch('/api/auth/session');
        const session = await response.json();

        if (session?.user?.isSuperadmin) {
          router.push('/admin');
        } else {
          router.push('/');
        }
      } else {
        router.push(callbackUrl);
      }
    } catch (err) {
      console.error("signIn error:", err);
      setError(t('errorGeneric'));
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            {t('title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('noAccount')}{" "}
            <Link
              href="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {t('signUp')}
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="sr-only">
                {t('username')}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder={t('username')}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                {t('password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder={t('password')}
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('submitting') : t('submit')}
          </button>

          <div className="flex items-center justify-center">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              {t('forgotPassword')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function LoginPageFallback() {
  const t = useTranslations('auth.login');
  return (
    <div className="flex min-h-screen items-center justify-center">{t('loading')}</div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginForm />
    </Suspense>
  );
}
