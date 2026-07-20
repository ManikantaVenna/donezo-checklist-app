# Donezo project rules

## Release rule

When the user approves app changes with language like "this is good", "final", "ship it", or "make it public", treat that as a request to prepare a new Donezo Android release unless the user explicitly says local-only, no build, or no publish.

For a release, do all of these before calling it done:

1. Build a new signed Android APK.
2. Upload the APK to the Donezo downloads site/storage.
3. Update the Android release manifest at `https://donezo.mv-builds.com/releases/android/latest.json` with the new version/build number, APK URL, SHA-256, file size, publish time, and release notes.
4. Verify the Donezo download page points to the new APK.
5. Verify the in-app update prompt will appear for older Android builds that already include the update checker.

Do not claim friends/users will see the update prompt until the APK is uploaded and `latest.json` is updated live.
