const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Datenbank-Pfad
const DB_PATH = path.join(__dirname, 'westfalen_network.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Fehler beim Öffnen der Datenbank:', err.message);
      } else {
        console.log('Verbindung zur SQLite-Datenbank hergestellt.');
        this.init();
      }
    });
  }

  // Datenbankinitialisierung - Erstelle alle Tabellen
  init() {
    const createTables = [
      // Ansprechpartner Tabelle
      `CREATE TABLE IF NOT EXISTS ansprechpartner (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        telefon TEXT,
        email TEXT,
        abteilung TEXT,
        firma TEXT,
        bemerkungen TEXT,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Standorte Tabelle
      `CREATE TABLE IF NOT EXISTS standorte (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        adresse TEXT NOT NULL,
        ansprechpartner_name TEXT,
        ansprechpartner_telefon TEXT,
        ansprechpartner_email TEXT,
        ansprechpartner_it_id TEXT,
        ansprechpartner_vor_ort_id TEXT,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ansprechpartner_it_id) REFERENCES ansprechpartner(id),
        FOREIGN KEY (ansprechpartner_vor_ort_id) REFERENCES ansprechpartner(id)
      )`,



      // Geräte Tabelle
      `CREATE TABLE IF NOT EXISTS geraete (
        id TEXT PRIMARY KEY,
        standort_id TEXT NOT NULL,
        name TEXT NOT NULL,
        geraetetyp TEXT NOT NULL,
        modell TEXT NOT NULL,
        seriennummer TEXT,
        ip_typ TEXT CHECK(ip_typ IN ('dhcp', 'statisch')),
        ip_adresse TEXT,
        netzwerkbereich TEXT,
        mac_adresse TEXT,
        anzahl_netzwerkports INTEGER DEFAULT 0,
        position_x REAL,
        position_y REAL,
        rack_name TEXT,
        rack_einheit INTEGER,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (standort_id) REFERENCES standorte(id) ON DELETE CASCADE
      )`,

      // Port-Belegungen Tabelle
      `CREATE TABLE IF NOT EXISTS port_belegungen (
        id TEXT PRIMARY KEY,
        geraet_id TEXT NOT NULL,
        port_nummer INTEGER NOT NULL,
        verbindung_id TEXT,
        beschreibung TEXT,
        belegt BOOLEAN DEFAULT 0,
        port_typ TEXT DEFAULT 'RJ45',
        geschwindigkeit TEXT DEFAULT '1G',
        FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE,
        UNIQUE(geraet_id, port_nummer)
      )`,

      // Verbindungen Tabelle
      `CREATE TABLE IF NOT EXISTS verbindungen (
        id TEXT PRIMARY KEY,
        standort_id TEXT NOT NULL,
        quell_geraet_id TEXT NOT NULL,
        quell_port INTEGER NOT NULL,
        ziel_geraet_id TEXT NOT NULL,
        ziel_port INTEGER NOT NULL,
        kabeltyp TEXT NOT NULL,
        kabel_laenge REAL,
        kabel_farbe TEXT,
        kabel_kategorie TEXT,
        bemerkungen TEXT,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (standort_id) REFERENCES standorte(id) ON DELETE CASCADE,
        FOREIGN KEY (quell_geraet_id) REFERENCES geraete(id) ON DELETE CASCADE,
        FOREIGN KEY (ziel_geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
      )`,



      // Switch-Stacks Tabelle
      `CREATE TABLE IF NOT EXISTS switch_stacks (
        id TEXT PRIMARY KEY,
        standort_id TEXT NOT NULL,
        name TEXT NOT NULL,
        beschreibung TEXT,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (standort_id) REFERENCES standorte(id) ON DELETE CASCADE
      )`,

      // Stack-Mitglieder Tabelle
      `CREATE TABLE IF NOT EXISTS stack_mitglieder (
        id TEXT PRIMARY KEY,
        stack_id TEXT NOT NULL,
        geraet_id TEXT NOT NULL,
        stack_nummer INTEGER NOT NULL,
        prioritaet INTEGER DEFAULT 0,
        FOREIGN KEY (stack_id) REFERENCES switch_stacks(id) ON DELETE CASCADE,
        FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE,
        UNIQUE(stack_id, stack_nummer),
        UNIQUE(geraet_id)
      )`,

      // Stack-Verbindungen Tabelle
      `CREATE TABLE IF NOT EXISTS stack_verbindungen (
        id TEXT PRIMARY KEY,
        stack_id TEXT NOT NULL,
        quell_geraet_id TEXT NOT NULL,
        quell_port INTEGER NOT NULL,
        ziel_geraet_id TEXT NOT NULL,
        ziel_port INTEGER NOT NULL,
        verbindungstyp TEXT DEFAULT 'DAC',
        bemerkungen TEXT,
        FOREIGN KEY (stack_id) REFERENCES switch_stacks(id) ON DELETE CASCADE,
        FOREIGN KEY (quell_geraet_id) REFERENCES geraete(id) ON DELETE CASCADE,
        FOREIGN KEY (ziel_geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
      )`
    ];

    createTables.forEach((sql, index) => {
      this.db.run(sql, (err) => {
        if (err) {
          console.error(`Fehler beim Erstellen der Tabelle ${index + 1}:`, err.message);
        } else {
          console.log(`Tabelle ${index + 1} erfolgreich erstellt/überprüft.`);
        }
      });
    });

    // Warten bis alle Tabellen erstellt sind, dann Trigger erstellen
    setTimeout(() => {
      // Erst Migrationen ausführen
      this.runMigrations();
      
      const updateTriggers = [
        `CREATE TRIGGER IF NOT EXISTS update_ansprechpartner_timestamp 
         AFTER UPDATE ON ansprechpartner 
         BEGIN 
           UPDATE ansprechpartner SET aktualisiert_am = CURRENT_TIMESTAMP WHERE id = NEW.id;
         END`,

        `CREATE TRIGGER IF NOT EXISTS update_standorte_timestamp 
         AFTER UPDATE ON standorte 
         BEGIN 
           UPDATE standorte SET aktualisiert_am = CURRENT_TIMESTAMP WHERE id = NEW.id;
         END`,
        
        `CREATE TRIGGER IF NOT EXISTS update_geraete_timestamp 
         AFTER UPDATE ON geraete 
         BEGIN 
           UPDATE geraete SET aktualisiert_am = CURRENT_TIMESTAMP WHERE id = NEW.id;
         END`,



        `CREATE TRIGGER IF NOT EXISTS update_stacks_timestamp 
         AFTER UPDATE ON switch_stacks 
         BEGIN 
           UPDATE switch_stacks SET aktualisiert_am = CURRENT_TIMESTAMP WHERE id = NEW.id;
         END`
      ];
      
      updateTriggers.forEach((sql, index) => {
        this.db.run(sql, (err) => {
          if (err) {
            console.error(`Fehler beim Erstellen des Triggers ${index + 1}:`, err.message);
          }
        });
      });
    }, 1000); // 1 Sekunde warten
  }

  // Datenbank-Migrationen
  runMigrations() {
    console.log('Führe Datenbank-Migrationen aus...');
    
    // Migration 1: Ansprechpartner-Spalten zur standorte-Tabelle hinzufügen
    this.db.run(`
      ALTER TABLE standorte ADD COLUMN ansprechpartner_it_id TEXT REFERENCES ansprechpartner(id)
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration ansprechpartner_it_id:', err.message);
      } else if (!err) {
        console.log('✓ Spalte ansprechpartner_it_id hinzugefügt');
      }
    });

    this.db.run(`
      ALTER TABLE standorte ADD COLUMN ansprechpartner_vor_ort_id TEXT REFERENCES ansprechpartner(id)
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration ansprechpartner_vor_ort_id:', err.message);
      } else if (!err) {
        console.log('✓ Spalte ansprechpartner_vor_ort_id hinzugefügt');
      }
    });

    // Migration 2: Port-Typ und Geschwindigkeit zur port_belegungen-Tabelle hinzufügen
    this.db.run(`
      ALTER TABLE port_belegungen ADD COLUMN port_typ TEXT DEFAULT 'RJ45'
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration port_typ:', err.message);
      } else if (!err) {
        console.log('✓ Spalte port_typ hinzugefügt');
      }
    });

    this.db.run(`
      ALTER TABLE port_belegungen ADD COLUMN geschwindigkeit TEXT DEFAULT '1G'
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration geschwindigkeit:', err.message);
      } else if (!err) {
        console.log('✓ Spalte geschwindigkeit hinzugefügt');
      }
    });

    // Migration 3: Port-Label zur port_belegungen-Tabelle hinzufügen
    this.db.run(`
      ALTER TABLE port_belegungen ADD COLUMN label TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration label:', err.message);
      } else if (!err) {
        console.log('✓ Spalte label hinzugefügt');
      }
    });

    // Migration 4: Kategorie-Spalte zur stack_verbindungen-Tabelle hinzufügen
    this.db.run(`
      ALTER TABLE stack_verbindungen ADD COLUMN kategorie TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration kategorie:', err.message);
      } else if (!err) {
        console.log('✓ Spalte kategorie hinzugefügt');
      }
    });

    // Migration 5: Farbe-Spalte zur stack_verbindungen-Tabelle hinzufügen
    this.db.run(`
      ALTER TABLE stack_verbindungen ADD COLUMN farbe TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration farbe:', err.message);
      } else if (!err) {
        console.log('✓ Spalte farbe hinzugefügt');
      }
    });

    // Migration 6: Standort-Details-Spalte zur geraete-Tabelle hinzufügen
    this.db.run(`
      ALTER TABLE geraete ADD COLUMN standort_details TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration standort_details:', err.message);
      } else if (!err) {
        console.log('✓ Spalte standort_details hinzugefügt');
      }
    });

    // Migration 7: Bemerkungen-Spalte zur geraete-Tabelle hinzufügen
    this.db.run(`
      ALTER TABLE geraete ADD COLUMN bemerkungen TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration bemerkungen:', err.message);
      } else if (!err) {
        console.log('✓ Spalte bemerkungen hinzugefügt');
      }
    });

    // Migration 8: Router öffentliche IP Felder hinzufügen
    this.db.run(`
      ALTER TABLE geraete ADD COLUMN hat_oeffentliche_ip BOOLEAN DEFAULT 0
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration hat_oeffentliche_ip:', err.message);
      } else if (!err) {
        console.log('✓ Spalte hat_oeffentliche_ip hinzugefügt');
      }
    });

    this.db.run(`
      ALTER TABLE geraete ADD COLUMN oeffentliche_ip_typ TEXT CHECK(oeffentliche_ip_typ IN ('dynamisch', 'statisch'))
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration oeffentliche_ip_typ:', err.message);
      } else if (!err) {
        console.log('✓ Spalte oeffentliche_ip_typ hinzugefügt');
      }
    });

    this.db.run(`
      ALTER TABLE geraete ADD COLUMN dyndns_aktiv BOOLEAN DEFAULT 0
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration dyndns_aktiv:', err.message);
      } else if (!err) {
        console.log('✓ Spalte dyndns_aktiv hinzugefügt');
      }
    });

    this.db.run(`
      ALTER TABLE geraete ADD COLUMN dyndns_adresse TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration dyndns_adresse:', err.message);
      } else if (!err) {
        console.log('✓ Spalte dyndns_adresse hinzugefügt');
      }
    });

    this.db.run(`
      ALTER TABLE geraete ADD COLUMN statische_oeffentliche_ip TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration statische_oeffentliche_ip:', err.message);
      } else if (!err) {
        console.log('✓ Spalte statische_oeffentliche_ip hinzugefügt');
      }
    });

    // Migration 9: Hostname-Felder hinzufügen
    this.db.run(`
      ALTER TABLE standorte ADD COLUMN hostname_prefix TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration hostname_prefix (standorte):', err.message);
      } else if (!err) {
        console.log('✓ Spalte hostname_prefix zu standorte hinzugefügt');
      }
    });

    this.db.run(`
      ALTER TABLE geraetetypen ADD COLUMN hostname_prefix TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration hostname_prefix (geraetetypen):', err.message);
      } else if (!err) {
        console.log('✓ Spalte hostname_prefix zu geraetetypen hinzugefügt');
      }
    });

    this.db.run(`
      ALTER TABLE geraete ADD COLUMN hostname TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration hostname (geraete):', err.message);
      } else if (!err) {
        console.log('✓ Spalte hostname zu geraete hinzugefügt');
      }
    });

    // Migration 10: Erweiterte IP-Konfiguration Tabellen erstellen
    this.createExtendedIPTables();
    
    console.log('Migrationen abgeschlossen.');
  }

  // Erweiterte IP-Konfiguration Tabellen erstellen
  createExtendedIPTables() {
    console.log('Erstelle erweiterte IP-Konfiguration Tabellen...');

    // IP-Konfigurationen Tabelle
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ip_konfigurationen (
        id TEXT PRIMARY KEY,
        geraet_id TEXT NOT NULL,
        name TEXT NOT NULL,
        port_nummer INTEGER NOT NULL,
        typ TEXT CHECK(typ IN ('dhcp', 'statisch')) NOT NULL,
        ip_adresse TEXT,
        netzwerkbereich TEXT NOT NULL,
        gateway TEXT,
        dns_server TEXT,
        prioritaet INTEGER DEFAULT 1,
        aktiv BOOLEAN DEFAULT 1,
        bemerkungen TEXT,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('Fehler beim Erstellen der ip_konfigurationen Tabelle:', err.message);
      } else {
        console.log('✓ Tabelle ip_konfigurationen erstellt');
      }
    });

    // VLAN-Konfigurationen Tabelle  
    this.db.run(`
      CREATE TABLE IF NOT EXISTS vlan_konfigurationen (
        id TEXT PRIMARY KEY,
        ip_konfiguration_id TEXT NOT NULL,
        vlan_id INTEGER NOT NULL,
        vlan_name TEXT,
        tagged BOOLEAN DEFAULT 0,
        nac_zugewiesen BOOLEAN DEFAULT 0,
        bemerkungen TEXT,
        FOREIGN KEY (ip_konfiguration_id) REFERENCES ip_konfigurationen(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('Fehler beim Erstellen der vlan_konfigurationen Tabelle:', err.message);
      } else {
        console.log('✓ Tabelle vlan_konfigurationen erstellt');
      }
    });

    // Öffentliche IP-Konfigurationen Tabelle
    this.db.run(`
      CREATE TABLE IF NOT EXISTS oeffentliche_ip_konfigurationen (
        id TEXT PRIMARY KEY,
        geraet_id TEXT NOT NULL,
        typ TEXT CHECK(typ IN ('einzelip', 'subnet')) NOT NULL,
        aktiv BOOLEAN DEFAULT 1,
        bemerkungen TEXT,
        -- Einzelne IP Felder
        einzelip_dynamisch BOOLEAN,
        einzelip_adresse TEXT,
        einzelip_dyndns_aktiv BOOLEAN,
        einzelip_dyndns_adresse TEXT,
        -- Subnet Felder
        subnet_netzwerkadresse TEXT,
        subnet_gateway TEXT,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('Fehler beim Erstellen der oeffentliche_ip_konfigurationen Tabelle:', err.message);
      } else {
        console.log('✓ Tabelle oeffentliche_ip_konfigurationen erstellt');
      }
    });

    // Öffentliche IPs Tabelle (für Subnet-Konfigurationen)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS oeffentliche_ips (
        id TEXT PRIMARY KEY,
        oeffentliche_ip_konfiguration_id TEXT NOT NULL,
        ip_adresse TEXT NOT NULL,
        verwendung TEXT,
        belegt BOOLEAN DEFAULT 0,
        bemerkungen TEXT,
        FOREIGN KEY (oeffentliche_ip_konfiguration_id) REFERENCES oeffentliche_ip_konfigurationen(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('Fehler beim Erstellen der oeffentliche_ips Tabelle:', err.message);
      } else {
        console.log('✓ Tabelle oeffentliche_ips erstellt');
      }
    });

    // Gerätetypen Tabelle
    this.db.run(`
      CREATE TABLE IF NOT EXISTS geraetetypen (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        beschreibung TEXT,
        icon TEXT,
        farbe TEXT,
        aktiv BOOLEAN DEFAULT 1,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Fehler beim Erstellen der geraetetypen Tabelle:', err.message);
      } else {
        console.log('✓ Tabelle geraetetypen erstellt');
        this.populateDefaultGeraetetypen();
      }
    });

    // Update-Trigger für neue Tabellen
    setTimeout(() => {
      this.db.run(`
        CREATE TRIGGER IF NOT EXISTS update_ip_konfigurationen_timestamp 
        AFTER UPDATE ON ip_konfigurationen 
        BEGIN 
          UPDATE ip_konfigurationen SET aktualisiert_am = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `);

      this.db.run(`
        CREATE TRIGGER IF NOT EXISTS update_oeffentliche_ip_konfigurationen_timestamp 
        AFTER UPDATE ON oeffentliche_ip_konfigurationen 
        BEGIN 
          UPDATE oeffentliche_ip_konfigurationen SET aktualisiert_am = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `);

      this.db.run(`
        CREATE TRIGGER IF NOT EXISTS update_geraetetypen_timestamp 
        AFTER UPDATE ON geraetetypen 
        BEGIN 
          UPDATE geraetetypen SET aktualisiert_am = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `);
    }, 500);

    console.log('✓ Erweiterte IP-Konfiguration Tabellen erstellt');
  }

  // Standard-Gerätetypen populieren
  populateDefaultGeraetetypen() {
    const standardGeraetetypen = [
      { name: 'Router', beschreibung: 'Netzwerk-Router für Routing-Funktionalität', icon: 'router', farbe: '#f44336', hostname_prefix: 'RT' },
      { name: 'Switch', beschreibung: 'Netzwerk-Switch für Layer 2/3 Switching', icon: 'switch', farbe: '#2196f3', hostname_prefix: 'SW' },
      { name: 'SD-WAN Gateway', beschreibung: 'Software-Defined WAN Gateway', icon: 'cloud', farbe: '#9c27b0', hostname_prefix: 'GW' },
      { name: 'Firewall', beschreibung: 'Netzwerk-Firewall für Sicherheit', icon: 'security', farbe: '#ff9800', hostname_prefix: 'FW' },
      { name: 'Access Point', beschreibung: 'WLAN Access Point', icon: 'wifi', farbe: '#4caf50', hostname_prefix: 'AP' },
      { name: 'Kamera', beschreibung: 'IP-Überwachungskamera', icon: 'videocam', farbe: '#795548', hostname_prefix: 'CM' },
      { name: 'VOIP-Phone', beschreibung: 'Voice over IP Telefon', icon: 'phone', farbe: '#607d8b', hostname_prefix: 'PH' },
      { name: 'Drucker', beschreibung: 'Netzwerk-Drucker', icon: 'print', farbe: '#9e9e9e', hostname_prefix: 'PR' },
      { name: 'AI-Port', beschreibung: 'KI-Port oder Analogport', icon: 'hub', farbe: '#3f51b5', hostname_prefix: 'AI' },
      { name: 'NVR', beschreibung: 'Network Video Recorder', icon: 'storage', farbe: '#e91e63', hostname_prefix: 'NV' },
      { name: 'Zugangskontrolle', beschreibung: 'Zugangskontrollsystem', icon: 'lock', farbe: '#8bc34a', hostname_prefix: 'ZK' },
      { name: 'Serial Server', beschreibung: 'Serieller Server/Konverter', icon: 'cable', farbe: '#ffc107', hostname_prefix: 'SS' },
      { name: 'HMI', beschreibung: 'Human Machine Interface', icon: 'monitor', farbe: '#00bcd4', hostname_prefix: 'HM' },
      { name: 'Server', beschreibung: 'Server-System', icon: 'dns', farbe: '#673ab7', hostname_prefix: 'SV' },
      { name: 'Sensor', beschreibung: 'IoT-Sensor oder Messgerät', icon: 'sensors', farbe: '#ff5722', hostname_prefix: 'SN' },
      { name: 'Sonstiges', beschreibung: 'Sonstige Netzwerkgeräte', icon: 'device_unknown', farbe: '#757575', hostname_prefix: 'XX' }
    ];

    // Prüfen ob bereits Daten vorhanden sind
    this.db.get('SELECT COUNT(*) as count FROM geraetetypen', (err, row) => {
      if (err) {
        console.error('Fehler beim Prüfen der Gerätetypen:', err.message);
        return;
      }

      if (row.count === 0) {
        console.log('Populiere Standard-Gerätetypen...');
        const { v4: uuidv4 } = require('uuid');
        
        for (const typ of standardGeraetetypen) {
          this.db.run(`
            INSERT OR IGNORE INTO geraetetypen (id, name, beschreibung, icon, farbe, hostname_prefix, aktiv)
            VALUES (?, ?, ?, ?, ?, ?, 1)
          `, [uuidv4(), typ.name, typ.beschreibung, typ.icon, typ.farbe, typ.hostname_prefix], (err) => {
            if (err) {
              console.error(`Fehler beim Einfügen von Gerätetyp ${typ.name}:`, err.message);
            }
          });
        }
        console.log('✓ Standard-Gerätetypen populiert');
      }
    });
  }

  // Promise-basierte Wrapper für Datenbankoperationen
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Transaktions-Support
  beginTransaction() {
    return this.run('BEGIN TRANSACTION');
  }

  commit() {
    return this.run('COMMIT');
  }

  rollback() {
    return this.run('ROLLBACK');
  }

  // Datenbank schließen
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = Database; 