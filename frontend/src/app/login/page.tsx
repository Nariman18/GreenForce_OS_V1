import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Logo } from '@/components/logo';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

const STEPS = [
  'Enter the project address',
  'See which rules apply and why',
  'Track the proof for each requirement',
  'Issue a fingerprinted compliance passport',
];

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-pine-900 px-12 py-14 text-pine-50 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-pine-700/40 blur-3xl" />
        <Logo className="[&_span]:text-pine-50" />
        <div className="relative max-w-lg">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Know which rules apply to your project. Prove you meet them.
          </h1>
          <ol className="mt-8 space-y-3">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-3 text-pine-100">
                <span className="grid size-7 place-items-center rounded-full bg-pine-700 text-sm font-semibold">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <p className="relative text-sm text-pine-200">Denmark & Germany — one compliance workflow.</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use the demo contractor account provided with this MVP.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
