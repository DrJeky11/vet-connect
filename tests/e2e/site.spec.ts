import { expect, test } from "@playwright/test";

test("phone menu opens, lists every section, and closes after navigating", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();
  const menu = page.getByRole("navigation", { name: "Main" }).last();
  for (const name of ["Home", "Find help", "Topics", "All listings", "Get updates", "Help", "My Plan", "Print the directory"]) {
    await expect(menu.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "true");
  await menu.getByRole("link", { name: "Topics", exact: true }).click();
  await expect(page.getByRole("heading", { name: "All topics" })).toBeVisible();
  await expect(menu).toBeHidden();
  await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
});

test("home search goes to the directory", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("What do you need?").fill("legal");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/resources\?q=legal/);
  await expect(page.getByTestId("resource-card").first()).toContainText(/Legal/);
});

test("topic page: place filter, tips, breadcrumbs", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Transportation/ }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Transportation");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Topics");
  // Mobility Options' source lists King George; FXBGO!'s does not, so it shows under "Elsewhere in the region"
  await page.getByRole("link", { name: "King George County" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Transportation near King George County");
  await expect(page.locator('[data-id="va-richmond-veterans-transportation-program"]')).toBeVisible();
  await expect(page.locator('[data-id="healthy-generations-mobility-options"]')).toBeVisible();
  await expect(page.getByTestId("nearby")).toContainText("FXBGO!");
  await expect(page.getByTestId("nearby")).not.toContainText("Mobility Options");
  await expect(page.locator("main")).toContainText("Before you call, have ready");
});

test("Spanish: one tap switches the interface, and the choice is remembered", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Español/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Encuentre ayuda para veteranos cerca de Fredericksburg");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByTestId("crisis-footer")).toContainText("Marque 988 y oprima 1");
  await page.goto("/resources/211-virginia");
  await expect(page.locator("main")).toContainText("La información de cada servicio está en inglés");
  await expect(page.getByRole("button", { name: /Guardar en Mi Plan\s*: 211 Virginia/ })).toBeVisible();
  await page.getByRole("link", { name: /English/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("language switch works without JavaScript", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/help");
  await page.getByRole("link", { name: /Español/ }).click();
  await expect(page).toHaveURL(/\/help$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ayuda y preguntas frecuentes");
  await ctx.close();
});

test("larger text makes the base font bigger and is remembered", async ({ page }) => {
  await page.goto("/");
  const size = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  const before = await size();
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("button", { name: /Larger text/ }).click();
  expect(await size()).toBeGreaterThan(before);
  await page.reload();
  expect(await size()).toBeGreaterThan(before);
});

test("report a problem on a listing reaches the verifier, who resolves it", async ({ page }) => {
  await page.goto("/resources/fxbgo-regional-transit");
  await page.getByRole("link", { name: "Report a problem with this listing" }).click();
  await expect(page.getByLabel("Which listing?")).toHaveValue("fxbgo-regional-transit");
  await page.getByLabel("What should we know?").fill("The phone number on their bus schedule is different.");
  await page.getByLabel("How do you know? (optional)").fill("Printed schedule");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByTestId("suggest-done")).toContainText("A verifier will look at this");

  await page.goto("/verify");
  await page.getByLabel("Your initials").fill("qa");
  await page.getByLabel("Demo passcode").fill("demo-verifier");
  await page.getByRole("button", { name: "Sign in" }).click();
  const report = page.getByTestId("report").filter({ hasText: "bus schedule" });
  await expect(report).toContainText("FXBGO!");
  await expect(page.locator('[data-testid="queue-row"][data-id="fxbgo-regional-transit"]')).toContainText("1 open report");
  await report.getByLabel("What you did (optional)").fill("Called; still checking");
  await report.getByRole("button", { name: "Mark resolved" }).click();
  await expect(page.getByTestId("report").filter({ hasText: "bus schedule" })).toHaveCount(0);
});

test("printable directory and paper form include every listing and the crisis line", async ({ page }) => {
  await page.goto("/print");
  const count = await page.getByTestId("print-listing").count();
  const total = (await (await page.request.get("/api/resources")).json()).resources.length;
  expect(count).toBe(total);
  await expect(page.locator("main")).toContainText("Dial 988, then press 1");
  await page.goto("/updates/paper-form");
  await expect(page.locator("main")).toContainText("Reply STOP to cancel");
  await expect(page.locator("main")).toContainText("Signature");
});

test("help page answers how to get information without a computer", async ({ page }) => {
  await page.goto("/help");
  await page.getByRole("link", { name: "I don't use a computer. How else can I get this?" }).click();
  await expect(page.locator("#q3")).toContainText("letter");
});

test("sitemap lists topic and listing pages; robots keeps staff pages out", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/topics/transportation");
  expect(sitemap).toContain("/resources/211-virginia");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /staff");
});

test("the crisis bar stays compact on small phones in both languages", async ({ browser }) => {
  for (const lang of ["en", "es"]) {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 640 } });
    await ctx.addCookies([{ name: "vsn-lang", value: lang, url: "http://localhost:3100" }]);
    const page = await ctx.newPage();
    await page.goto("/");
    const h = await page.getByTestId("crisis-footer").evaluate((e) => e.getBoundingClientRect().height);
    expect(h, lang).toBeLessThanOrEqual(110);
    await ctx.close();
  }
});

test("no page scrolls sideways on a phone, in English or Spanish", async ({ page, context }) => {
  const paths = ["/", "/intake", "/resources", "/topics/transportation", "/resources/lsnv-fredericksburg", "/plan?ids=211-virginia", "/updates", "/help", "/print", "/suggest", "/updates/paper-form"];
  for (const lang of ["en", "es"]) {
    await context.addCookies([{ name: "vsn-lang", value: lang, url: page.url() === "about:blank" ? "http://localhost:3100" : page.url() }]);
    for (const path of paths) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${lang} ${path}`).toBeLessThanOrEqual(0);
    }
  }
});

test("sign-up and stop forms work without JavaScript", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/updates/stop");
  await page.getByLabel("Phone number").fill("540-555-0198");
  await page.getByRole("button", { name: "Stop updates" }).click();
  await expect(page.getByTestId("stop-done")).toBeVisible();
  await page.goto("/updates");
  await page.getByRole("textbox", { name: "Phone number" }).fill("540-555-0197");
  await page.getByRole("checkbox", { name: /Recorded phone calls/ }).check();
  await page.getByRole("button", { name: "Sign me up" }).click();
  // Missing permission: the error shows and what was typed is kept.
  await expect(page.getByRole("alert")).toContainText("permission");
  await expect(page.getByRole("textbox", { name: "Phone number" })).toHaveValue("540-555-0197");
  await page.getByRole("checkbox", { name: /This is my phone number/ }).check();
  await page.getByRole("button", { name: "Sign me up" }).click();
  await expect(page.getByTestId("signup-done")).toContainText("Press 9");
  await ctx.close();
});
