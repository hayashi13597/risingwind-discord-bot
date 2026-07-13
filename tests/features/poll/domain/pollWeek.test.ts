// tests/features/poll/domain/pollWeek.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getCurrentPollWeek, buildPollTitle } from "../../../../src/features/poll/domain/pollWeek";

test("getCurrentPollWeek for a Wednesday returns correct Saturday and Sunday", () => {
  // Wednesday July 15, 2026, 10:00 AM
  const wednesday = new Date(2026, 6, 15, 10, 0, 0);
  assert.equal(wednesday.getDay(), 3, "should be Wednesday");

  const week = getCurrentPollWeek(wednesday);

  // Monday should be July 13
  assert.equal(week.monday.getDate(), 13);
  assert.equal(week.monday.getMonth(), 6); // July = 6

  // Saturday should be July 18
  assert.equal(week.saturday.getDate(), 18);
  assert.equal(week.saturday.getMonth(), 6);

  // Sunday should be July 19
  assert.equal(week.sunday.getDate(), 19);
  assert.equal(week.sunday.getMonth(), 6);
});

test("weekKey is formatted as YYYY-MM-DD based on Saturday", () => {
  const wednesday = new Date(2026, 6, 15, 10, 0, 0);
  const week = getCurrentPollWeek(wednesday);
  assert.equal(week.weekKey, "2026-07-18");
});

test("expiresAt is Sunday 23:59", () => {
  const wednesday = new Date(2026, 6, 15, 10, 0, 0);
  const week = getCurrentPollWeek(wednesday);
  assert.equal(week.expiresAt.getDate(), 19);
  assert.equal(week.expiresAt.getHours(), 23);
  assert.equal(week.expiresAt.getMinutes(), 59);
});

test("durationHours is at least 1", () => {
  // Sunday 23:58 — very close to expiry
  const lateSunday = new Date(2026, 6, 19, 23, 58, 0);
  const week = getCurrentPollWeek(lateSunday);
  assert.ok(week.durationHours >= 1);
});

test("buildPollTitle returns GVG T7 format for Saturday", () => {
  const saturday = new Date(2026, 6, 18, 0, 0, 0);
  const title = buildPollTitle("saturday", saturday);
  assert.equal(title, "GVG T7 18/7 19H00 Tập trung !");
});

test("buildPollTitle returns GVG CN format for Sunday", () => {
  const sunday = new Date(2026, 6, 19, 0, 0, 0);
  const title = buildPollTitle("sunday", sunday);
  assert.equal(title, "GVG CN 19/7 19H00 Tập trung !");
});