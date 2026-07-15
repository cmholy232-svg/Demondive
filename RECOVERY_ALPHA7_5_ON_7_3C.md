# Alpha 7.5 Asset Overlay on Verified Alpha 7.3C

This branch layers the tracked Alpha 7.5 asset-production work from checkpoint
`5210b49` onto the protected Alpha 7.3C recovery commit `89dfba6`.

The overlay is deliberately additive. It includes Alpha 7.5 production records,
source assets, runtime-ready assets, audit documents, and their verification scripts.
It does not import the older Level 3 runtime, source files, HTML, or configuration from
the isolated asset-production repository.

`npm run verify` must pass both gates:

1. Alpha 7.3C runtime-foundation parity plus the ten sanctioned late-boon portrait mappings.
2. Every Alpha 7.5 asset-production and audit gate.

Alpha 7.4 gameplay/refinement changes are not included and should be rebuilt from this
branch only after the combined checkpoint is committed and backed up.
