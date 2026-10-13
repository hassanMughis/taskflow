import test from "node:test";
import assert from "node:assert/strict";
import { dateValue, emailValue, optionalHexColor, optionalText, positiveId, positionValue, requireText, slugify } from "../utils/validation.js";

test("requireText trims valid text", () => assert.equal(requireText("  Board  ", "Title"), "Board"));
test("requireText rejects blank values", () => assert.throws(() => requireText("  ", "Title"), /Title is required/));
test("requireText rejects values above the configured limit", () => assert.throws(() => requireText("abcd", "Name", 3), /3 characters or fewer/));
test("optionalText converts blank text to null", () => assert.equal(optionalText("  ", "Description"), null));
test("positiveId accepts numeric strings", () => assert.equal(positiveId("42"), 42));
test("positiveId rejects decimals", () => assert.throws(() => positiveId("4.2"), /Invalid id/));
test("positionValue accepts zero", () => assert.equal(positionValue(0), 0));
test("positionValue rejects negative numbers", () => assert.throws(() => positionValue(-1), /non-negative/));
test("slugify creates URL-safe slugs", () => assert.equal(slugify(" Website Redesign! "), "website-redesign"));
test("dateValue accepts leap days", () => assert.equal(dateValue("2028-02-29", "Due date"), "2028-02-29"));
test("dateValue rejects calendar rollover", () => assert.throws(() => dateValue("2026-02-31", "Due date"), /real calendar date/));
test("emailValue normalizes valid email addresses", () => assert.equal(emailValue(" TEST@Example.com "), "test@example.com"));
test("emailValue rejects malformed addresses", () => assert.throws(() => emailValue("not-an-email"), /valid email/));
test("optionalHexColor normalizes valid colors", () => assert.equal(optionalHexColor("#AABBCC"), "#aabbcc"));
test("optionalHexColor rejects invalid colors", () => assert.throws(() => optionalHexColor("purple"), /six-digit hex/));
