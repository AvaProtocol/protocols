---
"@avaprotocol/protocols": patch
---

Correct Ethereum BGB to the replacement contract published by Bitget in July 2024, with issuer provenance. The superseded address returns empty data for the standard allowance getter and can block approval discovery built from the token catalog. Unknown allowance responses remain subject to each consumer's validation; this correction does not treat empty results as zero.

Add a read-only standard allowance-interface check to catalog CI and the publish workflow on every catalog chain, preventing empty, malformed or failed reads from passing a release gate.
