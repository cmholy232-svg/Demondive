# DemonDive Recovery Ledger — Library Materialization Failure

Date: 2026-07-15

## Impact

ChatGPT Library continues to list the Alpha 7.4A playable, full source and compact recovery checkpoint with their original filenames, sizes and identifiers. Every supported attempt to materialize their bytes returns `Library file content is not ready`.

The same failure occurs for:

- the Alpha 7.3C source archive;
- the compact 2.67 MB Alpha 7.4 checkpoint;
- newly uploaded sub-megabyte Alpha 7.5 archives;
- Alpha 7.5 archives replaced through the prepared upload path with successful version-1 records.

This proves the failure is not caused by ZIP size, ZIP integrity or the local upload route. It is a Library materialization-service failure in the active environment.

## Protected Alpha 7.4A records

| Artifact | Size | Library ID | SHA-256 |
|---|---:|---|---|
| `DemonDive_Alpha7_4A_PerformanceAudio_Playable.zip` | 169,902,511 bytes | `libfile_ce6219a228a88191aa178547bb9b29f9` | `1a7b08ebe16a2db7a0caef841fe1602b0652908f1c7ac1b12ca00340dde8b505` |
| `DemonDive_Alpha7_4A_PerformanceAudio_FullSource.zip` | 377,988,940 bytes | `libfile_4d5afaaabb6881919f1c2a660e58c2ae` | `fe7dca1034df75ca893635378766d1707b017628f6c0d5f5f7f6ea5c07b9c870` |
| `DemonDive_Alpha7_4_Checkpoint_06_FileBackedAudioGate.zip` | 2,674,798 bytes | `libfile_5e99fc1925208191a48b9fe66f94648b` | `97e9e0ef320eef736ac4744bc69397f1fdc987f7756099ba66c5e280947b7b74` |

Do not delete or replace these records. They are the only persistent identities for the exact verified 7.4A artifacts.

## Verified 7.4A delivery claim retained in readable form

`DELIVERY_ALPHA7_4A_PERFORMANCE_AUDIO.md` remains readable in Library and records a passing gate for Levels 1–9, ending/credits, nine-biome Deep Dive, exact supplied music, 19,786 generated rooms, save/retry, twenty boons, 51 universal WAV files, a 36,000-frame performance stress, production build, distribution smoke and loopback launch.

This delivery record is evidence of what was verified, but it is not a substitute for the missing source bytes.

## Safe continuation decision

- The older Level 3 source tree remains an asset-production scaffold only.
- No Level 3 source file may overwrite or be described as Alpha 7.4A.
- Alpha 7.5 work may continue only in independent source/runtime asset packages, manifests, audits and integration maps.
- Runtime integration waits for an exact Alpha 7.4A recovery or a deliberately approved reconstruction effort.
- All current assets remain non-final and not human-approved.

## Backup-path correction

Prepared replacements for Alpha 7.5 completed successfully and created Library version 1 records, but a subsequent fresh restore test still failed. Therefore a successful Library upload response cannot currently be treated as restore proof.

GitHub access was installed as an alternate versioned-source route, but the authenticated account exposes no repositories. No repository was created or published.

Until a durable external repository/destination exists, every checkpoint must retain:

1. a local source tree;
2. a local ZIP;
3. a SHA-256 sidecar;
4. an asset/content manifest;
5. a readable plaintext handoff and recovery ledger;
6. a verified ZIP integrity test;
7. an explicit statement that Library restore is unproven.

## Resolution criteria

The materialization error is considered resolved only when a fresh workspace can restore an uploaded archive, reproduce its recorded SHA-256 and pass `unzip -t`. Metadata visibility or upload success alone is insufficient.
