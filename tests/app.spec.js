const { test, expect } = require("@playwright/test");

test("app render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Quán quen" })).toBeVisible();
  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator(".list-panel")).toBeInViewport();
  await expect(page.locator(".place-item")).toHaveCount(5);
  await expect(page.locator(".place-div-marker")).toHaveCount(5);
  await expect(page.locator(".recommendation-item")).toHaveCount(3);
  await page.click("#rerollRecommendationsBtn");
  await expect(page.locator(".recommendation-item")).toHaveCount(3);
  await page.locator(".place-item").first().click();
  await expect(page.locator(".place-detail-panel")).toContainText("Google Maps");
  await expect(page.locator(".place-detail-panel")).toContainText("Chỉ đường");
  await expect(page.locator(".place-detail-panel")).toContainText("Apple Maps");
  await expect(page.locator(".place-detail-panel")).toContainText("Đã ghé");
  await page.locator(".place-detail-panel [data-detail-action='filter-tag'][data-tag='wifi mạnh']").click();
  await expect(page.locator("#tagFilters [data-tag='wifi mạnh']")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".place-item")).toHaveCount(1);

  await page.click("#sidebarToggleBtn");
  await expect(page.locator("#workspace")).toHaveClass(/sidebar-collapsed/);
  await expect(page.locator("#sidebarToggleBtn")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".sidebar")).toHaveCSS("visibility", "hidden");
  await page.click("#sidebarToggleBtn");
  await expect(page.locator("#workspace")).not.toHaveClass(/sidebar-collapsed/);
});

test("import Google Maps link opens editor with coordinates", async ({ page }) => {
  await page.goto("/");
  await page.fill(
    "#mapsLinkInput",
    "https://www.google.com/maps/place/The+Coffee+House/@10.782451,106.691284,17z/data=!3m1!4b1",
  );
  await page.click("#mapsImportBtn");

  await expect(page.locator("#workspace")).toHaveClass(/editor-open/);
  await expect(page.locator("#placeName")).toHaveValue("The Coffee House");
  await expect(page.locator("#placeLat")).toHaveValue("10.782451");
  await expect(page.locator("#placeLng")).toHaveValue("106.691284");
});

test("encrypted backup can decrypt to original payload", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const payload = createBackupPayload();
    const encrypted = await encryptBackup(payload, "test-password-123");
    const decrypted = await decryptBackup(encrypted, "test-password-123");
    return {
      encrypted: encrypted.encrypted,
      originalCount: payload.places.length,
      decryptedCount: decrypted.places.length,
      firstName: decrypted.places[0].name,
    };
  });

  expect(result.encrypted).toBe(true);
  expect(result.decryptedCount).toBe(result.originalCount);
  expect(result.firstName).toBeTruthy();
});

test("undo restores data after adding a place", async ({ page }) => {
  await page.goto("/");
  await page.click("#newPlaceBtn");
  await page.fill("#placeName", "Undo test place");
  await page.fill("#placeAddress", "Test area");
  await page.click('#placeForm button[type="submit"]');

  await expect(page.locator(".place-item").filter({ hasText: "Undo test place" })).toHaveCount(1);
  await page.click(".toast-action");
  await expect(page.locator(".place-item").filter({ hasText: "Undo test place" })).toHaveCount(0);
  await expect(page.locator(".place-item")).toHaveCount(5);
});

test("PWA manifest is valid", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "manifest.json");

  const response = await request.get("/manifest.json");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.name).toBe("Quán quen");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  expect(manifest.share_target.action).toContain("share-target");
});

test("theme toggle switches to dark mode and persists", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.click("#themeToggleBtn");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#themeToggleBtn")).toHaveAttribute("aria-pressed", "true");

  const stored = await page.evaluate(() => localStorage.getItem("quan-quen-map:theme:v1"));
  expect(stored).toBe("dark");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.click("#themeToggleBtn");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("open-now filter shows only places open right now", async ({ page }) => {
  await page.goto("/");
  await page.click("#newPlaceBtn");
  await page.fill("#placeName", "Mở cả ngày");
  await page.fill("#placeAddress", "Test area");
  await page.fill("#openingOpen", "00:00");
  await page.fill("#openingClose", "23:59");
  await page.click('#placeForm button[type="submit"]');
  await expect(page.locator(".place-item")).toHaveCount(6);

  await page.click("#openNowFilter");
  await expect(page.locator("#openNowFilter")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".place-item")).toHaveCount(1);
  await expect(page.locator(".place-item").first()).toContainText("Mở cả ngày");

  await page.click("#openNowFilter");
  await expect(page.locator("#openNowFilter")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".place-item")).toHaveCount(6);
});

test("stats panel summarizes visits after marking visited", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#statsSummary")).toHaveText("Chưa có lần ghé");
  await expect(page.locator(".stats-empty")).toBeVisible();

  await page.locator(".place-item").first().click();
  await page.locator(".place-detail-panel [data-detail-action='visit']").click();

  await expect(page.locator("#statsSummary")).toContainText("lần ghé");
  await expect(page.locator(".stats-grid .stat-tile")).toHaveCount(2);
  await expect(page.locator(".stat-month-chart .stat-month")).toHaveCount(6);
});
