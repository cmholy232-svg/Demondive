# DemonDive Alpha 7.3C Recovery Baseline

This source tree was reconstructed from the last user-confirmed playable archive,
`DemonDive_Alpha7_3C_FullCampaign_Playable.zip`.

## Evidence

- Attached archive SHA-256: `bce8d4c00fe3b85e3ba17fddc2b75c9a96f75712347831b0f088d7f11169d504`
- The archive passed `unzip -t` with 160 entries.
- Its production source map contained all 20 runtime TypeScript modules with complete `sourcesContent`.
- Rebuilding this tree produces byte-for-byte identical JavaScript, CSS, source-map, and generated HTML hashes.
- The erased type-only catalog was restored from the previous checkpoint and extended only for the recovered Levels 4–9 runtime definitions. It compiles under strict TypeScript.

Run `npm run verify` before using this commit as a base.

## Restart decision

This commit is the protected Alpha 7.3C gameplay baseline. Alpha 7.5 asset-production
work may be layered onto a branch from this point. Alpha 7.4 gameplay/refinement work
must be redone after that integration and must not be recovered from an unverified package.

## Remote status

At recovery time the connected GitHub account exposed zero repositories and this local
project had no configured remote. No claim should be made that this baseline is on GitHub
until the intended `owner/repository` is verified and a push succeeds.
