WRANGLER := $(shell command -v wrangler 2>/dev/null || echo ~/.npm-global/bin/wrangler)

.PHONY: push deploy-api deploy-app dev-api dev-app schema

# Nopea commit + push
# Käyttö: make push m="commit viesti"
push:
	@if [ -z "$(m)" ]; then \
		echo "Anna commit-viesti: make push m=\"viesti\""; \
		exit 1; \
	fi
	git add -A
	git commit -m "$(m)"
	git push origin main

# Aja D1 schema (--remote = tuotanto, --local = lokaalitesti)
schema:
	cd api && $(WRANGLER) d1 execute oma-talous-db --remote --file=schema.sql

# Deploy Workers API
deploy-api:
	cd api && $(WRANGLER) deploy

# Deploy frontend (Pages)
deploy-app:
	$(WRANGLER) pages deploy app/

# Paikallinen dev
dev-api:
	cd api && $(WRANGLER) dev

dev-app:
	$(WRANGLER) pages dev app/
