# Slice specs

Every non-typo feature or fix gets a short stub in this folder before code. A typo-sized fix can live in the PR body instead, using the same headings.

Copy [_TEMPLATE.md](_TEMPLATE.md). Name the file after the slice, not the ticket number alone: `lp-on-the-card.md`, `shared-places.md`.

Canonical product and tech truth stays in [product-spec.md](../product-spec.md) and [tech-spec.md](../tech-spec.md). Taste and ready-judgment stay in [taste.md](../taste.md). A slice stub is the job card for one change. It is not a second product essay.

## Default path

Clarify → write the stub → smallest change → prove-it (visual + backend) → compound into [solutions/](../solutions/) or [taste.md](../taste.md).

Do not start implementation until **Acceptance** and **Anti-acceptance** are filled. Empty checkboxes are not a spec.

## Required sections

| Section | Job |
| --- | --- |
| Goal | What must be true for the porch when this ships. |
| Non-goals | What this slice will not do. |
| Acceptance | Observable outcomes that **must be true**. |
| Anti-acceptance | Outcomes that **must not be true** (regressions, scope creep, wrong surface). |
| Contracts / invariants | Product-bar ids and save-format rules this slice must hold. |
| Prove-it plan | Gallery scenarios, viewports, and `npm run check` / visual tests. |
| Kill criteria | When to stop and ask Matt. |
| Questions for Matt | Open product calls. Leave blank if none. |

Acceptance and Anti-acceptance are the required pair. Goal without Anti-acceptance is how slices sprawl.

## Size

Keep the stub short. If it is longer than the change, you are writing a redesign. Tiny fixes: paste the same headings into the PR body and skip a file.

App and product PRs stay draft until Matt says undraft or merge. Docs-only OS with no game behavior may merge.
