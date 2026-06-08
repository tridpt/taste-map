const { test, expect } = require("@playwright/test");

test("app render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Quán quen" })).toBeVisible();
  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator(".list-panel")).toBeInViewport();
  await expect(page.locator(".place-item")).toHaveCount(5);
  await expect.poll(() => page.evaluate(() => markers.size)).toBe(5);
  await expect(page.locator(".recommendation-item")).toHaveCount(3);
  await page.click("#rerollRecommendationsBtn");
  await expect(page.locator(".recommendation-item")).toHaveCount(3);
  await page.locator(".place-item").first().click();
  await expect(page.locator(".place-detail-panel")).toContainText("Google Maps");
  await expect(page.locator(".place-detail-panel")).toContainText("Chỉ đường");
  await expect(page.locator(".place-detail-panel")).toContainText("Apple Maps");
  await expect(page.locator(".place-detail-panel")).toContainText("Chia sẻ");
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
  await expect(page.locator(".stats-grid .stat-tile")).toHaveCount(4);
  await expect(page.locator(".stat-month-chart").first().locator(".stat-month")).toHaveCount(6);
});

test("share payload includes place name and maps link", async ({ page }) => {
  await page.goto("/");
  const payload = await page.evaluate(() => buildSharePayload(places[0]));
  expect(payload.title).toBeTruthy();
  expect(payload.text).toContain(payload.title);
  expect(payload.text).toContain(payload.url);
  expect(payload.url).toContain("google.com/maps");
});

test("random nearby picks a place within radius", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(() => {
    userLocation = { lat: 10.7769, lng: 106.7009 };
    render();
    const place = randomNearbyPlace(5000);
    return place ? { name: place.name, distance: getDistanceFromUser(place) } : null;
  });
  expect(result).not.toBeNull();
  expect(result.name).toBeTruthy();
  expect(result.distance).toBeLessThanOrEqual(5000);
});

test("random nearby prompts to locate when position unknown", async ({ page }) => {
  await page.goto("/");
  await page.click("#randomNearbyBtn");
  await expect(page.locator("#mapStatus")).toContainText("vị trí");
});

async function setRange(page, selector, value) {
  await page.locator(selector).evaluate((el, v) => {
    el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

test("price slider filters by price range", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".place-item")).toHaveCount(5);
  await setRange(page, "#priceMin", "3");
  await expect(page.locator("#priceRangeLabel")).toContainText("₫₫₫");
  await expect(page.locator(".place-item")).toHaveCount(2);
  await page.click("#resetFiltersBtn");
  await expect(page.locator(".place-item")).toHaveCount(5);
});

test("open-at-time filter uses chosen weekday and time", async ({ page }) => {
  await page.goto("/");
  const res = await page.evaluate(() => {
    const place = { openingHours: { days: [1], open: "08:00", close: "17:00" } };
    return {
      openMon10: getOpeningStatusAt(place, 1, 600).state,
      closedMon20: getOpeningStatusAt(place, 1, 1200).state,
      closedTue10: getOpeningStatusAt(place, 2, 600).state,
    };
  });
  expect(res.openMon10).toBe("open");
  expect(res.closedMon20).toBe("closed");
  expect(res.closedTue10).toBe("closed");
});

test("area filter narrows by district", async ({ page }) => {
  await page.goto("/");
  await page.locator("#areaFilters [data-area='Quận 3']").click();
  await expect(page.locator("#areaFilters [data-area='Quận 3']")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".place-item")).toHaveCount(1);
  await page.click("#resetFiltersBtn");
  await expect(page.locator(".place-item")).toHaveCount(5);
});

test("itinerary collects stops and builds a directions url", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".itinerary-empty")).toBeVisible();

  await page.locator(".place-item").nth(0).click();
  await expect(page.locator(".place-detail-panel [data-detail-action='itinerary']")).toBeVisible();

  const result = await page.evaluate(() => {
    toggleItinerary(places[0].id);
    toggleItinerary(places[1].id);
    return {
      count: itinerary.length,
      url: getItineraryDirectionsUrl(itinerary.map((id) => getPlace(id))),
    };
  });

  expect(result.count).toBe(2);
  await expect(page.locator("#itineraryMeta")).toHaveText("2 quán");
  await expect(page.locator(".itinerary-stop")).toHaveCount(2);
  expect(result.url).toContain("google.com/maps/dir");
  expect(result.url).toContain("destination=");
});

test("stats show estimated spending after visits", async ({ page }) => {
  await page.goto("/");
  await page.locator(".place-item").first().click();
  await page.locator(".place-detail-panel [data-detail-action='visit']").click();
  await expect(page.locator(".stats-content")).toContainText("Chi tiêu ước tính");
  await expect(page.locator(".stats-content")).toContainText("Lâu chưa ghé");
});

test("csv import adds places", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(() => {
    const before = places.length;
    const csv = "name,type,address,lat,lng,price,tags,notes\nQuán CSV,cafe,Quận 1,10.78,106.70,3,wifi; yên,ghi chú\n";
    const r = importCsvText(csv);
    return { before, after: places.length, added: r.added };
  });
  expect(result.added).toBe(1);
  expect(result.after).toBe(result.before + 1);
  await expect(page.locator(".place-item").filter({ hasText: "Quán CSV" })).toHaveCount(1);
});

test("collections filter places by membership", async ({ page }) => {
  await page.goto("/");
  const res = await page.evaluate(() => {
    const collection = createCollection("Đi date");
    toggleCollectionMembership(collection.id, places[0].id);
    activeCollection = collection.id;
    render();
    return { count: getFilteredPlaces().length, name: collection.name };
  });
  expect(res.count).toBe(1);
  await expect(page.locator("#collectionFilterList")).toContainText("Đi date");
  await expect(page.locator(".place-item")).toHaveCount(1);
});

test("heatmap toggle switches map layers", async ({ page }) => {
  await page.goto("/");
  await page.click("#heatmapBtn");
  await expect(page.locator("#heatmapBtn")).toHaveAttribute("aria-pressed", "true");
  const state = await page.evaluate(() => ({
    mode: heatmapMode,
    heatOn: Boolean(heatLayer) && map.hasLayer(heatLayer),
    markersOff: !map.hasLayer(markerLayer),
  }));
  expect(state.mode).toBe(true);
  expect(state.heatOn).toBe(true);
  expect(state.markersOff).toBe(true);
});

test("new mood favors unvisited places", async ({ page }) => {
  await page.goto("/");
  const scores = await page.evaluate(() => {
    const ratings = { taste: 3, quiet: 3, power: 3, date: 3, work: 3 };
    const fresh = { visits: [], favorite: false, ratings, lastVisit: "", priceLevel: 2, type: "cafe" };
    const visited = { visits: [{ date: "2026-01-01", rating: 5 }], favorite: false, ratings, lastVisit: "2026-01-01", priceLevel: 2, type: "cafe" };
    return { fresh: getMoodScore(fresh, "new"), visited: getMoodScore(visited, "new") };
  });
  expect(scores.fresh).toBeGreaterThan(scores.visited);
});

test("favorite reminder lists stale favorites", async ({ page }) => {
  await page.goto("/");
  const found = await page.evaluate(() => {
    const old = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    places.push(normalizePlace({ id: "fav-test", name: "Ruột cũ", lat: 10.78, lng: 106.70, favorite: true, lastVisit: old }));
    render();
    return getFavoriteReminders().some((item) => item.place.id === "fav-test");
  });
  expect(found).toBe(true);
  await expect(page.locator("#favoriteReminder")).toBeVisible();
  await expect(page.locator(".favorite-reminder-item").filter({ hasText: "Ruột cũ" })).toHaveCount(1);
});

test("saved itinerary can be stored and reloaded", async ({ page }) => {
  await page.goto("/");
  const res = await page.evaluate(() => {
    itinerary = [places[0].id, places[1].id];
    savedItineraries.push({ id: "it1", name: "Cuối tuần", placeIds: [...itinerary] });
    saveSavedItineraries();
    itinerary = [];
    render();
    loadSavedItinerary("it1");
    return { count: itinerary.length };
  });
  expect(res.count).toBe(2);
  await expect(page.locator(".saved-itinerary")).toHaveCount(1);
  await expect(page.locator(".saved-itinerary")).toContainText("Cuối tuần");
});

test("rename tag updates all places", async ({ page }) => {
  await page.goto("/");
  const res = await page.evaluate(() => {
    const before = places.filter((p) => p.tags.includes("wifi mạnh")).length;
    const affected = renameTag("wifi mạnh", "wifi xịn");
    const after = places.filter((p) => p.tags.includes("wifi xịn")).length;
    const oldGone = places.every((p) => !p.tags.includes("wifi mạnh"));
    return { before, affected, after, oldGone };
  });
  expect(res.before).toBeGreaterThan(0);
  expect(res.affected).toBe(res.before);
  expect(res.after).toBe(res.before);
  expect(res.oldGone).toBe(true);
});

test("delete tag removes it from all places", async ({ page }) => {
  await page.goto("/");
  const res = await page.evaluate(() => {
    const affected = deleteTag("wifi mạnh");
    const gone = places.every((p) => !p.tags.includes("wifi mạnh"));
    return { affected, gone };
  });
  expect(res.affected).toBeGreaterThan(0);
  expect(res.gone).toBe(true);
});

test("editor panel is an accessible dialog with focus management", async ({ page }) => {
  await page.goto("/");
  await page.click("#newPlaceBtn");

  await expect(page.locator("#editorPanel")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#editorPanel")).toHaveAttribute("role", "dialog");
  await expect(page.locator("#editorPanel")).toHaveAttribute("aria-modal", "true");

  await expect
    .poll(() => page.evaluate(() => document.getElementById("editorPanel").contains(document.activeElement)))
    .toBe(true);

  await page.keyboard.press("Escape");
  await expect(page.locator("#editorPanel")).toHaveAttribute("aria-hidden", "true");
  const focusBack = await page.evaluate(() => document.activeElement === document.getElementById("newPlaceBtn"));
  expect(focusBack).toBe(true);
});
