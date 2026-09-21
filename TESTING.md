# Rapport-Korrekturen

## Prüfung

`node --test tests/rapport-regressions.cjs`

17 Regressionstests prüfen Speichern, Metadaten, Unterschriften, Kontotrennung,
Konflikterkennung, Transaktionsaufrufe mit künstlichen Cloud-Antworten,
Abschlussstatus, Schutz beim Admin-Öffnen und Selbstübergabe sowie JavaScript-Syntax.
Die Tests schreiben keine Firebase-Daten. Die Anmeldung wurde im lokalen Browser
bei 390 Pixel Breite visuell geprüft, ohne gemeldete Browserfehler.
`firestore.rules` basiert auf den aktiven Regeln und wurde über die Firebase
Rules-Test-API erfolgreich auf Kompilierungsfehler geprüft; noch nicht aktiviert.

## Vor Veröffentlichung

- Mit einem ausdrücklich als Test markierten Rapport in einer Testumgebung:
  speichern, synchronisieren, erneut bearbeiten, synchronisieren und auf einem
  zweiten Gerät öffnen. Unterschriften und Status müssen erhalten bleiben.
- Zwei Geräte mit derselben Revision bearbeiten lassen: eine Änderung darf die
  andere nicht überschreiben. Die Tests simulieren diese Cloud-Antworten; ein
  vollständiger Live-Test und eine Prüfung aller Rollen stehen noch aus.
- Einen Rapport an einen anderen Monteur übergeben und dessen Zugriff prüfen.
- PDF-Ausgabe mit allen ausgewählten Seiten kontrollieren; die Druck-CSS wurde
  nicht geändert, aber noch kein vollständiger Drucktest durchgeführt.
- Registrierung muss nur ein inaktives Monteurprofil erzeugen können; ein aktives
  Adminprofil muss abgewiesen werden. Die Regeln sind kompiliert, noch nicht mit
  echten Registrierungen oder einem Rules-Emulator getestet.

## Bestehende lokale Daten

Der bisherige gemeinsame Browser-Speicher wird nicht gelöscht. Beim ersten Login
werden eindeutig zugeordnete Rapporte in den jeweiligen Benutzerspeicher übernommen.
Andere Altbestände kann ein Admin unter „Backup / Dateien → Alten lokalen Speicher
sichern“ als kompatible Backup-Datei herunterladen. Es findet keine automatische
Zuweisung von Rapporten mit unbekanntem Eigentümer statt.

## Veröffentlichung

GitHub Pages verwendet weiterhin den bestehenden Veröffentlichungsablauf.
Die Sicherheitskorrektur erfordert separat:

`firebase deploy --only firestore:rules --project equans-rapport-test`

Die Konfiguration enthält keine Hosting-Änderung. Alle anderen bestehenden
Firestore-Regeln wurden übernommen; dies ist kein vollständiges Sicherheitsaudit.
