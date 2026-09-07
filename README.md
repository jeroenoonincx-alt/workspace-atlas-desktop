# Workspace Atlas for Desktop Start

Tauri 2 Windows-app voor **Workspace Atlas for Desktop Start**.

## Actieve testkandidaat

**0.8.5 TEST**

0.8.5 bouwt voort op de grafische herinrichting van 0.8.4 en richt zich op **eenvoudige uitleg en betrouwbare back-ups**:

- Help is herschreven in gewone Nederlandse taal; technische termen zoals protocolhandler en WebView zijn uit de gebruikersuitleg verwijderd.
- Tegelinstellingen leggen rechtstreeks openen van apps uit zonder technische voorkennis te veronderstellen.
- Handmatige back-up en herstel blijven beschikbaar.
- Automatische back-up kan worden ingesteld op wekelijks of maandelijks, met een vaste dag, tijd en opslagmap.
- Als Atlas op het geplande moment gesloten is, wordt de gemiste back-up bij de eerstvolgende start ingehaald.
- Alleen de laatste vijf automatische back-ups worden bewaard.
- De bestaande 0.8.4-interface, Werk/Privé-scheiding, tegels, URL-inbox, activiteiten, taken en notities blijven behouden.
- De Windows-build wordt automatisch gecontroleerd in de echte Tauri WebView.

De tijdelijke PowerShell/VBS/localhost-helper maakt geen deel uit van deze Tauri-build.
