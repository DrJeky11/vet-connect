import { expect, test, type Page } from "@playwright/test";

/** All phone numbers here are in the fictional 555-01xx range. */

async function staffSignIn(page: Page) {
  await page.goto("/staff");
  await expect(page.getByTestId("mode-banner")).toContainText("Simulated mode");
  await page.getByLabel("Your initials").fill("qa");
  await page.getByLabel("Staff passcode").fill("demo-outreach");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Outreach overview" })).toBeVisible();
}

async function textLine(page: Page, from: string, message: string) {
  await page.getByLabel("From number").fill(from);
  await page.getByLabel("Message").fill(message);
  await page.getByRole("button", { name: "Send text" }).click();
}

test("web sign-up for texts waits for YES, then a staff message reaches them, and STOP ends it", async ({ page }) => {
  // A veteran signs up on the website.
  await page.goto("/updates");
  await expect(page.getByRole("note")).toContainText("Demo site");
  await page.getByLabel("Food").check();
  await page.getByLabel("Where does the veteran live?").selectOption("stafford");
  await page.getByRole("textbox", { name: "Phone number" }).fill("(540) 555-0111");
  await page.getByRole("checkbox", { name: /Text messages/ }).check();
  await page.getByRole("checkbox", { name: /This is my phone number/ }).check();
  await page.getByRole("button", { name: "Sign me up" }).click();
  await expect(page.getByTestId("signup-done")).toContainText("Reply YES");

  // Staff see them waiting for YES; the phone replies YES on the text line.
  await staffSignIn(page);
  await page.getByRole("link", { name: "Subscribers" }).click();
  const row = page.getByTestId("subscriber-table").getByRole("row", { name: /0111/ });
  await expect(row).toContainText("waiting for YES");
  await expect(page.getByTestId("subscriber-table")).not.toContainText("555-0111");
  await page.getByRole("link", { name: "Try the text & phone line" }).click();
  await textLine(page, "540-555-0111", "YES");
  await expect(page.getByTestId("text-log")).toContainText("you're confirmed");

  // Staff send a food update to Stafford.
  await page.getByRole("link", { name: "Messages" }).click();
  await page.getByLabel("Title (staff only)").fill("Food pantry Saturday");
  await page.getByRole("checkbox", { name: "Text messages" }).check();
  await page.getByRole("textbox", { name: "Text message" }).fill("The pantry is open this Saturday 9 to noon.");
  await expect(page.locator("#m-sms-count")).toContainText("Reply STOP to opt out.");
  await page.getByRole("group", { name: /Only people interested in/ }).getByLabel("Food").check();
  await page.getByRole("group", { name: /Only people in/ }).getByLabel("Stafford County").check();
  await page.getByRole("button", { name: "Save draft and review" }).click();
  await expect(page.getByTestId("delivery-stats")).toContainText("Text messages: 1 people");
  await page.getByRole("button", { name: "Send now" }).click();
  await expect(page.getByTestId("delivery-stats")).toContainText("1 simulated");

  // The veteran texts STOP; they are off for texts and calls.
  await page.getByRole("link", { name: "Try the text & phone line" }).click();
  await textLine(page, "540-555-0111", "STOP");
  await expect(page.getByTestId("text-log")).toContainText("unsubscribed");
  await page.getByRole("link", { name: "Subscribers" }).click();
  await page.getByTestId("subscriber-table").getByRole("row", { name: /0111/ }).getByRole("link").click();
  await expect(page.getByTestId("consent-history")).toContainText("Stopped text messages");
  await expect(page.locator("main")).toContainText("Hidden in demo mode");
});

test("the text line answers topic + ZIP from the directory and counts demand", async ({ page }) => {
  await staffSignIn(page);
  await page.getByRole("link", { name: "Try the text & phone line" }).click();
  await textLine(page, "540-555-0112", "RIDE 22553");
  await expect(page.getByTestId("text-log")).toContainText("Transportation near Spotsylvania County");
  await expect(page.getByTestId("text-log")).toContainText("Mobility Options");
  await textLine(page, "540-555-0112", "I want to end my life");
  await expect(page.getByTestId("text-log")).toContainText("988 and press 1");
  await page.getByRole("link", { name: "Overview" }).click();
  await expect(page.locator("main")).toContainText("Transportation");
});

test("the phone line keypad menu reads listings and can sign a caller up", async ({ page }) => {
  await staffSignIn(page);
  await page.getByRole("link", { name: "Try the text & phone line" }).click();
  await page.getByLabel("Calling from").fill("540-555-0113");
  await page.getByRole("button", { name: "Call the line" }).click();
  const screen = page.getByTestId("call-screen");
  await expect(screen).toContainText("dial 9 8 8, then press 1");
  await page.getByRole("button", { name: "1", exact: true }).click();
  await expect(screen).toContainText("Enter your 5 digit ZIP code");
  for (const d of "22553") await page.getByRole("group", { name: "Keypad" }).getByRole("button", { name: d, exact: true }).click();
  await expect(screen).toContainText("Mobility Options, from Healthy Generations");
  await page.getByRole("button", { name: "0", exact: true }).click();
  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect(screen).toContainText("signed up for phone calls and text messages");
  await page.getByRole("link", { name: "Subscribers" }).click();
  await expect(page.getByTestId("subscriber-table").getByRole("row", { name: /0113/ })).toContainText("Phone line keypress");
});

test("staff add a mail-only subscriber from a paper form and print letters", async ({ page }) => {
  await staffSignIn(page);
  await page.getByRole("link", { name: "Subscribers" }).click();
  const form = page.getByTestId("add-subscriber");
  await form.getByLabel("Paper form").check();
  await form.getByRole("checkbox", { name: /Letters in the mail/ }).check();
  await form.getByLabel("Name (letters only)").fill("Test Resident");
  await form.getByLabel("Street address (letters only)").fill("1 Example Way");
  await form.getByLabel("City").fill("Fredericksburg");
  await form.getByLabel("ZIP").fill("22401");
  await form.getByLabel("Where they live").selectOption("fredericksburg");
  await form.getByRole("button", { name: "Save subscriber" }).click();
  await expect(form.getByRole("alert")).toContainText("Confirm that the person agreed");
  await form.getByRole("checkbox", { name: /I read the wording/ }).check();
  await form.getByRole("button", { name: "Save subscriber" }).click();
  await expect(form.getByRole("status")).toContainText("Added subscriber");

  await page.getByRole("link", { name: "Messages" }).click();
  await page.getByLabel("Title (staff only)").fill("Winter letter");
  await page.getByRole("checkbox", { name: "Letters in the mail" }).check();
  await page.getByRole("textbox", { name: "Letter", exact: true }).fill("Here are services near you this winter.");
  await page.getByRole("button", { name: "Save draft and review" }).click();
  await page.getByRole("button", { name: "Send now" }).click();
  await page.getByRole("link", { name: "Open letters to print" }).click();
  const letter = page.getByTestId("letter").first();
  await expect(letter).toContainText("Address hidden in demo mode");
  await expect(letter).not.toContainText("1 Example Way");
  await expect(letter).toContainText("Services for you");
  await expect(letter).toContainText("Veterans Crisis Line");
  await page.goBack();
  await page.getByRole("button", { name: /Mark 1 letter\(s\) as mailed/ }).click();
  await expect(page.getByTestId("delivery-stats")).toContainText("1 mailed");
});

test("staff pages and webhooks are locked down", async ({ page, request }) => {
  await page.goto("/staff/subscribers");
  await expect(page).toHaveURL(/\/staff$/);
  await expect(page.getByRole("heading", { name: "Staff sign-in: outreach" })).toBeVisible();
  // Without Twilio configured, the webhooks refuse everything.
  expect((await request.post("/api/sms", { form: { From: "+15405550114", Body: "JOIN" } })).status()).toBe(404);
  expect((await request.post("/api/voice", { form: { From: "+15405550114" } })).status()).toBe(404);
});

test("anyone can stop updates by phone number without learning if it was on file", async ({ page }) => {
  await page.goto("/updates/stop");
  await page.getByLabel("Phone number").fill("540-555-0199");
  await page.getByRole("button", { name: "Stop updates" }).click();
  await expect(page.getByTestId("stop-done")).toContainText("If that number was signed up");
});
