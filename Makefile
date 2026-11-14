PYTHON ?= python3
DAYS ?= 730
BQ_DAYS ?= 365
INTENTS_DAYS ?= 90

.PHONY: data test docs docs-check dry-run rebuild bq-import dev all

## Keyless: rebuild data/public.json from NearBlocks + DefiLlama (no credentials)
data:
	$(PYTHON) scripts/fetch_public.py --days $(DAYS)

## Unit tests for the analysis math and scenario model
test:
	$(PYTHON) -m unittest discover -s scripts -p "test_*.py" -v

## Regenerate the numbers in THESIS.md and README.md from data/public.json
docs:
	$(PYTHON) scripts/render_docs.py

## Fail if THESIS.md / README.md numbers are stale (used in CI)
docs-check:
	$(PYTHON) scripts/render_docs.py --check

## BigQuery: estimate bytes scanned without running anything
dry-run:
	$(PYTHON) scripts/rebuild.py --dry-run --days $(BQ_DAYS)

## BigQuery + Intents Explorer: rebuild data/dashboard.json (needs .env, see .env.example)
rebuild:
	$(PYTHON) scripts/rebuild.py --days $(BQ_DAYS) --intents-days $(INTENTS_DAYS)

## Keyless alternative: import a BigQuery console export of sql/daily_usage.sql
## (data/bigquery/daily_usage.raw.json) and cross-check it against NearBlocks
bq-import:
	$(PYTHON) scripts/import_bigquery.py

## Run the dashboard locally
dev:
	pnpm install && pnpm dev

all: data test docs
