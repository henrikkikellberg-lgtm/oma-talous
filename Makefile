.PHONY: push deploy-api deploy-app dev-api dev-app

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

# Deploy Workers API
deploy-api:
	cd api && wrangler deploy

# Deploy frontend (Pages)
deploy-app:
	wrangler pages deploy app/

# Paikallinen dev
dev-api:
	cd api && wrangler dev

dev-app:
	wrangler pages dev app/
