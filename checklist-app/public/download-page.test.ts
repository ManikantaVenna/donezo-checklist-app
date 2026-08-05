/// <reference types="node" />

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const downloadPage = readFileSync(resolve(__dirname, "download", "index.html"), "utf8");

describe("download page", () => {
  it("guides iPhone users to install Donezo from Safari as a Home Screen app", () => {
    expect(downloadPage).toContain("Use Donezo on iPhone");
    expect(downloadPage).toContain("iPhone users do not need an APK");
    expect(downloadPage).toContain("It works almost exactly like an app");
    expect(downloadPage).toContain("Open donezo.mv-builds.com in Safari");
    expect(downloadPage).toContain("Add to Home Screen");
    expect(downloadPage).toContain("Open Donezo from the new Home Screen icon");
    expect(downloadPage).toContain("Enable web reminders");
  });
});
