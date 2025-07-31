# Westfalen AG - Network Documentation Tool

Ein umfassendes Tool zur Dokumentation und Verwaltung der Netzwerk-Infrastruktur an OnSite-Anlagen der Westfalen AG.

**Version:** 1.7.0  
**Letztes Update:** 31. Juli 2025  
**Support:** Niklas Terhorst (n.terhorst@westfalen.com oder Teams)

## 🚀 Funktionen

### Kernfeatures
- **Standortverwaltung**: Verwaltung aller OnSite-Anlagen mit Details zu Standorten, Adressen, Ansprechpartnern und Hostname-Präfixen
- **Automatisches Hostname-System**: Intelligente Generierung eindeutiger Geräte-Hostnamen basierend auf Standort und Gerätetyp
- **Gerätetyp-Verwaltung**: Vollständige Konfiguration von Gerätetypen mit Hostname-Präfixen, Icons und Farben
- **Geräte-Management**: Erfassung aller Netzwerkgeräte mit IP-Konfiguration, Ports, automatischen Hostnamen und technischen Details
- **Verbindungsdokumentation**: Vollständige Dokumentation aller Kabelverbindungen (RJ45, SFP/SFP+, Coax, etc.)
- **Switch-Stack-Verwaltung**: Konfiguration und Verwaltung von Switch-Stacks mit Stack-Mitgliedern
- **Rack-Visualisierung**: Interaktive Darstellung der Geräte-Platzierung in Serverschränken
- **Export-Funktionen**: Professionelle PDF und PNG Exports mit vollständiger Standort-Dokumentation
- **Interaktive Netzwerkdiagramme**: Visuelle Darstellung der Netzwerkinfrastruktur mit Drag & Drop
- **Changelog**: Vollständige Versionshistorie mit detaillierten Änderungen
- **Dark/Light Mode**: Benutzerfreundliche Themes für verschiedene Arbeitsumgebungen
- **IT/OT-Verwaltung**: Umfassende Verwaltung von IT- und OT-Infrastruktur mit industriellen Standards

### Neue Features in Version 1.7.0
- **Netzwerk-Scanning**: Vollautomatische Netzwerk-Discovery mit intelligenter Geräteerkennung
  - **Parallele Host-Discovery**: 25 Hosts gleichzeitig scannen für maximale Performance
  - **Multi-Methoden-Erkennung**: Ping + TCP-Connect für Hosts, die nicht auf Ping antworten
  - **Port-Scanning**: Automatische Erkennung von 50+ bekannten Services (Web, SSH, RDP, VNC, Datenbanken, Industrial, etc.)
  - **Intelligente Geräteerkennung**: Automatische Typisierung basierend auf offenen Port-Kombinationen
  - **Hostname-Auflösung**: DNS Reverse Lookup für bessere Gerätenamen-Vorschläge
  - **Live-Progress-Tracking**: Echzeit-Updates über WebSocket-Verbindung
  - **Interaktive Geräteauswahl**: Dropdown für Gerätetypen aus Datenbank, editierbare Namen
  - **Batch-Geräteerstellung**: Mehrere Geräte gleichzeitig aus Scan-Ergebnissen erstellen
- **Einstellungsseite**: Vollständige Anpassung der Anwendung
  - **Logo-Upload**: Separate Logos für Hell- und Dunkel-Modus mit automatischer Optimierung
  - **Favicon-Management**: Automatische Generierung aller benötigten Größen (16x16 bis 512x512px)
  - **App-Branding**: Anpassbare App-Namen und Firmenbezeichnungen
  - **Reset-Funktionalität**: Zurücksetzen auf Standard-Westfalen-Branding
- **Performance-Optimierungen**: 5-8x schnellere Netzwerk-Scans durch Parallelisierung
- **Erweiterte Standort-Integration**: Nahtlose Integration in bestehende Standortverwaltung

### Features aus Version 1.6.0
- **IT/OT-Verwaltung**: Vollständige Implementierung der IT/OT-Infrastruktur-Verwaltung
  - **Dashboard**: Umfassende Statistiken und Übersichten für IT/OT-Geräte
  - **Purdue Model Integration**: Klassifizierung von Geräten nach Purdue-Leveln (L0-L5)
  - **Security Zones**: Verwaltung von Sicherheitszonen (Manufacturing, Control, DMZ, etc.)
  - **Security Assessments**: IEC 62443 Sicherheitsbewertungen mit Risikoanalyse
  - **Communication Matrix**: Verwaltung industrieller Protokolle (PROFINET, Modbus, OPC UA, etc.)
  - **Change Management**: Strukturierte Änderungsverwaltung mit Genehmigungsworkflows
  - **Asset Lifecycle Management**: Vollständige Lebenszyklus-Verwaltung von Assets
  - **Compliance Management**: Einhaltung von Standards (IEC 62443, ISO 27001, etc.)
- **Netzbereichs-Verwaltung**: Erweiterte Verwaltung von IT- und OT-Netzwerkbereichen
- **Verbesserte Standort-Übersicht**: Einheitliche Kartenhöhen und erweiterte Funktionalität
- **Vollständige CRUD-Operationen**: Erstellen, Lesen, Aktualisieren und Löschen für alle IT/OT-Entitäten
- **Server-API-Erweiterungen**: Umfassende Backend-Unterstützung für alle neuen Features

### Features aus Version 1.5.0
- **Automatisches Hostname-System**: Intelligente Hostname-Generierung basierend auf Standort und Gerätetyp
  - Format: [StandortPrefix][GeraetetypPrefix][3-stellige-Nummer] (z.B. DELIN2CM001 für Kamera #001 in Lingen 2)
  - Automatische Nummernvergabe mit Gap-Detection (wiederverwendung gelöschter Nummern)
  - Manueller Refresh-Button für nachträgliche Hostname-Aktualisierung
- **Gerätetyp-Verwaltung**: Vollständige Verwaltung von Gerätetypen mit konfigurierbaren Hostname-Präfixen
  - 16 vordefinierte Gerätetypen (CM, SW, FW, AP, etc.) mit Standard-Präfixen
  - Benutzerfreundliche Oberfläche zum Hinzufügen, Bearbeiten und Deaktivieren von Gerätetypen
  - Icon- und Farbkonfiguration für visuelle Darstellung
- **Hostname-Präfix-Konfiguration**: Standort-spezifische Hostname-Präfixe (z.B. DELIN2, MELLE1)
- **Code-Bereinigung**: Entfernung ungenutzter Legacy-Komponenten für bessere Performance
  - Unverwendete Uplinks-Tabelle und APIs entfernt (ersetzt durch automatische Router/SD-WAN Erkennung)
  - Debug-APIs und unverwendete TypeScript-Interfaces entfernt
  - Datenbankschema optimiert durch Entfernung ungenutzter Tabellen

### Features aus Version 1.4.0
- **Router-öffentliche IP-Verwaltung**: Vollständige Konfiguration von öffentlichen IP-Adressen für Router
  - Checkbox für "Hat öffentliche IP-Adresse"
  - Auswahl zwischen dynamischer und statischer IP
  - DynDNS-Unterstützung mit Adresseingabe für dynamische IPs
  - Statische öffentliche IP-Adresseingabe
- **Erweiterte Bemerkungsfelder**: Allgemeine Kommentarfelder für alle Gerätetypen
- **WAN/LAN IP-Unterscheidung**: Separate Anzeige von LAN- und WAN-IP-Adressen in allen Übersichten
- **Farbkodierte IP-Anzeige**: Blaue Hervorhebung für WAN/öffentliche IP-Informationen
- **Umfassende Router-Visualisierung**: WAN-IP-Anzeige in Netzwerkdiagrammen, Rack-Visualisierungen und Export-Funktionen
- **Intelligente IP-Anzeige**: Priorisierte Darstellung von statischen IPs, DynDNS-Adressen oder dynamischen IP-Status

### Features aus Version 1.3.0
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
- **IT/OT-Geräte**: Vollständige Unterstützung für industrielle Automatisierungsgeräte

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
│   │   ├── ITOTVerwaltung.tsx          # IT/OT-Infrastruktur-Verwaltung
│   │   ├── NetzbereichsVerwaltung.tsx  # Netzbereichs-Management
│   │   └── Changelog.tsx               # Versionshistorie
│   ├── types/                 # TypeScript Interface Definitionen
│   │   └── index.ts
│   ├── App.tsx               # Haupt-Anwendungskomponente
│   └── index.tsx             # React Entry Point
├── public/                   # Statische Assets
│   ├── header_schwarz.png   # Westfalen AG Header (dunkel)
│   ├── header_weis.png      # Westfalen AG Header (hell)
│   ├── logo.png             # Westfalen AG Logo
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

### 2. Gerätetypen konfigurieren (optional)
1. Navigieren Sie zu "Gerätetyp-Verwaltung" 
2. Passen Sie vordefinierte Gerätetypen an oder erstellen Sie neue:
   - Hostname-Präfix (z.B. CM für Kameras, SW für Switches)
   - Icon und Farbe für visuelle Darstellung
   - Aktivierung/Deaktivierung von Gerätetypen
3. 16 Standard-Gerätetypen sind bereits vorkonfiguriert

### 3. Geräte hinzufügen
1. Wählen Sie einen Standort aus
2. Navigieren Sie zu "Geräte-Verwaltung"
3. Erstellen Sie neue Geräte mit:
   - Name und Gerätetyp
   - **Automatischer Hostname-Generierung** (z.B. DELIN2CM001)
   - IP-Konfiguration (DHCP/statisch)
   - Anzahl Netzwerkports
   - Rack-Position (optional)
   - Standort-Details (Raum, Container, etc.)
   - Bemerkungen für zusätzliche Informationen
   - **Für Router**: Öffentliche IP-Konfiguration (statisch/dynamisch mit DynDNS-Unterstützung)
   - **IT/OT-Klassifizierung**: Purdue Level und Security Zone
4. **Hostname-Refresh**: Nutzen Sie den 🔄-Button für nachträgliche Hostname-Aktualisierung

### 4. IT/OT-Verwaltung nutzen
1. Navigieren Sie zu "IT/OT-Verwaltung"
2. Nutzen Sie das Dashboard für Übersichten und Statistiken
3. Verwalten Sie Security Assessments nach IEC 62443
4. Dokumentieren Sie industrielle Kommunikation in der Communication Matrix
5. Erstellen Sie Change Requests für strukturierte Änderungen
6. Verwalten Sie Asset Lifecycle und Compliance Assessments

### 5. Netzwerkbereiche verwalten
1. Navigieren Sie zu "Netzbereichs-Verwaltung"
2. Erstellen Sie IT- und OT-Netzwerkbereiche
3. Konfigurieren Sie VLANs, Gateways und DHCP-Bereiche

### 6. Switch-Stacks konfigurieren
1. Navigieren Sie zu "Switch-Stack-Verwaltung"
2. Erstellen Sie neue Switch-Stacks
3. Fügen Sie Stack-Mitglieder hinzu
4. Konfigurieren Sie Stack-spezifische Einstellungen

### 7. Verbindungen dokumentieren
1. Wählen Sie "Verbindungs-Verwaltung"
2. Erstellen Sie Verbindungen zwischen Geräten
3. Definieren Sie Kabeltyp, Länge und weitere Eigenschaften
4. Ports werden automatisch als belegt markiert

### 8. Netzwerkdiagramm erstellen
1. Navigieren Sie zu "Netzwerkdiagramm"
2. Wählen Sie einen Standort aus
3. Arrangieren Sie Geräte per Drag & Drop
4. Speichern Sie Positionen für zukünftige Ansichten

### 9. Export-Funktionen nutzen
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
- `POST /api/standorte/:standortId/geraete` - Neues Gerät erstellen (mit automatischer Hostname-Generierung)
- `PUT /api/geraete/:id` - Gerät aktualisieren
- `PUT /api/geraete/:id/position` - Geräteposition aktualisieren
- `DELETE /api/geraete/:id` - Gerät löschen
- `GET /api/geraete/search` - Erweiterte Gerätesuche mit IT/OT-Filtern

### Gerätetypen
- `GET /api/geraetetypen` - Aktive Gerätetypen abrufen
- `GET /api/geraetetypen/alle` - Alle Gerätetypen abrufen (auch inaktive)
- `GET /api/geraetetypen/:id` - Einzelnen Gerätetyp abrufen
- `POST /api/geraetetypen` - Neuen Gerätetyp erstellen
- `PUT /api/geraetetypen/:id` - Gerätetyp aktualisieren
- `DELETE /api/geraetetypen/:id` - Gerätetyp löschen
- `POST /api/geraetetypen/auto-create` - Standard-Gerätetypen automatisch erstellen

### Hostname-System
- `POST /api/hostname/generate` - Hostname für Gerät generieren
- `POST /api/hostname/check` - Hostname-Verfügbarkeit prüfen

### Verbindungen
- `GET /api/standorte/:standortId/verbindungen` - Verbindungen eines Standorts
- `POST /api/standorte/:standortId/verbindungen` - Neue Verbindung erstellen
- `PUT /api/verbindungen/:id` - Verbindung aktualisieren
- `DELETE /api/verbindungen/:id` - Verbindung löschen

### Switch-Stacks
- `GET /api/standorte/:standortId/stacks` - Switch-Stacks eines Standorts
- `POST /api/standorte/:standortId/stacks` - Neuen Switch-Stack erstellen
- `PUT /api/stacks/:stackId` - Switch-Stack aktualisieren
- `DELETE /api/stacks/:stackId` - Switch-Stack löschen

### Netzbereichs-Verwaltung
- `GET /api/netzbereich-verwaltung` - Netzbereichs-Liste abrufen
- `POST /api/netzbereich-verwaltung` - Neuen Netzbereich erstellen
- `PUT /api/netzbereich-verwaltung/:id` - Netzbereich aktualisieren
- `DELETE /api/netzbereich-verwaltung/:id` - Netzbereich löschen

### IT/OT-Verwaltung
- `GET /api/standorte/:standortId/itot-dashboard` - IT/OT Dashboard-Daten
- `GET /api/standorte/:standortId/security-assessments` - Security Assessments
- `POST /api/geraete/:geraetId/security-assessments` - Security Assessment erstellen
- `PUT /api/security-assessments/:id` - Security Assessment aktualisieren
- `DELETE /api/security-assessments/:id` - Security Assessment löschen
- `GET /api/standorte/:standortId/communication-matrix` - Communication Matrix
- `POST /api/standorte/:standortId/communication-matrix` - Communication Matrix Eintrag erstellen
- `PUT /api/communication-matrix/:id` - Communication Matrix aktualisieren
- `DELETE /api/communication-matrix/:id` - Communication Matrix löschen
- `GET /api/standorte/:standortId/change-requests` - Change Requests
- `POST /api/standorte/:standortId/change-requests` - Change Request erstellen
- `PUT /api/change-requests/:id` - Change Request aktualisieren
- `DELETE /api/change-requests/:id` - Change Request löschen
- `GET /api/standorte/:standortId/asset-lifecycle` - Asset Lifecycle
- `POST /api/geraete/:geraetId/asset-lifecycle` - Asset Lifecycle erstellen
- `PUT /api/asset-lifecycle/:id` - Asset Lifecycle aktualisieren
- `DELETE /api/asset-lifecycle/:id` - Asset Lifecycle löschen
- `GET /api/compliance-requirements` - Compliance Requirements
- `GET /api/standorte/:standortId/compliance-assessments` - Compliance Assessments
- `POST /api/geraete/:geraetId/compliance-assessments` - Compliance Assessment erstellen
- `PUT /api/compliance-assessments/:id` - Compliance Assessment aktualisieren
- `DELETE /api/compliance-assessments/:id` - Compliance Assessment löschen

### Netzwerk-Scanning
- `POST /api/network-scan/start` - Netzwerk-Scan starten
- `GET /api/network-scan/:scanId/status` - Scan-Status abrufen
- `GET /api/network-scan/:scanId/results` - Scan-Ergebnisse abrufen
- `POST /api/network-scan/:scanId/create-devices` - Geräte aus Scan-Ergebnissen erstellen
- `DELETE /api/network-scan/:scanId` - Scan-Session löschen
- `GET /api/device-types` - Verfügbare Gerätetypen für Dropdown abrufen

### Einstellungen
- `GET /api/settings` - App-Einstellungen abrufen
- `PUT /api/settings` - App-Einstellungen aktualisieren
- `POST /api/settings/upload-logo` - Logo hochladen
- `POST /api/settings/upload-favicon` - Favicon hochladen
- `POST /api/settings/reset` - Einstellungen auf Standard zurücksetzen

### Ansprechpartner
- `GET /api/ansprechpartner` - Alle Ansprechpartner abrufen
- `POST /api/ansprechpartner` - Neuen Ansprechpartner erstellen
- `PUT /api/ansprechpartner/:id` - Ansprechpartner aktualisieren
- `DELETE /api/ansprechpartner/:id` - Ansprechpartner löschen

## 🔒 Sicherheit und Compliance

### Unterstützte Standards
- **IEC 62443**: Industrielle Cybersicherheit
- **ISO 27001**: Informationssicherheits-Management
- **FDA 21 CFR Part 11**: Pharmazeutische Compliance
- **NIST Cybersecurity Framework**: Cybersicherheits-Rahmenwerk

### Purdue Model Integration
- **Level 0**: Field Level (Sensoren, Aktoren)
- **Level 1**: Control Level (PLC, SPS)
- **Level 2**: Supervisory Level (SCADA, HMI)
- **Level 3**: Manufacturing Operations (MES)
- **Level 4**: Business Planning (ERP)
- **Level 5**: Enterprise Level

### Security Zones
- **Manufacturing Zone (L0-L2)**: Produktionsumgebung
- **Control Zone**: Steuerungsebene
- **DMZ (Demilitarized Zone)**: Sicherheitszone
- **Corporate Network (L3-L5)**: Unternehmensebene
- **Safety Zone (SIS)**: Sicherheitsgerichtete Systeme
- **Remote Access Zone**: Fernzugriff

## 📊 Industrielle Protokolle

### Unterstützte Protokolle
- **PROFINET**: Ethernet-basierte Industrieautomatisierung
- **PROFIBUS**: Feldbus-Standard
- **EtherNet/IP**: Industrial Ethernet Protokoll
- **Modbus TCP/RTU**: Industrielle Kommunikation
- **OPC UA/DA**: Offene Plattform-Kommunikation
- **BACnet**: Gebäudeautomatisierung
- **HART**: Highway Addressable Remote Transducer
- **Foundation Fieldbus**: Prozessautomatisierung
- **CAN Bus**: Controller Area Network
- **DeviceNet**: Gerätenetzwerk
- **ControlNet**: Echtzeitsteuerung
- **AS-Interface**: Aktor-Sensor-Interface
- **IO-Link**: Punkt-zu-Punkt-Kommunikation

## 🔄 Change Management

### Change-Typen
- **Standard**: Vordefinierte, risikoarme Änderungen
- **Normal**: Reguläre Änderungen mit Genehmigungsverfahren
- **Emergency**: Notfalländerungen mit beschleunigtem Verfahren

### Workflow
1. **Antragstellung**: Detaillierte Beschreibung der Änderung
2. **Risikoanalyse**: Bewertung der Auswirkungen
3. **Genehmigung**: Mehrstufiges Genehmigungsverfahren
4. **Implementierung**: Durchführung nach Plan
5. **Verifikation**: Überprüfung der Umsetzung
6. **Dokumentation**: Vollständige Nachverfolgung

## 📈 Asset Lifecycle Management

### Lifecycle-Phasen
- **Planung**: Bedarfsanalyse und Spezifikation
- **Beschaffung**: Auswahl und Einkauf
- **Installation**: Inbetriebnahme und Konfiguration
- **Betrieb**: Überwachung und Wartung
- **Optimierung**: Performance-Verbesserung
- **Austausch**: End-of-Life-Management

### Wartungsmanagement
- **Präventive Wartung**: Geplante Wartungsintervalle
- **Korrektive Wartung**: Reaktive Fehlerbehebung
- **Zustandsbasierte Wartung**: Überwachung kritischer Parameter
- **Ersatzteilmanagement**: Verfügbarkeit und Beschaffung

## 🎓 Schulung und Support

### Dokumentation
- Umfassende Benutzerhandbücher
- Video-Tutorials für alle Funktionen
- Best-Practice-Leitfäden
- FAQ und Troubleshooting

### Support-Kanäle
- **E-Mail**: n.terhorst@westfalen.com
- **Microsoft Teams**: Direkter Kontakt
- **Interne Schulungen**: Auf Anfrage verfügbar
- **Remote-Support**: Bildschirmfreigabe möglich

## 🚀 Roadmap

### Geplante Features
- **Mobile App**: iOS/Android Companion App
- **API-Integration**: Anbindung an bestehende Systeme
- **Erweiterte Berichte**: Automatisierte Compliance-Reports
- **Backup/Restore**: Datensicherung und -wiederherstellung
- **Multi-Tenant**: Unterstützung mehrerer Organisationen

### Kontinuierliche Verbesserungen
- Performance-Optimierungen
- Benutzerfreundlichkeits-Verbesserungen
- Erweiterte Sicherheitsfeatures
- Neue Gerätetyp-Unterstützung

---

**Entwickelt mit ❤️ für die Westfalen AG**  
*Vereinfachung der Netzwerk-Dokumentation für OnSite-Anlagen* 