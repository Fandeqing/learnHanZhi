import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy · Learn Hanzi Card" };

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen w-full bg-[#fffaf0] px-6 py-12 text-slate-800">
      <div className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-bold text-slate-950">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Effective August 18, 2026</p>

      <div className="mt-10 space-y-8 leading-7">
        <section>
          <h2 className="text-xl font-semibold text-slate-950">Information we process</h2>
          <p className="mt-2">
            Learn Hanzi Card creates an account and device identifier so it can save your settings,
            learning progress, review history, and completed lessons. If you choose Sign in with
            Apple, we receive Apple&apos;s app-specific account identifier. We do not receive your Apple
            password.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-950">Purchases</h2>
          <p className="mt-2">
            Apple processes payments. We receive transaction identifiers, product, purchase status,
            environment, and purchase or revocation dates to unlock and restore Lifetime Pro and to
            prevent fraud. We do not receive your full payment-card details.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-950">Diagnostics and analytics</h2>
          <p className="mt-2">
            The app uses Firebase Analytics, Crashlytics, and Performance Monitoring to understand
            feature use, diagnose crashes, and improve reliability. This may include app interaction,
            device, performance, and crash information. We do not use this information for advertising
            or cross-app tracking, and we do not sell personal information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-950">Storage and sharing</h2>
          <p className="mt-2">
            Data is processed by service providers that host the app and database, by Firebase for
            diagnostics and analytics, and by Apple for sign-in and purchases. We retain account data
            while your account exists. After account deletion, we retain only the minimum purchase
            record and a one-way identifier needed for fraud prevention, accounting, and restoring a
            permanent purchase; learning progress and account credentials are deleted.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-950">Your choices</h2>
          <p className="mt-2">
            You can disable pronunciation, sound effects, and reminders in Settings. You can delete
            your account in the app under Settings → Delete Account. This permanently removes learning
            progress and invalidates signed-in devices.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-950">Contact</h2>
          <p className="mt-2">
            For privacy questions, email{" "}
            <a className="text-emerald-700 underline" href="mailto:support@learnhanzhi.com">
              support@learnhanzhi.com
            </a>.
          </p>
        </section>
      </div>
      </div>
    </main>
  );
}
