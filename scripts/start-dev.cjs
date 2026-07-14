const { resolve } = require("node:path");
const { spawn } = require("node:child_process");
const dotenv = require("dotenv");

const envFile = process.argv[2];

if (!envFile) {
  throw new Error("Expected an environment file path.");
}

const result = dotenv.config({ path: resolve(process.cwd(), envFile), override: true });

if (result.error) {
  throw result.error;
}

const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev", "--webpack"], {
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 1));
