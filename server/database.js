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
        geraetekategorie TEXT CHECK(geraetekategorie IN ('IT', 'OT', 'Hybrid')) DEFAULT 'IT',
        
        -- Purdue Model & Security Extensions
        purdue_level TEXT CHECK(purdue_level IN (
          'Level 0 - Field Level (Sensoren, Aktoren)',
          'Level 1 - Control Level (PLC, SPS)',
          'Level 2 - Supervisory Level (SCADA, HMI)',
          'Level 3 - Manufacturing Operations (MES)',
          'Level 4 - Business Planning (ERP)',
          'Level 5 - Enterprise Level',
          'Nicht definiert'
        )) DEFAULT 'Nicht definiert',
        security_zone TEXT CHECK(security_zone IN (
          'Manufacturing Zone (L0-L2)',
          'Control Zone',
          'DMZ (Demilitarized Zone)',
          'Corporate Network (L3-L5)',
          'Safety Zone (SIS)',
          'Remote Access Zone',
          'Nicht definiert'
        )) DEFAULT 'Nicht definiert',
        
        standort_details TEXT,
        bemerkungen TEXT,
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
        label TEXT,
        FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE,
        UNIQUE(geraet_id, port_nummer)
      )`,

      // IP-Konfigurationen Tabelle
      `CREATE TABLE IF NOT EXISTS ip_konfigurationen (
        id TEXT PRIMARY KEY,
        geraet_id TEXT NOT NULL,
        name TEXT NOT NULL,
        port_nummer INTEGER NOT NULL,
        typ TEXT CHECK(typ IN ('dhcp', 'statisch')) NOT NULL,
        ip_adresse TEXT,
        netzwerkbereich TEXT NOT NULL,
        netzbereich_typ TEXT CHECK(netzbereich_typ IN ('IT', 'OT', 'Sonstiges')) DEFAULT 'IT',
        gateway TEXT,
        dns_server TEXT, -- JSON Array als Text
        vlan_id INTEGER,
        vlan_name TEXT,
        vlan_tagged BOOLEAN DEFAULT 0,
        prioritaet INTEGER DEFAULT 1,
        aktiv BOOLEAN DEFAULT 1,
        bemerkungen TEXT,
        FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
      )`,

      // SPS-Netz Konfigurationen Tabelle
      `CREATE TABLE IF NOT EXISTS sps_netz_konfigurationen (
        id TEXT PRIMARY KEY,
        geraet_id TEXT NOT NULL,
        name TEXT NOT NULL,
        netzwerkbereich TEXT NOT NULL,
        protokoll TEXT CHECK(protokoll IN ('Profinet', 'Profibus', 'Ethernet/IP', 'Modbus TCP', 'OPC UA', 'Sonstiges')) DEFAULT 'Profinet',
        zykluszeit INTEGER, -- in ms
        sicherheitseinstufung TEXT CHECK(sicherheitseinstufung IN ('SIL0', 'SIL1', 'SIL2', 'SIL3', 'SIL4', 'Keine')) DEFAULT 'Keine',
        redundanz BOOLEAN DEFAULT 0,
        bemerkungen TEXT,
        FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
      )`,

      // OT-Gerät Eigenschaften Tabelle
      `CREATE TABLE IF NOT EXISTS ot_geraet_eigenschaften (
        id TEXT PRIMARY KEY,
        geraet_id TEXT NOT NULL UNIQUE,
        
        -- Verdichter-spezifische Eigenschaften
        verdichter_max_druck REAL,
        verdichter_max_leistung REAL,
        verdichter_temp_min REAL,
        verdichter_temp_max REAL,
        verdichter_kuehlungstyp TEXT CHECK(verdichter_kuehlungstyp IN ('Luft', 'Wasser', 'Öl')),
        verdichter_steuerungsart TEXT CHECK(verdichter_steuerungsart IN ('Frequenzumrichter', 'Ein/Aus', 'Mehrstufig')),
        
        -- SPS-spezifische Eigenschaften
        sps_cpu_typ TEXT,
        sps_speichergroesse INTEGER,
        sps_digital_inputs INTEGER,
        sps_digital_outputs INTEGER,
        sps_analog_inputs INTEGER,
        sps_analog_outputs INTEGER,
        sps_kommunikationsmodule TEXT, -- JSON Array als Text
        sps_sicherheitsfunktionen BOOLEAN DEFAULT 0,
        sps_redundanz BOOLEAN DEFAULT 0,
        
        -- H2-Versorger-spezifische Eigenschaften
        h2_max_druck REAL,
        h2_max_durchfluss REAL,
        h2_reinheitsgrad REAL,
        h2_speicherkapazitaet REAL,
        h2_detektionssystem TEXT,
        h2_sicherheitsventile INTEGER,
        
        -- Industrial Switch-spezifische Eigenschaften
        switch_managed BOOLEAN DEFAULT 0,
        switch_port_anzahl INTEGER,
        switch_poe_support BOOLEAN DEFAULT 0,
        switch_temp_min REAL,
        switch_temp_max REAL,
        switch_schutzklasse TEXT,
        switch_redundanz_protokolle TEXT, -- JSON Array als Text
        switch_vlan_support BOOLEAN DEFAULT 0,
        switch_qos_support BOOLEAN DEFAULT 0,
        
        -- Allgemeine OT-Eigenschaften
        betrieb_temp_min REAL,
        betrieb_temp_max REAL,
        betrieb_luftfeuchtigkeit_min REAL,
        betrieb_luftfeuchtigkeit_max REAL,
        betrieb_schutzklasse TEXT,
        betrieb_vibrationsklasse TEXT,
        betrieb_emv_klasse TEXT,
        
        -- Wartung
        wartung_intervall INTEGER, -- in Tagen
        wartung_letzte DATE,
        wartung_naechste DATE,
        wartung_verantwortlicher TEXT,
        
        -- Sicherheit
        sicherheit_einstufung TEXT CHECK(sicherheit_einstufung IN ('SIL0', 'SIL1', 'SIL2', 'SIL3', 'SIL4', 'Keine')) DEFAULT 'Keine',
        sicherheit_notabschaltung BOOLEAN DEFAULT 0,
        sicherheit_redundanz BOOLEAN DEFAULT 0,
        sicherheit_failsafe_funktionen TEXT, -- JSON Array als Text
        
        FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
      )`,

      // Verbindungen Tabelle
      `CREATE TABLE IF NOT EXISTS verbindungen (
        id TEXT PRIMARY KEY,
        standort_id TEXT NOT NULL,
        quell_geraet_id TEXT NOT NULL,
        quell_port INTEGER NOT NULL,
        ziel_geraet_id TEXT NOT NULL,
        ziel_port INTEGER NOT NULL,
        kabel_typ TEXT NOT NULL,
        kabel_farbe TEXT,
        kabel_kategorie TEXT,
        kabel_laenge REAL,
        status TEXT DEFAULT 'aktiv',
        beschreibung TEXT,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (standort_id) REFERENCES standorte(id) ON DELETE CASCADE,
        FOREIGN KEY (quell_geraet_id) REFERENCES geraete(id) ON DELETE CASCADE,
        FOREIGN KEY (ziel_geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
      )`,

      // Netzbereichs-Verwaltung Tabelle
      `CREATE TABLE IF NOT EXISTS netzbereich_verwaltung (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        beschreibung TEXT,
        ip_bereich TEXT NOT NULL,
        netztyp TEXT CHECK(netztyp IN ('IT-Netz', 'OT-Netz', 'Sonstiges')) DEFAULT 'IT-Netz',
        standort_id TEXT NOT NULL,
        vlan_id INTEGER,
        gateway TEXT,
        dns_server TEXT,
        ntp_server TEXT,
        dhcp_aktiv BOOLEAN DEFAULT 0,
        dhcp_bereich TEXT,
        aktiv BOOLEAN DEFAULT 1,
        bemerkungen TEXT,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        geaendert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (standort_id) REFERENCES standorte(id) ON DELETE CASCADE,
        UNIQUE(name, standort_id)
      )`,

      // =================== IT/OT SECURITY TABLES ===================
      
      // Security Assessments Tabelle
      `CREATE TABLE IF NOT EXISTS security_assessments (
        id TEXT PRIMARY KEY,
        geraet_id TEXT NOT NULL,
        iec62443_level TEXT CHECK(iec62443_level IN (
          'SL-1 (Protection against casual or coincidental violation)',
          'SL-2 (Protection against intentional violation using simple means)',
          'SL-3 (Protection against intentional violation using sophisticated means)',
          'SL-4 (Protection against intentional violation using state-of-the-art means)',
          'Nicht definiert'
        )) DEFAULT 'Nicht definiert',
        risiko_einstufung TEXT CHECK(risiko_einstufung IN ('Niedrig', 'Mittel', 'Hoch', 'Kritisch')) DEFAULT 'Niedrig',
        bedrohungsanalyse TEXT,
        schutzmassnahmen TEXT, -- JSON Array als Text
        letzte_bewertung DATE,
        naechste_bewertung DATE,
        verantwortlicher TEXT,
        bemerkungen TEXT,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
      )`,
      
      // Network Segmentation Tabelle
      `CREATE TABLE IF NOT EXISTS network_segmentation (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        beschreibung TEXT,
        security_zone TEXT CHECK(security_zone IN (
          'Manufacturing Zone (L0-L2)',
          'Control Zone',
          'DMZ (Demilitarized Zone)',
          'Corporate Network (L3-L5)',
          'Safety Zone (SIS)',
          'Remote Access Zone',
          'Nicht definiert'
        )),
        vlan_ids TEXT, -- JSON Array als Text
        allowed_protocols TEXT, -- JSON Array als Text
        access_control_list TEXT, -- JSON Array als Text
        monitoring_level TEXT CHECK(monitoring_level IN ('Basic', 'Enhanced', 'Deep Packet Inspection')) DEFAULT 'Basic',
        standort_id TEXT NOT NULL,
        aktiv BOOLEAN DEFAULT 1,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (standort_id) REFERENCES standorte(id) ON DELETE CASCADE
      )`,
      
      // Firewall Rules Tabelle
      `CREATE TABLE IF NOT EXISTS firewall_rules (
        id TEXT PRIMARY KEY,
        segmentation_id TEXT NOT NULL,
        name TEXT NOT NULL,
        source_zone TEXT,
        destination_zone TEXT,
        protocol TEXT,
        source_port TEXT,
        destination_port TEXT,
        action TEXT CHECK(action IN ('Allow', 'Deny', 'Log')) DEFAULT 'Deny',
        prioritaet INTEGER DEFAULT 100,
        beschreibung TEXT,
        aktiv BOOLEAN DEFAULT 1,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (segmentation_id) REFERENCES network_segmentation(id) ON DELETE CASCADE
      )`,
      
      // =================== INDUSTRIAL PROTOCOL MANAGEMENT ===================
      
      // Communication Matrix Tabelle
      `CREATE TABLE IF NOT EXISTS communication_matrix (
        id TEXT PRIMARY KEY,
        quell_geraet_id TEXT NOT NULL,
        ziel_geraet_id TEXT NOT NULL,
        protokoll TEXT CHECK(protokoll IN (
          'PROFINET', 'PROFIBUS', 'EtherNet/IP', 'Modbus TCP', 'Modbus RTU',
          'OPC UA', 'OPC DA', 'BACnet', 'HART', 'Foundation Fieldbus',
          'CAN Bus', 'DeviceNet', 'ControlNet', 'AS-Interface', 'IO-Link', 'Sonstiges'
        )),
        richtung TEXT CHECK(richtung IN ('Bidirectional', 'Source to Target', 'Target to Source')) DEFAULT 'Bidirectional',
        datentyp TEXT,
        zykluszeit INTEGER, -- in ms
        prioritaet TEXT CHECK(prioritaet IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
        real_time_requirement BOOLEAN DEFAULT 0,
        max_latenz INTEGER, -- in ms
        max_jitter INTEGER, -- in ms
        sicherheitsrelevant BOOLEAN DEFAULT 0,
        verschluesselung BOOLEAN DEFAULT 0,
        authentifizierung BOOLEAN DEFAULT 0,
        bemerkungen TEXT,
        standort_id TEXT NOT NULL,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quell_geraet_id) REFERENCES geraete(id) ON DELETE CASCADE,
        FOREIGN KEY (ziel_geraet_id) REFERENCES geraete(id) ON DELETE CASCADE,
        FOREIGN KEY (standort_id) REFERENCES standorte(id) ON DELETE CASCADE
      )`,
      
      // =================== ASSET LIFECYCLE MANAGEMENT ===================
      
      // Asset Lifecycle Tabelle
      `CREATE TABLE IF NOT EXISTS asset_lifecycle (
        id TEXT PRIMARY KEY,
        geraet_id TEXT NOT NULL UNIQUE,
        installations_datum DATE,
        inbetriebnahme_datum DATE,
        geplantes_eol DATE, -- End of Life
        erwartete_lebensdauer INTEGER, -- in Jahren
        aktuelle_firmware_version TEXT,
        letzte_firmware_update DATE,
        wartungsintervall INTEGER, -- in Tagen
        letzte_wartung DATE,
        naechste_wartung DATE,
        wartungsverantwortlicher TEXT,
        kritikalitaet TEXT CHECK(kritikalitaet IN ('Niedrig', 'Mittel', 'Hoch', 'Kritisch')) DEFAULT 'Niedrig',
        ersatzteil_verfuegbarkeit TEXT CHECK(ersatzteil_verfuegbarkeit IN ('Verfügbar', 'Begrenzt', 'EOL', 'Unbekannt')) DEFAULT 'Unbekannt',
        support_status TEXT CHECK(support_status IN ('Vollständig', 'Eingeschränkt', 'EOL', 'Unbekannt')) DEFAULT 'Unbekannt',
        bemerkungen TEXT,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
      )`,
      
      // Ersatzteil Management Tabelle
      `CREATE TABLE IF NOT EXISTS ersatzteil_management (
        id TEXT PRIMARY KEY,
        geraet_id TEXT NOT NULL,
        teilenummer TEXT NOT NULL,
        bezeichnung TEXT NOT NULL,
        lieferant TEXT,
        lagerbestand INTEGER DEFAULT 0,
        mindestbestand INTEGER DEFAULT 0,
        letzte_bestellung DATE,
        kostenstelle TEXT,
        kritikalitaet TEXT CHECK(kritikalitaet IN ('Niedrig', 'Mittel', 'Hoch', 'Kritisch')) DEFAULT 'Niedrig',
        lagerort TEXT,
        bemerkungen TEXT,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
      )`,
      
      // Firmware Management Tabelle
      `CREATE TABLE IF NOT EXISTS firmware_management (
        id TEXT PRIMARY KEY,
        geraet_id TEXT NOT NULL UNIQUE,
        aktuelle_version TEXT NOT NULL,
        verfuegbare_version TEXT,
        update_erforderlich BOOLEAN DEFAULT 0,
        sicherheits_update BOOLEAN DEFAULT 0,
        geplantes_update_datum DATE,
        update_verantwortlicher TEXT,
        release_notes TEXT,
        rollback_moeglich BOOLEAN DEFAULT 0,
        test_erforderlich BOOLEAN DEFAULT 1,
        bemerkungen TEXT,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
      )`,
      
      // =================== OPERATIONAL EXCELLENCE ===================
      
      // Process Integration Tabelle
      `CREATE TABLE IF NOT EXISTS process_integration (
        id TEXT PRIMARY KEY,
        geraet_id TEXT NOT NULL,
        prozess_name TEXT NOT NULL,
        prozess_beschreibung TEXT,
        kritische_funktion BOOLEAN DEFAULT 0,
        ausfall_auswirkung TEXT CHECK(ausfall_auswirkung IN ('Keine', 'Gering', 'Mittel', 'Hoch', 'Kritisch')) DEFAULT 'Gering',
        redundanz_vorhanden BOOLEAN DEFAULT 0,
        notfall_prozedur TEXT,
        verantwortlicher_betreiber TEXT,
        dokument_pfad TEXT, -- P&ID, Verfahrensfließbild
        bemerkungen TEXT,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
      )`,
      
      // Alarm Management Tabelle
      `CREATE TABLE IF NOT EXISTS alarm_management (
        id TEXT PRIMARY KEY,
        geraet_id TEXT NOT NULL,
        alarm_typ TEXT NOT NULL,
        prioritaet TEXT CHECK(prioritaet IN ('Low', 'Medium', 'High', 'Emergency')) DEFAULT 'Medium',
        alarm_beschreibung TEXT NOT NULL,
        handlungsanweisung TEXT,
        eskalations_matrix TEXT, -- JSON Array als Text
        quittierung_erforderlich BOOLEAN DEFAULT 1,
        automatische_aktion TEXT,
        log_retention INTEGER DEFAULT 365, -- in Tagen
        benachrichtigungs_gruppe TEXT,
        bemerkungen TEXT,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
      )`,
      
      // Golden Configuration Tabelle
      `CREATE TABLE IF NOT EXISTS golden_configuration (
        id TEXT PRIMARY KEY,
        geraet_id TEXT NOT NULL,
        konfigurations_name TEXT NOT NULL,
        version TEXT NOT NULL,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        erstellt_von TEXT NOT NULL,
        genehmigt BOOLEAN DEFAULT 0,
        genehmigt_von TEXT,
        genehmigt_am DATETIME,
        konfigurations_daten TEXT, -- JSON als String
        beschreibung TEXT NOT NULL,
        aenderungs_grund TEXT,
        rollback_moeglich BOOLEAN DEFAULT 1,
        aktiv BOOLEAN DEFAULT 0,
        FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE
      )`,
      
      // Change Management Tabelle
      `CREATE TABLE IF NOT EXISTS change_management (
        id TEXT PRIMARY KEY,
        geraet_id TEXT,
        standort_id TEXT NOT NULL,
        change_nummer TEXT NOT NULL UNIQUE,
        titel TEXT NOT NULL,
        beschreibung TEXT NOT NULL,
        change_typ TEXT CHECK(change_typ IN ('Standard', 'Normal', 'Emergency')) DEFAULT 'Normal',
        prioritaet TEXT CHECK(prioritaet IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
        antragsteller TEXT NOT NULL,
        antrags_grund TEXT NOT NULL,
        risiko_analyse TEXT NOT NULL,
        implementierungs_plan TEXT NOT NULL,
        rollback_plan TEXT NOT NULL,
        test_plan TEXT,
        genehmiger_ebene1 TEXT,
        genehmiger_ebene2 TEXT,
        geplantes_start_datum DATE,
        geplantes_ende_datum DATE,
        tatsaechliches_start_datum DATE,
        tatsaechliches_ende_datum DATE,
        status TEXT CHECK(status IN ('Draft', 'Submitted', 'Approved', 'In Progress', 'Completed', 'Cancelled', 'Rejected')) DEFAULT 'Draft',
        ergebnis TEXT,
        bemerkungen TEXT,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE SET NULL,
        FOREIGN KEY (standort_id) REFERENCES standorte(id) ON DELETE CASCADE
      )`,
      
      // =================== COMPLIANCE & REPORTING ===================
      
      // Compliance Requirements Tabelle
      `CREATE TABLE IF NOT EXISTS compliance_requirements (
        id TEXT PRIMARY KEY,
        standard TEXT NOT NULL,
        anforderung TEXT NOT NULL,
        beschreibung TEXT,
        kategorie TEXT CHECK(kategorie IN ('Security', 'Safety', 'Quality', 'Environmental', 'Regulatory')) DEFAULT 'Regulatory',
        anwendbar_auf TEXT, -- JSON Array: ['IT', 'OT', 'Hybrid']
        pruef_intervall INTEGER DEFAULT 12, -- in Monaten
        verantwortlicher TEXT,
        dokumentations_erforderlich BOOLEAN DEFAULT 1,
        aktiv BOOLEAN DEFAULT 1,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Compliance Assessments Tabelle
      `CREATE TABLE IF NOT EXISTS compliance_assessments (
        id TEXT PRIMARY KEY,
        geraet_id TEXT NOT NULL,
        requirement_id TEXT NOT NULL,
        bewertungs_datum DATE NOT NULL,
        bewerter TEXT NOT NULL,
        konformitaets_status TEXT CHECK(konformitaets_status IN ('Compliant', 'Non-Compliant', 'Partially Compliant', 'Not Assessed')) DEFAULT 'Not Assessed',
        abweichungen TEXT,
        massnahmen TEXT,
        frist DATE,
        naechste_pruefung DATE,
        bemerkungen TEXT,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (geraet_id) REFERENCES geraete(id) ON DELETE CASCADE,
        FOREIGN KEY (requirement_id) REFERENCES compliance_requirements(id) ON DELETE CASCADE
      )`,
      
      // Audit Trail Tabelle
      `CREATE TABLE IF NOT EXISTS audit_trail (
        id TEXT PRIMARY KEY,
        zeitstempel DATETIME DEFAULT CURRENT_TIMESTAMP,
        benutzer TEXT NOT NULL,
        aktion TEXT NOT NULL,
        objekt_typ TEXT NOT NULL,
        objekt_id TEXT NOT NULL,
        alte_daten TEXT, -- JSON
        neue_daten TEXT, -- JSON
        ip_adresse TEXT,
        grund TEXT,
        genehmiger TEXT
      )`,
      
      // Documentation Templates Tabelle
      `CREATE TABLE IF NOT EXISTS documentation_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        beschreibung TEXT,
        kategorie TEXT CHECK(kategorie IN ('Validation', 'Security', 'Safety', 'Operational', 'Maintenance')) DEFAULT 'Operational',
        anwendungsbereich TEXT, -- JSON Array: ['IT', 'OT', 'Hybrid']
        template_pfad TEXT NOT NULL,
        version TEXT DEFAULT '1.0',
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktiv BOOLEAN DEFAULT 1
      )`,
      
      // =================== VISUALIZATION & REPORTING ===================
      
      // Network Topology Views Tabelle
      `CREATE TABLE IF NOT EXISTS network_topology_views (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        standort_id TEXT NOT NULL,
        ansichts_typ TEXT CHECK(ansichts_typ IN ('Physical', 'Logical', 'Security Zones', 'Purdue Levels')) DEFAULT 'Physical',
        filter_konfiguration TEXT, -- JSON als String
        layout_konfiguration TEXT, -- JSON als String
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktiv BOOLEAN DEFAULT 1,
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



        `CREATE TRIGGER IF NOT EXISTS update_stacks_timestamp 
         AFTER UPDATE ON switch_stacks 
         BEGIN 
           UPDATE switch_stacks SET aktualisiert_am = CURRENT_TIMESTAMP WHERE id = NEW.id;
         END`,

        `CREATE TRIGGER IF NOT EXISTS update_netzbereich_timestamp 
         AFTER UPDATE ON netzbereich_verwaltung 
         BEGIN 
           UPDATE netzbereich_verwaltung SET geaendert_am = CURRENT_TIMESTAMP WHERE id = NEW.id;
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

    // Migration 10: Standard-Netzbereich zu standorte hinzufügen
    this.db.run(`
      ALTER TABLE standorte ADD COLUMN standard_netzbereich TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration standard_netzbereich (standorte):', err.message);
      } else if (!err) {
        console.log('✓ Spalte standard_netzbereich zu standorte hinzugefügt');
      }
    });

    // Migration 11: NTP-Server zu netzbereich_verwaltung hinzufügen
    this.db.run(`
      ALTER TABLE netzbereich_verwaltung ADD COLUMN ntp_server TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration ntp_server (netzbereich_verwaltung):', err.message);
      } else if (!err) {
        console.log('✓ Spalte ntp_server zu netzbereich_verwaltung hinzugefügt');
      }
    });

    // Migration 12: DHCP-aktiv zu netzbereich_verwaltung hinzufügen
    this.db.run(`
      ALTER TABLE netzbereich_verwaltung ADD COLUMN dhcp_aktiv BOOLEAN DEFAULT 0
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration dhcp_aktiv (netzbereich_verwaltung):', err.message);
      } else if (!err) {
        console.log('✓ Spalte dhcp_aktiv zu netzbereich_verwaltung hinzugefügt');
      }
    });

    // Migration 13: DHCP-Bereich zu netzbereich_verwaltung hinzufügen
    this.db.run(`
      ALTER TABLE netzbereich_verwaltung ADD COLUMN dhcp_bereich TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration dhcp_bereich (netzbereich_verwaltung):', err.message);
      } else if (!err) {
        console.log('✓ Spalte dhcp_bereich zu netzbereich_verwaltung hinzugefügt');
      }
    });

    // Migration 14: Netzbereichtypen vereinfachen
    this.db.run(`
      UPDATE netzbereich_verwaltung 
      SET netztyp = CASE 
        WHEN netztyp = 'SPS-Netz' THEN 'OT-Netz'
        WHEN netztyp = 'DMZ' THEN 'IT-Netz'
        WHEN netztyp = 'Management' THEN 'IT-Netz'
        WHEN netztyp = 'WAG-Netz' THEN 'Sonstiges'
        ELSE netztyp
      END
    `, (err) => {
      if (err) {
        console.error('Fehler bei Migration Netzbereichtypen (netzbereich_verwaltung):', err.message);
      } else {
        console.log('✓ Netzbereichtypen in netzbereich_verwaltung vereinfacht');
      }
    });

    this.db.run(`
      UPDATE ip_konfigurationen 
      SET netzbereich_typ = CASE 
        WHEN netzbereich_typ = 'SPS' THEN 'OT'
        WHEN netzbereich_typ = 'DMZ' THEN 'IT'
        WHEN netzbereich_typ = 'Management' THEN 'IT'
        ELSE netzbereich_typ
      END
    `, (err) => {
      if (err) {
        console.error('Fehler bei Migration Netzbereichtypen (ip_konfigurationen):', err.message);
      } else {
        console.log('✓ Netzbereichtypen in ip_konfigurationen vereinfacht');
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

    // Migration 15: Kategorie-Spalte zu geraetetypen hinzufügen
    this.db.run(`
      ALTER TABLE geraetetypen ADD COLUMN kategorie TEXT CHECK(kategorie IN ('IT', 'OT', 'Hybrid')) DEFAULT 'IT'
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration kategorie (geraetetypen):', err.message);
      } else if (!err) {
        console.log('✓ Spalte kategorie zu geraetetypen hinzugefügt');
      }
    });

    // =================== IT/OT MIGRATIONS ===================
    
    // Migration 16: Purdue Level und Security Zone zu geraete hinzufügen
    this.db.run(`
      ALTER TABLE geraete ADD COLUMN purdue_level TEXT CHECK(purdue_level IN (
        'Level 0 - Field Level (Sensoren, Aktoren)',
        'Level 1 - Control Level (PLC, SPS)',
        'Level 2 - Supervisory Level (SCADA, HMI)',
        'Level 3 - Manufacturing Operations (MES)',
        'Level 4 - Business Planning (ERP)',
        'Level 5 - Enterprise Level',
        'Nicht definiert'
      )) DEFAULT 'Nicht definiert'
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration purdue_level:', err.message);
      } else if (!err) {
        console.log('✓ Spalte purdue_level zu geraete hinzugefügt');
      }
    });

    this.db.run(`
      ALTER TABLE geraete ADD COLUMN security_zone TEXT CHECK(security_zone IN (
        'Manufacturing Zone (L0-L2)',
        'Control Zone',
        'DMZ (Demilitarized Zone)',
        'Corporate Network (L3-L5)',
        'Safety Zone (SIS)',
        'Remote Access Zone',
        'Nicht definiert'
      )) DEFAULT 'Nicht definiert'
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Fehler bei Migration security_zone:', err.message);
      } else if (!err) {
        console.log('✓ Spalte security_zone zu geraete hinzugefügt');
      }
    });

    // Migration 17: Intelligente Purdue Level Zuordnung basierend auf Gerätetyp
    this.db.run(`
      UPDATE geraete SET purdue_level = CASE 
        WHEN geraetetyp IN ('SPS', 'Industrial Switch') THEN 'Level 1 - Control Level (PLC, SPS)'
        WHEN geraetetyp IN ('HMI', 'SCADA') THEN 'Level 2 - Supervisory Level (SCADA, HMI)'
        WHEN geraetetyp IN ('Router', 'Switch', 'Firewall', 'Access Point', 'Server') THEN 'Level 3 - Manufacturing Operations (MES)'
        WHEN geraetetyp IN ('Verdichter', 'H2-Versorger', 'Gasanalysator', 'Drucksensor', 'Temperatursensor', 'Durchflussmesser', 'Ventilstation', 'Notabschaltung') THEN 'Level 0 - Field Level (Sensoren, Aktoren)'
        WHEN geraetetyp IN ('IT/OT-Router') THEN 'DMZ (Demilitarized Zone)'
        ELSE 'Nicht definiert'
      END
      WHERE purdue_level = 'Nicht definiert'
    `, (err) => {
      if (err) {
        console.error('Fehler bei Migration Purdue Level Zuordnung:', err.message);
      } else {
        console.log('✓ Intelligente Purdue Level Zuordnung angewendet');
      }
    });

    // Migration 18: Intelligente Security Zone Zuordnung
    this.db.run(`
      UPDATE geraete SET security_zone = CASE 
        WHEN geraetetyp IN ('SPS', 'Industrial Switch', 'Verdichter', 'H2-Versorger', 'Gasanalysator', 'Drucksensor', 'Temperatursensor', 'Durchflussmesser', 'Ventilstation', 'Notabschaltung') THEN 'Manufacturing Zone (L0-L2)'
        WHEN geraetetyp IN ('IT/OT-Router') THEN 'DMZ (Demilitarized Zone)'
        WHEN geraetetyp IN ('HMI') THEN 'Control Zone'
        WHEN geraetetyp IN ('Router', 'Switch', 'Firewall', 'Access Point', 'Server', 'NVR', 'Kamera', 'Drucker', 'VOIP-Phone') THEN 'Corporate Network (L3-L5)'
        ELSE 'Nicht definiert'
      END
      WHERE security_zone = 'Nicht definiert'
    `, (err) => {
      if (err) {
        console.error('Fehler bei Migration Security Zone Zuordnung:', err.message);
      } else {
        console.log('✓ Intelligente Security Zone Zuordnung angewendet');
      }
    });

    // Migration 19: Standard Compliance Requirements hinzufügen
    this.populateStandardComplianceRequirements();

    // Migration 20: Standard Network Segmentation Regeln erstellen
    this.createStandardNetworkSegmentation();
    
    console.log('✓ IT/OT Migrationen abgeschlossen.');

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
        kategorie TEXT CHECK(kategorie IN ('IT', 'OT', 'Hybrid')) DEFAULT 'IT',
        hostname_prefix TEXT,
        aktiv BOOLEAN DEFAULT 1,
        erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Fehler beim Erstellen der geraetetypen Tabelle:', err.message);
      } else {
        console.log('✓ Tabelle geraetetypen erstellt');
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
  // =================== IT/OT HELPER FUNCTIONS ===================

  // Standard Compliance Requirements populieren
  populateStandardComplianceRequirements() {
    const standardRequirements = [
      // IEC 62443 - Industrial Security Standards
      {
        standard: 'IEC 62443',
        anforderung: 'Network Segmentation',
        beschreibung: 'Netzwerksegmentierung zwischen IT und OT Bereichen implementieren',
        kategorie: 'Security',
        anwendbar_auf: JSON.stringify(['OT', 'Hybrid']),
        pruef_intervall: 6,
        dokumentations_erforderlich: true,
        verantwortlicher: 'IT Security Team'
      },
      {
        standard: 'IEC 62443',
        anforderung: 'Access Control',
        beschreibung: 'Zugriffskontrolle und Authentifizierung für OT-Systeme',
        kategorie: 'Security',
        anwendbar_auf: JSON.stringify(['OT', 'Hybrid']),
        pruef_intervall: 3,
        dokumentations_erforderlich: true,
        verantwortlicher: 'OT Security Officer'
      },
      {
        standard: 'IEC 62443',
        anforderung: 'System Monitoring',
        beschreibung: 'Kontinuierliche Überwachung von OT-Netzwerken',
        kategorie: 'Security',
        anwendbar_auf: JSON.stringify(['OT']),
        pruef_intervall: 1,
        dokumentations_erforderlich: true,
        verantwortlicher: 'NOC Team'
      },
      
      // ISO 27001 - Information Security
      {
        standard: 'ISO 27001',
        anforderung: 'Asset Management',
        beschreibung: 'Vollständige Inventarisierung aller IT/OT Assets',
        kategorie: 'Security',
        anwendbar_auf: JSON.stringify(['IT', 'OT', 'Hybrid']),
        pruef_intervall: 12,
        dokumentations_erforderlich: true,
        verantwortlicher: 'Asset Manager'
      },
      {
        standard: 'ISO 27001',
        anforderung: 'Risk Assessment',
        beschreibung: 'Regelmäßige Risikobewertung für kritische Systeme',
        kategorie: 'Security',
        anwendbar_auf: JSON.stringify(['IT', 'OT', 'Hybrid']),
        pruef_intervall: 6,
        dokumentations_erforderlich: true,
        verantwortlicher: 'Risk Manager'
      },
      
      // NIST Cybersecurity Framework
      {
        standard: 'NIST CSF',
        anforderung: 'Asset Identification',
        beschreibung: 'Identifikation und Kategorisierung aller Assets',
        kategorie: 'Security',
        anwendbar_auf: JSON.stringify(['IT', 'OT', 'Hybrid']),
        pruef_intervall: 6,
        dokumentations_erforderlich: true,
        verantwortlicher: 'Security Team'
      },
      {
        standard: 'NIST CSF',
        anforderung: 'Supply Chain Security',
        beschreibung: 'Sicherheit der Lieferkette für kritische Komponenten',
        kategorie: 'Security',
        anwendbar_auf: JSON.stringify(['OT']),
        pruef_intervall: 12,
        dokumentations_erforderlich: true,
        verantwortlicher: 'Procurement'
      },
      
      // FDA 21 CFR Part 11 (für pharmazeutische/kritische Industrien)
      {
        standard: 'FDA 21 CFR Part 11',
        anforderung: 'Electronic Records',
        beschreibung: 'Elektronische Aufzeichnungen müssen authentisch und nachvollziehbar sein',
        kategorie: 'Regulatory',
        anwendbar_auf: JSON.stringify(['IT', 'OT']),
        pruef_intervall: 12,
        dokumentations_erforderlich: true,
        verantwortlicher: 'Quality Assurance'
      },
      
      // IEC 61511 - Functional Safety
      {
        standard: 'IEC 61511',
        anforderung: 'Safety Instrumented Systems',
        beschreibung: 'Sicherheitsgerichtete Systeme müssen SIL-konform ausgelegt sein',
        kategorie: 'Safety',
        anwendbar_auf: JSON.stringify(['OT']),
        pruef_intervall: 12,
        dokumentations_erforderlich: true,
        verantwortlicher: 'Safety Engineer'
      },
      
      // Environmental/Energy
      {
        standard: 'ISO 50001',
        anforderung: 'Energy Monitoring',
        beschreibung: 'Energieverbrauch von IT/OT-Systemen überwachen',
        kategorie: 'Environmental',
        anwendbar_auf: JSON.stringify(['IT', 'OT']),
        pruef_intervall: 6,
        dokumentations_erforderlich: true,
        verantwortlicher: 'Energy Manager'
      },
      
      // Change Management
      {
        standard: 'ITIL v4',
        anforderung: 'Change Management',
        beschreibung: 'Alle Änderungen an kritischen Systemen müssen dokumentiert und genehmigt werden',
        kategorie: 'Quality',
        anwendbar_auf: JSON.stringify(['IT', 'OT', 'Hybrid']),
        pruef_intervall: 3,
        dokumentations_erforderlich: true,
        verantwortlicher: 'Change Manager'
      }
    ];

    console.log('Populiere Standard Compliance Requirements...');
    
    standardRequirements.forEach(req => {
      this.db.run(`
        INSERT OR IGNORE INTO compliance_requirements (
          id, standard, anforderung, beschreibung, kategorie, anwendbar_auf, 
          pruef_intervall, dokumentations_erforderlich, verantwortlicher, aktiv
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        require('crypto').randomUUID(),
        req.standard,
        req.anforderung,
        req.beschreibung,
        req.kategorie,
        req.anwendbar_auf,
        req.pruef_intervall,
        req.dokumentations_erforderlich,
        req.verantwortlicher
      ], (err) => {
        if (err) {
          console.error(`Fehler beim Hinzufügen der Compliance Requirement ${req.standard} - ${req.anforderung}:`, err.message);
        }
      });
    });
    
    console.log('✓ Standard Compliance Requirements hinzugefügt');
  }

  // Standard Network Segmentation erstellen
  createStandardNetworkSegmentation() {
    console.log('Erstelle Standard Network Segmentation...');
    
    // Hole alle Standorte
    this.db.all('SELECT id, name FROM standorte', [], (err, standorte) => {
      if (err) {
        console.error('Fehler beim Laden der Standorte für Network Segmentation:', err.message);
        return;
      }
      
      standorte.forEach(standort => {
        const standardSegments = [
          {
            name: 'Corporate Network',
            beschreibung: 'Standard IT-Netzwerk für Office-Anwendungen und Business-Systeme',
            security_zone: 'Corporate Network (L3-L5)',
            vlan_ids: JSON.stringify([10, 20, 30]),
            allowed_protocols: JSON.stringify(['HTTP', 'HTTPS', 'SMTP', 'DNS', 'DHCP', 'NTP']),
            access_control_list: JSON.stringify(['IT-Team', 'Management', 'Office-Mitarbeiter']),
            monitoring_level: 'Basic'
          },
          {
            name: 'DMZ Zone',
            beschreibung: 'Demilitarisierte Zone für IT/OT-Übergänge und externe Zugriffe',
            security_zone: 'DMZ (Demilitarized Zone)',
            vlan_ids: JSON.stringify([100]),
            allowed_protocols: JSON.stringify(['HTTPS', 'SSH', 'VPN', 'DNS']),
            access_control_list: JSON.stringify(['IT-Security', 'Remote-Support']),
            monitoring_level: 'Enhanced'
          },
          {
            name: 'Manufacturing Zone',
            beschreibung: 'OT-Netzwerk für Produktionsanlagen und Feldgeräte',
            security_zone: 'Manufacturing Zone (L0-L2)',
            vlan_ids: JSON.stringify([200, 201, 202]),
            allowed_protocols: JSON.stringify(['PROFINET', 'Modbus TCP', 'OPC UA', 'Ethernet/IP']),
            access_control_list: JSON.stringify(['OT-Team', 'Wartungstechniker', 'Produktionsleiter']),
            monitoring_level: 'Deep Packet Inspection'
          },
          {
            name: 'Control Zone',
            beschreibung: 'Steuerungsebene für HMI und SCADA-Systeme',
            security_zone: 'Control Zone',
            vlan_ids: JSON.stringify([150]),
            allowed_protocols: JSON.stringify(['OPC UA', 'PROFINET', 'HTTPS', 'RDP']),
            access_control_list: JSON.stringify(['Anlagenführer', 'Process-Engineers']),
            monitoring_level: 'Enhanced'
          },
          {
            name: 'Safety Zone',
            beschreibung: 'Sicherheitsgerichtete Systeme (SIS) - höchste Sicherheitsstufe',
            security_zone: 'Safety Zone (SIS)',
            vlan_ids: JSON.stringify([300]),
            allowed_protocols: JSON.stringify(['PROFISAFE', 'Safety Ethernet']),
            access_control_list: JSON.stringify(['Safety-Engineer', 'Certified-Technician']),
            monitoring_level: 'Deep Packet Inspection'
          }
        ];
        
        standardSegments.forEach(segment => {
          this.db.run(`
            INSERT OR IGNORE INTO network_segmentation (
              id, name, beschreibung, security_zone, vlan_ids, allowed_protocols, 
              access_control_list, monitoring_level, standort_id, aktiv
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          `, [
            require('crypto').randomUUID(),
            segment.name,
            segment.beschreibung,
            segment.security_zone,
            segment.vlan_ids,
            segment.allowed_protocols,
            segment.access_control_list,
            segment.monitoring_level,
            standort.id
          ], (err) => {
            if (err) {
              console.error(`Fehler beim Erstellen der Network Segmentation ${segment.name} für ${standort.name}:`, err.message);
            }
          });
        });
        
        console.log(`✓ Standard Network Segmentation für ${standort.name} erstellt`);
      });
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