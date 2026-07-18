# DemonDive Alpha 7.8B — Downloadable Package Gate

## Corrected handoff failure

The playable README referenced `START_DEMONDIVE.cmd`, `START_DEMONDIVE.ps1`, and `serve.mjs`, but the recovered repository did not contain them. A tester following the documented path could not launch the game.

## Current package contract

- `npm run package:playable` runs the complete verification suite.
- The production build is copied into an install-free folder.
- Windows CMD, PowerShell, and cross-platform Node launch paths are included.
- Every packaged file is recorded with byte length and SHA-256.
- The ZIP is extracted into a new temporary directory and every hash is rechecked.
- The extracted server must return the correct HTML and hashed JavaScript bundle.
- The verified ZIP and checksum are published as a tagged GitHub release from the recovery branch; `main` is not modified.

## Tester requirement

The extracted package requires Node.js 18 or newer. It does not require `npm install`, a development server, Git, or a source checkout.

## Honest limits

The automated restore gate proves archive integrity and loopback serving. Windows SmartScreen behavior, browser choice, antivirus behavior, controller detection, and subjective play still require testing on a real Windows machine.
