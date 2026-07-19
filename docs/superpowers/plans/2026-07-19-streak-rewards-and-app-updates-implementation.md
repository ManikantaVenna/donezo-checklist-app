# Donezo Streak Rewards and App Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix active streak display, add the approved compact luxury reward ladder, and ship a one-time bridge APK that can announce every later Donezo Android release through a permanent download page.

**Architecture:** Keep streak calculation and tier selection as pure domain functions. Render the reward through one shared `StreakBadge`, then isolate update networking and lifecycle state in an `AppUpdateProvider` that never blocks checklist loading. Serve release metadata and a download page from the existing Donezo Cloudflare site, with immutable APK files stored in Cloudflare R2.

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19, TypeScript 6, Vitest, AsyncStorage, `expo-application`, EAS Build, Cloudflare Pages/Workers static assets, Cloudflare R2.

**Design specification:** `docs/superpowers/specs/2026-07-19-streak-rewards-and-app-updates-design.md`

## Global Constraints

- Preserve authentication, Supabase schema/RLS, reminders, checklist CRUD, navigation, and existing dark/gold layout.
- Visual badge text is the integer only; never append `d`, a range, or a tier name.
- Tiers are exactly: `0 neutral`, `1-14 silver`, `15-29 rose-gold`, `30-44 gold`, `45-59 diamond`, `60-74 emerald`, `75-89 sapphire`, `90-99 black-diamond`, `100+ legend`.
- Everyday target sizes are approximately `54 x 30` logical pixels on mobile and `66 x 32` on web/tablet.
- Update checks are Android-only, non-blocking, optional, HTTPS-only, five-second timeout, and no more frequent than every six hours.
- The release manifest comparison uses the installed native integer build number; semantic version text is display-only.
- The app opens `https://donezo.mv-builds.com/download`; Android still requires the user to approve APK installation.
- Version 1.0.5 build 8 remains the rollback point. Do not publish the release manifest until the replacement APK and page are independently verified.
- Never request or expose passwords, API keys, signing keys, Supabase secrets, or Cloudflare tokens in chat or logs.

---

### Task 1: Correct active streak semantics and centralize tier boundaries

**Files:**
- Modify: `checklist-app/src/domain/dates.ts`
- Modify: `checklist-app/src/domain/dates.test.ts`
- Create: `checklist-app/src/domain/streakTiers.ts`
- Create: `checklist-app/src/domain/streakTiers.test.ts`

**Interfaces:**
- Consumes: `DailyCompletion`, `shiftLocalDateKey(localDate, days)`.
- Produces: existing `calculateCurrentStreak(completions, taskId, todayLocalDate): number`; new `getStreakTier(streak): StreakTier`; new `isTierBoundary(streak): boolean`.

- [ ] **Step 1: Add failing grace-period tests to `dates.test.ts`**

```ts
it("keeps yesterday's consecutive streak active while today is still open", () => {
  const completions = [
    completion("daily-1", "2026-07-18"),
    completion("daily-1", "2026-07-17"),
  ];
  expect(calculateCurrentStreak(completions, "daily-1", "2026-07-19")).toBe(2);
});

it("resets after a complete local day is missed", () => {
  const completions = [completion("daily-1", "2026-07-17")];
  expect(calculateCurrentStreak(completions, "daily-1", "2026-07-19")).toBe(0);
});

it("increments immediately when today is completed", () => {
  const completions = [
    completion("daily-1", "2026-07-19"),
    completion("daily-1", "2026-07-18"),
  ];
  expect(calculateCurrentStreak(completions, "daily-1", "2026-07-19")).toBe(2);
});
```

- [ ] **Step 2: Run the focused test and confirm the first case fails**

Run: `npm test -- src/domain/dates.test.ts`  
Expected: FAIL because the current function starts only from today and returns `0`.

- [ ] **Step 3: Implement the minimal active-streak rule in `dates.ts`**

```ts
export function calculateCurrentStreak(
  completions: DailyCompletion[],
  taskId: string,
  todayLocalDate: string,
): number {
  const completedDates = new Set(
    completions.filter((completion) => completion.taskId === taskId).map((completion) => completion.localDate),
  );
  let cursor = completedDates.has(todayLocalDate)
    ? todayLocalDate
    : shiftLocalDateKey(todayLocalDate, -1);
  let streak = 0;

  while (completedDates.has(cursor)) {
    streak += 1;
    cursor = shiftLocalDateKey(cursor, -1);
  }
  return streak;
}
```

- [ ] **Step 4: Add exact tier-boundary tests in `streakTiers.test.ts`**

```ts
const cases = [
  [0, "neutral"], [1, "silver"], [14, "silver"],
  [15, "rose-gold"], [29, "rose-gold"], [30, "gold"], [44, "gold"],
  [45, "diamond"], [59, "diamond"], [60, "emerald"], [74, "emerald"],
  [75, "sapphire"], [89, "sapphire"], [90, "black-diamond"],
  [99, "black-diamond"], [100, "legend"], [145, "legend"],
] as const;

it.each(cases)("maps %i to %s", (streak, id) => {
  expect(getStreakTier(streak).id).toBe(id);
});

it("recognizes only earned-tier boundaries", () => {
  expect([1, 15, 30, 45, 60, 75, 90, 100].filter(isTierBoundary)).toEqual([1, 15, 30, 45, 60, 75, 90, 100]);
  expect(isTierBoundary(14)).toBe(false);
  expect(isTierBoundary(101)).toBe(false);
});
```

- [ ] **Step 5: Implement `streakTiers.ts` as the single source of truth**

```ts
export type StreakTierId =
  | "neutral" | "silver" | "rose-gold" | "gold" | "diamond"
  | "emerald" | "sapphire" | "black-diamond" | "legend";

export type StreakTier = { id: StreakTierId; label: string; minimum: number };

export const STREAK_TIERS: readonly StreakTier[] = [
  { id: "neutral", label: "No streak", minimum: 0 },
  { id: "silver", label: "Silver", minimum: 1 },
  { id: "rose-gold", label: "Rose Gold", minimum: 15 },
  { id: "gold", label: "Gold", minimum: 30 },
  { id: "diamond", label: "Diamond", minimum: 45 },
  { id: "emerald", label: "Emerald", minimum: 60 },
  { id: "sapphire", label: "Sapphire", minimum: 75 },
  { id: "black-diamond", label: "Black Diamond", minimum: 90 },
  { id: "legend", label: "Legend", minimum: 100 },
] as const;

export function getStreakTier(streak: number): StreakTier {
  const safeStreak = Math.max(0, Math.floor(streak));
  return [...STREAK_TIERS].reverse().find((tier) => safeStreak >= tier.minimum)!;
}

export function isTierBoundary(streak: number): boolean {
  return streak > 0 && STREAK_TIERS.some((tier) => tier.minimum === streak);
}
```

- [ ] **Step 6: Run domain tests, typecheck, and commit**

Run: `npm test -- src/domain/dates.test.ts src/domain/streakTiers.test.ts`  
Expected: both files PASS.  
Run: `npm run typecheck`  
Expected: exit code 0.

```powershell
git add checklist-app/src/domain/dates.ts checklist-app/src/domain/dates.test.ts checklist-app/src/domain/streakTiers.ts checklist-app/src/domain/streakTiers.test.ts
git commit -m "fix: keep active streaks visible during the current day"
```

---

### Task 2: Produce optimized luxury badge backdrops and the shared component

**Files:**
- Create: `checklist-app/assets/streak-badges/silver.png`
- Create: `checklist-app/assets/streak-badges/rose-gold.png`
- Create: `checklist-app/assets/streak-badges/gold.png`
- Create: `checklist-app/assets/streak-badges/diamond.png`
- Create: `checklist-app/assets/streak-badges/emerald.png`
- Create: `checklist-app/assets/streak-badges/sapphire.png`
- Create: `checklist-app/assets/streak-badges/black-diamond.png`
- Create: `checklist-app/assets/streak-badges/legend.png`
- Create: `checklist-app/src/components/StreakBadge.tsx`
- Create: `checklist-app/src/components/StreakBadge.test.tsx`

**Interfaces:**
- Consumes: `getStreakTier(streak)` and eight static PNG sources.
- Produces: `StreakBadge({ streak }: { streak: number })` with number-only visual text and full accessibility label.

- [ ] **Step 1: Generate eight numberless badge backdrops from the approved close-up reference**

Use the image-generation workflow once per tier. Every prompt must require: transparent or removable flat background; fixed `2.2:1` capsule ratio; no number, letter, tier name, watermark, or shadow outside the capsule; small crest in the left 30%; empty right 70% for live text; luxury-watch materials matching the approved screenshot. Use the exact material descriptions in the design spec. Save the alpha PNGs at the paths above and keep the generation sources outside the app bundle.

- [ ] **Step 2: Validate and compress the assets**

Run the imagegen alpha-validation helper on each source, resize each final to `264 x 120` pixels, and use lossless PNG optimization. Confirm transparent corners and total size under `800 KiB`:

```powershell
$files = Get-ChildItem -LiteralPath 'assets/streak-badges' -Filter '*.png'
if ($files.Count -ne 8) { throw "Expected eight streak badge assets." }
$total = ($files | Measure-Object Length -Sum).Sum
if ($total -gt 819200) { throw "Streak assets exceed 800 KiB." }
```

- [ ] **Step 3: Write a failing `StreakBadge` rendering test**

```tsx
it("renders only the number and exposes the tier to accessibility", () => {
  const renderer = create(<StreakBadge streak={63} />);
  expect(renderer.root.findByProps({ accessibilityLabel: "63 day streak, Emerald tier" })).toBeDefined();
  expect(renderer.root.findAllByType("Text").map((node) => node.props.children)).toEqual([63]);
});

it("keeps 100-plus values in the Legend material", () => {
  const renderer = create(<StreakBadge streak={127} />);
  expect(renderer.root.findByProps({ accessibilityLabel: "127 day streak, Legend tier" })).toBeDefined();
});
```

- [ ] **Step 4: Implement `StreakBadge.tsx` with static source mapping and restrained shimmer**

```tsx
const badgeSources: Record<Exclude<StreakTierId, "neutral">, ImageSourcePropType> = {
  silver: require("../../assets/streak-badges/silver.png"),
  "rose-gold": require("../../assets/streak-badges/rose-gold.png"),
  gold: require("../../assets/streak-badges/gold.png"),
  diamond: require("../../assets/streak-badges/diamond.png"),
  emerald: require("../../assets/streak-badges/emerald.png"),
  sapphire: require("../../assets/streak-badges/sapphire.png"),
  "black-diamond": require("../../assets/streak-badges/black-diamond.png"),
  legend: require("../../assets/streak-badges/legend.png"),
};

export function StreakBadge({ streak }: { streak: number }) {
  const tier = getStreakTier(streak);
  const safeStreak = Math.max(0, Math.floor(streak));
  const previous = useRef(safeStreak);
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const increased = safeStreak > previous.current;
    previous.current = safeStreak;
    if (!increased) return;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) return;
      shine.setValue(0);
      Animated.timing(shine, { toValue: 1, duration: isTierBoundary(safeStreak) ? 700 : 450, useNativeDriver: true }).start();
    });
  }, [safeStreak, shine]);

  const label = `${safeStreak} day streak${tier.id === "neutral" ? "" : `, ${tier.label} tier`}`;
  return (
    <View accessibilityLabel={label} accessibilityRole="text" style={styles.frame}>
      {tier.id === "neutral" ? <View style={styles.neutral} /> : <Image source={badgeSources[tier.id]} resizeMode="stretch" style={StyleSheet.absoluteFill} />}
      <Text style={[styles.number, numberStyles[tier.id]]}>{safeStreak}</Text>
      <Animated.View pointerEvents="none" style={[styles.shine, { opacity: shine, transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-40, 90] }) }] }]} />
    </View>
  );
}
```

Use `overflow: "hidden"`, a `54 x 30` base frame, a web/tablet media-width adjustment through `useWindowDimensions`, and tier-specific number colors/shadows that match the approved assets.

- [ ] **Step 5: Run component tests and verify reduced-motion handling**

Run: `npm test -- src/components/StreakBadge.test.tsx`  
Expected: number-only, tier-label, Legend, and reduced-motion tests PASS.

- [ ] **Step 6: Commit the component and optimized assets**

```powershell
git add checklist-app/assets/streak-badges checklist-app/src/components/StreakBadge.tsx checklist-app/src/components/StreakBadge.test.tsx
git commit -m "feat: add compact luxury streak rewards"
```

---

### Task 3: Replace every old streak pill without changing task interactions

**Files:**
- Modify: `checklist-app/src/components/TaskRow.tsx`
- Create: `checklist-app/src/components/TaskRow.test.tsx`
- Modify: `checklist-app/src/screens/DailyScreen.tsx`
- Create: `checklist-app/src/screens/DailyScreen.test.tsx`

**Interfaces:**
- Consumes: `StreakBadge({ streak })` and existing numeric `streak` props.
- Produces: identical task toggling/reordering/deleting behavior with the new number-only badge on Today and Daily.

- [ ] **Step 1: Add failing tests proving `d` is gone and task controls remain connected**

```tsx
it("renders the shared streak badge and preserves task actions", () => {
  const onToggle = vi.fn();
  const renderer = create(<TaskRow task={task} complete={false} streak={48} onToggle={onToggle} />);
  expect(renderer.root.findByProps({ accessibilityLabel: "48 day streak, Diamond tier" })).toBeDefined();
  expect(renderer.root.findAllByType("Text").some((node) => node.props.children === "48d")).toBe(false);
  renderer.root.findByProps({ accessibilityLabel: task.title }).props.onPress();
  expect(onToggle).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Replace `TaskRow`'s old `<Text style={styles.badge}>{streak}d</Text>`**

```tsx
{typeof streak === "number" ? <StreakBadge streak={streak} /> : null}
```

Remove only the now-unused `badge` style. Do not alter checkbox, title wrapping, optimistic actions, movement controls, or delete behavior.

- [ ] **Step 3: Replace `DailyScreen`'s inline streak text with `StreakBadge`**

```tsx
<StreakBadge streak={getDailyStreak(snapshot, task.id, todayLocalDate)} />
```

Remove only the now-unused `styles.streak` declaration.

- [ ] **Step 4: Run focused and full tests**

Run: `npm test -- src/components/TaskRow.test.tsx src/screens/DailyScreen.test.tsx`  
Expected: PASS.  
Run: `npm test`  
Expected: all existing and new tests PASS.

- [ ] **Step 5: Run web and Android visual smoke exports**

Run: `npx expo export --platform web --output-dir .expo-web-streak-smoke`  
Run: `npx expo export --platform android --output-dir .expo-android-streak-smoke`  
Expected: both exports complete without bundling errors. Inspect narrow Android, wider Android, and desktop web captures; task titles and all controls remain usable.

- [ ] **Step 6: Commit the integration**

```powershell
git add checklist-app/src/components/TaskRow.tsx checklist-app/src/components/TaskRow.test.tsx checklist-app/src/screens/DailyScreen.tsx checklist-app/src/screens/DailyScreen.test.tsx
git commit -m "feat: show premium streak tiers across Donezo"
```

---

### Task 4: Build the strict Android release-manifest client

**Files:**
- Modify: `checklist-app/package.json`
- Modify: `checklist-app/package-lock.json`
- Create: `checklist-app/src/domain/appRelease.ts`
- Create: `checklist-app/src/domain/appRelease.test.ts`
- Create: `checklist-app/src/lib/appReleases.ts`
- Create: `checklist-app/src/lib/appReleases.test.ts`

**Interfaces:**
- Produces: `AppReleaseManifest`; `parseAppReleaseManifest(value): AppReleaseManifest | null`; `isNewerAndroidRelease(release, installedBuild): boolean`; `fetchLatestAndroidRelease(fetchImpl?): Promise<AppReleaseManifest | null>`.

- [ ] **Step 1: Install the SDK-compatible native version reader**

Run: `npx expo install expo-application`  
Expected: SDK 57-compatible `expo-application` appears in `package.json` and the lockfile.

- [ ] **Step 2: Add failing parser and comparison tests**

```ts
it("accepts the exact production manifest contract", () => {
  expect(parseAppReleaseManifest(validManifest)).toEqual(validManifest);
});

it.each([
  { ...validManifest, platform: "ios" },
  { ...validManifest, buildVersion: 0 },
  { ...validManifest, downloadPageUrl: "http://donezo.mv-builds.com/download" },
  { ...validManifest, downloadPageUrl: "https://example.com/download" },
  { ...validManifest, apkUrl: "https://example.com/app.apk" },
  { ...validManifest, sha256: "not-a-checksum" },
])("rejects unsafe or malformed metadata", (value) => {
  expect(parseAppReleaseManifest(value)).toBeNull();
});

it("compares the native integer build instead of semantic text", () => {
  expect(isNewerAndroidRelease(validManifest, "8")).toBe(true);
  expect(isNewerAndroidRelease(validManifest, "9")).toBe(false);
});
```

- [ ] **Step 3: Implement the strict domain contract**

```ts
export type AppReleaseManifest = {
  platform: "android";
  version: string;
  buildVersion: number;
  publishedAt: string;
  downloadPageUrl: string;
  apkUrl: string;
  fileSizeBytes: number;
  sha256: string;
  releaseNotes: string[];
};

export function isNewerAndroidRelease(release: AppReleaseManifest, installedBuild: string | null): boolean {
  const current = Number(installedBuild);
  return Number.isSafeInteger(current) && release.buildVersion > current;
}
```

`parseAppReleaseManifest` must require positive safe integer build/file size, valid ISO date, non-empty version/notes, lowercase 64-character SHA-256, exact page origin `https://donezo.mv-builds.com`, and exact APK origin `https://downloads.mv-builds.com`.

- [ ] **Step 4: Add failing fetch tests for timeout, HTTP failure, and malformed JSON**

Use fake timers and an injected `fetchImpl`. Assert all failures resolve to `null` and never throw into UI state.

- [ ] **Step 5: Implement the five-second release fetch**

```ts
export const LATEST_ANDROID_RELEASE_URL = "https://donezo.mv-builds.com/releases/android/latest.json";

export async function fetchLatestAndroidRelease(fetchImpl: typeof fetch = fetch): Promise<AppReleaseManifest | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetchImpl(LATEST_ANDROID_RELEASE_URL, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) return null;
    return parseAppReleaseManifest(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 6: Run tests, typecheck, and commit**

Run: `npm test -- src/domain/appRelease.test.ts src/lib/appReleases.test.ts`  
Run: `npm run typecheck`  
Expected: PASS and exit code 0.

```powershell
git add checklist-app/package.json checklist-app/package-lock.json checklist-app/src/domain/appRelease.ts checklist-app/src/domain/appRelease.test.ts checklist-app/src/lib/appReleases.ts checklist-app/src/lib/appReleases.test.ts
git commit -m "feat: add strict Donezo release checks"
```

---

### Task 5: Add the non-blocking update lifecycle, popup, and Settings fallback

**Files:**
- Create: `checklist-app/src/state/AppUpdateContext.tsx`
- Create: `checklist-app/src/state/AppUpdateContext.test.tsx`
- Create: `checklist-app/src/components/AppUpdateNotice.tsx`
- Create: `checklist-app/src/components/AppUpdateNotice.test.tsx`
- Modify: `checklist-app/App.tsx`
- Modify: `checklist-app/src/screens/SettingsScreen.tsx`

**Interfaces:**
- Produces: `AppUpdateProvider`; `useAppUpdate()` returning installed version/build, `availableRelease`, `dismiss()`, and `openDownloadPage()`.

- [ ] **Step 1: Add provider tests for startup, six-hour foreground throttling, cache, dismissal, and offline silence**

Mock `Platform.OS = "android"`, `expo-application`, AsyncStorage, AppState, and `fetchLatestAndroidRelease`. Required assertions:

```ts
expect(check).toHaveBeenCalledTimes(1); // startup
expect(value.availableRelease?.buildVersion).toBe(9);
value.dismiss();
expect(value.availableRelease).toBeNull(); // hidden for this provider session
```

Advance fewer than six hours and emit `active`: no second check. Advance six hours and emit `active`: exactly one additional check. A rejected/offline fetch leaves children mounted and error-free.

- [ ] **Step 2: Implement `AppUpdateProvider`**

Use AsyncStorage keys `donezo:update:last-attempt-at` and `donezo:update:cached-release`. On mount, parse the cache first, expose it only when newer than `Application.nativeBuildVersion`, then call the network checker if the stored attempt is at least six hours old. Store the attempt timestamp before the fetch to avoid retry storms. Skip all checks unless `Platform.OS === "android"`.

```ts
type AppUpdateContextValue = {
  installedVersion: string;
  installedBuildVersion: string | null;
  availableRelease: AppReleaseManifest | null;
  dismiss: () => void;
  openDownloadPage: () => Promise<void>;
};
```

`openDownloadPage` must open only the already-validated `availableRelease.downloadPageUrl`.

- [ ] **Step 3: Add failing popup tests**

Assert the popup is absent without a release, shows exact version/notes when available, **Later** calls `dismiss`, and **Update Donezo** calls `openDownloadPage`.

- [ ] **Step 4: Implement `AppUpdateNotice` as a compact modal**

Use React Native `Modal`, existing Donezo tokens/fonts, a short heading (`Donezo {version} is ready`), up to three release-note lines, `AppButton` for **Update Donezo**, and a ghost **Later** button. Do not block interaction while no update is known.

- [ ] **Step 5: Wire the provider globally without coupling it to authentication or checklist state**

```tsx
export default function App() {
  return (
    <SafeAreaProvider>
      <AppUpdateProvider>
        <AppContent />
        <AppUpdateNotice />
      </AppUpdateProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 6: Replace Settings' hardcoded version and add the persistent update entry**

Use `installedVersion` for `DONEZO {installedVersion}`. When a newer release is known, render an **Update available: {version}** link calling `openDownloadPage`. Do not otherwise change Settings layout or scheduling behavior.

- [ ] **Step 7: Run focused/full tests and commit**

Run: `npm test -- src/state/AppUpdateContext.test.tsx src/components/AppUpdateNotice.test.tsx`  
Run: `npm test`  
Run: `npm run typecheck`  
Expected: all PASS.

```powershell
git add checklist-app/App.tsx checklist-app/src/state/AppUpdateContext.tsx checklist-app/src/state/AppUpdateContext.test.tsx checklist-app/src/components/AppUpdateNotice.tsx checklist-app/src/components/AppUpdateNotice.test.tsx checklist-app/src/screens/SettingsScreen.tsx
git commit -m "feat: notify Android users about Donezo updates"
```

---

### Task 6: Build the permanent download page without publishing a fake release

**Files:**
- Create: `checklist-app/public/download.html`
- Create: `checklist-app/public/download.js`
- Create: `checklist-app/public/_redirects`
- Modify: `checklist-app/README.md`

**Interfaces:**
- Consumes: `/releases/android/latest.json` using the exact manifest contract.
- Produces: `https://donezo.mv-builds.com/download`, which renders release information and opens the immutable R2 APK URL.

- [ ] **Step 1: Create the dark/gold static page shell**

The page must include fixed IDs `version`, `build`, `published-at`, `release-notes`, `file-size`, `sha256`, `download-button`, and `status`. The download button starts disabled with `Preparing latest release...`. Match `privacy.html`/`support.html` typography and never render raw HTML from manifest values.

- [ ] **Step 2: Implement `download.js` with safe DOM text assignment**

```js
const response = await fetch("/releases/android/latest.json", { cache: "no-store" });
if (!response.ok) throw new Error("Release unavailable");
const release = await response.json();
if (release.platform !== "android" || !Number.isSafeInteger(release.buildVersion)) throw new Error("Invalid release");
const apk = new URL(release.apkUrl);
if (apk.protocol !== "https:" || apk.origin !== "https://downloads.mv-builds.com") throw new Error("Invalid download");
document.querySelector("#version").textContent = release.version;
document.querySelector("#build").textContent = String(release.buildVersion);
document.querySelector("#sha256").textContent = release.sha256;
document.querySelector("#download-button").href = apk.href;
document.querySelector("#download-button").removeAttribute("aria-disabled");
```

Render notes by creating `<li>` nodes and assigning `textContent`. On any failure, keep the button disabled and show `The latest Donezo download is temporarily unavailable. Please try again later.`

- [ ] **Step 3: Add Cloudflare static rewrites**

```text
/download /download.html 200
/privacy /privacy.html 200
/support /support.html 200
```

Do not create `latest.json` yet; publishing nonexistent build metadata is forbidden.

- [ ] **Step 4: Build and inspect the web export**

Run: `npm run build:web`  
Expected: `dist/download.html`, `dist/download.js`, and `dist/_redirects` exist.  
Serve: `npx serve dist -l 4173`  
Inspect: `http://localhost:4173/download`; the unavailable state is polished and contains no broken direct link before a real manifest exists.

- [ ] **Step 5: Commit the page shell and deployment documentation**

Document the publication order in README: signed build, hash, R2 upload, page deployment, endpoint verification, manifest last.

```powershell
git add checklist-app/public/download.html checklist-app/public/download.js checklist-app/public/_redirects checklist-app/README.md
git commit -m "feat: add permanent Donezo download page"
```

---

### Task 7: Verify, build, host, and publish the bridge release safely

**Files:**
- Modify: `checklist-app/app.json`
- Create only after a real build exists: `checklist-app/public/releases/android/latest.json`

**Interfaces:**
- Produces: signed Donezo 1.0.6 bridge APK, immutable R2 object, live download page, and live validated manifest.

- [ ] **Step 1: Bump the visible version only**

Change `expo.version` from `1.0.5` to `1.0.6`. Leave EAS remote `autoIncrement` responsible for the Android build version; do not guess or hardcode it in the manifest before the build completes.

- [ ] **Step 2: Run the complete local verification battery**

```powershell
npm test
npm run typecheck
npx expo-doctor
npx expo export --platform android --output-dir .expo-android-final-smoke
npm run build:web
git diff --check
```

Expected: all tests PASS, TypeScript clean, Expo Doctor 20/20, both exports succeed, no whitespace errors, and Git contains only intentional release changes.

- [ ] **Step 3: Commit the exact source used for the bridge binary**

```powershell
git add checklist-app/app.json
git commit -m "release: prepare Donezo 1.0.6 bridge build"
git status --short
```

Expected: clean worktree before EAS Build.

- [ ] **Step 4: Create the signed Android preview APK and capture its metadata**

```powershell
$buildJson = npx eas-cli@latest build --platform android --profile preview --non-interactive --wait --json
$build = $buildJson | ConvertFrom-Json
if ($build -is [array]) { $build = $build[0] }
$actualBuild = [int]$build.appBuildVersion
$artifactUrl = [string]$build.artifacts.buildUrl
$releaseCommit = (git rev-parse HEAD).Trim()
if ($actualBuild -le 8) { throw 'EAS did not increment the Android build version.' }
if ([string]$build.gitCommitHash -ne $releaseCommit) { throw 'EAS built a different Git commit.' }
if (-not $artifactUrl.StartsWith('https://')) { throw 'EAS did not return a secure artifact URL.' }
```

Record `$build.id`, `$artifactUrl`, `$releaseCommit`, `$build.appVersion`, and `$actualBuild` in the release handoff.

- [ ] **Step 5: Download and validate the exact artifact**

```powershell
$releaseDir = Join-Path $env:LOCALAPPDATA 'Donezo\Releases\1.0.6'
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
$apkName = "Donezo-1.0.6-build-$actualBuild.apk"
$apk = Join-Path $releaseDir $apkName
Invoke-WebRequest -Uri $artifactUrl -OutFile $apk
$size = (Get-Item -LiteralPath $apk).Length
$sha = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToLowerInvariant()
if ($size -le 0 -or $sha.Length -ne 64) { throw 'APK validation failed.' }
```

- [ ] **Step 6: Install over Donezo 1.0.5 on a physical Android device**

Do not uninstall first. Confirm Android recognizes it as an update, the app opens, the existing account remains signed in, synced tasks remain present, yesterday's active streak displays before today's completion, and completing today increments it.

- [ ] **Step 7: Inspect the existing Cloudflare target before making changes**

Using the connected Cloudflare session, identify the existing Pages/Workers project currently serving `donezo.mv-builds.com`. Do not create or switch the production route. Record the project name and current deployment so it can be rolled back.

- [ ] **Step 8: Create or reuse R2 release storage and bind the production hostname**

Create/reuse bucket `donezo-releases`, connect `downloads.mv-builds.com` as its production custom domain, keep `r2.dev` disabled for production, and upload the immutable APK object. Verify a HEAD request returns 200, correct `Content-Length`, and `application/vnd.android.package-archive` (or `application/octet-stream`).

- [ ] **Step 9: Create the real manifest with artifact-derived values**

Use `apply_patch` to create `public/releases/android/latest.json`. Every dynamic property comes from the named, already-validated value below:

```ts
const release = {
  platform: "android",
  version: "1.0.6",
  buildVersion: actualBuild,
  publishedAt: new Date().toISOString(),
  downloadPageUrl: "https://donezo.mv-builds.com/download",
  apkUrl: `https://downloads.mv-builds.com/${apkName}`,
  fileSizeBytes: size,
  sha256: sha,
  releaseNotes: [
    "Streaks remain visible during today's completion window.",
    "Premium streak rewards now grow from Silver to Legend.",
    "Donezo can now notify you when future Android updates are ready.",
  ],
};
```

Write the resolved literal values, not the variable names, into JSON. Run the same `parseAppReleaseManifest` implementation against the file before deployment.

- [ ] **Step 10: Rebuild and deploy the existing Cloudflare web target**

Run `npm run build:web`, then deploy `dist/` to the existing project identified in Step 7 using its established deployment method. Do not alter DNS or the root app route. Verify `/`, `/privacy`, `/support`, and `/download` before continuing.

- [ ] **Step 11: Publish the manifest last and verify all public endpoints**

After the APK and page are confirmed:

```powershell
curl.exe -fSs https://donezo.mv-builds.com/releases/android/latest.json
curl.exe -fSI https://donezo.mv-builds.com/download
curl.exe -fSI "https://downloads.mv-builds.com/$apkName"
```

Confirm the public manifest parses, the checksum matches the downloaded APK, the page button targets the same immutable URL, and the page download completes at the correct byte length.

- [ ] **Step 12: Commit the real manifest and final release metadata**

```powershell
git add checklist-app/public/releases/android/latest.json
git commit -m "release: publish Donezo 1.0.6 bridge metadata"
```

- [ ] **Step 13: Hand off the one-time bridge APK**

Provide the permanent page URL and explain once: existing 1.0.5 users must install 1.0.6 manually. Future higher-build manifests will generate the in-app notice automatically.

---

## Final Self-Review Checklist

- [ ] Every approved streak rule maps to Task 1 tests.
- [ ] Every tier boundary and 100+ behavior maps to `streakTiers.test.ts`.
- [ ] Both Today and Daily use the same `StreakBadge`.
- [ ] No visible streak text contains `d`.
- [ ] Badge assets stay under the defined size budget and do not materially inflate the APK.
- [ ] Update failures never block auth, checklist loading, or task interactions.
- [ ] The app opens only the permanent HTTPS Donezo page.
- [ ] The public page validates the immutable R2 origin before enabling download.
- [ ] The bridge APK is signed by the existing key and installs over build 8.
- [ ] Manifest publication remains the final external change.
- [ ] Current release commit and Cloudflare deployment remain available for rollback.
