import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hanzi Bamboo Support · Chinese Character Cards",
  description: "Get help with purchases, account access, learning progress, and app issues.",
};

const helpTopics = [
  "Restore Purchase",
  "Sign in with Apple",
  "Learning progress",
  "Purchase issues",
  "App bugs",
];

export default function SupportPage() {
  return (
    <main className="min-h-screen w-full bg-[#fffaf0] px-6 py-12 text-slate-800">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold text-slate-950">Hanzi Bamboo Support</h1>
        <p className="mt-3 text-lg leading-8 text-slate-600">
          Need help with Hanzi Bamboo? We&apos;re here to help.
        </p>

        <div className="mt-10 space-y-8 leading-7">
          <section>
            <h2 className="text-xl font-semibold text-slate-950">Contact</h2>
            <p className="mt-2">
              For questions about purchases, account access, learning progress, or app issues,
              contact us at:
            </p>
            <p className="mt-2">
              <a
                className="font-medium text-emerald-700 underline underline-offset-4"
                href="mailto:deqingfan7@gmail.com"
              >
                deqingfan7@gmail.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">Common Help</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              {helpTopics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="mt-12 border-t border-slate-200 pt-6 text-sm">
          <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link className="text-emerald-700 underline underline-offset-4" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="text-emerald-700 underline underline-offset-4" href="/terms">
              Terms of Use
            </Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
