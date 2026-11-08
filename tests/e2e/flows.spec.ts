import { expect, test, type Page } from "@playwright/test";

async function stubPrint(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __printed: number }).__printed = 0;
    window.print = () => {
      (window as unknown as { __printed: number }).__printed++;
    };
  });
}

test.describe("veteran flows (fictional scenarios)", () => {
  test("Ray: intake → filter → save → print, in large type", async ({ page }) => {
    await stubPrint(page);
    const start = Date.now();
    await page.goto("/");
    await expect(page.getByTestId("crisis-footer")).toContainText("988");
    await page.getByRole("link", { name: "Start: answer 4 quick questions" }).click();

    // Step 1: need
    await page.getByRole("button", { name: /Transportation/ }).click();
    // Step 2: where (ZIP lookup)
    await page.getByLabel("ZIP code (optional)").fill("22553");
    await page.getByRole("button", { name: "Use ZIP" }).click();
    await expect(page.getByRole("button", { name: "Spotsylvania County" })).toHaveAttribute("aria-pressed", "true");
    // Back button works on every step
    await page.getByRole("button", { name: "← Back" }).click();
    await expect(page.getByRole("heading", { name: "What do you need help with?" })).toBeVisible();
    await page.getByRole("button", { name: /Transportation/ }).click();
    await page.getByRole("button", { name: "Spotsylvania County" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    // Step 3: who
    await page.getByRole("button", { name: /For me/ }).click();
    // Step 4: filters (skip)
    await page.getByRole("button", { name: "Skip" }).click();

    await expect(page).toHaveURL(/category=transportation/);
    await expect(page).toHaveURL(/locality=spotsylvania/);
    const card = page.locator('[data-testid="resource-card"][data-id="healthy-generations-mobility-options"]');
    await expect(card).toBeVisible();
    // Every card shows source, status and verification date
    for (const c of await page.getByTestId("resource-card").all()) {
      await expect(c.getByTestId("source-link")).toHaveAttribute("href", /^https:\/\//);
      await expect(c.getByTestId("status-badge")).toBeVisible();
      await expect(c.getByTestId("last-verified")).toContainText(/Not yet verified|\d{4}/);
    }
    await card.getByRole("button", { name: /^\+ Save to My Plan\s*: / }).click();

    // FXBGO!'s source lists Spotsylvania in its service area, so it is a main result
    const fxbgo = page.locator('[data-testid="resource-card"][data-id="fxbgo-regional-transit"]');
    await expect(fxbgo).toBeVisible();
    await fxbgo.getByRole("button", { name: /Save to My Plan\s*: FXBGO/ }).click();

    await page.getByRole("link", { name: /My Plan/ }).first().click();
    await expect(page.getByTestId("plan-item")).toHaveCount(2);
    await expect(page.getByTestId("call-script").first()).toContainText("I'm a veteran in Spotsylvania County");
    await expect(page.getByTestId("call-script").first()).toContainText("may be eligible");

    await page.getByRole("button", { name: "Print large-type list" }).click();
    expect(await page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1);
    await page.emulateMedia({ media: "print" });
    const size = await page.getByTestId("plan-item").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(22);
    await expect(page.getByTestId("crisis-footer")).toBeVisible();
    expect(Date.now() - start).toBeLessThan(180_000);
  });

  test("Dana: legal help and VSO claims help from Stafford", async ({ page }) => {
    await page.goto("/intake?category=legal");
    await page.getByRole("button", { name: "Stafford County" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Skip" }).click();
    await page.getByRole("button", { name: "Skip" }).click();
    // Both legal aid offices' sources list Stafford, so they are direct matches
    const legalAid = page.locator('[data-testid="resource-card"][data-id="legal-aid-works-fxbg"]');
    await expect(legalAid).toBeVisible();
    await expect(page.locator('[data-id="lsnv-fredericksburg"]')).toBeVisible();
    await expect(page.locator("body")).toContainText("You may be eligible");
    await expect(page.locator("body")).not.toContainText(/you qualify/i);
    await legalAid.getByRole("button", { name: /Save to My Plan\s*: Legal Aid Works/ }).click();

    // Benefits: the Quantico DVS office lists Stafford; the Fredericksburg office does not
    await page.getByText("Filters", { exact: true }).click();
    await page.getByLabel("Topic").selectOption("benefits");
    await expect(page.locator('[data-id="dvs-quantico-benefits-office"]')).toBeVisible();
    await expect(page.getByTestId("nearby")).toContainText("Fredericksburg");
    await page.locator('[data-id="dvs-quantico-benefits-office"]').getByRole("button", { name: /Save/ }).click();
    await page.goto("/plan");
    await expect(page.getByTestId("plan-item")).toHaveCount(2);
  });

  test("Maria: caregiver searches on someone's behalf and shares by link", async ({ page, context }) => {
    await page.goto("/intake");
    await page.getByRole("button", { name: /Public services/ }).click();
    await page.getByRole("button", { name: "Caroline County" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: /For someone else/ }).click();
    await page.getByLabel("Free only").check();
    await page.getByRole("button", { name: "Show results" }).click();
    // No seed listing states it is free: the app says so instead of guessing
    await expect(page.getByTestId("result-count")).toContainText("0 listings");
    await page.getByRole("button", { name: /Free only/ }).click();
    await page.locator('[data-id="211-virginia"]').getByRole("button", { name: /Save/ }).click();
    await page.goto("/plan");
    await expect(page.getByTestId("call-script")).toContainText("I'm calling for a veteran in Caroline County");

    // Share link holds only IDs; opening it in a fresh browser offers to add them
    const fresh = await context.browser()!.newContext();
    const other = await fresh.newPage();
    await other.goto("/plan?ids=211-virginia,not-a-real-id");
    await expect(other.getByRole("region", { name: "Shared plan" })).toContainText("211 Virginia");
    await other.getByRole("button", { name: "Add to my plan" }).click();
    await expect(other.getByTestId("plan-item")).toHaveCount(1);
    await fresh.close();
  });
});

test("verifier marks a listing verified; it shows in the log and on the card", async ({ page }) => {
  await page.goto("/verify");
  await expect(page.getByText("Simulated login")).toBeVisible();
  await page.getByLabel("Your initials").fill("qa");
  await page.getByLabel("Demo passcode").fill("demo-verifier");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Verifier dashboard" })).toBeVisible();

  const row = page.locator('[data-testid="queue-row"][data-id="lsnv-fredericksburg"]');
  await expect(row).toContainText("Sources disagree");

  // Contact details cannot be saved without saying where they came from
  await row.getByRole("button", { name: /^Edit/ }).click();
  await row.getByLabel("Hours").fill("Test hours from e2e");
  await row.getByRole("button", { name: "Save changes" }).click();
  await expect(row.getByRole("alert")).toContainText("came from");
  await row.getByRole("button", { name: "Cancel" }).click();

  await row.getByRole("button", { name: /^Mark verified/ }).click();
  await row.getByLabel(/Note/).fill("E2E: called office");
  await row.getByRole("button", { name: "Confirm verified" }).click();
  await expect(page.getByTestId("change-log").last()).toContainText("verify by QA");

  await page.goto("/resources/lsnv-fredericksburg");
  await expect(page.getByTestId("status-badge")).toContainText("Verified");
  await expect(page.getByTestId("last-verified")).toContainText("by QA");
});

test("crisis footer is on every page", async ({ page }) => {
  for (const path of [
    "/",
    "/intake",
    "/resources",
    "/resources/211-virginia",
    "/topics",
    "/topics/food",
    "/plan",
    "/updates",
    "/updates/stop",
    "/updates/paper-form",
    "/help",
    "/print",
    "/suggest",
    "/verify",
    "/staff",
    "/about",
    "/nope",
  ]) {
    await page.goto(path);
    await expect(page.getByTestId("crisis-footer"), path).toContainText("Dial 988, then press 1");
    await expect(page.getByTestId("crisis-footer"), path).toContainText("838255");
  }
});
