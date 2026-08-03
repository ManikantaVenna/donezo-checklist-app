# AGENTS.md - Donezo Project Router

This repo uses project continuity: files are the brain, Git/GitHub is the memory,
and chat is disposable. Future Codex chats should continue from the files in this
repo instead of relying on old chat history.

## Load order

Read these first, in order:

1. `CURRENT.md` - hot state, latest commit, verification, and next exact task.
2. `DIRECTION.md` - durable product decisions, rules, and "do not re-litigate" context.
3. `INDEX.md` - map of important files, folders, commands, and live services.
4. Relevant `docs/superpowers/specs/` or `docs/superpowers/plans/` files only when needed.

## Operating principles

- Keep work scoped to the user's request.
- Talk simply and clearly.
- Continue the existing Donezo app; do not restart or replace it.
- Do not use the mobile-design workflow unless the user explicitly asks.
- Do not ask the user to paste secret keys, passwords, or API keys into chat.
- Verify against real files/tests before claiming success.
- Update project memory when current state, decisions, release details, or next steps change.
- Commit meaningful checkpoints with clear, scoped messages.
- Do not overwrite unrelated user changes.

## Memory rules

- Standing rule or durable decision -> `DIRECTION.md`.
- Current state, latest evidence, and next task -> `CURRENT.md`.
- File/service map -> `INDEX.md`.
- Design spec -> `docs/superpowers/specs/`.
- Implementation plan -> `docs/superpowers/plans/`.

## GitHub attribution rule

The public GitHub repo should present Donezo as built by Manikanta only. Do not add
`Co-Authored-By` trailers for AI tools or assistant accounts. Use Manikanta's git
author/committer identity for commits in this repo.

## Release rule

When the user approves app changes with language like "this is good", "final", "ship it", or "make it public", treat that as a request to prepare a new Donezo Android release unless the user explicitly says local-only, no build, or no publish.

For a release, do all of these before calling it done:

1. Build a new signed Android APK.
2. Upload the APK to the Donezo downloads site/storage.
3. Update the Android release manifest at `https://donezo.mv-builds.com/releases/android/latest.json` with the new version/build number, APK URL, SHA-256, file size, publish time, and release notes.
4. Verify the Donezo download page points to the new APK.
5. Verify the in-app update prompt will appear for older Android builds that already include the update checker.

Do not claim friends/users will see the update prompt until the APK is uploaded and `latest.json` is updated live.

## Fresh-chat handoff rule

When the user asks for a fresh chat, new chat, handoff, or opener:

1. Update `CURRENT.md`.
2. Commit the state update if anything changed.
3. Return a short opener that tells the next chat to read `AGENTS.md`,
   `CURRENT.md`, and `DIRECTION.md`, names the current branch/commit, gives the
   current state, gives the next exact task, and lists important don'ts.
