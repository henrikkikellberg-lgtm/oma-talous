-- Lisää splits-sarake transactions- ja rules-tauluihin.
-- Mahdollistaa yhden tapahtuman jakamisen useaan kategoriaan (esim. taloyhtiölasku:
-- hoitovastike + rahoitusvastike + vesi) ja sen tallentamisen toistuvana sääntönä,
-- jotta jako toistuu automaattisesti seuraavissa CSV-tuonneissa.
-- splits on JSON-taulukko: [{label, cat, type, amount|pct}]

ALTER TABLE transactions ADD COLUMN splits TEXT;
ALTER TABLE rules        ADD COLUMN splits TEXT;
