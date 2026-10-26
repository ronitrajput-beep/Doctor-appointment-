import { test, expect, Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const credentials = fs.readFileSync(
  process.env.DEMO_ACCOUNTS_PATH || path.resolve("../DEMO_ACCOUNTS.md"),
  "utf8",
);
function password(email: string) {
  const line = credentials.split("\n").find((x) => x.includes(`| ${email} |`));
  if (!line) throw Error("Local test account missing");
  return line.split("|")[3].trim();
}
async function login(page: Page, email: string) {
  await page.goto(
    "/login" + (email.startsWith("doctor") ? "?role=doctor" : ""),
  );
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password(email));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
}
async function shot(page: Page, name: string) {
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

test("patient edits medical history and sees it after refresh", async ({
  page,
}) => {
  await login(page, "patient@example.com");
  await page
    .getByRole("navigation", { name: "Dashboard" })
    .getByRole("link", { name: "Medical history", exact: true })
    .click();
  await page.getByLabel("Date of birth").fill("2004-05-06");
  await page.getByLabel("Blood group").selectOption("O+");
  await page
    .getByLabel("Allergies", { exact: true })
    .fill("Penicillin — fictional demonstration");
  await page
    .getByLabel("Medical conditions", { exact: true })
    .fill("Mild asthma — fictional demonstration");
  await page
    .getByLabel("Current medications")
    .fill("Fictional inhaler information");
  await page
    .getByRole("button", { name: "Save medical history", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("saved");
  await page.reload();
  await expect(page.getByLabel("Allergies", { exact: true })).toHaveValue(
    "Penicillin — fictional demonstration",
  );
  await shot(page, "patient-medical-history");
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await shot(page, "medical-history-mobile");
});

test("doctor portal shows own patients, history and direct Excel downloads", async ({
  page,
}) => {
  await login(page, "doctor@example.com");
  await expect(
    page.getByRole("heading", { name: "Your practice, Dr. Jhatka." }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Find doctors" }),
  ).toHaveCount(0);
  await shot(page, "doctor-practice-overview");
  await page
    .getByRole("navigation", { name: "Dashboard" })
    .getByRole("link", { name: "My patients", exact: true })
    .click();
  const patient = page
    .locator(".clinical-patient")
    .filter({ hasText: "Aarav Shah" });
  await patient.getByRole("button", { name: "View medical history" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Penicillin — fictional demonstration",
  );
  await shot(page, "doctor-patient-history");
  await page.keyboard.press("Escape");
  const promise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download patients Excel", exact: true })
    .click();
  const download = await promise;
  expect(download.suggestedFilename()).toBe("My_Patients_Doctor.xlsx");
  expect(
    fs
      .readFileSync((await download.path())!)
      .subarray(0, 2)
      .toString(),
  ).toBe("PK");
  const response = await page.request.post("/api/appointments", {
    data: { slot_id: "anything", payment_result: "success" },
  });
  expect(response.status()).toBe(403);
  await page.goto("/doctors/doctor-1");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/dashboard/downloads");
  await expect(
    page.getByRole("button", { name: "Download workspace Excel" }),
  ).toBeVisible();
  await shot(page, "doctor-excel-downloads");
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await shot(page, "doctor-workspace-mobile");
});

test("doctor leave hides times and removal restores them", async ({ page }) => {
  await login(page, "doctor@example.com");
  await page.goto("/dashboard/availability");
  const date = new Date(Date.now() + 26 * 86400000).toISOString().slice(0, 10);
  const form = page
    .locator("form")
    .filter({ hasText: "Add an appointment slot" });
  await form.getByLabel("Date", { exact: true }).fill(date);
  await form.getByLabel("Start time (IST)").fill("10:00");
  await form.getByLabel("End time (IST)").fill("10:30");
  await form.getByRole("button", { name: "Publish slot" }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "available for booking",
  );
  const off = page.locator(".time-off-panel");
  await off.getByLabel("From date").fill(date);
  await off.getByLabel("To date").fill(date);
  await off.getByLabel("From time (IST)").fill("10:00");
  await off.getByLabel("To time (IST)").fill("11:00");
  await off.getByLabel("Note (optional)").fill("Fictional planned leave");
  await off.getByRole("button", { name: "Add unavailable period" }).click();
  await expect(off.getByRole("status")).toContainText("saved");
  await page.getByLabel("Filter date").fill(date);
  await expect(
    page
      .locator(".schedule-card")
      .filter({ hasText: "10:00" })
      .locator(".badge"),
  ).toHaveText("Unavailable period");
  let result = await page.request.get("/api/doctors/doctor-1/availability");
  expect(
    (await result.json()).some(
      (s: { appointment_date: string }) => s.appointment_date === date,
    ),
  ).toBeFalsy();
  await shot(page, "doctor-availability-leave");
  await off.getByRole("button", { name: "Remove period" }).click();
  await expect(off.getByRole("status")).toContainText("removed");
  result = await page.request.get("/api/doctors/doctor-1/availability");
  expect(
    (await result.json()).some(
      (s: { appointment_date: string }) => s.appointment_date === date,
    ),
  ).toBeTruthy();
  const restored = (await result.json()).find(
    (s: { appointment_date: string }) => s.appointment_date === date,
  );
  await page.request.delete("/api/doctor/availability/" + restored.slot_id);
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
});

test("different doctor cannot see a cancelled-only patient history", async ({
  page,
}) => {
  await login(page, "doctor3@example.com");
  await expect(
    page.getByRole("heading", { name: "Your practice, Dr. Emmett Brown." }),
  ).toBeVisible();
  await page.goto("/dashboard/patients");
  await expect(page.locator(".clinical-patient")).toHaveCount(0);
  expect(
    (await page.request.get("/api/doctor/patients/patient-1")).status(),
  ).toBe(404);
  await page.goto("/dashboard/appointments");
  await expect(
    page.getByRole("link", { name: "Book an appointment", exact: true }),
  ).toHaveCount(0);
});

test("doctor receives a new booking notification while the page remains open", async ({
  page,
  browser,
}) => {
  await login(page, "doctor@example.com");
  await page.goto("/dashboard/notifications");
  const read = page.getByRole("button", { name: "Mark all as read" });
  if (await read.isEnabled()) await read.click();
  const context = await browser.newContext();
  try {
    const response = await context.request.post(
      (process.env.BASE_URL || "http://127.0.0.1:8000") + "/api/auth/login",
      {
        data: {
          email: "patient@example.com",
          password: password("patient@example.com"),
        },
      },
    );
    expect(response.status()).toBe(200);
    const slots = await (
      await context.request.get(
        (process.env.BASE_URL || "http://127.0.0.1:8000") +
          "/api/doctors/doctor-1/availability",
      )
    ).json();
    const slot = slots[slots.length - 1];
    const booked = await context.request.post(
      (process.env.BASE_URL || "http://127.0.0.1:8000") + "/api/appointments",
      { data: { slot_id: slot.slot_id, payment_result: "success" } },
    );
    expect(booked.status()).toBe(201);
    await expect(
      page.getByText(
        `Appointment confirmed for ${slot.appointment_date} at ${slot.start_time} IST. Payment is simulated.`,
        { exact: true },
      ),
    ).toBeVisible({ timeout: 22000 });
    await shot(page, "doctor-booking-notifications");
  } finally {
    await context.close();
  }
});
