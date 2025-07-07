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

      // Uplinks Tabelle
      `CREATE TABLE IF NOT EXISTS uplinks (
        id TEXT PRIMARY KEY,
        standort_id TEXT NOT NULL,
        typ TEXT NOT NULL,
        anbieter TEXT NOT NULL,
        download_geschwindigkeit INTEGER,
        upload_geschwindigkeit INTEGER,
        oeffentliche_ip_verfuegbar BOOLEAN DEFAULT 0,
        statische_ip TEXT,
        bemerkungen TEXT,
        FOREIGN KEY (standort_id) REFERENCES standorte(id) ON DELETE CASCADE
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

      // Netzwerk-Diagramme Tabelle
      `CREATE TABLE IF NOT EXISTS netzwerk_diagramme (
        id TEXT PRIMARY KEY,
        standort_id TEXT NOT NULL,
        name TEXT NOT NULL,
        typ TEXT CHECK(typ IN ('Netzwerkdiagramm', 'Rack-Diagramm')),
        einstellungen TEXT, -- JSON String
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (standort_id) REFERENCES standorte(id) ON DELETE CASCADE
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

        `CREATE TRIGGER IF NOT EXISTS update_diagramme_timestamp 
         AFTER UPDATE ON netzwerk_diagramme 
         BEGIN 
           UPDATE netzwerk_diagramme SET aktualisiert_am = CURRENT_TIMESTAMP WHERE id = NEW.id;
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
    
    console.log('Migrationen abgeschlossen.');
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