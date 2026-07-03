"use strict";

// Chụp ảnh giao diện cho README. Yêu cầu server đang chạy ở http://127.0.0.1:5178.
// Dùng: node scripts/screenshots.js
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");

const BASE = "http://127.0.0.1:5178";
const OUT = path.join(__dirname, "..", "screenshots");

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 850 } });

  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(3000); // chờ tile bản đồ tải

  // Mặc định mở ở Dark neon
  await page.screenshot({ path: path.join(OUT, "home-dark.png") });

  // Chọn 1 quán để hiện panel chi tiết
  await page.locator(".place-item").first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "detail.png") });

  // Chuyển sang giao diện sáng (biến thể ấm)
  await page.click("#themeToggleBtn");
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "home-light.png") });

  await browser.close();
  console.log("Đã lưu ảnh vào", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
