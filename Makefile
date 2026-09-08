WRANGLER := $(shell command -v wrangler 2>/dev/null || echo ~/.npm-global/bin/wrangler)

.PHONY: push deploy-api deploy-app deploy-app-force dev-api dev-app schema

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

# Frontend EI deployata käsin.
# Pages-projekti 'oma-talous' on kytketty GitHubiin (Git Provider: Yes) ja
# rakentaa itsensä jokaisesta main-pushista. 'make push' riittää.
#
# Suora 'wrangler pages deploy app/' git-kytkettyyn projektiin menee build-pipelinen
# ohi ja kysyy projektin nimeä (repossa ei ole Pages-configia) — silloin on helppo
# luoda vahingossa kokonaan uusi projekti uuteen URLiin.
deploy-app:
	@echo "Frontend deployautuu automaattisesti GitHub-pushista → https://oma-talous.pages.dev"
	@echo "Käytä: make push m=\"viesti\""
	@echo ""
	@echo "Jos GitHub-buildi on jumissa ja tarvitset hätädeployn: make deploy-app-force"

# Hätävara: ohittaa GitHub-buildin. Projektin nimi on pakko antaa, muuten wrangler
# tarjoaa uuden projektin luomista.
deploy-app-force:
	$(WRANGLER) pages deploy app/ --project-name=oma-talous --branch=main

# Paikallinen dev
dev-api:
	cd api && $(WRANGLER) dev

dev-app:
	$(WRANGLER) pages dev app/
