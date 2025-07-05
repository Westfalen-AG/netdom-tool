# Westfalen AG - Network Documentation Tool

Ein umfassendes Tool zur Dokumentation und Verwaltung der Netzwerk-Infrastruktur an OnSite-Anlagen der Westfalen AG.

## 🚀 Funktionen

### Kernfeatures
- **Standortverwaltung**: Verwaltung aller OnSite-Anlagen mit Details zu Standorten, Adressen und Ansprechpartnern
- **Geräte-Management**: Erfassung aller Netzwerkgeräte mit IP-Konfiguration, Ports und technischen Details
- **Verbindungsdokumentation**: Vollständige Dokumentation aller Kabelverbindungen (RJ45, Fibre, etc.)
- **Uplink-Verwaltung**: Dokumentation verschiedener Uplink-Typen (Glasfaser, Starlink, MPLS, etc.)
- **Interaktive Netzwerkdiagramme**: Visuelle Darstellung der Netzwerkinfrastruktur
- **Export-Funktionen**: PDF und PNG Export für Dokumentation
- **Mehrbenutzerzugriff**: Mehrere Administratoren können gleichzeitig arbeiten

### Unterstützte Gerätetypen
- Switches und Netzwerk-Hardware
- SD-WAN Server und Uplink Router  
- Fritzbox Fibre, Starlink Gen 3 Router
- IP-Kameras für Geländeüberwachung
- Unifi AI-Ports für Kennzeichenerkennung
- UNVR, NEDAP Zugangskontrollgeräte
- IOLAN, Phoenix Webpanel
- Telefone, Drucker und weitere Endgeräte

### Kabeltypen
- RJ45 (Cat5e, Cat6, Cat6a)
- Glasfaser (Singlemode, Multimode)
- Coax und weitere Verbindungsarten

## 🛠️ Installation und Setup

### Voraussetzungen
- Node.js (Version 16 oder höher)
- npm oder yarn Package Manager

### 1. Dependencies installieren

```bash
# Frontend-Dependencies installieren
npm install

# Zusätzliche Backend-Dependencies (falls noch nicht installiert)
npm install express sqlite3 cors uuid
npm install -D @types/uuid nodemon
```

### 2. Backend-Server starten

```bash
# In einem Terminal-Fenster
node server/index.js
```

Der Server läuft standardmäßig auf Port 3001.

### 3. Frontend-Entwicklungsserver starten

```bash
# In einem zweiten Terminal-Fenster  
npm start
```

Die Anwendung öffnet sich automatisch im Browser unter `http://localhost:3000`.

## 📁 Projektstruktur

```
westfalen-network-tool/
├── server/                     # Backend (Express + SQLite)
│   ├── database.js            # Datenbankschicht
│   ├── index.js               # Express Server + API Routen
│   └── westfalen_network.db   # SQLite Datenbank (wird automatisch erstellt)
├── src/                       # Frontend (React + TypeScript)
│   ├── components/            # React Komponenten
│   │   ├── StandortUebersicht.tsx
│   │   ├── NetzwerkDiagramm.tsx
│   │   ├── GeraeteVerwaltung.tsx
│   │   ├── VerbindungsVerwaltung.tsx
│   │   └── ...
│   ├── types/                 # TypeScript Interface Definitionen
│   │   └── index.ts
│   ├── App.tsx               # Haupt-Anwendungskomponente
│   └── index.tsx             # React Entry Point
├── public/                   # Statische Assets
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

### 3. Verbindungen dokumentieren
1. Wählen Sie "Verbindungs-Verwaltung"
2. Erstellen Sie Verbindungen zwischen Geräten
3. Definieren Sie Kabeltyp, Länge und weitere Eigenschaften
4. Ports werden automatisch als belegt markiert

### 4. Netzwerkdiagramm erstellen
1. Navigieren Sie zu "Netzwerkdiagramm"
2. Wählen Sie einen Standort aus
3. Arrangieren Sie Geräte per Drag & Drop
4. Speichern Sie Positionen für zukünftige Ansichten

## 🔧 API Endpunkte

### Standorte
- `GET /api/standorte` - Alle Standorte abrufen
- `GET /api/standorte/:id` - Einzelnen Standort abrufen  
- `POST /api/standorte` - Neuen Standort erstellen

### Geräte
- `GET /api/standorte/:standortId/geraete` - Geräte eines Standorts
- `POST /api/standorte/:standortId/geraete` - Neues Gerät erstellen
- `PUT /api/geraete/:id/position` - Geräteposition aktualisieren

### Verbindungen
- `GET /api/standorte/:standortId/verbindungen` - Verbindungen eines Standorts
- `POST /api/standorte/:standortId/verbindungen` - Neue Verbindung erstellen
- `DELETE /api/verbindungen/:id` - Verbindung löschen

### Hilfsdaten
- `GET /api/geraetetypen` - Verfügbare Gerätetypen
- `GET /api/kabeltypen` - Verfügbare Kabeltypen

## 🗄️ Datenbank

Das Tool verwendet SQLite als lokale Datenbank. Die Datenbankdatei wird automatisch unter `server/westfalen_network.db` erstellt.

### Haupttabellen
- `standorte` - Grundlegende Standortinformationen
- `uplinks` - Uplink-Verbindungen pro Standort
- `geraete` - Alle Netzwerkgeräte
- `port_belegungen` - Port-Status für jedes Gerät
- `verbindungen` - Kabelverbindungen zwischen Geräten
- `netzwerk_diagramme` - Gespeicherte Diagramm-Layouts

## 🔒 Sicherheit und Backup

### Backup-Empfehlungen
- Regelmäßige Sicherung der SQLite-Datenbankdatei
- Export wichtiger Konfigurationen als JSON
- Dokumentation in PDF-Format für Offline-Zugriff

### Zugriffskontrolle
- Aktuell keine Benutzerauthentifizierung implementiert
- Für Produktionsumgebung sollte Authentifizierung hinzugefügt werden
- Netzwerkzugriff über Firewall-Regeln beschränken

## 🚦 Entwicklung und Erweiterung

### Development Server starten
```bash
# Backend (mit Auto-Reload)
npm run server

# Frontend 
npm start
```

### Code-Struktur
- **Backend**: Express.js mit SQLite
- **Frontend**: React mit TypeScript und Material-UI
- **Diagramme**: ReactFlow für interaktive Netzwerkdiagramme
- **State Management**: React Hooks (useState, useEffect)

### Mögliche Erweiterungen
- Benutzerauthentifizierung und Rechteverwaltung
- Import/Export von CSV-Dateien
- Automatische Netzwerk-Discovery
- Integration mit monitoring Tools
- Mobile App für vor-Ort Wartung
- Barcode/QR-Code Scanner für Geräte-IDs

## 📋 Troubleshooting

### Häufige Probleme

**Port bereits belegt**
```
Error: listen EADDRINUSE: address already in use :::3001
```
→ Backend-Server läuft bereits oder Port wird von anderem Prozess verwendet

**Datenbankfehler**
```
Error: SQLITE_BUSY: database is locked
```
→ Mehrere Server-Instanzen oder unvollständig geschlossene Verbindungen

**Frontend kann nicht auf Backend zugreifen**
→ Überprüfen Sie, ob Backend auf Port 3001 läuft und proxy in package.json korrekt konfiguriert ist

### Logs und Debugging
- Backend-Logs werden in der Konsole ausgegeben
- Frontend-Fehler sind in den Browser-Entwicklertools sichtbar
- SQLite-Datenbankdatei kann mit Tools wie DB Browser inspiziert werden

## 📞 Support und Kontakt

Für Fragen zur Anwendung oder bei Problemen:
- **Interne IT-Abteilung**: Westfalen AG
- **Dokumentation**: Diese README-Datei
- **Issue-Tracking**: Nutzen Sie das interne Ticketing-System

---

**Version**: 1.0.0  
**Erstellt für**: Westfalen AG OnSite-Anlagen Management  
**Letzte Aktualisierung**: Dezember 2024 