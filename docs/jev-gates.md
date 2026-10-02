# Jev-class gates

Operator page for Coding OS dispatch and prove-it completeness. Thresholds live in this file. Product and scoring rules stay in [product-spec.md](product-spec.md) and [tech-spec.md](tech-spec.md). This page does not invent them.

## Model

Prefer Vercel AI Gateway model `typesafe-ai/jev`. Back Porch already ships on Vercel.

Pin the model version on the call (use the Gateway-returned model id, not an unversioned alias alone). Log `provider` plus the scores on the PR.

If the Gateway key or credits are missing, fill the same JSON with structured judgment. Set `provider` to `fallback-structured`. Do not pretend Jev ran, and do not raise confidence to clear an auto-dispatch bar.

## Gate B — Choice + Score (every feature kickoff)

After clarify, before implementation.

**Choice** (exactly one):

| Value | Means |
| --- | --- |
| `clear_cut_bug` | Broken invariant, obvious fix, no taste call. |
| `taste_ui` | Look, copy, or layout judgment. |
| `scoring_rules` | Points, places, Life Preserver, or house law. |
| `docs_os` | Agent memory, specs, or process. No game behavior. |
| `needs_matt` | Kill, merge, product bar, or anything that invents a rule. |

**Score:** gnarliness `1`–`5`.

Auto-dispatch only when Choice is `clear_cut_bug` or `docs_os`, **and** `choice_confidence` ≥ **0.90**, **and** gnarliness ≤ **2**.

- `taste_ui` or `scoring_rules` → short Matt summary. Do not auto-dispatch.
- `needs_matt` → Matt.
- Gnarliness ≥ **4** → adversarial review (second pass or second model) before implementation, even if Choice looks clear-cut.

```json
{
  "gate": "B",
  "provider": "vercel-ai-gateway",
  "model": "typesafe-ai/jev",
  "model_version": "<pin the Gateway-returned id>",
  "choice": "clear_cut_bug",
  "choice_confidence": 0.94,
  "gnarliness": 2,
  "auto_dispatch": true,
  "notes": ""
}
```

## Gate C — Noul (before ready language)

Before any ready, handoff, or “prove-it complete” claim.

Noul scores two fields on a structured checklist JSON plus the test paste (`npm run check` output, gallery scenarios opened, visual result when snapshots apply):

- `visual_evidence_complete` ≥ **0.95**
- `backend_evidence_complete` ≥ **0.95**

Computer use is still required for UI. Noul does not replace opening the gallery. Gate C does **not** undraft. App and product PRs stay draft until Matt says undraft or merge.

```json
{
  "gate": "C",
  "provider": "vercel-ai-gateway",
  "model": "typesafe-ai/jev",
  "model_version": "<pin the Gateway-returned id>",
  "visual_evidence_complete": 0.97,
  "backend_evidence_complete": 0.99,
  "checklist": {
    "npm_run_check": true,
    "gallery_scenarios_opened": [],
    "computer_use_for_ui": true,
    "test_paste_attached": true
  }
}
```

Docs-only OS may set `visual_evidence_complete` from “no UI change” plus a docs-only diff. Backend still needs the check paste. Noul alone is not backend proof.

## Hard skips

Jev-class gates do not:

- Undraft or merge an app or product PR
- Make taste or kill calls
- Invent scoring rules or product-bar law
- Treat Noul alone as backend proof

## Policy

| Gate | Bar |
| --- | --- |
| B auto-dispatch | `clear_cut_bug` or `docs_os`, confidence ≥ 0.90, gnarliness ≤ 2 |
| B adversarial review | gnarliness ≥ 4 |
| C ready language | both Noul scores ≥ 0.95, test paste attached, computer use for UI |

Pin the model version. Log provider and scores on the PR. Change these numbers here, not in chat.
