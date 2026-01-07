'use client';

import { resetPassword } from '@/actions/password-reset';
import { validateResetPassword } from '@/lib/validation-client';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = (params?.token as string) || '';

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Validate token format on mount (allow both uppercase and lowercase hex)
  useEffect(() => {
    if (!token || !/^[a-f0-9A-F0-9]{64}$/.test(token)) {
      setError('Invalid reset link. Please request a new password reset.');
    } else {
      // Clear error if token format is valid (it will be set again on server error)
      setError('');
    }
  }, [token]);

  // Check password requirements in real-time
  const getPasswordRequirements = (pwd: string) => {
    return {
      minLength: pwd.length >= 8,
      hasUppercase: /[A-Z]/.test(pwd),
      hasLowercase: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
    };
  };

  const requirements = getPasswordRequirements(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});
    setIsLoading(true);

    // Client-side validation
    const validationResult = validateResetPassword({
      token,
      password,
      confirmPassword,
    });

    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.issues.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      setValidationErrors(errors);
      setIsLoading(false);
      return;
    }

    try {
      const result = await resetPassword({
        token,
        password,
        confirmPassword,
      });

      if (result.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(result.error || 'Failed to reset password. Please try again.');
      }
    } catch (err) {
      console.error('Error in reset password submission:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    !isLoading &&
    !success &&
    Object.values(requirements).every(Boolean) &&
    passwordsMatch;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Set new password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter a new password to regain access to your account.
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
                <p className="text-sm font-medium text-green-800">Password reset successfully!</p>
                <p className="text-xs text-green-700 mt-1">
                  Redirecting to login page in a moment...
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Password Input */}
            <div>
              <label htmlFor="password" className="sr-only">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-10 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="New password"
                  disabled={isLoading || success}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-label="New password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {validationErrors.password && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.password}</p>
              )}
            </div>

            {/* Password Requirements Checklist */}
            {password && (
              <div className="rounded-md bg-gray-50 p-3 space-y-2">
                <p className="text-xs font-medium text-gray-700">Password requirements:</p>
                <div className="space-y-1 text-xs">
                  <div
                    className={`flex items-center gap-2 ${
                      requirements.minLength ? 'text-green-700' : 'text-gray-600'
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${
                      requirements.minLength ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    At least 8 characters
                  </div>
                  <div
                    className={`flex items-center gap-2 ${
                      requirements.hasUppercase ? 'text-green-700' : 'text-gray-600'
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${
                      requirements.hasUppercase ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    Uppercase letter (A-Z)
                  </div>
                  <div
                    className={`flex items-center gap-2 ${
                      requirements.hasLowercase ? 'text-green-700' : 'text-gray-600'
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${
                      requirements.hasLowercase ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    Lowercase letter (a-z)
                  </div>
                  <div
                    className={`flex items-center gap-2 ${
                      requirements.hasNumber ? 'text-green-700' : 'text-gray-600'
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${
                      requirements.hasNumber ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    Number (0-9)
                  </div>
                </div>
              </div>
            )}

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-10 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="Confirm password"
                  disabled={isLoading || success}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  aria-label="Confirm password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.confirmPassword}</p>
              )}
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-600 mt-1">Passwords don't match</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!isFormValid}
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Resetting password...' : success ? 'Password reset!' : 'Reset password'}
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
