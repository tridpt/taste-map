"use strict";

// Dựng GIF demo cho README. Yêu cầu server chạy ở http://127.0.0.1:5178.
// Dùng: node scripts/gif.js
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const { PNG } = require("pngjs");
const { GIFEncoder, quantize, applyPalette } = require("gifenc");

const BASE = "http://127.0.0.1:5178";
const OUT = path.join(__dirname, "..", "screenshots", "demo.gif");
const W = 1600;
const H = 900;

async function snap(page) {
  const buf = await page.screenshot({ type: "png" });
  const png = PNG.sync.read(buf);
  return new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.length);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(3500); // chờ tile bản đồ

  const frames = [];
  const grab = async () => frames.push(await snap(page));

  await grab();                                   // màn hình chính
  await page.locator(".place-item").first().click();
  await page.waitForTimeout(900);
  await grab();                                   // chi tiết quán
  await page.locator(".place-item").nth(1).click();
  await page.waitForTimeout(900);
  await grab();                                   // quán khác
  await page.click("#openNowFilter").catch(() => {});
  await page.waitForTimeout(700);
  await grab();                                   // lọc
  await page.click("#openNowFilter").catch(() => {});
  await page.waitForTimeout(500);
  await page.click("#themeToggleBtn");
  await page.waitForTimeout(700);
  await grab();                                   // dark mode
  await page.click("#heatmapBtn").catch(() => {});
  await page.waitForTimeout(900);
  await grab();                                   // heatmap
  await browser.close();

  encodeGif(frames);
}

function encodeGif(frames) {
  const enc = GIFEncoder();
  frames.forEach((rgba) => {
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    enc.writeFrame(index, W, H, { palette, delay: 1300 });
  });
  enc.finish();
  fs.writeFileSync(OUT, Buffer.from(enc.bytes()));
  console.log("Đã lưu GIF:", OUT, "(" + frames.length + " frame)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
