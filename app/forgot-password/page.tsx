'use client';

import { requestPasswordReset } from '@/actions/password-reset';
import { validateForgotPassword } from '@/lib/validation-client';
import Link from 'next/link';
import { useState, Suspense } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

function ForgotPasswordForm() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    // Client-side validation
    const validationResult = validateForgotPassword({
      email: formData.get('email') as string,
    });

    if (!validationResult.success) {
      const fieldErrors = validationResult.error.issues[0]?.message || 'Invalid email address';
      setError(fieldErrors);
      setIsLoading(false);
      return;
    }

    try {
      const result = await requestPasswordReset({
        email: formData.get('email') as string,
      });

      if (result.success) {
        setSuccess(true);
        setEmail('');
        // Clear form - safely reset if element still exists
        try {
          if (e.currentTarget) {
            e.currentTarget.reset();
          }
        } catch {
          // Ignore reset errors
        }
      } else {
        setError(result.error || 'Failed to send reset email. Please try again.');
      }
    } catch (err) {
      console.error('forgot password error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4 flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  If an account exists with this email, you will receive a password reset link shortly.
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Please check your email (including spam folder) and follow the instructions.
                </p>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              placeholder="Email address"
              disabled={isLoading || success}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || success}
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : success ? 'Email sent!' : 'Send reset link'}
          </button>

          <div className="flex items-center justify-center">
            <div className="text-sm">
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Back to sign in
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
