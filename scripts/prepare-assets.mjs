import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const ARTIFACT_DIR =
  "C:\\Users\\OWE PROJECT\\.gemini\\antigravity\\brain\\f953643c-f5ed-4cd2-84c5-3298ea85f0dd";
const ROOT = process.cwd();

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

function findBrowser() {
  for (const p of EDGE_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("Could not find Edge or Chrome executable.");
}

function findLatestFile(dir, prefix) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && (f.endsWith(".jpg") || f.endsWith(".png") || f.endsWith(".webp")))
    .sort();
  if (files.length === 0) {
    throw new Error(`No artifact file found matching prefix "${prefix}" in ${dir}`);
  }
  return path.join(dir, files[files.length - 1]);
}

const jobs = [
  { prefix: "garri_", target: "public/images/products/garri.webp", w: 1200, h: 900, q: 0.88 },
  { prefix: "kulikuli_179", target: "public/images/products/kulikuli.webp", w: 1200, h: 900, q: 0.88 },
  { prefix: "iru_", target: "public/images/products/iru.webp", w: 1200, h: 900, q: 0.88 },
  { prefix: "ponmo_", target: "public/images/products/ponmo.webp", w: 1200, h: 900, q: 0.88 },
  { prefix: "dried_fish_", target: "public/images/products/dried-fish.webp", w: 1200, h: 900, q: 0.88 },
  { prefix: "signature_crate_", target: "public/images/products/signature-crate.webp", w: 1200, h: 900, q: 0.88 },
  { prefix: "seq_01_six_bowls_", target: "public/images/sequence/seq-01-six-bowls.webp", w: 1280, h: 720, q: 0.9 },
  { prefix: "seq_02_garri_bowl_v2_", target: "public/images/sequence/seq-02-garri-bowl.webp", w: 1280, h: 720, q: 0.9 },
  { prefix: "seq_03_mixing_bowl_", target: "public/images/sequence/seq-03-mixing-bowl.webp", w: 1280, h: 720, q: 0.9 },
  { prefix: "seq_04_overhead_final_", target: "public/images/sequence/seq-04-overhead-final.webp", w: 1280, h: 720, q: 0.9 },
];

async function run() {
  for (const dir of ["public/images/products", "public/images/sequence", "public/frames"]) {
    fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
  }

  const resolvedJobs = jobs.map((j) => ({
    ...j,
    srcPath: findLatestFile(ARTIFACT_DIR, j.prefix),
  }));

  const server = http.createServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html><html><body><canvas id="c"></canvas><script>
        window.convertToWebp = async function(url, targetW, targetH, quality) {
          const img = new Image();
          img.src = url;
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
          const c = document.getElementById("c");
          c.width = targetW;
          c.height = targetH;
          const ctx = c.getContext("2d");
          const scale = Math.max(targetW / img.naturalWidth, targetH / img.naturalHeight);
          const dw = img.naturalWidth * scale;
          const dh = img.naturalHeight * scale;
          ctx.drawImage(img, (targetW - dw) / 2, (targetH - dh) / 2, dw, dh);
          return c.toDataURL("image/webp", quality);
        };
      </script></body></html>`);
      return;
    }
    const idx = Number(req.url?.replace("/src/", ""));
    if (Number.isInteger(idx) && resolvedJobs[idx]) {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      fs.createReadStream(resolvedJobs[idx].srcPath).pipe(res);
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const httpPort = server.address().port;
  const cdpPort = 9334;
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-assets-"));
  const browser = spawn(
    findBrowser(),
    [
      "--headless=new",
      "--disable-gpu",
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      `http://127.0.0.1:${httpPort}/`,
    ],
    { stdio: "ignore" }
  );

  try {
    let wsUrl = null;
    for (let i = 0; i < 40; i++) {
      try {
        const resp = await fetch(`http://127.0.0.1:${cdpPort}/json`);
        const targets = await resp.json();
        const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
        if (page) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      } catch {
        // wait
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!wsUrl) throw new Error("Browser CDP unavailable");

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });

    let msgId = 0;
    function cdp(method, params = {}) {
      const id = ++msgId;
      return new Promise((resolve, reject) => {
        const handler = (ev) => {
          const msg = JSON.parse(ev.data);
          if (msg.id === id) {
            ws.removeEventListener("message", handler);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    for (let i = 0; i < resolvedJobs.length; i++) {
      const job = resolvedJobs[i];
      const evalRes = await cdp("Runtime.evaluate", {
        expression: `window.convertToWebp("/src/${i}", ${job.w}, ${job.h}, ${job.q})`,
        awaitPromise: true,
        returnByValue: true,
      });
      const dataUrl = evalRes?.result?.value;
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/webp;base64,")) {
        throw new Error(`Failed converting ${job.target}`);
      }
      const buf = Buffer.from(dataUrl.slice("data:image/webp;base64,".length), "base64");
      fs.writeFileSync(path.join(ROOT, job.target), buf);
      console.log(`Saved ${job.target} (${Math.round(buf.length / 1024)} KB)`);
    }

    ws.close();
  } finally {
    try {
      browser.kill("SIGKILL");
    } catch {
      // ignore
    }
    server.close();
    await new Promise((r) => setTimeout(r, 300));
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Windows Edge lock cleanup fallback
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
