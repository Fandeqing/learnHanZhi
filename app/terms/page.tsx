import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service · Learn Hanzi Card" };

export default function TermsPage() {
  return (
    <main className="min-h-screen w-full bg-[#fffaf0] px-6 py-12 text-slate-800">
      <div className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-bold text-slate-950">Terms of Service</h1>
      <p className="mt-2 text-sm text-slate-500">Effective August 18, 2026</p>

      <div className="mt-10 space-y-8 leading-7">
        <section>
          <h2 className="text-xl font-semibold text-slate-950">Using the app</h2>
          <p className="mt-2">
            Learn Hanzi Card is an educational tool. You may use it for personal, lawful learning. You
            may not interfere with the service, attempt unauthorized access, automate abusive requests,
            or copy and redistribute protected app content except where law permits.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-950">Lifetime Pro</h2>
          <p className="mt-2">
            Lifetime Pro is a one-time in-app purchase that unlocks the advertised Pro features for the
            supported lifetime of Learn Hanzi Card. It is not a subscription. Purchases are billed and
            managed by Apple and can be restored using the Apple account that made the purchase. Refunds
            are handled under Apple&apos;s policies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-950">Accounts and deletion</h2>
          <p className="mt-2">
            You are responsible for access to your device and Apple account. You may delete your Learn
            Hanzi Card account from Settings. Deletion permanently removes learning progress and
            settings; a minimal purchase record may remain so permanent purchases can be restored and
            fraud or accounting obligations can be handled.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-950">Availability and learning results</h2>
          <p className="mt-2">
            We work to keep the app accurate and available, but do not promise uninterrupted service or
            particular learning results. Features may change when needed for security, legal compliance,
            compatibility, or continued operation without removing rights already provided by your
            purchase.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-950">Liability</h2>
          <p className="mt-2">
            To the extent permitted by applicable law, the app is provided without implied warranties
            and we are not liable for indirect or consequential losses. Nothing here limits rights or
            remedies that cannot legally be excluded.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-950">Changes and contact</h2>
          <p className="mt-2">
            We may update these terms and will post the effective date here. Questions can be sent to{" "}
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
