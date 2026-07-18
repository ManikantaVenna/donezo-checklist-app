# Donezo download Worker

This Worker streams the current Android APK from Expo through
`https://download.mv-builds.com` with an Android MIME type, a short filename,
and support for resumable byte-range downloads.

The Expo artifact used by this version expires on August 1, 2026. Update
`APK_URL` and `APK_FILENAME` in `src/index.ts` after producing a replacement
build, then redeploy the Worker.

## Validate and deploy

```powershell
npx wrangler@latest types --config wrangler.jsonc
npx tsc --project tsconfig.json
npx wrangler@latest deploy --dry-run --config wrangler.jsonc
npx wrangler@latest deploy --config wrangler.jsonc
```
