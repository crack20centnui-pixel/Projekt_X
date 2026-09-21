# Rapport-Korrekturen – Stand 21.09.2026

## Automatische Prüfung

`node --test tests/rapport-regressions.cjs`

30 Tests prüfen Speichern, Metadaten, Unterschriften, Kontotrennung,
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

GitHub-Schreibzugriff über die lokale GitHub-CLI funktioniert. Änderungen liegen
im Branch codex/rapport-setup. GitHub Pages enthält bis zur Übernahme nach main
weiterhin die bisherige Version. Firebase nutzt weiterhin kein neues Hosting.
Die neue App lokal über HTTP öffnen, beispielsweise http://localhost:8765/;
ein file://-Aufruf genügt nicht für Anmeldung und Service Worker.

## Weitere Verbesserungen

- Lokale Entwürfe pro angemeldetem Konto und Rapport; Sicherung nach 700 ms
  Eingabepause, beim Seitenverlassen und vor einem Rapportwechsel. Wiederherstellen
  setzt keine Cloud-Schreiboperation ab. Abweichende Serverrevisionen blockieren
  Wiederherstellung; Export bleibt möglich. Browser-Test: Eingabe, Neuladen,
  Wiederherstellen, Speichern, SYNC erfolgreich.
- Getrennte Anzeige für ungespeichert, nur lokal, synchronisiert, archiviert und
  übergeben. Drive-Zeitstempel nur nach zwei erfolgreichen privaten Uploads;
  nach neuem Speichern wird das Backup als älterer Stand bezeichnet.
- Admin-Bereiche laden bei Bedarf. Erneutes Öffnen verwendet die gelesenen Daten;
  „Ansicht aktualisieren“ liest sie erneut. Kein periodisches Cloud-Polling.
- Eigentümerwechsel und Übergabemeldung sind eine Transaktion. Beim nächsten SYNC
  sperrt der bisherige Besitzer seine lokale Kopie. Nicht synchronisierte Arbeit
  bleibt erhalten und exportierbar. Offline kann eine Übergabe erst nach dem
  nächsten SYNC erkannt werden. Rückzuweisung entfernt die Übergabemeldung.
- Drive-Verbindungsfehler zeigen den betroffenen API-Schritt. Innerhalb derselben
  Anmeldung wird das kurzlebige OAuth-Token höchstens 45 Minuten im Speicher
  wiederverwendet. Kein Token in localStorage. Echter Drive-Test in Chrome/Safari
  steht noch aus; alternativ PDF und .rapport manuell im privaten Drive ablegen.
- Abrechnung am 21.09.2026 per Cloud Billing API als deaktiviert bestätigt. Keine
  kostenpflichtigen Dienste für diese Änderungen eingerichtet.

Abschluss-Hinweis: Admins sehen bei fertigen/archivierten Rapporten einen gelben
Hinweis, wenn auf diesem Gerät kein aktueller Nachweis für beide Drive-Dateien
vorliegt. Andere Geräte und manuelle Backups werden ausdrücklich nicht beurteilt.
Die Prüfung liest ausschliesslich localStorage und verursacht keine Cloud-Abfrage.

## GitHub-Pages-V2-Test (21.09.2026)

V2 unter https://crack20centnui-pixel.github.io/Projekt_X/index_v2.html veröffentlicht
(Weiterleitung nach v2/index.html), Veröffentlichung PR #2 erfolgreich.
Die bisherige index.html, manifest.json und service-worker.js sind unverändert.
V2 besitzt eigenen Worker-Bereich und Cache. Firebase wird weiterhin gemeinsam genutzt.

Online mit Testkonto Peter geprüft: Anmeldung, erste Synchronisierung ohne Daten,
klar gekennzeichneter Testrapport „TEST V2 – Peter – 21.09.2026“, lokales Speichern,
Upload (1 Dokument), Neuladen, erneutes Öffnen mit vollständiger Arbeitsbeschreibung,
zweiter SYNC mit Download. Mit Mustermax ebenfalls Anmeldung, getrennte Rapportliste, Speichern,
Upload und Abschlussstatus geprüft. Ein ungespeicherter Entwurf wurde in einem
neu geöffneten Online-Fenster wiederhergestellt, gespeichert und synchronisiert.
Keine Browserfehler im geprüften Fenster. Zwei gekennzeichnete Testrapporte bleiben
für die anschliessende Admin-Prüfung erhalten. Admin-/Drive-Onlineprüfung stehen
noch aus.
