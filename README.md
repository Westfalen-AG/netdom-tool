# Westfalen AG - Network Documentation Tool

Ein umfassendes Tool zur Dokumentation und Verwaltung der Netzwerk-Infrastruktur an OnSite-Anlagen der Westfalen AG.

**Version:** 1.3.0  
**Letztes Update:** Januar 2025  
**Support:** Niklas Terhorst (n.terhorst@westfalen.com oder Teams)

## 🚀 Funktionen

### Kernfeatures
- **Standortverwaltung**: Verwaltung aller OnSite-Anlagen mit Details zu Standorten, Adressen und Ansprechpartnern
- **Geräte-Management**: Erfassung aller Netzwerkgeräte mit IP-Konfiguration, Ports, technischen Details und Standort-Informationen
- **Verbindungsdokumentation**: Vollständige Dokumentation aller Kabelverbindungen (RJ45, SFP/SFP+, Coax, etc.)
- **Switch-Stack-Verwaltung**: Konfiguration und Verwaltung von Switch-Stacks mit Stack-Mitgliedern
- **Rack-Visualisierung**: Interaktive Darstellung der Geräte-Platzierung in Serverschränken
- **Export-Funktionen**: Professionelle PDF und PNG Exports mit vollständiger Standort-Dokumentation
- **Interaktive Netzwerkdiagramme**: Visuelle Darstellung der Netzwerkinfrastruktur mit Drag & Drop
- **Changelog**: Vollständige Versionshistorie mit detaillierten Änderungen
- **Dark/Light Mode**: Benutzerfreundliche Themes für verschiedene Arbeitsumgebungen

### Neue Features in Version 1.3.0
- **Kabelfarben-Visualisierung**: Port-Darstellung in Rack-Diagrammen basierend auf tatsächlichen Kabelfarben
- **Intelligente Kontrastoptimierung**: Automatische Anpassung der Textfarbe für optimale Lesbarkeit
- **Verbesserte Navigation**: Klickbares Logo (führt zur Standort-Übersicht) und klickbare Versionsanzeige (führt zum Changelog)
- **Westfalen AG Branding**: Professionelles Export-Design mit Unternehmensfarben und Logo
- **Erweiterte Verbindungsdetails**: Vollständige Anzeige aller Kabelinformationen (Farbe, Kategorie, Länge, Labels)
- **Optimierte Rack-Informationen**: Verbesserte Darstellung von Raum- und Rack-Positionen in Übersichten
- **Universelle Lesbarkeit**: Einheitliche Darstellung in Light-Mode, Dark-Mode und Export-Modus

### Unterstützte Gerätetypen
- **Switches und Netzwerk-Hardware**: Managed Switches, Stackable Switches
- **SD-WAN Server und Uplink Router**: Zentrale Routing-Infrastruktur
- **Fritzbox Fibre, Starlink Gen 3 Router**: Internet-Uplink-Geräte
- **IP-Kameras**: Geländeüberwachung und Sicherheitssysteme
- **Unifi AI-Ports**: Kennzeichenerkennung und Zutrittskontrolle
- **UNVR, NEDAP Zugangskontrollgeräte**: Sicherheits- und Zugangssysteme
- **IOLAN, Phoenix Webpanel**: Industrielle Steuerungsgeräte
- **Telefone, Drucker und weitere Endgeräte**: Office-Infrastruktur

### Kabeltypen und Verbindungen
- **RJ45**: Cat5e, Cat6, Cat6a Ethernet-Verbindungen
- **SFP/SFP+**: Glasfaser-Verbindungen für Hochgeschwindigkeits-Uplinks
- **Coax**: Koaxial-Verbindungen für spezielle Anwendungen
- **Sonstiges**: Weitere individuelle Verbindungstypen

## 🛠️ Installation und Setup

### Voraussetzungen
- Node.js (Version 16 oder höher)
- npm Package Manager
- Windows 10/11 oder kompatibles Betriebssystem

### 1. Dependencies installieren

```bash
# Alle Dependencies in einem Schritt installieren
npm run install:all

# Oder manuell:
npm install
npm install express sqlite3 cors uuid
npm install -D @types/uuid nodemon concurrently
```

### 2. Entwicklungsumgebung starten

```bash
# Backend und Frontend gleichzeitig starten
npm run dev
```

Alternativ können Sie Backend und Frontend separat starten:

```bash
# Backend-Server (Port 3001)
npm run server

# Frontend-Entwicklungsserver (Port 3000)
npm start
```

Die Anwendung öffnet sich automatisch im Browser unter `http://localhost:3000`.

### 3. Produktionsumgebung

```bash
# Frontend für Produktion bauen
npm run build

# Backend-Server für Produktion starten
npm run server
```

## 📁 Projektstruktur

```
westfalen-network-tool/
├── server/                     # Backend (Express + SQLite)
│   ├── database.js            # Datenbankschicht und Migrationen
│   ├── index.js               # Express Server + API Routen
│   └── westfalen_network.db   # SQLite Datenbank (automatisch erstellt)
├── src/                       # Frontend (React + TypeScript)
│   ├── components/            # React Komponenten
│   │   ├── StandortUebersicht.tsx      # Standort-Übersicht
│   │   ├── StandortDetails.tsx         # Detailansicht einzelner Standorte
│   │   ├── GeraeteVerwaltung.tsx       # Geräte-Management
│   │   ├── VerbindungsVerwaltung.tsx   # Verbindungs-Dokumentation
│   │   ├── SwitchStackVerwaltung.tsx   # Switch-Stack-Konfiguration
│   │   ├── NetzwerkDiagramm.tsx        # Interaktive Netzwerkdiagramme
│   │   ├── ExportBereich.tsx           # Export-Funktionalität
│   │   ├── AnsprechpartnerVerwaltung.tsx # Kontakt-Management
│   │   └── Changelog.tsx               # Versionshistorie
│   ├── types/                 # TypeScript Interface Definitionen
│   │   └── index.ts
│   ├── App.tsx               # Haupt-Anwendungskomponente
│   └── index.tsx             # React Entry Point
├── public/                   # Statische Assets
│   ├── logo_schrift_schwarz.png # Westfalen AG Logo (dunkel)
│   ├── logo_schrift_weiss.png   # Westfalen AG Logo (hell)
│   └── index.html
├── package.json             # NPM Dependencies und Scripts
└── README.md               # Diese Datei
```

## 🎯 Benutzung

### 1. Ersten Standort erstellen
1. Navigieren Sie zur "Standort-Übersicht"
2. Klicken Sie auf "Neuer Standort"
3. Geben Sie Name (z.B. DELIN1), Adresse und Ansprechpartner ein
4. Fügen Sie verfügbare Uplinks hinzu

### 2. Geräte hinzufügen
1. Wählen Sie einen Standort aus
2. Navigieren Sie zu "Geräte-Verwaltung"
3. Erstellen Sie neue Geräte mit:
   - Name und Gerätetyp
   - IP-Konfiguration (DHCP/statisch)
   - Anzahl Netzwerkports
   - Rack-Position (optional)
   - Standort-Details (Raum, Container, etc.)

### 3. Switch-Stacks konfigurieren
1. Navigieren Sie zu "Switch-Stack-Verwaltung"
2. Erstellen Sie neue Switch-Stacks
3. Fügen Sie Stack-Mitglieder hinzu
4. Konfigurieren Sie Stack-spezifische Einstellungen

### 4. Verbindungen dokumentieren
1. Wählen Sie "Verbindungs-Verwaltung"
2. Erstellen Sie Verbindungen zwischen Geräten
3. Definieren Sie Kabeltyp, Länge und weitere Eigenschaften
4. Ports werden automatisch als belegt markiert

### 5. Netzwerkdiagramm erstellen
1. Navigieren Sie zu "Netzwerkdiagramm"
2. Wählen Sie einen Standort aus
3. Arrangieren Sie Geräte per Drag & Drop
4. Speichern Sie Positionen für zukünftige Ansichten

### 6. Export-Funktionen nutzen
1. Navigieren Sie zu "Export"
2. Wählen Sie einen Standort aus
3. Konfigurieren Sie Export-Optionen:
   - Standort-Details
   - Geräte-Übersicht
   - Verbindungs-Details
   - Rack-Visualisierung
4. Exportieren Sie als PNG oder PDF

## 🔧 API Endpunkte

### Standorte
- `GET /api/standorte` - Alle Standorte abrufen
- `GET /api/standorte/:id` - Einzelnen Standort abrufen
- `POST /api/standorte` - Neuen Standort erstellen
- `PUT /api/standorte/:id` - Standort aktualisieren
- `DELETE /api/standorte/:id` - Standort löschen

### Geräte
- `GET /api/standorte/:standortId/geraete` - Geräte eines Standorts
- `POST /api/standorte/:standortId/geraete` - Neues Gerät erstellen
- `PUT /api/geraete/:id` - Gerät aktualisieren
- `PUT /api/geraete/:id/position` - Geräteposition aktualisieren
- `DELETE /api/geraete/:id` - Gerät löschen

### Verbindungen
- `GET /api/standorte/:standortId/verbindungen` - Verbindungen eines Standorts
- `POST /api/standorte/:standortId/verbindungen` - Neue Verbindung erstellen
- `PUT /api/verbindungen/:id` - Verbindung aktualisieren
- `DELETE /api/verbindungen/:id` - Verbindung löschen

### Switch-Stacks
- `GET /api/standorte/:standortId/stacks` - Switch-Stacks eines Standorts
- `POST /api/standorte/:standortId/stacks` - Neuen Switch-Stack erstellen
- `PUT /api/stacks/:id` - Switch-Stack aktualisieren
- `DELETE /api/stacks/:id` - Switch-Stack löschen

### Hilfsdaten
- `GET /api/geraetetypen` - Verfügbare Gerätetypen
- `GET /api/kabeltypen` - Verfügbare Kabeltypen

## 🗄️ Datenbank

Das Tool verwendet SQLite als lokale Datenbank. Die Datenbankdatei wird automatisch unter `server/westfalen_network.db` erstellt.

### Haupttabellen
- `standorte` - Grundlegende Standortinformationen
- `uplinks` - Uplink-Verbindungen pro Standort
- `geraete` - Alle Netzwerkgeräte mit Standort-Details
- `port_belegungen` - Port-Status für jedes Gerät
- `verbindungen` - Kabelverbindungen zwischen Geräten
- `stacks` - Switch-Stack-Konfigurationen
- `stack_mitglieder` - Zuordnung von Geräten zu Stacks
- `netzwerk_diagramme` - Gespeicherte Diagramm-Layouts

### Automatische Migrationen
- Die Datenbank wird automatisch bei Server-Start aktualisiert
- Neue Felder werden ohne Datenverlust hinzugefügt
- Backups werden vor größeren Änderungen erstellt

## 🔒 Sicherheit und Backup

### Backup-Empfehlungen
- **Regelmäßige Sicherung** der SQLite-Datenbankdatei (`westfalen_network.db`)
- **Export wichtiger Konfigurationen** als PDF für Offline-Zugriff
- **Versionskontrolle** für wichtige Konfigurationsänderungen

### Zugriffskontrolle
- Aktuell keine Benutzerauthentifizierung implementiert
- Für Produktionsumgebung sollte Authentifizierung hinzugefügt werden
- Netzwerkzugriff über Firewall-Regeln beschränken

## 🚦 Entwicklung und Erweiterung

### Development-Scripts
```bash
# Backend und Frontend gleichzeitig starten
npm run dev

# Backend mit Auto-Reload
npm run server:dev

# Frontend-Entwicklungsserver
npm start

# Alle Dependencies installieren
npm run install:all
```

### Code-Struktur
- **Backend**: Express.js mit SQLite und automatischen Migrationen
- **Frontend**: React mit TypeScript und Material-UI
- **Diagramme**: ReactFlow für interaktive Netzwerkdiagramme
- **Export**: html2canvas und jsPDF für professionelle Exports
- **State Management**: React Hooks (useState, useEffect)

### Mögliche Erweiterungen
- **Benutzerauthentifizierung** und Rechteverwaltung
- **Import/Export** von CSV-Dateien
- **Automatische Netzwerk-Discovery** über SNMP
- **Integration** mit Monitoring-Tools
- **Mobile App** für vor-Ort Wartung
- **Barcode/QR-Code Scanner** für Geräte-IDs
- **Benachrichtigungen** bei Konfigurationsänderungen

## 📋 Troubleshooting

### Häufige Probleme

**Port bereits belegt**
```
Error: listen EADDRINUSE: address already in use :::3001
```
→ Backend-Server läuft bereits oder Port wird von anderem Prozess verwendet

**Datenbankfehler**
```
Error: SQLITE_ERROR: database is locked
```
→ Datenbankdatei wird von anderem Prozess verwendet oder ist beschädigt

**Frontend startet nicht**
```
Error: Cannot find module '@types/react'
```
→ Dependencies fehlen, führen Sie `npm install` aus

**Export-Funktionen funktionieren nicht**
```
Error: html2canvas is not defined
```
→ Browser-Kompatibilität prüfen oder Dependencies neu installieren

### Logs und Debugging
- **Backend-Logs**: Werden in der Konsole ausgegeben
- **Frontend-Logs**: Browser-Entwicklertools (F12)
- **Datenbankabfragen**: Werden bei Fehlern in der Konsole angezeigt

## 📞 Support und Kontakt

Bei Fragen, Problemen oder Anregungen wenden Sie sich bitte an:

**Niklas Terhorst**
- **E-Mail**: n.terhorst@westfalen.com
- **Teams**: Niklas Terhorst (Westfalen AG)
- **Themen**: Technische Fragen, Fehlermeldungen, Feature-Requests, Schulungen

### Hilfreiche Informationen für Support-Anfragen
- Aktuelle Tool-Version (siehe Footer)
- Betriebssystem und Browser-Version
- Fehlermeldungen (Screenshots helfen)
- Beschreibung der durchgeführten Schritte

## 📝 Changelog

Eine detaillierte Übersicht aller Änderungen finden Sie in der integrierten Changelog-Seite der Anwendung oder unter dem Menüpunkt "Changelog".

### Version 1.2.0 (Juli 2025)
- Export-Funktion für PNG und PDF mit vollständiger Standort-Dokumentation
- Rack-Visualisierung im Export-Bereich
- Changelog-Seite und Versionierung
- Standort-Details-Feld für Geräte (Raum, Container, etc.)
- Footer-Design optimiert
- UI-Verbesserungen für bessere Benutzerfreundlichkeit

---

**© 2025 Westfalen AG - Network Documentation Tool** 