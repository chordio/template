#!/usr/bin/env node

import { createServer } from "node:http";
import https from "node:https";
import http from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { homedir, platform } from "node:os";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

const HUB_URL = process.env.CHORDIO_HUB_URL || "https://hub.chordio.com";
const CONFIG_DIR = join(homedir(), ".config", "chordio");
const TOKEN_PATH = join(CONFIG_DIR, "token.json");
const PROJECT_ROOT = join(dirname(new URL(import.meta.url).pathname), "..");

// --- Token management ---

async function readToken() {
  try {
    const data = JSON.parse(await readFile(TOKEN_PATH, "utf-8"));
    if (!data.token) return null;

    // Check expiry by decoding JWT payload
    const payload = JSON.parse(
      Buffer.from(data.token.split(".")[1], "base64url").toString(),
    );
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.log("Token expired, re-authenticating...");
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

async function saveToken(token) {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(
    TOKEN_PATH,
    JSON.stringify(
      {
        token,
        hub_url: HUB_URL,
        created_at: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
}

// --- Browser opener ---

function openBrowser(url) {
  const cmd =
    platform() === "darwin"
      ? "open"
      : platform() === "win32"
        ? "start"
        : "xdg-open";
  try {
    execSync(`${cmd} "${url}"`, { stdio: "ignore" });
  } catch {
    console.log(`Open this URL in your browser:\n  ${url}`);
  }
}

// --- Login flow ---

async function login() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost`);

      if (url.pathname === "/callback") {
        const token = url.searchParams.get("token");
        if (token) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            "<html><body><h2>Authenticated! You can close this tab.</h2></body></html>",
          );
          server.close();
          resolve(token);
        } else {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(
            "<html><body><h2>Authentication failed. No token received.</h2></body></html>",
          );
          server.close();
          reject(new Error("No token received in callback"));
        }
        return;
      }

      res.writeHead(404);
      res.end();
    });

    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      const authUrl = `${HUB_URL}/cli-auth?port=${port}`;
      console.log("Opening browser for authentication...");
      openBrowser(authUrl);
      console.log(
        `Waiting for authentication on http://localhost:${port} ...`,
      );
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("Authentication timed out after 2 minutes"));
    }, 120_000);
  });
}

async function ensureAuth() {
  const existing = await readToken();
  if (existing) return existing.token;

  const token = await login();
  await saveToken(token);

  // Decode and show email
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    console.log(`Authenticated as ${payload.email}`);
  } catch {
    console.log("Authenticated successfully");
  }

  return token;
}

// --- HTTP fetch ---

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.request(url, options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        resolve({ status: res.statusCode, body });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

// --- Sync flow ---

async function sync(token) {
  console.log("Downloading skills...");

  const res = await fetch(`${HUB_URL}/api/skills`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    return "reauth";
  }

  if (res.status === 403) {
    console.error(
      "Error: Your organization is not active. Contact support for access.",
    );
    process.exit(1);
  }

  if (res.status !== 200) {
    console.error(`Error: Server returned ${res.status}`);
    console.error(res.body);
    process.exit(1);
  }

  const data = JSON.parse(res.body);
  let updated = 0;
  let unchanged = 0;

  for (const file of data.files) {
    const destPath = join(PROJECT_ROOT, file.path);
    const content = Buffer.from(file.content, "base64");

    // Check if file exists and is unchanged
    try {
      const existing = await readFile(destPath);
      const existingHash = createHash("sha256").update(existing).digest("hex");
      if (existingHash === file.sha256) {
        unchanged++;
        continue;
      }
    } catch {
      // File doesn't exist yet
    }

    await mkdir(dirname(destPath), { recursive: true });
    await writeFile(destPath, content);
    updated++;
  }

  console.log(`Updated ${updated} files, ${unchanged} unchanged`);
}

// --- Main ---

async function main() {
  const command = process.argv[2];

  if (command === "login") {
    await ensureAuth();
    return;
  }

  if (command === "sync") {
    const tokenData = await readToken();
    if (!tokenData) {
      console.error("Not authenticated. Run `npm run sync login` first.");
      process.exit(1);
    }
    await sync(tokenData.token);
    return;
  }

  // Default: login + sync
  const token = await ensureAuth();
  const result = await sync(token);
  if (result === "reauth") {
    console.log("Token rejected, re-authenticating...");
    const newToken = await login();
    await saveToken(newToken);
    await sync(newToken);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
