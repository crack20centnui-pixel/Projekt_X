# Rapport-Korrekturen – Stand 21.09.2026

## Automatische Prüfung

`node --test tests/rapport-regressions.cjs`

23 Tests prüfen Speichern, Metadaten, Unterschriften, Kontotrennung,
Konflikterkennung, Transaktionen, Abschlussstatus, Archivieren/Wiederöffnen,
Zeitstempel-Cursor und erste sowie folgende Monteur-Abfragen. Sie schreiben keine
Firebase-Daten. Zusätzlich: `node --check rapport-drive.js`.

## Isolierter Browser-Test

`node tests/preview-server.cjs` startet http://127.0.0.1:8766/admin und /monteur.
Die Firebase-Implementierung ist dort durch einen lokalen Testspeicher ersetzt.
Geprüft: Admin erstellt und weist zu; Monteur synchronisiert, bearbeitet und
schliesst ab; Admin archiviert; Rapport verschwindet aus der aktiven Monteurliste;
Admin öffnet wieder; derselbe Rapport kehrt mit seinen Arbeiten und ohne aktuelle
Abschlusshäkchen zurück. Der alte Abschluss bleibt als Version erhalten.
Keine echten Rapporte wurden dabei verändert.

Alle sieben PDF-Seiten wurden erzeugt, als A4 bestätigt und visuell geprüft.
Formularwerte werden im PDF als Bild gerendert. Die zusätzliche .rapport-Datei
enthält die wiederherstellbaren Daten. PDF-Seitenauswahl wird berücksichtigt.

## Cloud-Stand

Firestore-Regeln und Indizes sind in equans-rapport-test aktiviert.
Beide neuen zusammengesetzten Indizes wurden als READY bestätigt.
Die echte lokale App lädt die sechs bestehenden Rapporte als Admin erfolgreich.
Die Rollenregeln wurden kompiliert; ein vollständiger Rules-Emulatortest fehlt.

Die erste Monteur-Abfrage lädt nur zugewiesene aktive Rapporte. Weitere Abfragen
verwenden einen gespeicherten Server-Zeitstempel inklusive Grenzwert, um gleiche
Zeitstempel nicht zu überspringen. Datensätze am Grenzwert können erneut gelesen
werden. Admin-Gesamtübersichten lesen weiterhin den gesamten angeforderten Bestand.
Die tatsächlichen Tageskosten hängen von Nutzung und Datenmenge ab.

## Private Backups

Manueller Admin-Button sichert den geöffneten gespeicherten Rapport als PDF und
.rapport in einen privaten Drive-Ordner von latthiwan.danuwat@gmail.com.
Google-Freigabe ist erforderlich; OAuth-Tokens bleiben nur im Arbeitsspeicher.
Ordnerbesitz und Freigaben werden vor Upload geprüft. Es gibt keine automatische
Löschung und keine automatische Komplettsicherung aller Firebase-Daten.
Der erste echte Drive-Test brach mit einem Verbindungsfehler ab; erfolgreiche
Sicherung muss noch bestätigt werden. Teilweise Uploads werden angezeigt.

## Lokale Daten und Veröffentlichung

Der alte gemeinsame Browserspeicher bleibt erhalten. Eindeutig zugeordnete Daten
werden in den Benutzerspeicher übernommen. Unbekannte Altbestände kann der Admin
über „Alten lokalen Speicher sichern“ herunterladen.

GitHub Pages enthält noch die bisherige Version: GitHub-Schreibzugriff über die
Integration scheitert mit HTTP 403, lokal fehlt Git-Authentifizierung. Zur
Veröffentlichung gehören index.html, service-worker.js, rapport-workflow.js,
rapport-drive.js und vendor/. Firebase nutzt weiterhin kein neues Hosting.
Die neue App lokal über HTTP öffnen, beispielsweise http://localhost:8765/;
ein file://-Aufruf genügt nicht für Anmeldung und Service Worker.
