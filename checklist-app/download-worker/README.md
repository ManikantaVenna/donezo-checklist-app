# Donezo download Worker

This Worker serves the verified Android APK from Cloudflare-hosted static
assets through `https://download.mv-builds.com`. The APK is split into three
deployment assets because Cloudflare limits each individual static asset to
25 MiB. Users still receive one normal `Donezo-1.0.3.apk` file.

The Worker implements single byte-range responses so Android Chrome can pause,
resume, and download parallel sections without contacting Expo.

## Prepare assets

Generate the ignored deployment assets from the verified build:

```powershell
.\prepare-assets.ps1 -SourceApk "C:\path\to\Donezo-1.0.3.apk"
```

The script refuses to continue unless both the APK size and SHA-256 checksum
match the verified production build.

## Validate on staging

```powershell
npx wrangler@latest types --config wrangler.staging.jsonc
npx tsc --project tsconfig.json
npx wrangler@latest deploy --dry-run --config wrangler.staging.jsonc
npx wrangler@latest deploy --config wrangler.staging.jsonc
```

## Deploy production

```powershell
npx wrangler@latest types --config wrangler.jsonc
npx tsc --project tsconfig.json
npx wrangler@latest deploy --dry-run --config wrangler.jsonc
npx wrangler@latest deploy --config wrangler.jsonc
```
