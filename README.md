# MemoryBook AI

MemoryBook AI is a privacy-aware prototype for turning a narrated memory into a fact-grounded autobiography paragraph. It is intentionally offline and deterministic: every sentence in the draft is linked to evidence extracted from the user's transcript.

## What the prototype demonstrates

- Fact extraction for people, dates, locations and events from a simple structured transcript.
- A memory record that retains source snippets and an evidence identifier for every fact.
- An adaptive follow-up question when a key part of a memory is missing.
- A conservative draft generator that only uses facts in the record; it abstains when the evidence is insufficient.
- A fixed-question baseline for the final evaluation comparison.

## Run

Requires Python 3.11 or later. No packages or API keys are required.

```powershell
python -m memorybook.demo
python -m memorybook.evaluate
```

## Privacy boundary

The included evaluation cases are synthetic. Do not commit recordings, names, contact information or identifiable life stories without documented consent. The project stores source excerpts separately from the generated draft so a user can check and correct each claimed fact.

## Repository layout

```text
memorybook/        Core prototype and CLI commands
evals/cases.json   Ten synthetic, anonymised evaluation cases
docs/              Architecture and evaluation notes
tests/             Automated tests
```

`docs/architecture.svg` is a portable architecture diagram for the report and submission package.

## Current limitations

This is a transparent MVP, not a production speech or LLM system. The rule-based extractor expects a structured transcript pattern, and the evaluation measures reproducibility on synthetic cases rather than real-world clinical or biographical accuracy.
