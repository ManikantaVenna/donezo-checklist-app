# Donezo Streak Rewards and App Updates Design

**Date:** 2026-07-19  
**Status:** Approved for implementation
**App:** Donezo  
**Current release:** 1.0.5, Android build 8

## Objective

Deliver one carefully scoped Donezo release that:

1. keeps an active daily streak visible during the current day's completion window;
2. turns the streak counter into a compact, premium 100-day reward ladder; and
3. adds a professional in-app update notice backed by one permanent Donezo download page.

The checklist, authentication, Supabase schema, user-data isolation, reminders, navigation, and existing dark/gold layout remain unchanged.

## Confirmed Current Behavior and Root Cause

The database is preserving historical daily completions. The visible reset happens because `calculateCurrentStreak` starts at today's local date and returns zero whenever today has not yet been completed. The screenshots prove the previous completion still exists: the badge changes directly from `0` to `2` after today's task is checked.

The correction is a display/calculation rule, not a database repair or migration.

## Active Streak Semantics

Donezo will display an **active streak** using the user's selected timezone:

- If the routine is completed today, count consecutive completion dates backward from today.
- If the routine is not completed today, count consecutive completion dates backward from yesterday. Today is treated as an open grace period, not a missed day.
- If neither today nor yesterday has a completion, display `0`.
- A routine completed yesterday therefore continues showing its existing streak throughout today.
- Completing it today immediately increments the visible streak by one.
- Missing the entire current day causes the streak to become `0` on the following local day.
- Unchecking today's completion falls back to the streak ending yesterday.
- A new routine with no completions displays `0`.
- Existing `daily_completions` rows remain the source of truth; no history is rewritten.

Automated tests will cover consecutive dates, the open-today grace period, completed today, a fully missed day, month boundaries, and timezone-derived local date changes.

## Reward Ladder

The visible badge contains only the streak number. It does not include `d`, a range, or a tier name.

| Active streak | Tier | Material direction |
|---:|---|---|
| 0 | Neutral | Existing subdued Donezo treatment |
| 1-14 | Silver | Liquid rhodium, pearl enamel, polished chrome number |
| 15-29 | Rose Gold | Champagne rose gold, blush copper depth, burgundy enamel |
| 30-44 | Gold | 24-karat Donezo gold, champagne highlights, amber depth |
| 45-59 | Diamond | Opalescent crystal with white, cyan, lavender, and faint pink fire |
| 60-74 | Emerald | Deep Colombian emerald, near-black forest depth, teal internal fire |
| 75-89 | Sapphire | Midnight Kashmir sapphire, cobalt core, indigo-violet refraction |
| 90-99 | Black Diamond | Faceted black crystal, gunmetal depth, restrained spectral edge |
| 100+ | Legend | Piano-black lacquer, molten Donezo gold, crown/check crest |

The app continues storing and calculating streaks beyond 100. Until a later reward system is designed, every value of 100 or more uses the Legend treatment and displays its real number.

## Badge Presentation

### Everyday task rows

- Mobile target size: approximately `54 x 30` logical pixels.
- Web/tablet target size: approximately `66 x 32` logical pixels.
- The number remains the visual focus.
- A small material crest may appear to the left of the number.
- Premium identity comes from layered rims, material depth, controlled highlights, subtle faceting, and a narrow specular shine--not a flat fill or oversized ornament.
- The badge must not reduce task-title readability or crowd the move/delete controls.
- The same tier mapping is used on Today and Daily screens.

### Motion and feedback

- Checking a daily routine produces one short, restrained badge shimmer.
- Crossing a tier boundary may use a slightly stronger single glint, but no continuous animation or distracting particle effect.
- Initial screen load does not replay reward animations.
- Reduced-motion accessibility settings disable decorative movement.

### Accessibility

- Visual text remains the number only.
- The accessibility label includes the full meaning, for example: `63 day streak, Emerald tier`.
- Text contrast must remain readable in every material treatment.
- Tier meaning never depends on color alone because the crest and accessibility label also identify it.

## Asset Strategy

Use a small shared `StreakBadge` component and one centralized tier resolver. The resolver owns thresholds, tier names, accessibility copy, and style/asset selection so Today and Daily cannot drift apart.

The approved jewelry appearance will be implemented with compact, optimized badge-backdrop assets and live text layered over them. This preserves the approved material depth consistently across Android and web without adding a large animation or graphics framework. Assets will be exported at sufficient resolution for high-density phones, compressed, and checked for APK-size impact.

The generated mockups are visual references only; they are not shipped directly as full-screen images.

## Professional Update System

### User experience

1. Donezo checks a small release manifest after startup without blocking checklist loading.
2. If the manifest's Android build number is greater than the installed native build number, Donezo shows a clear update notice.
3. The notice contains the new version, brief release notes, **Later**, and **Update Donezo**.
4. **Update Donezo** opens the permanent page `https://donezo.mv-builds.com/download` in the browser.
5. The page always describes and links to the newest signed Android APK.
6. The user downloads the APK and approves Android's installation prompt.
7. Android updates/replaces the existing Donezo installation because the package ID and signing certificate stay the same and the build number increases.
8. Supabase data and the signed-in account remain intact.

Android does not permit this sideloaded app to install an APK silently. User confirmation is required.

### One-time bridge limitation

Donezo 1.0.5 build 8 has no update-checking code and cannot be made to show a new popup remotely. The next release is the one-time **bridge version**. Existing testers must install that bridge version manually once. Every subsequent release can be announced inside the bridge version and later versions.

### Release manifest

The app reads `https://donezo.mv-builds.com/releases/android/latest.json`. Its contract is:

```json
{
  "platform": "android",
  "version": "1.0.6",
  "buildVersion": 9,
  "publishedAt": "2026-07-19T00:00:00Z",
  "downloadPageUrl": "https://donezo.mv-builds.com/download",
  "apkUrl": "https://downloads.mv-builds.com/Donezo-1.0.6-build-9.apk",
  "fileSizeBytes": 39384576,
  "sha256": "64 lowercase hexadecimal characters",
  "releaseNotes": [
    "Streaks remain visible during today's completion window.",
    "Premium streak reward tiers through 100 days."
  ]
}
```

The integer native build number is the authoritative comparison. Semantic version text is display-only. The app opens only `downloadPageUrl`; `apkUrl`, `fileSizeBytes`, and `sha256` are used by the human-facing download page.

### Check policy and failure handling

- Check after the app becomes usable and whenever it returns to the foreground at least six hours after the previous check attempt.
- Never block authentication, snapshot loading, navigation, or task interactions.
- Abort the request after five seconds and fail silently when offline or when the release service is unavailable.
- Cache the last valid manifest.
- Show an optional notice rather than forcing normal updates.
- A dismissed release is not shown repeatedly during the same session; Settings retains an update entry when a newer release is known.
- Malformed manifests, unsupported platforms, non-HTTPS URLs, and non-increasing build numbers are ignored.

## Download Hosting

- `donezo.mv-builds.com/download` is the permanent human-facing release page.
- The small release manifest and page are served through the existing Cloudflare-backed Donezo website.
- The APK is stored in Cloudflare R2 at `downloads.mv-builds.com` because the current APK is larger than Cloudflare Pages' 25 MiB single-file limit.
- Each release uses an immutable APK filename, such as `Donezo-1.0.6-build-9.apk`.
- The page points to the current immutable file; older APKs remain available for rollback but are not advertised.
- The published page includes version, build number, release date, release notes, file size, and SHA-256 checksum.
- Production APKs continue using the existing Android package ID and EAS signing key.

## Release Workflow

1. Implement and verify client changes locally.
2. Bump the visible app version and create an EAS preview APK with a higher remote Android build number.
3. Install and test the signed bridge APK on a physical Android device.
4. Compute and record the APK SHA-256 checksum.
5. Upload the immutable APK to Cloudflare R2.
6. Update and deploy the permanent download page.
7. Publish the release manifest last, only after the download has been independently verified.
8. Confirm the older bridge-capable app detects the new manifest and opens the correct page.

Publishing the manifest last prevents users from seeing an update that is not downloadable yet.

## Verification Requirements

- New streak-domain unit tests pass.
- Tier-boundary tests cover `0`, `1`, `14`, `15`, `29`, `30`, `44`, `45`, `59`, `60`, `74`, `75`, `89`, `90`, `99`, `100`, and values above 100.
- Update comparison, malformed response, offline failure, dismissal, and foreground-check behavior are unit tested.
- TypeScript is clean.
- The full existing test suite passes.
- Expo Doctor passes.
- Android production export succeeds.
- Web export succeeds and the download page renders correctly.
- Badge layouts are visually checked on narrow Android, wider Android, and desktop web widths.
- The signed APK is installed over 1.0.5 without uninstalling, and synced user data remains available.
- Update detection is tested from one older bridge-capable build to a newer published build.

## Explicitly Out of Scope

- Play Store submission or Play-managed automatic updates.
- Silent APK installation.
- Changes to authentication, Supabase tables/RLS, reminders, task CRUD behavior, navigation, or the Donezo brand.
- New streak rewards beyond the 100+ Legend presentation.
- Social leaderboards, coins, purchases, or competitive features.

## Rollback and Safety

- The implementation will be committed in reviewable phases: streak semantics, badge presentation, update client, and release hosting.
- No database migration is required for streaks or update notifications.
- The current 1.0.5 build and its commit remain the rollback point.
- The release manifest is not published until the replacement APK and website are verified.
- If the update service is unavailable, Donezo continues operating normally with no user-facing error.
