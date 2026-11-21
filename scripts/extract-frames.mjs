import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

/**
 * Extracts real frames from the user's MP4 video using Headless Edge/Chrome HTML5 Video + Canvas,
 * and processes the uploaded official CleanCrate.ng logos into clean transparent-ready / badge WebP assets.
 */
const ROOT = process.cwd();
const VIDEO_PATH =
  process.argv[2] ||
  "C:/Users/OWE PROJECT/.gemini/antigravity/brain/1b90b49b-3b40-437d-ac91-25a507233259/.user_uploaded/media_1795264450289_e6c156ba.mp4";
const LOGO_CIRCLE_PATH =
  "C:/Users/OWE PROJECT/.gemini/antigravity/brain/1b90b49b-3b40-437d-ac91-25a507233259/.user_uploaded/media_1795264434122_b261582d.jpg";
const LOGO_WIDE_PATH =
  "C:/Users/OWE PROJECT/.gemini/antigravity/brain/1b90b49b-3b40-437d-ac91-25a507233259/.user_uploaded/media_1795264434227_7127f083.jpg";

const TARGET_FRAMES = 140;

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

async function run() {
  if (!fs.existsSync(VIDEO_PATH)) {
    throw new Error(`Video not found at ${VIDEO_PATH}`);
  }

  const outFramesDir = path.join(ROOT, "public", "frames");
  const outLogoDir = path.join(ROOT, "public", "images", "brand");
  fs.mkdirSync(outFramesDir, { recursive: true });
  fs.mkdirSync(outLogoDir, { recursive: true });

  // Clean any existing frames permanently
  for (const f of fs.readdirSync(outFramesDir)) {
    fs.unlinkSync(path.join(outFramesDir, f));
  }

  const server = http.createServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html>
<html>
<body>
<video id="v" src="/video.mp4" muted playsInline preload="auto" crossorigin="anonymous"></video>
<canvas id="c"></canvas>
<script>
  const video = document.getElementById("v");
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  window.initVideo = async function() {
    if (video.readyState < 1) {
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error("Video load error"));
      });
    }
    return {
      duration: video.duration,
      width: video.videoWidth || 1280,
      height: video.videoHeight || 720
    };
  };

  window.captureFrameAt = async function(timeSec, outW, outH) {
    canvas.width = outW;
    canvas.height = outH;
    video.currentTime = timeSec;
    await new Promise((resolve) => {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      };
      video.addEventListener("seeked", onSeeked);
    });
    // Slight warm natural color enhancement so garri & ingredients look crisp, warm, and organic
    ctx.filter = "contrast(1.04) saturate(1.06) brightness(1.01)";
    ctx.drawImage(video, 0, 0, outW, outH);
    ctx.filter = "none";
    return canvas.toDataURL("image/webp", 0.86);
  };

  window.processCircularLogo = async function() {
    const img = new Image();
    img.src = "/logo-circle.jpg";
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);

    // Draw original image centered
    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - minDim) / 2;
    const sy = (img.naturalHeight - minDim) / 2;

    // Circular mask eliminating outer white corners and green artifact in bottom-left corner
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.472, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
    ctx.restore();

    return canvas.toDataURL("image/webp", 0.94);
  };

  window.processWideLogo = async function() {
    const img = new Image();
    img.src = "/logo-wide.jpg";
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const w = 800;
    const h = Math.round((img.naturalHeight / img.naturalWidth) * w);
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    // Key out near-white background smoothly into transparency while keeping green & gold crisp
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const minC = Math.min(r, g, b);
      const maxC = Math.max(r, g, b);
      const saturation = maxC - minC;
      // Near-white low-saturation background pixels
      if (minC > 228 && saturation < 26) {
        const alphaFactor = Math.max(0, Math.min(1, (250 - minC) / 22));
        d[i + 3] = Math.round(d[i + 3] * alphaFactor);
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL("image/webp", 0.94);
  };
</script>
</body>
</html>`);
      return;
    }

    if (req.url === "/video.mp4") {
      const stat = fs.statSync(VIDEO_PATH);
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunksize = end - start + 1;
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": "video/mp4",
        });
        fs.createReadStream(VIDEO_PATH, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Type": "video/mp4",
          "Content-Length": stat.size,
          "Accept-Ranges": "bytes",
        });
        fs.createReadStream(VIDEO_PATH).pipe(res);
      }
      return;
    }

    if (req.url === "/logo-circle.jpg") {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      fs.createReadStream(LOGO_CIRCLE_PATH).pipe(res);
      return;
    }

    if (req.url === "/logo-wide.jpg") {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      fs.createReadStream(LOGO_WIDE_PATH).pipe(res);
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const httpPort = server.address().port;
  const cdpPort = 9345;
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-video-extract-"));
  const browser = spawn(
    findBrowser(),
    [
      "--headless=new",
      "--disable-gpu",
      "--autoplay-policy=no-user-gesture-required",
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
    for (let i = 0; i < 50; i++) {
      try {
        const resp = await fetch(`http://127.0.0.1:${cdpPort}/json`);
        const targets = await resp.json();
        const page = targets.find(
          (t) =>
            t.type === "page" &&
            t.webSocketDebuggerUrl &&
            t.url &&
            t.url.startsWith(`http://127.0.0.1:${httpPort}`)
        );
        if (page) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      } catch {
        // wait
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!wsUrl) throw new Error("CDP browser failed to start");

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

    // Wait until page script has executed and window.initVideo is defined
    for (let i = 0; i < 40; i++) {
      const check = await cdp("Runtime.evaluate", {
        expression: `typeof window.initVideo === "function"`,
        returnByValue: true,
      });
      if (check?.result?.value === true) break;
      await new Promise((r) => setTimeout(r, 150));
    }

    // 1. Process official logos
    const circleRes = await cdp("Runtime.evaluate", {
      expression: `window.processCircularLogo()`,
      awaitPromise: true,
      returnByValue: true,
    });
    const circleData = circleRes?.result?.value;
    if (typeof circleData === "string" && circleData.startsWith("data:image/webp;base64,")) {
      const buf = Buffer.from(circleData.slice("data:image/webp;base64,".length), "base64");
      fs.writeFileSync(path.join(outLogoDir, "logo-seal.webp"), buf);
      console.log(`Saved public/images/brand/logo-seal.webp (${Math.round(buf.length / 1024)} KB)`);
    }

    const wideRes = await cdp("Runtime.evaluate", {
      expression: `window.processWideLogo()`,
      awaitPromise: true,
      returnByValue: true,
    });
    const wideData = wideRes?.result?.value;
    if (typeof wideData === "string" && wideData.startsWith("data:image/webp;base64,")) {
      const buf = Buffer.from(wideData.slice("data:image/webp;base64,".length), "base64");
      fs.writeFileSync(path.join(outLogoDir, "logo-emblem.webp"), buf);
      console.log(`Saved public/images/brand/logo-emblem.webp (${Math.round(buf.length / 1024)} KB)`);
    }

    // 2. Inspect & extract video frames
    const metaRes = await cdp("Runtime.evaluate", {
      expression: `window.initVideo()`,
      awaitPromise: true,
      returnByValue: true,
    });
    const meta = metaRes?.result?.value;
    if (!meta || !meta.duration) {
      throw new Error(`Failed to read video metadata: ${JSON.stringify(metaRes)}`);
    }

    console.log(`Video metadata: duration=${meta.duration.toFixed(2)}s, ${meta.width}x${meta.height}`);

    // Preserve native aspect ratio up to 1280px max dimension
    const scale = Math.min(1, 1280 / Math.max(meta.width, meta.height));
    const outW = Math.round((meta.width * scale) / 2) * 2;
    const outH = Math.round((meta.height * scale) / 2) * 2;

    const safeDuration = Math.max(0.1, meta.duration - 0.05);

    for (let i = 0; i < TARGET_FRAMES; i++) {
      const t = (i / (TARGET_FRAMES - 1)) * safeDuration;
      const frameRes = await cdp("Runtime.evaluate", {
        expression: `window.captureFrameAt(${t.toFixed(4)}, ${outW}, ${outH})`,
        awaitPromise: true,
        returnByValue: true,
      });
      const dataUrl = frameRes?.result?.value;
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/webp;base64,")) {
        throw new Error(`Failed capturing frame ${i + 1}`);
      }
      const buf = Buffer.from(dataUrl.slice("data:image/webp;base64,".length), "base64");
      const fileName = `v2_frame_${String(i + 1).padStart(4, "0")}.webp`;
      fs.writeFileSync(path.join(outFramesDir, fileName), buf);
      if ((i + 1) % 20 === 0 || i === 0 || i === TARGET_FRAMES - 1) {
        console.log(`Extracted ${fileName} (t=${t.toFixed(2)}s, ${Math.round(buf.length / 1024)} KB)`);
      }
    }

    const manifest = {
      totalFrames: TARGET_FRAMES,
      width: outW,
      height: outH,
      durationSeconds: Number(meta.duration.toFixed(2)),
      source: path.basename(VIDEO_PATH),
      generatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(outFramesDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    console.log(`Successfully extracted ${TARGET_FRAMES} real video frames (${outW}x${outH}) to public/frames/`);

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
      // ignore
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
