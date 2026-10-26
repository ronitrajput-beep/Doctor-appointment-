import { test, expect, Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const credentials = fs.readFileSync(
  process.env.DEMO_ACCOUNTS_PATH || path.resolve("../DEMO_ACCOUNTS.md"),
  "utf8",
);
function password(email: string) {
  const line = credentials.split("\n").find((x) => x.includes(`| ${email} |`));
  if (!line) throw new Error("Missing local demo credentials");
  return line.split("|")[3].trim();
}
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password(email));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator(".stat-card").first()).toBeVisible();
}
async function screenshot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `../screenshots/${name}.png`, fullPage: true });
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
}

test("landing, search, doctor profiles and mobile navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".doctor-card")).toHaveCount(3);
  await screenshot(page, "home-desktop");
  await page
    .locator(".hero-search")
    .getByPlaceholder("Who are you looking for?")
    .fill("Jhatka");
  await page
    .locator(".hero-search")
    .getByRole("button", { name: "Find a doctor" })
    .click();
  await expect(page.locator(".doctor-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".doctor-card")).toHaveCount(6);
  for (const name of [
    "Jhatka",
    "Jagdish Asthana",
    "Emmett Brown",
    "Tsunade",
    "Tony Tony Chopper",
    "John Zoidberg",
  ]) {
    const card = page.locator(".doctor-card").filter({
      has: page.getByRole("link", { name: `Dr. ${name}`, exact: true }),
    });
    await expect(card).toBeVisible();
    const portrait = card.getByRole("img", {
      name: `Dr. ${name} — illustrated character portrait`,
    });
    await expect(portrait).toHaveAttribute(
      "src",
      /\/images\/doctors\/[a-z]+\.png$/,
    );
    expect(
      await portrait.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    ).toBeTruthy();
  }
  await screenshot(page, "find-doctors");
  await page.getByRole("link", { name: "Dr. Jhatka", exact: true }).click();
  await expect(page.locator(".slot").first()).toBeVisible();
  await screenshot(page, "doctor-profile");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".doctor-card")).toHaveCount(3);
  await noOverflow(page);
  await screenshot(page, "home-mobile");
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Find doctors" })
    .click();
  await expect(page.locator(".doctor-card")).toHaveCount(6);
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("patient payment retry, confirmation, reschedule, cancel and mobile logout", async ({
  page,
}) => {
  await login(page, "patient@example.com");
  await screenshot(page, "patient-dashboard");
  await page.goto("/doctors/doctor-1");
  const appointmentDate = page.getByLabel("Appointment date");
  await expect(appointmentDate.locator("option").last()).toBeAttached();
  await appointmentDate.selectOption(
    (await appointmentDate.locator("option").last().getAttribute("value"))!,
  );
  await page.locator(".slot").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await screenshot(page, "booking-review");
  await page.getByLabel("Simulated payment outcome").selectOption("failure");
  await page
    .getByRole("button", { name: "Confirm & pay (simulation)" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "No appointment was booked",
  );
  await page.getByLabel("Simulated payment outcome").selectOption("success");
  await page
    .getByRole("button", { name: "Confirm & pay (simulation)" })
    .click();
  await expect(page).toHaveURL(/confirmation/);
  await expect(page.getByText("Your care is")).toBeVisible();
  await screenshot(page, "booking-confirmation");
  const aid = page.url().split("/appointments/")[1].split("/")[0];
  await page.getByRole("link", { name: "View my appointments" }).click();
  const card = page.locator(".appointment-card").filter({ hasText: aid });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Reschedule", exact: true }).click();
  await expect(
    page.getByLabel("Available times").locator("option").first(),
  ).toBeAttached();
  const replacement = page.getByLabel("Available times");
  await replacement.selectOption(
    (await replacement.locator("option").last().getAttribute("value"))!,
  );
  await page.getByRole("button", { name: "Confirm reschedule" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await card.getByRole("button", { name: "Cancel appointment" }).click();
  await page.getByRole("button", { name: "Confirm cancel" }).click();
  await expect(card.locator(".badge")).toHaveText("cancelled");
  await page.reload();
  await expect(card.locator(".badge")).toHaveText("cancelled");
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await screenshot(page, "patient-mobile");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/login/);
});

test("doctor availability publication and removal", async ({ page }) => {
  await login(page, "doctor@example.com");
  await screenshot(page, "doctor-dashboard");
  await page
    .getByRole("navigation", { name: "Dashboard" })
    .getByRole("link", { name: "Availability", exact: true })
    .click();
  const date = new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10);
  const form = page
    .locator("form")
    .filter({ hasText: "Add an appointment slot" });
  await form.getByLabel("Date", { exact: true }).fill(date);
  await form.getByLabel("Start time (IST)").fill("18:00");
  await form.getByLabel("End time (IST)").fill("18:30");
  await form.getByRole("button", { name: "Publish slot" }).click();
  await expect(page.getByRole("status")).toContainText("available for booking");
  await page.getByLabel("Filter date").fill(date);
  const slot = page.locator(".schedule-card").filter({ hasText: "18:00" });
  await expect(slot).toBeVisible();
  await slot.getByRole("button", { name: "Remove slot" }).click();
  await expect(slot.locator(".badge")).toHaveText("blocked");
  await expect(slot.getByRole("button", { name: "Reopen slot" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Dashboard" })
    .getByRole("link", { name: "My profile" })
    .click();
  await expect(page.getByLabel("Full name")).toHaveValue("Jhatka");
  await page.getByRole("button", { name: "Save doctor" }).click();
  await expect(page.getByRole("status")).toContainText("updated");
});

test("administrator workbook validation, import, reports and account management", async ({
  page,
}) => {
  await login(page, "admin@example.com");
  await screenshot(page, "admin-dashboard");
  await page
    .getByRole("navigation", { name: "Dashboard" })
    .getByRole("link", { name: "Excel database" })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download workbook" }).click();
  const download = await downloadPromise;
  const downloaded = await download.path();
  expect(download.suggestedFilename()).toBe("Doctor_Appointment_Database.xlsx");
  await page.getByLabel("Choose workbook").setInputFiles({
    name: download.suggestedFilename(),
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: fs.readFileSync(downloaded!),
  });
  await page.getByRole("button", { name: "Validate & preview" }).click();
  await expect(page.getByRole("status")).toContainText(
    "All records passed validation",
  );
  await screenshot(page, "excel-management");
  await page.getByRole("button", { name: "Apply import" }).click();
  await expect(page.getByRole("status")).toContainText("Changes saved");
  await page
    .getByRole("navigation", { name: "Dashboard" })
    .getByRole("link", { name: "Reports", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Appointments by doctor" }),
  ).toBeVisible();
  await screenshot(page, "admin-reports");
  await page
    .getByRole("navigation", { name: "Dashboard" })
    .getByRole("link", { name: "Accounts", exact: true })
    .click();
  await page.getByLabel("Search accounts").fill("Aarav");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
});
