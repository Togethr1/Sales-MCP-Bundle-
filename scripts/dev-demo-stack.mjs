import { spawn } from "node:child_process";

function run(name, command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}.`);
      process.exitCode = code;
    }
  });

  return child;
}

const intelligence = run("intelligence", "python3", [
  "-m",
  "uvicorn",
  "intelligence.app:app",
  "--app-dir",
  "python/intelligence/src",
  "--host",
  "127.0.0.1",
  "--port",
  "8000",
  "--reload",
]);

const demo = run(
  "demo-web",
  "pnpm",
  ["--filter", "@sales-mcp/demo-web", "dev"],
  {
    VITE_INTELLIGENCE_BASE_URL:
      process.env.VITE_INTELLIGENCE_BASE_URL ?? "http://127.0.0.1:8000",
  },
);

function shutdown(signal) {
  intelligence.kill(signal);
  demo.kill(signal);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
