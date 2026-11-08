#!/usr/bin/env node

import { spawn, execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "frontend");
const backendDir = path.join(rootDir, "backend");

// Terminal Colors
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";

console.log(`${BOLD}${CYAN}====================================================${RESET}`);
console.log(`${BOLD}${GREEN}  OrdiSearch · Unified Development Launcher${RESET}`);
console.log(`${DIM}  Starting Next.js Frontend + FastAPI Python Backend${RESET}`);
console.log(`${BOLD}${CYAN}====================================================${RESET}\n`);

// 1. Detect Python Executable
function findPython() {
  const candidates = [
    // Windows Virtual Environments
    path.join(rootDir, ".venv", "Scripts", "python.exe"),
    path.join(rootDir, "venv", "Scripts", "python.exe"),
    path.join(backendDir, ".venv", "Scripts", "python.exe"),
    path.join(backendDir, "venv", "Scripts", "python.exe"),
    // Unix Virtual Environments
    path.join(rootDir, ".venv", "bin", "python"),
    path.join(rootDir, "venv", "bin", "python"),
    path.join(backendDir, ".venv", "bin", "python"),
    path.join(backendDir, "venv", "bin", "python"),
    // Global Python Commands
    "python",
    "python3",
    "py",
  ];

  for (const cmd of candidates) {
    if (cmd.includes(path.sep)) {
      if (fs.existsSync(cmd)) return cmd;
    } else {
      try {
        execSync(`${cmd} --version`, { stdio: "ignore" });
        return cmd;
      } catch {}
    }
  }
  return "python";
}

const pythonCmd = findPython();
console.log(`${DIM}[INIT] Using Python runtime:${RESET} ${pythonCmd}`);

// Process registry for clean shutdown
const children = [];

function killProcessTree(child) {
  if (!child || !child.pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  } catch {}
}

function cleanupAndExit() {
  console.log(`\n${YELLOW}[SHUTDOWN] Stopping all servers...${RESET}`);
  for (const child of children) {
    killProcessTree(child);
  }
  process.exit(0);
}

process.on("SIGINT", cleanupAndExit);
process.on("SIGTERM", cleanupAndExit);
process.on("exit", cleanupAndExit);

function prefixOutput(stream, prefix, color) {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep last incomplete line in buffer
    for (const line of lines) {
      if (line.trim().length > 0) {
        console.log(`${color}${prefix}${RESET} ${line}`);
      }
    }
  });
}

// 2. Start FastAPI Backend (Port 8000)
console.log(`${CYAN}[BACKEND]${RESET} Launching FastAPI at http://127.0.0.1:8000 ...`);
const backendProcess = spawn(
  pythonCmd,
  ["-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--host", "127.0.0.1", "--port", "8000", "--reload"],
  {
    cwd: rootDir,
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
    shell: process.platform === "win32",
  }
);
children.push(backendProcess);

prefixOutput(backendProcess.stdout, "[BACKEND]", CYAN);
prefixOutput(backendProcess.stderr, "[BACKEND]", CYAN);

backendProcess.on("error", (err) => {
  console.error(`${RED}[BACKEND ERROR] Failed to start Python backend:${RESET}`, err.message);
  console.warn(`${YELLOW}[TIP] If uvicorn is missing, install dependencies with: pip install -r backend/requirements.txt${RESET}`);
});

backendProcess.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    console.warn(`${YELLOW}[BACKEND] Process stopped with exit code ${code}.${RESET}`);
  }
});

// 3. Start Next.js Frontend (Port 3000)
console.log(`${GREEN}[FRONTEND]${RESET} Launching Next.js at http://localhost:3000 ...`);
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const frontendProcess = spawn(npmCmd, ["run", "dev"], {
  cwd: frontendDir,
  env: { ...process.env, FORCE_COLOR: "1" },
  shell: process.platform === "win32",
});
children.push(frontendProcess);

prefixOutput(frontendProcess.stdout, "[FRONTEND]", GREEN);
prefixOutput(frontendProcess.stderr, "[FRONTEND]", GREEN);

frontendProcess.on("error", (err) => {
  console.error(`${RED}[FRONTEND ERROR] Failed to start Next.js frontend:${RESET}`, err.message);
});

frontendProcess.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    console.warn(`${YELLOW}[FRONTEND] Process stopped with exit code ${code}.${RESET}`);
  }
});
