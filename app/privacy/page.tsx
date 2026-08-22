import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · Hanzi Bamboo",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen w-full bg-[#fffaf0] px-6 py-12 text-slate-800">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold text-slate-950">
          Privacy Policy
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Effective August 18, 2026
        </p>

        <div className="mt-10 space-y-8 leading-7">
          <section>
            <h2 className="text-xl font-semibold text-slate-950">
              Information we process
            </h2>

            <p className="mt-2">
              Hanzi Bamboo creates an account and an app-generated device
              identifier so it can save your settings, learning progress,
              review history, and completed lessons.
            </p>

            <p className="mt-2">
              If you choose Sign in with Apple, we receive Apple&apos;s
              app-specific account identifier. We do not receive your Apple
              password.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">
              Purchases
            </h2>

            <p className="mt-2">
              Apple processes payments. We receive transaction identifiers,
              product information, purchase status, environment, and purchase
              or revocation dates to unlock and restore your permanent purchase
              and to prevent fraud.
            </p>

            <p className="mt-2">
              We do not receive your full payment-card details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">
              Diagnostics and analytics
            </h2>

            <p className="mt-2">
              Hanzi Bamboo uses Firebase Analytics, Crashlytics, and Performance
              Monitoring to understand feature use, diagnose crashes, measure
              app performance, and improve reliability.
            </p>

            <p className="mt-2">
              These services may process app interactions, Firebase installation
              identifiers, device and operating-system information, app version
              information, crash logs, performance metrics, network request
              metadata, and coarse country or region information derived from
              network information.
            </p>

            <p className="mt-2">
              We do not use this information for advertising or cross-app
              tracking, and we do not sell personal information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">
              Storage and sharing
            </h2>

            <p className="mt-2">
              Data may be processed by service providers that host the app and
              database, by Firebase for diagnostics and analytics, and by Apple
              for sign-in and purchases.
            </p>

            <p className="mt-2">
              We retain account data while your account exists. After account
              deletion, we retain only the minimum purchase records and a
              pseudonymous identifier needed for fraud prevention, accounting,
              and restoring a permanent purchase. Learning progress and
              authentication records associated with the deleted account are
              removed or invalidated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">
              Your choices
            </h2>

            <p className="mt-2">
              You can disable pronunciation, sound effects, and reminders in
              Settings.
            </p>

            <p className="mt-2">
              You can delete your account in the app under{" "}
              <strong>Settings → Delete Account</strong>. This permanently
              removes your learning progress and invalidates signed-in devices,
              subject to limited records we may retain for fraud prevention,
              accounting, and purchase restoration.
            </p>

            <p className="mt-2">
              You may also contact us to request information about, correction
              of, or deletion of personal data associated with your account,
              subject to applicable legal and fraud-prevention retention
              requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">
              Contact
            </h2>

            <p className="mt-2">
              For privacy questions, email{" "}
              <a
                className="text-emerald-700 underline"
                href="mailto:deqingfan7@gmail.com"
              >
                deqingfan7@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}