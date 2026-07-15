"use client";

import { FormEvent, useState } from "react";

type ImportResult = {
  status: number;
  body: unknown;
};

export default function AdminPage() {
  const [file, setFile] = useState<File | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function importFromFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setResult({
        status: 0,
        body: {
          success: false,
          error: {
            code: "NO_FILE_SELECTED",
            message: "Choose a JSON file first.",
          },
        },
      });
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    await sendImportRequest(formData);
  }

  async function importFromText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const parsed = JSON.parse(jsonText);
      await sendImportRequest(JSON.stringify(parsed), "application/json");
    } catch {
      setResult({
        status: 0,
        body: {
          success: false,
          error: {
            code: "INVALID_JSON",
            message: "The pasted text is not valid JSON.",
          },
        },
      });
    }
  }

  async function sendImportRequest(body: BodyInit, contentType?: string) {
    setLoading(true);

    try {
      const headers = new Headers();
      if (contentType) {
        headers.set("content-type", contentType);
      }

      const response = await fetch("/api/admin/characters/import", {
        method: "POST",
        headers,
        body,
      });
      const responseText = await response.text();

      setResult({
        status: response.status,
        body: responseText ? JSON.parse(responseText) : null,
      });
    } catch (error) {
      setResult({
        status: 0,
        body: {
          success: false,
          error: {
            code: "REQUEST_FAILED",
            message: error instanceof Error ? error.message : "Request failed.",
          },
        },
      });
    } finally {
      setLoading(false);
    }
  }

  async function clearAllUserData() {
    const confirmed = window.confirm(
      "Clear all user data? This deletes users, settings, progress, study sessions, cards, and purchases. Characters and sections will be preserved.",
    );

    if (!confirmed) {
      return;
    }

    setClearing(true);

    try {
      const response = await fetch("/api/admin/user-data/clear", {
        method: "POST",
      });
      const responseText = await response.text();

      setResult({
        status: response.status,
        body: responseText ? JSON.parse(responseText) : null,
      });
    } catch (error) {
      setResult({
        status: 0,
        body: {
          success: false,
          error: {
            code: "REQUEST_FAILED",
            message: error instanceof Error ? error.message : "Request failed.",
          },
        },
      });
    } finally {
      setClearing(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="border-b border-zinc-800 pb-5">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Learn Han Zhi Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Character JSON Import
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Upload a file like <code className="text-zinc-200">data/data.json</code>{" "}
            to insert or update rows in the <code className="text-zinc-200">characters</code>{" "}
            table. Existing characters are matched by <code className="text-zinc-200">hanzi</code>.
          </p>
        </header>

        <section className="rounded border border-red-900/60 bg-red-950/20 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-red-100">
                Clear User Data
              </h2>
              <p className="mt-1 text-sm leading-6 text-red-200/70">
                Deletes users, settings, progress, study sessions, session cards,
                and purchases. Keeps all sections and characters.
              </p>
            </div>
            <button
              type="button"
              disabled={clearing || loading}
              onClick={clearAllUserData}
              className="h-10 rounded bg-red-500 px-4 text-sm font-medium text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {clearing ? "Clearing..." : "Clear User Data"}
            </button>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <form
            onSubmit={importFromFile}
            className="rounded border border-zinc-800 bg-zinc-900/70 p-4"
          >
            <h2 className="text-lg font-semibold">Upload JSON File</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Select a local JSON file. The request is sent as multipart form data
              with field name <code className="text-zinc-200">file</code>.
            </p>

            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mt-5 block w-full rounded border border-zinc-700 bg-zinc-950 p-3 text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-950"
            />

            <button
              type="submit"
              disabled={loading}
              className="mt-4 h-10 rounded bg-zinc-100 px-4 text-sm font-medium text-zinc-950 hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {loading ? "Importing..." : "Import File"}
            </button>
          </form>

          <form
            onSubmit={importFromText}
            className="rounded border border-zinc-800 bg-zinc-900/70 p-4"
          >
            <h2 className="text-lg font-semibold">Paste JSON</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Useful for quickly testing a few character rows without choosing a file.
            </p>

            <textarea
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              placeholder='[{"hanzi":"一","pinyin":"yī","meaningEn":"one",...}]'
              rows={10}
              className="mt-5 w-full rounded border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs leading-5 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-400"
            />

            <button
              type="submit"
              disabled={loading}
              className="mt-4 h-10 rounded bg-zinc-100 px-4 text-sm font-medium text-zinc-950 hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {loading ? "Importing..." : "Import Pasted JSON"}
            </button>
          </form>
        </section>

        <section className="rounded border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Import Response</h2>
            <span className="text-sm text-zinc-400">
              Status:{" "}
              <span
                className={
                  result && result.status >= 200 && result.status < 300
                    ? "text-emerald-300"
                    : "text-red-300"
                }
              >
                {result?.status ?? "-"}
              </span>
            </span>
          </div>
          <pre className="max-h-[460px] overflow-auto rounded bg-black p-4 text-xs leading-5 text-zinc-200">
            {result
              ? JSON.stringify(result.body, null, 2)
              : "Choose data/data.json and click Import File."}
          </pre>
        </section>

        <section className="rounded border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="text-lg font-semibold">Expected JSON Shape</h2>
          <pre className="mt-3 overflow-auto rounded bg-black p-4 text-xs leading-5 text-zinc-200">
{`[
  {
    "hanzi": "一",
    "pinyin": "yī",
    "meaningEn": "one",
    "structure": "一 = one horizontal line",
    "memoryHook": "One line means one.",
    "exampleWord": "一个",
    "examplePinyin": "yí gè",
    "exampleMeaningEn": "one item",
    "sectionKey": "basics",
    "level": 1,
    "orderInLevel": 1,
    "difficulty": 1,
    "audioText": "一",
    "orderIndex": 1,
    "isFree": true
  }
]`}
          </pre>
        </section>
      </div>
    </main>
  );
}
