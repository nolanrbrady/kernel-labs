.PHONY: lint test quality-gate

lint:
	npm run lint

test:
	npm run test

quality-gate:
	./scripts/quality_gate.sh
