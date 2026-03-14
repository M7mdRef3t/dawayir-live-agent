# PR Summary Changelog (2026)

## Product
1. Added runtime product-design brief enforcement to system instruction.
2. Introduced `Truth Contract` execution loop as a first-class outcome artifact.
3. Surfaced latest Truth Contract in live UI with completion action.
4. Added dedicated endpoint for latest Truth Contract retrieval.

## Research
1. Created full user research playbook:
   - interview script
   - journey map
   - JTBD
   - assumptions and validation plan
2. Delivered survey assets:
   - Google Forms CSV
   - bilingual CSV
   - Typeform-ready JSON
   - import guides
3. Added survey analysis automation script + quickstart.

## Brand
1. Delivered Arabic executive investor one-pager.
2. Delivered complete Arabic brand identity system:
   - strategy
   - visual identity directions
   - 20-page brand book structure
3. Added competitive intelligence package:
   - full matrix (EN/AR)
   - 2x2 plot points (EN/AR)
   - slide narratives (EN/AR)

## Engineering
1. Added server tool `create_truth_contract`.
2. Implemented server-side persistence and report embedding for Truth Contracts.
3. Added dedupe logic for repeated contract action within 24h.
4. Hardened user identity handling:
   - token-bound user key derivation
   - WS auth gate (`4401` unauthorized)
   - aligned REST user resolution with token identity
5. Added WS broadcast for `truthContractUpdate` to active user sockets.
6. Fixed client WS token mismatch (`VITE_DAWAYIR_API_TOKEN` support).
7. Added generated Tailwind config pipeline from design tokens.
8. Added and upgraded UI component primitives (10+ production-ready components).
9. Added UI showcase page and in-app shortcuts.

## QA
1. Added E2E truth-contract flow script:
   - create
   - WS update
   - complete
   - verify latest=completed
2. Added unit tests for core UI components (ARIA + state behavior).
3. Added snapshot tests for UI showcase.
4. Updated CI workflow to include:
   - `tokens:tailwind`
   - `test:unit`
   - `build`

## Key Output Index
1. [DELIVERY_INDEX_2026.md](c:\Users\moham\Downloads\dawayir-live-agent\DELIVERY_INDEX_2026.md)
2. [PRODUCT_DESIGN_BRIEF.md](c:\Users\moham\Downloads\dawayir-live-agent\PRODUCT_DESIGN_BRIEF.md)
3. [BRAND_IDENTITY_SYSTEM_AR.md](c:\Users\moham\Downloads\dawayir-live-agent\BRAND_IDENTITY_SYSTEM_AR.md)
4. [USER_RESEARCH_PLAYBOOK.md](c:\Users\moham\Downloads\dawayir-live-agent\USER_RESEARCH_PLAYBOOK.md)
5. [EXECUTIVE_MEMO_INVESTOR_ONE_PAGE_AR.md](c:\Users\moham\Downloads\dawayir-live-agent\EXECUTIVE_MEMO_INVESTOR_ONE_PAGE_AR.md)

## Operational Notes
1. Ensure server and client tokens are aligned:
   - `DWR_API_TOKEN`
   - `VITE_DAWAYIR_API_TOKEN`
2. Restart dev servers after env changes.
