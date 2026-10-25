import type { FormEventHandler, ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  error: string | null;
  pending: boolean;
  submitLabel: string;
  pendingLabel: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  footer: ReactNode;
}

/** The shared frame of the sign-in and registration forms. */
export default function AuthCard({
  title,
  error,
  pending,
  submitLabel,
  pendingLabel,
  onSubmit,
  children,
  footer,
}: AuthCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg bg-white p-8 shadow">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {children}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? pendingLabel : submitLabel}
          </button>
        </form>
        <p className="text-center text-sm text-slate-600">{footer}</p>
      </div>
    </main>
  );
}
