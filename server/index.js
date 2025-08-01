const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const http = require('http');
const { Server } = require('socket.io');
const Database = require('./database');
const NetworkScanner = require('./networkScanner');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Erlaubt alle Origins für Socket.IO-Verbindungen
      // Sie können dies für Production einschränken
      callback(null, true);
    },
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Datenbank-Instanz
const db = new Database();

// Netzwerk-Scanner Instanz
const networkScanner = new NetworkScanner();

// Hilfsfunktionen
const createResponse = (success, data = null, message = '', error = null) => ({
  success,
  data,
  message,
  error
});

// Erweiterte IP-Konfigurationen laden
const loadIPKonfigurationen = async (geraetId) => {
  const ipConfigs = await db.all(
    'SELECT * FROM ip_konfigurationen WHERE geraet_id = ? ORDER BY prioritaet, port_nummer',
    [geraetId]
  );

  const result = [];
  for (let ipConfig of ipConfigs) {
    // VLAN-Konfiguration laden falls vorhanden
    const vlanConfig = await db.get(
      'SELECT * FROM vlan_konfigurationen WHERE ip_konfiguration_id = ?',
      [ipConfig.id]
    );

    // DNS-Server JSON parsen
    let dnsServer = [];
    if (ipConfig.dns_server) {
      try {
        dnsServer = JSON.parse(ipConfig.dns_server);
      } catch (e) {
        dnsServer = [];
      }
    }

    result.push({
      id: ipConfig.id,
      name: ipConfig.name,
      portNummer: ipConfig.port_nummer,
      typ: ipConfig.typ,
      ipAdresse: ipConfig.ip_adresse,
      netzwerkbereich: ipConfig.netzwerkbereich,
      gateway: ipConfig.gateway,
      dnsServer,
      vlan: vlanConfig ? {
        vlanId: vlanConfig.vlan_id,
        vlanName: vlanConfig.vlan_name,
        tagged: Boolean(vlanConfig.tagged),
        nacZugewiesen: Boolean(vlanConfig.nac_zugewiesen),
        bemerkungen: vlanConfig.bemerkungen
      } : undefined,
      prioritaet: ipConfig.prioritaet,
      aktiv: Boolean(ipConfig.aktiv),
      bemerkungen: ipConfig.bemerkungen
    });
  }

  return result;
};

// Erweiterte öffentliche IP-Konfigurationen laden
const loadOeffentlicheIPKonfigurationen = async (geraetId) => {
  const oeffentlicheConfigs = await db.all(
    'SELECT * FROM oeffentliche_ip_konfigurationen WHERE geraet_id = ?',
    [geraetId]
  );

  const result = [];
  for (let config of oeffentlicheConfigs) {
    const ipConfig = {
      id: config.id,
      typ: config.typ,
      aktiv: Boolean(config.aktiv),
      bemerkungen: config.bemerkungen
    };

    if (config.typ === 'einzelip') {
      ipConfig.einzelIP = {
        dynamisch: Boolean(config.einzelip_dynamisch),
        adresse: config.einzelip_adresse,
        dyndnsAktiv: Boolean(config.einzelip_dyndns_aktiv),
        dyndnsAdresse: config.einzelip_dyndns_adresse
      };
    } else if (config.typ === 'subnet') {
      // Nutzbare IPs für Subnet laden
      const nutzbareIPs = await db.all(
        'SELECT * FROM oeffentliche_ips WHERE oeffentliche_ip_konfiguration_id = ?',
        [config.id]
      );

      ipConfig.subnet = {
        netzwerkadresse: config.subnet_netzwerkadresse,
        gateway: config.subnet_gateway,
        nutzbareIPs: nutzbareIPs.map(ip => ({
          id: ip.id,
          ipAdresse: ip.ip_adresse,
          verwendung: ip.verwendung,
          belegt: Boolean(ip.belegt),
          bemerkungen: ip.bemerkungen
        }))
      };
    }

    result.push(ipConfig);
  }

  return result;
};

// Erweiterte IP-Konfigurationen speichern
const saveIPKonfigurationen = async (geraetId, ipKonfigurationen) => {
  for (let ipConfig of ipKonfigurationen) {
    const ipConfigId = ipConfig.id || uuidv4();
    
    // DNS-Server zu JSON konvertieren
    const dnsServerJSON = ipConfig.dnsServer && Array.isArray(ipConfig.dnsServer) 
      ? JSON.stringify(ipConfig.dnsServer) 
      : null;

    // IP-Konfiguration speichern
    await db.run(`
      INSERT OR REPLACE INTO ip_konfigurationen (
        id, geraet_id, name, port_nummer, typ, ip_adresse, netzwerkbereich, 
        gateway, dns_server, prioritaet, aktiv, bemerkungen
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ipConfigId,
      geraetId,
      ipConfig.name || '',
      ipConfig.portNummer || 1,
      ipConfig.typ || 'dhcp',
      ipConfig.ipAdresse || null,
      ipConfig.netzwerkbereich || '',
      ipConfig.gateway || null,
      dnsServerJSON,
      ipConfig.prioritaet || 1,
      ipConfig.aktiv ? 1 : 0,
      ipConfig.bemerkungen || null
    ]);

    // VLAN-Konfiguration speichern falls vorhanden
    if (ipConfig.vlan && ipConfig.vlan.vlanId) {
      // Existierende VLAN-Konfiguration löschen
      await db.run(
        'DELETE FROM vlan_konfigurationen WHERE ip_konfiguration_id = ?',
        [ipConfigId]
      );

      // Neue VLAN-Konfiguration speichern
      await db.run(`
        INSERT INTO vlan_konfigurationen (
          id, ip_konfiguration_id, vlan_id, vlan_name, tagged, nac_zugewiesen, bemerkungen
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(),
        ipConfigId,
        ipConfig.vlan.vlanId,
        ipConfig.vlan.vlanName || null,
        ipConfig.vlan.tagged ? 1 : 0,
        ipConfig.vlan.nacZugewiesen ? 1 : 0,
        ipConfig.vlan.bemerkungen || null
      ]);
    }
  }
};

// Erweiterte öffentliche IP-Konfigurationen speichern
const saveOeffentlicheIPKonfigurationen = async (geraetId, oeffentlicheIPKonfigurationen) => {
  for (let ipConfig of oeffentlicheIPKonfigurationen) {
    const configId = ipConfig.id || uuidv4();

    // Grundlegende öffentliche IP-Konfiguration speichern
    await db.run(`
      INSERT OR REPLACE INTO oeffentliche_ip_konfigurationen (
        id, geraet_id, typ, aktiv, bemerkungen,
        einzelip_dynamisch, einzelip_adresse, einzelip_dyndns_aktiv, einzelip_dyndns_adresse,
        subnet_netzwerkadresse, subnet_gateway
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      configId,
      geraetId,
      ipConfig.typ,
      ipConfig.aktiv ? 1 : 0,
      ipConfig.bemerkungen || null,
      // Einzelne IP Felder
      ipConfig.einzelIP?.dynamisch ? 1 : 0,
      ipConfig.einzelIP?.adresse || null,
      ipConfig.einzelIP?.dyndnsAktiv ? 1 : 0,
      ipConfig.einzelIP?.dyndnsAdresse || null,
      // Subnet Felder
      ipConfig.subnet?.netzwerkadresse || null,
      ipConfig.subnet?.gateway || null
    ]);

    // Nutzbare IPs für Subnet-Konfigurationen speichern
    if (ipConfig.typ === 'subnet' && ipConfig.subnet?.nutzbareIPs) {
      // Existierende IPs löschen
      await db.run(
        'DELETE FROM oeffentliche_ips WHERE oeffentliche_ip_konfiguration_id = ?',
        [configId]
      );

      // Neue IPs speichern
      for (let ip of ipConfig.subnet.nutzbareIPs) {
        await db.run(`
          INSERT INTO oeffentliche_ips (
            id, oeffentliche_ip_konfiguration_id, ip_adresse, verwendung, belegt, bemerkungen
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          ip.id || uuidv4(),
          configId,
          ip.ipAdresse || '',
          ip.verwendung || null,
          ip.belegt ? 1 : 0,
          ip.bemerkungen || null
        ]);
      }
    }
  }
};

// =================== STANDORT API ===================

// Alle Standorte abrufen
app.get('/api/standorte', async (req, res) => {
  try {
    const standorte = await db.all(`
      SELECT s.*, 
             COUNT(DISTINCT g.id) as anzahlGeraete,
             COUNT(DISTINCT v.id) as anzahlVerbindungen,
             ap_it.name as ansprechpartner_it_name,
             ap_it.telefon as ansprechpartner_it_telefon,
             ap_it.email as ansprechpartner_it_email,
             ap_vor_ort.name as ansprechpartner_vor_ort_name,
             ap_vor_ort.telefon as ansprechpartner_vor_ort_telefon,
             ap_vor_ort.email as ansprechpartner_vor_ort_email
      FROM standorte s
      LEFT JOIN geraete g ON s.id = g.standort_id
      LEFT JOIN verbindungen v ON s.id = v.standort_id
      LEFT JOIN ansprechpartner ap_it ON s.ansprechpartner_it_id = ap_it.id
      LEFT JOIN ansprechpartner ap_vor_ort ON s.ansprechpartner_vor_ort_id = ap_vor_ort.id
      GROUP BY s.id
      ORDER BY s.name
    `);

    // Uplinks automatisch aus Geräten zusammenstellen
    for (let standort of standorte) {
      // Automatische Uplink-Erkennung - keine separaten Uplinks mehr erforderlich
      standort.verfuegbareUplinks = [];
      
      // Ansprechpartner Struktur anpassen (für Rückwärtskompatibilität)
      standort.ansprechpartner = {
        name: standort.ansprechpartner_name,
        telefon: standort.ansprechpartner_telefon,
        email: standort.ansprechpartner_email
      };

      // Neue Ansprechpartner-Struktur
      standort.ansprechpartnerIT = standort.ansprechpartner_it_id ? {
        id: standort.ansprechpartner_it_id,
        name: standort.ansprechpartner_it_name,
        telefon: standort.ansprechpartner_it_telefon,
        email: standort.ansprechpartner_it_email
      } : null;

      standort.ansprechpartnerVorOrt = standort.ansprechpartner_vor_ort_id ? {
        id: standort.ansprechpartner_vor_ort_id,
        name: standort.ansprechpartner_vor_ort_name,
        telefon: standort.ansprechpartner_vor_ort_telefon,
        email: standort.ansprechpartner_vor_ort_email
      } : null;
      
      // hostname_prefix zu hostnamePrefix konvertieren
      standort.hostnamePrefix = standort.hostname_prefix;
      
      // standard_netzbereich zu standardNetzbereich konvertieren
      standort.standardNetzbereich = standort.standard_netzbereich;
      
      // Alte Properties entfernen
      delete standort.ansprechpartner_name;
      delete standort.ansprechpartner_telefon;
      delete standort.ansprechpartner_email;
      delete standort.ansprechpartner_it_id;
      delete standort.ansprechpartner_vor_ort_id;
      delete standort.hostname_prefix;
      delete standort.standard_netzbereich;
    }

    res.json(createResponse(true, standorte));
  } catch (error) {
    console.error('Fehler beim Abrufen der Standorte:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Einzelnen Standort abrufen
app.get('/api/standorte/:id', async (req, res) => {
  try {
    const standort = await db.get(
      'SELECT * FROM standorte WHERE id = ?',
      [req.params.id]
    );

    if (!standort) {
      return res.status(404).json(createResponse(false, null, 'Standort nicht gefunden'));
    }

    // Automatische Uplink-Erkennung - keine separaten Uplinks mehr erforderlich
    standort.verfuegbareUplinks = [];
    
    // Ansprechpartner laden
    if (standort.ansprechpartner_it_id) {
      const ansprechpartnerIT = await db.get(
        'SELECT * FROM ansprechpartner WHERE id = ?',
        [standort.ansprechpartner_it_id]
      );
      if (ansprechpartnerIT) {
        standort.ansprechpartnerIT = {
          id: ansprechpartnerIT.id,
          name: ansprechpartnerIT.name,
          telefon: ansprechpartnerIT.telefon,
          email: ansprechpartnerIT.email
        };
      }
    }
    
    if (standort.ansprechpartner_vor_ort_id) {
      const ansprechpartnerVorOrt = await db.get(
        'SELECT * FROM ansprechpartner WHERE id = ?',
        [standort.ansprechpartner_vor_ort_id]
      );
      if (ansprechpartnerVorOrt) {
        standort.ansprechpartnerVorOrt = {
          id: ansprechpartnerVorOrt.id,
          name: ansprechpartnerVorOrt.name,
          telefon: ansprechpartnerVorOrt.telefon,
          email: ansprechpartnerVorOrt.email
        };
      }
    }
    
    // Ansprechpartner Struktur anpassen (Fallback für altes Format)
    standort.ansprechpartner = {
      name: standort.ansprechpartner_name,
      telefon: standort.ansprechpartner_telefon,
      email: standort.ansprechpartner_email
    };
    
    // hostname_prefix zu hostnamePrefix konvertieren
    standort.hostnamePrefix = standort.hostname_prefix;
    
    // standard_netzbereich zu standardNetzbereich konvertieren
    standort.standardNetzbereich = standort.standard_netzbereich;
    
    // Alte Properties entfernen
    delete standort.ansprechpartner_name;
    delete standort.ansprechpartner_telefon;
    delete standort.ansprechpartner_email;
    delete standort.ansprechpartner_it_id;
    delete standort.ansprechpartner_vor_ort_id;
    delete standort.hostname_prefix;
    delete standort.standard_netzbereich;

    res.json(createResponse(true, standort));
  } catch (error) {
    console.error('Fehler beim Abrufen des Standorts:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Neuen Standort erstellen
app.post('/api/standorte', async (req, res) => {
  try {
    const {
      name,
      adresse,
      ansprechpartner,
      ansprechpartnerITId,
      ansprechpartnerVorOrtId,
      hostnamePrefix,
      standardNetzbereich
    } = req.body;

    const standortId = uuidv4();

    await db.beginTransaction();

    // Standort erstellen
    await db.run(`
      INSERT INTO standorte (
        id, name, adresse, ansprechpartner_name, 
        ansprechpartner_telefon, ansprechpartner_email,
        ansprechpartner_it_id, ansprechpartner_vor_ort_id, hostname_prefix, standard_netzbereich
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      standortId,
      name,
      adresse,
      ansprechpartner?.name || '',
      ansprechpartner?.telefon || '',
      ansprechpartner?.email || '',
      ansprechpartnerITId || null,
      ansprechpartnerVorOrtId || null,
      hostnamePrefix || null,
      standardNetzbereich || null
    ]);

    // Uplinks werden automatisch aus Router/SD-WAN Geräten erkannt - keine separaten Einträge mehr

    await db.commit();

    res.status(201).json(createResponse(true, { id: standortId }, 'Standort erfolgreich erstellt'));
  } catch (error) {
    await db.rollback();
    console.error('Fehler beim Erstellen des Standorts:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Standort bearbeiten
app.put('/api/standorte/:id', async (req, res) => {
  try {
    const {
      name,
      adresse,
      ansprechpartner,
      ansprechpartnerITId,
      ansprechpartnerVorOrtId,
      hostnamePrefix,
      standardNetzbereich
    } = req.body;

    const standortId = req.params.id;

    await db.beginTransaction();

    // Standort aktualisieren
    await db.run(`
      UPDATE standorte SET 
        name = ?, adresse = ?, ansprechpartner_name = ?, 
        ansprechpartner_telefon = ?, ansprechpartner_email = ?,
        ansprechpartner_it_id = ?, ansprechpartner_vor_ort_id = ?, hostname_prefix = ?, standard_netzbereich = ?
      WHERE id = ?
    `, [
      name,
      adresse,
      ansprechpartner?.name || '',
      ansprechpartner?.telefon || '',
      ansprechpartner?.email || '',
      ansprechpartnerITId || null,
      ansprechpartnerVorOrtId || null,
      hostnamePrefix || null,
      standardNetzbereich || null,
      standortId
    ]);

    // Uplinks werden automatisch aus Router/SD-WAN Geräten erkannt - keine separaten Einträge mehr

    await db.commit();

    res.json(createResponse(true, null, 'Standort erfolgreich aktualisiert'));
  } catch (error) {
    await db.rollback();
    console.error('Fehler beim Aktualisieren des Standorts:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== GERÄTE API ===================

// Alle Geräte eines Standorts abrufen
app.get('/api/standorte/:standortId/geraete', async (req, res) => {
  try {
    const geraeteRows = await db.all(
      'SELECT * FROM geraete WHERE standort_id = ? ORDER BY name',
      [req.params.standortId]
    );

    // Port-Belegungen und erweiterte IP-Konfigurationen für jedes Gerät laden
    const geraete = [];
    for (let geraetRow of geraeteRows) {
      const ports = await db.all(
        'SELECT * FROM port_belegungen WHERE geraet_id = ? ORDER BY port_nummer',
        [geraetRow.id]
      );

      // Erweiterte IP-Konfigurationen laden
      const ipKonfigurationen = await loadIPKonfigurationen(geraetRow.id);
      
      // Erweiterte öffentliche IP-Konfigurationen laden
      const oeffentlicheIPKonfigurationen = await loadOeffentlicheIPKonfigurationen(geraetRow.id);

      // Datenbank-Felder zu Frontend-Format konvertieren
      const geraet = {
        id: geraetRow.id,
        standortId: geraetRow.standort_id,
        name: geraetRow.name,
        hostname: geraetRow.hostname,
        geraetetyp: geraetRow.geraetetyp,
        modell: geraetRow.modell,
        seriennummer: geraetRow.seriennummer,
        standortDetails: geraetRow.standort_details,
        bemerkungen: geraetRow.bemerkungen,
        
        // IT/OT-spezifische Eigenschaften
        purdueLevel: geraetRow.purdue_level || 'Nicht definiert',
        securityZone: geraetRow.security_zone || 'Nicht definiert',
        geraetekategorie: geraetRow.geraetekategorie || 'IT',
        
        // Neue erweiterte IP-Konfigurationen
        ipKonfigurationen,
        oeffentlicheIPKonfigurationen,
        
        // Legacy-Kompatibilität für alte ipKonfiguration
        ipKonfiguration: {
          typ: geraetRow.ip_typ || 'dhcp',
          ipAdresse: geraetRow.ip_adresse,
          netzwerkbereich: geraetRow.netzwerkbereich
        },
        
        macAdresse: geraetRow.mac_adresse,
        anzahlNetzwerkports: geraetRow.anzahl_netzwerkports || 0,
        
        // Legacy Router-spezifische öffentliche IP-Konfiguration
        hatOeffentlicheIp: Boolean(geraetRow.hat_oeffentliche_ip),
        oeffentlicheIpTyp: geraetRow.oeffentliche_ip_typ,
        dyndnsAktiv: Boolean(geraetRow.dyndns_aktiv),
        dyndnsAdresse: geraetRow.dyndns_adresse,
        statischeOeffentlicheIp: geraetRow.statische_oeffentliche_ip,
        
        position: {
          x: geraetRow.position_x,
          y: geraetRow.position_y
        },
        rackPosition: {
          rack: geraetRow.rack_name,
          einheit: geraetRow.rack_einheit
        },
        belegteports: ports.map(port => ({
          id: port.id,
          portNummer: port.port_nummer,
          verbindungId: port.verbindung_id,
          beschreibung: port.beschreibung,
          belegt: Boolean(port.belegt),
          portTyp: port.port_typ || 'RJ45',
          geschwindigkeit: port.geschwindigkeit || '1G',
          label: port.label || ''
        })),
        
        // Zeitstempel
        erstelltAm: geraetRow.erstellt_am,
        aktualisiertAm: geraetRow.aktualisiert_am
      };

      geraete.push(geraet);
    }

    res.json(createResponse(true, geraete));
  } catch (error) {
    console.error('Fehler beim Abrufen der Geräte:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Neues Gerät erstellen
app.post('/api/standorte/:standortId/geraete', async (req, res) => {
  try {
    const {
      name,
      hostname,
      geraetetyp,
      modell,
      seriennummer,
      standortDetails,
      bemerkungen,
      purdueLevel,
      securityZone,
      geraetekategorie,
      ipKonfiguration,
      ipKonfigurationen,
      oeffentlicheIPKonfigurationen,
      macAdresse,
      anzahlNetzwerkports,
      position,
      rackPosition,
      belegteports,
      hatOeffentlicheIp,
      oeffentlicheIpTyp,
      dyndnsAktiv,
      dyndnsAdresse,
      statischeOeffentlicheIp
    } = req.body;

    const geraetId = uuidv4();

    await db.beginTransaction();

    // Gerät erstellen
    await db.run(`
      INSERT INTO geraete (
        id, standort_id, name, hostname, geraetetyp, modell, seriennummer, standort_details, bemerkungen,
        purdue_level, security_zone, geraetekategorie,
        ip_typ, ip_adresse, netzwerkbereich, mac_adresse, anzahl_netzwerkports,
        position_x, position_y, rack_name, rack_einheit,
        hat_oeffentliche_ip, oeffentliche_ip_typ, dyndns_aktiv, dyndns_adresse, statische_oeffentliche_ip
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      geraetId,
      req.params.standortId,
      name,
      hostname || null,
      geraetetyp,
      modell,
      seriennummer || null,
      standortDetails || null,
      bemerkungen || null,
      purdueLevel || 'Nicht definiert',
      securityZone || 'Nicht definiert',
      geraetekategorie || 'IT',
      ipKonfiguration?.typ || 'dhcp',
      ipKonfiguration?.ipAdresse || null,
      ipKonfiguration?.netzwerkbereich || null,
      macAdresse || null,
      anzahlNetzwerkports || 0,
      position?.x || null,
      position?.y || null,
      rackPosition?.rack || null,
      rackPosition?.einheit || null,
      hatOeffentlicheIp ? 1 : 0,
      oeffentlicheIpTyp || null,
      dyndnsAktiv ? 1 : 0,
      dyndnsAdresse || null,
      statischeOeffentlicheIp || null
    ]);

    // Port-Belegungen mit Konfiguration initialisieren
    if (belegteports && Array.isArray(belegteports)) {
      // Verwende die mitgeschickten Port-Konfigurationen
      for (const port of belegteports) {
        await db.run(`
          INSERT INTO port_belegungen (id, geraet_id, port_nummer, belegt, port_typ, geschwindigkeit, beschreibung, label)
          VALUES (?, ?, ?, 0, ?, ?, ?, ?)
        `, [
          uuidv4(), 
          geraetId, 
          port.portNummer,
          port.portTyp || 'RJ45',
          port.geschwindigkeit || '1G',
          port.beschreibung || '',
          port.label || ''
        ]);
      }
    } else {
      // Fallback: Standard-Ports erstellen
      for (let portNr = 1; portNr <= (anzahlNetzwerkports || 0); portNr++) {
        await db.run(`
          INSERT INTO port_belegungen (id, geraet_id, port_nummer, belegt, port_typ, geschwindigkeit, label)
          VALUES (?, ?, ?, 0, 'RJ45', '1G', '')
        `, [uuidv4(), geraetId, portNr]);
      }
    }

    // Erweiterte IP-Konfigurationen speichern
    if (ipKonfigurationen && Array.isArray(ipKonfigurationen)) {
      await saveIPKonfigurationen(geraetId, ipKonfigurationen);
    }

    // Erweiterte öffentliche IP-Konfigurationen speichern
    if (oeffentlicheIPKonfigurationen && Array.isArray(oeffentlicheIPKonfigurationen)) {
      await saveOeffentlicheIPKonfigurationen(geraetId, oeffentlicheIPKonfigurationen);
    }

    await db.commit();

    res.status(201).json(createResponse(true, { id: geraetId }, 'Gerät erfolgreich erstellt'));
  } catch (error) {
    await db.rollback();
    console.error('Fehler beim Erstellen des Geräts:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Gerät bearbeiten
app.put('/api/geraete/:id', async (req, res) => {
  try {
    const {
      name,
      hostname,
      geraetetyp,
      modell,
      seriennummer,
      standortDetails,
      bemerkungen,
      purdueLevel,
      securityZone,
      geraetekategorie,
      ipKonfiguration,
      ipKonfigurationen,
      oeffentlicheIPKonfigurationen,
      macAdresse,
      anzahlNetzwerkports,
      position,
      rackPosition,
      belegteports,
      hatOeffentlicheIp,
      oeffentlicheIpTyp,
      dyndnsAktiv,
      dyndnsAdresse,
      statischeOeffentlicheIp
    } = req.body;

    const geraetId = req.params.id;

    await db.beginTransaction();

    // Aktuelles Gerät abrufen
    const altesGeraet = await db.get('SELECT * FROM geraete WHERE id = ?', [geraetId]);
    if (!altesGeraet) {
      await db.rollback();
      return res.status(404).json(createResponse(false, null, 'Gerät nicht gefunden'));
    }

    // Gerät aktualisieren
    await db.run(`
      UPDATE geraete SET 
        name = ?, hostname = ?, geraetetyp = ?, modell = ?, seriennummer = ?, standort_details = ?, bemerkungen = ?,
        purdue_level = ?, security_zone = ?, geraetekategorie = ?,
        ip_typ = ?, ip_adresse = ?, netzwerkbereich = ?, mac_adresse = ?, anzahl_netzwerkports = ?,
        position_x = ?, position_y = ?, rack_name = ?, rack_einheit = ?,
        hat_oeffentliche_ip = ?, oeffentliche_ip_typ = ?, dyndns_aktiv = ?, dyndns_adresse = ?, statische_oeffentliche_ip = ?
      WHERE id = ?
    `, [
      name,
      hostname || null,
      geraetetyp,
      modell,
      seriennummer || null,
      standortDetails || null,
      bemerkungen || null,
      purdueLevel || altesGeraet.purdue_level || 'Nicht definiert',
      securityZone || altesGeraet.security_zone || 'Nicht definiert',
      geraetekategorie || altesGeraet.geraetekategorie || 'IT',
      ipKonfiguration?.typ || 'dhcp',
      ipKonfiguration?.ipAdresse || null,
      ipKonfiguration?.netzwerkbereich || null,
      macAdresse || null,
      anzahlNetzwerkports || 0,
      position?.x || altesGeraet.position_x,
      position?.y || altesGeraet.position_y,
      rackPosition?.rack || null,
      rackPosition?.einheit || null,
      hatOeffentlicheIp ? 1 : 0,
      oeffentlicheIpTyp || null,
      dyndnsAktiv ? 1 : 0,
      dyndnsAdresse || null,
      statischeOeffentlicheIp || null,
      geraetId
    ]);

    // Wenn sich die Anzahl der Ports geändert hat, Port-Belegungen anpassen
    const neuePortAnzahl = anzahlNetzwerkports || 0;
    const altePortAnzahl = altesGeraet.anzahl_netzwerkports || 0;
    
    if (neuePortAnzahl !== altePortAnzahl) {
      if (neuePortAnzahl > altePortAnzahl) {
        // Neue Ports hinzufügen
        for (let portNr = altePortAnzahl + 1; portNr <= neuePortAnzahl; portNr++) {
          await db.run(`
            INSERT INTO port_belegungen (id, geraet_id, port_nummer, belegt, port_typ, geschwindigkeit, label)
            VALUES (?, ?, ?, 0, 'RJ45', '1G', '')
          `, [uuidv4(), geraetId, portNr]);
        }
      } else {
        // Überschüssige Ports löschen (nur die freien)
        await db.run(`
          DELETE FROM port_belegungen 
          WHERE geraet_id = ? AND port_nummer > ? AND belegt = 0
        `, [geraetId, neuePortAnzahl]);
      }
    }

    // Port-Konfiguration aktualisieren, falls vorhanden
    if (belegteports && Array.isArray(belegteports)) {
      for (const port of belegteports) {
        await db.run(`
          UPDATE port_belegungen 
          SET port_typ = ?, geschwindigkeit = ?, beschreibung = ?, label = ?
          WHERE geraet_id = ? AND port_nummer = ?
        `, [
          port.portTyp || 'RJ45',
          port.geschwindigkeit || '1G',
          port.beschreibung || '',
          port.label || '',
          geraetId,
          port.portNummer
        ]);
      }
    }

    // Erweiterte IP-Konfigurationen aktualisieren
    if (ipKonfigurationen && Array.isArray(ipKonfigurationen)) {
      // Alte IP-Konfigurationen löschen
      await db.run('DELETE FROM ip_konfigurationen WHERE geraet_id = ?', [geraetId]);
      // Neue IP-Konfigurationen speichern
      await saveIPKonfigurationen(geraetId, ipKonfigurationen);
    }

    // Erweiterte öffentliche IP-Konfigurationen aktualisieren
    if (oeffentlicheIPKonfigurationen && Array.isArray(oeffentlicheIPKonfigurationen)) {
      // Alte öffentliche IP-Konfigurationen löschen
      await db.run('DELETE FROM oeffentliche_ip_konfigurationen WHERE geraet_id = ?', [geraetId]);
      // Neue öffentliche IP-Konfigurationen speichern
      await saveOeffentlicheIPKonfigurationen(geraetId, oeffentlicheIPKonfigurationen);
    }

    await db.commit();

    res.json(createResponse(true, null, 'Gerät erfolgreich aktualisiert'));
  } catch (error) {
    await db.rollback();
    console.error('Fehler beim Aktualisieren des Geräts:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Gerät löschen
app.delete('/api/geraete/:id', async (req, res) => {
  try {
    const geraetId = req.params.id;

    // Prüfen ob das Gerät existiert
    const geraet = await db.get('SELECT id, name, standort_id FROM geraete WHERE id = ?', [geraetId]);
    if (!geraet) {
      return res.status(404).json(createResponse(false, null, 'Gerät nicht gefunden'));
    }

    // Gerät löschen - alle abhängigen Datensätze werden automatisch durch CASCADE gelöscht
    const result = await db.run('DELETE FROM geraete WHERE id = ?', [geraetId]);
    
    if (result.changes === 0) {
      return res.status(404).json(createResponse(false, null, 'Gerät konnte nicht gelöscht werden'));
    }

    res.json(createResponse(true, null, `Gerät "${geraet.name}" und alle zugehörigen Daten erfolgreich gelöscht`));
  } catch (error) {
    console.error('Fehler beim Löschen des Geräts:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== IP-KONFIGURATION API ===================

// IP-Konfigurationen eines Geräts abrufen
app.get('/api/geraete/:geraetId/ip-konfigurationen', async (req, res) => {
  try {
    const ipKonfigurationen = await loadIPKonfigurationen(req.params.geraetId);
    res.json(createResponse(true, ipKonfigurationen));
  } catch (error) {
    console.error('Fehler beim Abrufen der IP-Konfigurationen:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// IP-Konfiguration erstellen/aktualisieren
app.post('/api/geraete/:geraetId/ip-konfigurationen', async (req, res) => {
  try {
    const { ipKonfigurationen } = req.body;
    const geraetId = req.params.geraetId;

    await db.beginTransaction();

    // Alte IP-Konfigurationen löschen
    await db.run('DELETE FROM ip_konfigurationen WHERE geraet_id = ?', [geraetId]);
    
    // Neue IP-Konfigurationen speichern
    if (ipKonfigurationen && Array.isArray(ipKonfigurationen)) {
      await saveIPKonfigurationen(geraetId, ipKonfigurationen);
    }

    await db.commit();

    res.json(createResponse(true, null, 'IP-Konfigurationen erfolgreich gespeichert'));
  } catch (error) {
    await db.rollback();
    console.error('Fehler beim Speichern der IP-Konfigurationen:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Öffentliche IP-Konfigurationen eines Geräts abrufen
app.get('/api/geraete/:geraetId/oeffentliche-ip-konfigurationen', async (req, res) => {
  try {
    const oeffentlicheIPKonfigurationen = await loadOeffentlicheIPKonfigurationen(req.params.geraetId);
    res.json(createResponse(true, oeffentlicheIPKonfigurationen));
  } catch (error) {
    console.error('Fehler beim Abrufen der öffentlichen IP-Konfigurationen:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Öffentliche IP-Konfiguration erstellen/aktualisieren
app.post('/api/geraete/:geraetId/oeffentliche-ip-konfigurationen', async (req, res) => {
  try {
    const { oeffentlicheIPKonfigurationen } = req.body;
    const geraetId = req.params.geraetId;

    await db.beginTransaction();

    // Alte öffentliche IP-Konfigurationen löschen
    await db.run('DELETE FROM oeffentliche_ip_konfigurationen WHERE geraet_id = ?', [geraetId]);
    
    // Neue öffentliche IP-Konfigurationen speichern
    if (oeffentlicheIPKonfigurationen && Array.isArray(oeffentlicheIPKonfigurationen)) {
      await saveOeffentlicheIPKonfigurationen(geraetId, oeffentlicheIPKonfigurationen);
    }

    await db.commit();

    res.json(createResponse(true, null, 'Öffentliche IP-Konfigurationen erfolgreich gespeichert'));
  } catch (error) {
    await db.rollback();
    console.error('Fehler beim Speichern der öffentlichen IP-Konfigurationen:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== VERBINDUNGEN API ===================

// Alle Verbindungen eines Standorts abrufen
app.get('/api/standorte/:standortId/verbindungen', async (req, res) => {
  try {
    const verbindungen = await db.all(`
      SELECT v.*, 
             g1.name as quell_geraet_name,
             g2.name as ziel_geraet_name
      FROM verbindungen v
      JOIN geraete g1 ON v.quell_geraet_id = g1.id
      JOIN geraete g2 ON v.ziel_geraet_id = g2.id
      WHERE v.standort_id = ?
      ORDER BY g1.name, v.quell_port
    `, [req.params.standortId]);

    res.json(createResponse(true, verbindungen));
  } catch (error) {
    console.error('Fehler beim Abrufen der Verbindungen:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Verbindungen für ein spezifisches Gerät abrufen
app.get('/api/geraete/:geraetId/verbindungen', async (req, res) => {
  try {
    const verbindungen = await db.all(`
      SELECT v.*, 
             CASE 
               WHEN v.quell_geraet_id = ? THEN g2.name
               ELSE g1.name
             END as verbundenes_geraet_name,
             CASE 
               WHEN v.quell_geraet_id = ? THEN v.ziel_port
               ELSE v.quell_port
             END as verbundener_port,
             CASE 
               WHEN v.quell_geraet_id = ? THEN 'ausgehend'
               ELSE 'eingehend'
             END as richtung,
             CASE 
               WHEN v.quell_geraet_id = ? THEN v.quell_port
               ELSE v.ziel_port
             END as eigener_port,
             CASE 
               WHEN v.quell_geraet_id = ? THEN zp.label
               ELSE qp.label
             END as remote_port_label
      FROM verbindungen v
      JOIN geraete g1 ON v.quell_geraet_id = g1.id
      JOIN geraete g2 ON v.ziel_geraet_id = g2.id
      LEFT JOIN port_belegungen qp ON v.quell_geraet_id = qp.geraet_id AND v.quell_port = qp.port_nummer
      LEFT JOIN port_belegungen zp ON v.ziel_geraet_id = zp.geraet_id AND v.ziel_port = zp.port_nummer
      WHERE v.quell_geraet_id = ? OR v.ziel_geraet_id = ?
      ORDER BY eigener_port
    `, [req.params.geraetId, req.params.geraetId, req.params.geraetId, req.params.geraetId, req.params.geraetId, req.params.geraetId, req.params.geraetId]);

    res.json(createResponse(true, verbindungen));
  } catch (error) {
    console.error('Fehler beim Abrufen der Geräte-Verbindungen:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Neue Verbindung erstellen
app.post('/api/standorte/:standortId/verbindungen', async (req, res) => {
  try {
    const {
      quellGeraetId,
      quellPort,
      zielGeraetId,
      zielPort,
      kabeltyp,
      kabeleigenschaften,
      bemerkungen
    } = req.body;

    const verbindungId = uuidv4();

    await db.beginTransaction();

    // Prüfen ob Ports bereits belegt sind
    const quellPortBelegt = await db.get(`
      SELECT belegt FROM port_belegungen 
      WHERE geraet_id = ? AND port_nummer = ?
    `, [quellGeraetId, quellPort]);

    const zielPortBelegt = await db.get(`
      SELECT belegt FROM port_belegungen 
      WHERE geraet_id = ? AND port_nummer = ?
    `, [zielGeraetId, zielPort]);

    if (quellPortBelegt?.belegt || zielPortBelegt?.belegt) {
      await db.rollback();
      return res.status(400).json(createResponse(false, null, 'Ein oder beide Ports sind bereits belegt'));
    }

    // Verbindung erstellen
    await db.run(`
      INSERT INTO verbindungen (
        id, standort_id, quell_geraet_id, quell_port, ziel_geraet_id, ziel_port,
        kabeltyp, kabel_laenge, kabel_farbe, kabel_kategorie, bemerkungen
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      verbindungId,
      req.params.standortId,
      quellGeraetId,
      quellPort,
      zielGeraetId,
      zielPort,
      kabeltyp,
      kabeleigenschaften?.laenge || null,
      kabeleigenschaften?.farbe || null,
      kabeleigenschaften?.kategorie || null,
      bemerkungen || null
    ]);

    // Ports als belegt markieren
    await db.run(`
      UPDATE port_belegungen 
      SET belegt = 1, verbindung_id = ? 
      WHERE geraet_id = ? AND port_nummer = ?
    `, [verbindungId, quellGeraetId, quellPort]);

    await db.run(`
      UPDATE port_belegungen 
      SET belegt = 1, verbindung_id = ? 
      WHERE geraet_id = ? AND port_nummer = ?
    `, [verbindungId, zielGeraetId, zielPort]);

    await db.commit();

    res.status(201).json(createResponse(true, { id: verbindungId }, 'Verbindung erfolgreich erstellt'));
  } catch (error) {
    await db.rollback();
    console.error('Fehler beim Erstellen der Verbindung:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Verbindung löschen
app.delete('/api/verbindungen/:id', async (req, res) => {
  try {
    await db.beginTransaction();

    // Verbindungsdetails abrufen
    const verbindung = await db.get(
      'SELECT * FROM verbindungen WHERE id = ?',
      [req.params.id]
    );

    if (!verbindung) {
      await db.rollback();
      return res.status(404).json(createResponse(false, null, 'Verbindung nicht gefunden'));
    }

    // Ports als frei markieren
    await db.run(`
      UPDATE port_belegungen 
      SET belegt = 0, verbindung_id = NULL 
      WHERE geraet_id = ? AND port_nummer = ?
    `, [verbindung.quell_geraet_id, verbindung.quell_port]);

    await db.run(`
      UPDATE port_belegungen 
      SET belegt = 0, verbindung_id = NULL 
      WHERE geraet_id = ? AND port_nummer = ?
    `, [verbindung.ziel_geraet_id, verbindung.ziel_port]);

    // Verbindung löschen
    await db.run('DELETE FROM verbindungen WHERE id = ?', [req.params.id]);

    await db.commit();

    res.json(createResponse(true, null, 'Verbindung erfolgreich gelöscht'));
  } catch (error) {
    await db.rollback();
    console.error('Fehler beim Löschen der Verbindung:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Verbindung aktualisieren
app.put('/api/verbindungen/:id', async (req, res) => {
  try {
    const {
      kabeltyp,
      kabeleigenschaften,
      bemerkungen
    } = req.body;

    // Prüfen ob Verbindung existiert
    const existierend = await db.get(
      'SELECT * FROM verbindungen WHERE id = ?',
      [req.params.id]
    );

    if (!existierend) {
      return res.status(404).json(createResponse(false, null, 'Verbindung nicht gefunden'));
    }

    // Verbindung aktualisieren
    await db.run(`
      UPDATE verbindungen SET
        kabeltyp = ?,
        kabel_laenge = ?,
        kabel_farbe = ?,
        kabel_kategorie = ?,
        bemerkungen = ?
      WHERE id = ?
    `, [
      kabeltyp,
      kabeleigenschaften?.laenge || null,
      kabeleigenschaften?.farbe || null,
      kabeleigenschaften?.kategorie || null,
      bemerkungen || null,
      req.params.id
    ]);

    res.json(createResponse(true, null, 'Verbindung erfolgreich aktualisiert'));
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Verbindung:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== DIAGRAMM API ===================

// Netzwerkdiagramm-Daten für einen Standort abrufen
app.get('/api/standorte/:standortId/diagramm', async (req, res) => {
  try {
    const geraeteRows = await db.all(`
      SELECT id, name, geraetetyp, anzahl_netzwerkports, ip_adresse, position_x, position_y 
      FROM geraete WHERE standort_id = ?
    `, [req.params.standortId]);

    // Datenstruktur für Frontend konvertieren
    const geraete = geraeteRows.map(row => ({
      id: row.id,
      name: row.name,
      geraetetyp: row.geraetetyp,
      anzahlNetzwerkports: row.anzahl_netzwerkports || 0,
      ipKonfiguration: {
        ipAdresse: row.ip_adresse
      },
      position: {
        x: row.position_x,
        y: row.position_y
      }
    }));

    const verbindungenRows = await db.all(`
      SELECT v.*, g1.name as quell_name, g2.name as ziel_name
      FROM verbindungen v
      JOIN geraete g1 ON v.quell_geraet_id = g1.id
      JOIN geraete g2 ON v.ziel_geraet_id = g2.id
      WHERE v.standort_id = ?
    `, [req.params.standortId]);

    // Verbindungen konvertieren
    const verbindungen = verbindungenRows.map(row => ({
      id: row.id,
      standortId: row.standort_id,
      quellGeraetId: row.quell_geraet_id,
      quellPort: row.quell_port,
      zielGeraetId: row.ziel_geraet_id,
      zielPort: row.ziel_port,
      kabeltyp: row.kabeltyp,
      kabeleigenschaften: {
        laenge: row.kabel_laenge,
        farbe: row.kabel_farbe,
        kategorie: row.kabel_kategorie
      },
      bemerkungen: row.bemerkungen,
      quellName: row.quell_name,
      zielName: row.ziel_name
    }));

    res.json(createResponse(true, { geraete, verbindungen }));
  } catch (error) {
    console.error('Fehler beim Abrufen der Diagrammdaten:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Gerätepositionen aktualisieren
app.put('/api/geraete/:id/position', async (req, res) => {
  try {
    const { x, y } = req.body;

    await db.run(
      'UPDATE geraete SET position_x = ?, position_y = ? WHERE id = ?',
      [x, y, req.params.id]
    );

    res.json(createResponse(true, null, 'Position erfolgreich aktualisiert'));
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Position:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== SWITCH-STACK API ===================

// Alle Switch-Stacks eines Standorts abrufen
app.get('/api/standorte/:standortId/stacks', async (req, res) => {
  try {
    const stacks = await db.all(`
      SELECT s.*, 
             COUNT(sm.id) as anzahl_mitglieder
      FROM switch_stacks s
      LEFT JOIN stack_mitglieder sm ON s.id = sm.stack_id
      WHERE s.standort_id = ?
      GROUP BY s.id
      ORDER BY s.name
    `, [req.params.standortId]);

    // Für jeden Stack die Mitglieder und Verbindungen laden
    for (let stack of stacks) {
      // Mitglieder laden
      const mitglieder = await db.all(`
        SELECT sm.*, g.name as geraet_name, g.modell
        FROM stack_mitglieder sm
        JOIN geraete g ON sm.geraet_id = g.id
        WHERE sm.stack_id = ?
        ORDER BY sm.stack_nummer
      `, [stack.id]);

      // Stack-Verbindungen laden
      const stackVerbindungen = await db.all(`
        SELECT sv.*, 
               g1.name as quell_geraet_name,
               g2.name as ziel_geraet_name
        FROM stack_verbindungen sv
        JOIN geraete g1 ON sv.quell_geraet_id = g1.id
        JOIN geraete g2 ON sv.ziel_geraet_id = g2.id
        WHERE sv.stack_id = ?
      `, [stack.id]);

      stack.mitglieder = mitglieder;
      stack.stackVerbindungen = stackVerbindungen;
    }

    res.json(createResponse(true, stacks));
  } catch (error) {
    console.error('Fehler beim Abrufen der Switch-Stacks:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Neuen Switch-Stack erstellen
app.post('/api/standorte/:standortId/stacks', async (req, res) => {
  try {
    const { name, beschreibung, mitglieder, stackVerbindungen } = req.body;
    const stackId = uuidv4();

    console.log('Stack-Erstellung gestartet:', {
      name,
      standortId: req.params.standortId,
      mitgliederAnzahl: mitglieder?.length || 0,
      verbindungenAnzahl: stackVerbindungen?.length || 0
    });

    await db.beginTransaction();

    // Stack erstellen
    await db.run(`
      INSERT INTO switch_stacks (id, standort_id, name, beschreibung)
      VALUES (?, ?, ?, ?)
    `, [stackId, req.params.standortId, name, beschreibung || null]);

    // Mitglieder hinzufügen
    for (const mitglied of mitglieder) {
      await db.run(`
        INSERT INTO stack_mitglieder (id, stack_id, geraet_id, stack_nummer, prioritaet)
        VALUES (?, ?, ?, ?, ?)
      `, [uuidv4(), stackId, mitglied.geraetId, mitglied.stackNummer, mitglied.prioritaet || 0]);
    }

    // Stack-Verbindungen hinzufügen
    if (stackVerbindungen && stackVerbindungen.length > 0) {
      console.log('Füge Stack-Verbindungen hinzu:', stackVerbindungen.length);
      for (const verbindung of stackVerbindungen) {
        const stackVerbindungId = uuidv4();
        const normalVerbindungId = uuidv4();

        console.log('Erstelle Verbindung:', {
          von: verbindung.quellGeraetId,
          quellPort: verbindung.quellPort,
          zu: verbindung.zielGeraetId,
          zielPort: verbindung.zielPort,
          typ: verbindung.verbindungstyp
        });

        // 1. In stack_verbindungen Tabelle eintragen
        await db.run(`
          INSERT INTO stack_verbindungen (id, stack_id, quell_geraet_id, quell_port, ziel_geraet_id, ziel_port, verbindungstyp, kategorie, farbe, bemerkungen)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          stackVerbindungId,
          stackId,
          verbindung.quellGeraetId,
          verbindung.quellPort,
          verbindung.zielGeraetId,
          verbindung.zielPort,
          verbindung.verbindungstyp || 'SFP/SFP+',
          verbindung.kategorie || null,
          verbindung.farbe || null,
          `Stack-Verbindung: ${name}${verbindung.bemerkungen ? ` - ${verbindung.bemerkungen}` : ''}`
        ]);

        console.log('Stack-Verbindung eingefügt mit ID:', stackVerbindungId);

        // 2. Als normale Verbindung eintragen (für Sichtbarkeit in Verbindungsübersicht)
        await db.run(`
          INSERT INTO verbindungen (id, standort_id, quell_geraet_id, quell_port, ziel_geraet_id, ziel_port, kabeltyp, kabel_laenge, kabel_farbe, kabel_kategorie, bemerkungen)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          normalVerbindungId,
          req.params.standortId,
          verbindung.quellGeraetId,
          verbindung.quellPort,
          verbindung.zielGeraetId,
          verbindung.zielPort,
          verbindung.verbindungstyp === 'SFP/SFP+' ? 'SFP/SFP+' : (verbindung.verbindungstyp === 'RJ45' ? 'RJ45' : 'Sonstiges'),
          verbindung.verbindungstyp === 'SFP/SFP+' ? 1 : 3, // Standard-Längen
          verbindung.farbe || (verbindung.verbindungstyp === 'SFP/SFP+' ? 'Orange' : (verbindung.verbindungstyp === 'RJ45' ? 'Blau' : 'Grau')),
          verbindung.kategorie || (verbindung.verbindungstyp === 'SFP/SFP+' ? 'DAC' : 'Cat6a'),
          `Stack-Verbindung: ${name}${verbindung.bemerkungen ? ` - ${verbindung.bemerkungen}` : ''}`
        ]);

        console.log('Normale Verbindung eingefügt mit ID:', normalVerbindungId);

        // 3. Stack-Ports als belegt markieren mit Verbindungs-ID
        await db.run(`
          UPDATE port_belegungen 
          SET belegt = 1, beschreibung = 'Stack-Verbindung', verbindung_id = ?
          WHERE geraet_id = ? AND port_nummer = ?
        `, [normalVerbindungId, verbindung.quellGeraetId, verbindung.quellPort]);

        await db.run(`
          UPDATE port_belegungen 
          SET belegt = 1, beschreibung = 'Stack-Verbindung', verbindung_id = ?
          WHERE geraet_id = ? AND port_nummer = ?
        `, [normalVerbindungId, verbindung.zielGeraetId, verbindung.zielPort]);
      }
    }

    await db.commit();
    console.log('Stack-Erstellung erfolgreich abgeschlossen. Stack-ID:', stackId);

    res.status(201).json(createResponse(true, { id: stackId }, 'Switch-Stack erfolgreich erstellt'));
  } catch (error) {
    await db.rollback();
    console.error('Fehler beim Erstellen des Switch-Stacks:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Verfügbare Switches für Stack abrufen (nur Switches die noch nicht in einem Stack sind)
app.get('/api/standorte/:standortId/verfuegbare-switches', async (req, res) => {
  try {
    const switches = await db.all(`
      SELECT g.*
      FROM geraete g
      LEFT JOIN stack_mitglieder sm ON g.id = sm.geraet_id
      WHERE g.standort_id = ? 
        AND g.geraetetyp = 'Switch'
        AND sm.geraet_id IS NULL
      ORDER BY g.name
    `, [req.params.standortId]);

    // Datenstruktur für Frontend konvertieren
    const verfuegbareSwitches = switches.map(row => ({
      id: row.id,
      name: row.name,
      modell: row.modell,
      anzahlNetzwerkports: row.anzahl_netzwerkports || 0,
      ipKonfiguration: {
        ipAdresse: row.ip_adresse
      }
    }));

    res.json(createResponse(true, verfuegbareSwitches));
  } catch (error) {
    console.error('Fehler beim Abrufen der verfügbaren Switches:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Stack-Port-Bezeichnungen für ein Gerät in einem Stack abrufen
app.get('/api/stacks/:stackId/ports/:geraetId', async (req, res) => {
  try {
    const { stackId, geraetId } = req.params;

    // Stack-Nummer des Geräts abrufen
    const mitglied = await db.get(`
      SELECT stack_nummer FROM stack_mitglieder 
      WHERE stack_id = ? AND geraet_id = ?
    `, [stackId, geraetId]);

    if (!mitglied) {
      return res.status(404).json(createResponse(false, null, 'Gerät nicht im Stack gefunden'));
    }

    // Port-Belegungen abrufen
    const ports = await db.all(`
      SELECT * FROM port_belegungen 
      WHERE geraet_id = ? 
      ORDER BY port_nummer
    `, [geraetId]);

    // Stack-Port-Bezeichnungen erstellen
    const stackPorts = ports.map(port => ({
      stackNummer: mitglied.stack_nummer,
      portNummer: port.port_nummer,
      bezeichnung: `${mitglied.stack_nummer}:${port.port_nummer}`,
      belegt: port.belegt,
      geraetId: geraetId,
      verbindungId: port.verbindung_id,
      beschreibung: port.beschreibung
    }));

    res.json(createResponse(true, stackPorts));
  } catch (error) {
    console.error('Fehler beim Abrufen der Stack-Ports:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Switch-Stack bearbeiten
app.put('/api/stacks/:stackId', async (req, res) => {
  try {
    const stackId = req.params.stackId;
    const { name, beschreibung, stackVerbindungen } = req.body;

    console.log('Stack-Bearbeitung gestartet für Stack-ID:', stackId);

    await db.beginTransaction();

    // 1. Stack-Details prüfen
    const existierenderStack = await db.get(`SELECT * FROM switch_stacks WHERE id = ?`, [stackId]);
    if (!existierenderStack) {
      await db.rollback();
      return res.status(404).json(createResponse(false, null, 'Stack nicht gefunden'));
    }

    // 2. Stack-Grunddaten aktualisieren
    await db.run(`
      UPDATE switch_stacks 
      SET name = ?, beschreibung = ?
      WHERE id = ?
    `, [name, beschreibung || null, stackId]);

    // 3. Alte Stack-Verbindungen löschen und Ports freigeben
    const alteVerbindungen = await db.all(`
      SELECT quell_geraet_id, quell_port, ziel_geraet_id, ziel_port 
      FROM stack_verbindungen 
      WHERE stack_id = ?
    `, [stackId]);

    for (const verbindung of alteVerbindungen) {
      // Normale Verbindungen löschen
      await db.run(`
        DELETE FROM verbindungen 
        WHERE quell_geraet_id = ? AND quell_port = ? 
          AND ziel_geraet_id = ? AND ziel_port = ?
          AND bemerkungen LIKE 'Stack-Verbindung:%'
      `, [verbindung.quell_geraet_id, verbindung.quell_port, verbindung.ziel_geraet_id, verbindung.ziel_port]);

      // Ports freigeben
      await db.run(`
        UPDATE port_belegungen 
        SET belegt = 0, beschreibung = NULL, verbindung_id = NULL
        WHERE geraet_id = ? AND port_nummer = ?
      `, [verbindung.quell_geraet_id, verbindung.quell_port]);

      await db.run(`
        UPDATE port_belegungen 
        SET belegt = 0, beschreibung = NULL, verbindung_id = NULL
        WHERE geraet_id = ? AND port_nummer = ?
      `, [verbindung.ziel_geraet_id, verbindung.ziel_port]);
    }

    // Alte Stack-Verbindungen löschen
    await db.run(`DELETE FROM stack_verbindungen WHERE stack_id = ?`, [stackId]);

    // 4. Neue Stack-Verbindungen erstellen
    if (stackVerbindungen && stackVerbindungen.length > 0) {
      for (const verbindung of stackVerbindungen) {
        const stackVerbindungId = uuidv4();
        const normalVerbindungId = uuidv4();

        // Stack-Verbindung erstellen
        await db.run(`
          INSERT INTO stack_verbindungen (
            id, stack_id, quell_geraet_id, quell_port, ziel_geraet_id, ziel_port, 
            verbindungstyp, kategorie, farbe, bemerkungen
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          stackVerbindungId,
          stackId,
          verbindung.quellGeraetId || verbindung.quell_geraet_id,
          verbindung.quellPort || verbindung.quell_port,
          verbindung.zielGeraetId || verbindung.ziel_geraet_id,
          verbindung.zielPort || verbindung.ziel_port,
          verbindung.verbindungstyp || 'SFP/SFP+',
          verbindung.kategorie || null,
          verbindung.farbe || null,
          verbindung.bemerkungen || null
        ]);

        // Normale Verbindung erstellen
        await db.run(`
          INSERT INTO verbindungen (
            id, standort_id, quell_geraet_id, quell_port, ziel_geraet_id, ziel_port,
            kabeltyp, kabel_laenge, kabel_farbe, kabel_kategorie, bemerkungen
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          normalVerbindungId,
          existierenderStack.standort_id,
          verbindung.quellGeraetId || verbindung.quell_geraet_id,
          verbindung.quellPort || verbindung.quell_port,
          verbindung.zielGeraetId || verbindung.ziel_geraet_id,
          verbindung.zielPort || verbindung.ziel_port,
          verbindung.verbindungstyp || 'SFP/SFP+',
          verbindung.verbindungstyp === 'SFP/SFP+' ? 1 : 3, // Standard-Längen
          verbindung.farbe || (verbindung.verbindungstyp === 'SFP/SFP+' ? 'Orange' : (verbindung.verbindungstyp === 'RJ45' ? 'Blau' : 'Grau')),
          verbindung.kategorie || (verbindung.verbindungstyp === 'SFP/SFP+' ? 'DAC' : 'Cat6a'),
          `Stack-Verbindung: ${name}${verbindung.bemerkungen ? ` - ${verbindung.bemerkungen}` : ''}`
        ]);

        // Ports als belegt markieren
        await db.run(`
          UPDATE port_belegungen 
          SET belegt = 1, beschreibung = ?, verbindung_id = ?
          WHERE geraet_id = ? AND port_nummer = ?
        `, [`Stack: ${name}`, normalVerbindungId, verbindung.quellGeraetId || verbindung.quell_geraet_id, verbindung.quellPort || verbindung.quell_port]);

        await db.run(`
          UPDATE port_belegungen 
          SET belegt = 1, beschreibung = ?, verbindung_id = ?
          WHERE geraet_id = ? AND port_nummer = ?
        `, [`Stack: ${name}`, normalVerbindungId, verbindung.zielGeraetId || verbindung.ziel_geraet_id, verbindung.zielPort || verbindung.ziel_port]);
      }
    }

    await db.commit();
    console.log('Stack-Bearbeitung erfolgreich abgeschlossen');

    res.json(createResponse(true, null, 'Switch-Stack erfolgreich aktualisiert'));
  } catch (error) {
    await db.rollback();
    console.error('Fehler beim Bearbeiten des Switch-Stacks:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Switch-Stack löschen
app.delete('/api/stacks/:stackId', async (req, res) => {
  try {
    const stackId = req.params.stackId;

    console.log('Stack-Löschung gestartet für Stack-ID:', stackId);

    await db.beginTransaction();

    // 1. Stack-Details abrufen (für Logging)
    const stack = await db.get(`SELECT name FROM switch_stacks WHERE id = ?`, [stackId]);
    if (!stack) {
      await db.rollback();
      return res.status(404).json(createResponse(false, null, 'Stack nicht gefunden'));
    }

    console.log('Lösche Stack:', stack.name);

    // 2. Alle normalen Verbindungen finden, die zu diesem Stack gehören
    const stackVerbindungsIds = await db.all(`
      SELECT sv.quell_geraet_id, sv.quell_port, sv.ziel_geraet_id, sv.ziel_port
      FROM stack_verbindungen sv
      WHERE sv.stack_id = ?
    `, [stackId]);

    console.log('Gefundene Stack-Verbindungen:', stackVerbindungsIds.length);

    // 3. Normale Verbindungen löschen (die Stack-Verbindungen entsprechen)
    for (const sv of stackVerbindungsIds) {
      const normalVerbindungen = await db.all(`
        SELECT id FROM verbindungen 
        WHERE quell_geraet_id = ? AND quell_port = ? 
          AND ziel_geraet_id = ? AND ziel_port = ?
          AND bemerkungen LIKE 'Stack-Verbindung:%'
      `, [sv.quell_geraet_id, sv.quell_port, sv.ziel_geraet_id, sv.ziel_port]);

      for (const nv of normalVerbindungen) {
        await db.run(`DELETE FROM verbindungen WHERE id = ?`, [nv.id]);
        console.log('Normale Verbindung gelöscht:', nv.id);
      }

      // 4. Ports wieder als frei markieren
      await db.run(`
        UPDATE port_belegungen 
        SET belegt = 0, beschreibung = NULL, verbindung_id = NULL
        WHERE geraet_id = ? AND port_nummer = ?
      `, [sv.quell_geraet_id, sv.quell_port]);

      await db.run(`
        UPDATE port_belegungen 
        SET belegt = 0, beschreibung = NULL, verbindung_id = NULL
        WHERE geraet_id = ? AND port_nummer = ?
      `, [sv.ziel_geraet_id, sv.ziel_port]);

      console.log('Ports freigegeben:', `${sv.quell_geraet_id}:${sv.quell_port}`, `${sv.ziel_geraet_id}:${sv.ziel_port}`);
    }

    // 5. Stack-Verbindungen löschen
    await db.run(`DELETE FROM stack_verbindungen WHERE stack_id = ?`, [stackId]);

    // 6. Stack-Mitglieder löschen
    await db.run(`DELETE FROM stack_mitglieder WHERE stack_id = ?`, [stackId]);

    // 7. Stack selbst löschen
    await db.run(`DELETE FROM switch_stacks WHERE id = ?`, [stackId]);

    await db.commit();
    console.log('Stack-Löschung erfolgreich abgeschlossen');

    res.json(createResponse(true, null, 'Switch-Stack erfolgreich gelöscht'));
  } catch (error) {
    await db.rollback();
    console.error('Fehler beim Löschen des Switch-Stacks:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== DEBUG API ===================

// Debug-APIs entfernt - werden nicht mehr benötigt

// =================== UTILITY API ===================

// Verfügbare Gerätetypen abrufen
app.get('/api/geraetetypen', async (req, res) => {
  try {
    const geraetetypenRows = await db.all(`
      SELECT id, name, beschreibung, icon, farbe, hostname_prefix, aktiv 
      FROM geraetetypen 
      WHERE aktiv = 1 
      ORDER BY name
    `);

    // snake_case zu camelCase konvertieren
    const geraetetypen = geraetetypenRows.map(row => ({
      ...row,
      hostnamePrefix: row.hostname_prefix,
      hostname_prefix: undefined // altes Feld entfernen
    }));

    res.json(createResponse(true, geraetetypen));
  } catch (error) {
    console.error('Fehler beim Abrufen der Gerätetypen:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Alle Gerätetypen abrufen (auch inaktive, für Verwaltung)
app.get('/api/geraetetypen/alle', async (req, res) => {
  try {
    const geraetetypenRows = await db.all(`
      SELECT id, name, beschreibung, icon, farbe, hostname_prefix, aktiv, erstellt_am, aktualisiert_am
      FROM geraetetypen 
      ORDER BY name
    `);

    // snake_case zu camelCase konvertieren
    const geraetetypen = geraetetypenRows.map(row => ({
      ...row,
      hostnamePrefix: row.hostname_prefix,
      hostname_prefix: undefined // altes Feld entfernen
    }));

    res.json(createResponse(true, geraetetypen));
  } catch (error) {
    console.error('Fehler beim Abrufen aller Gerätetypen:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Einzelnen Gerätetyp abrufen
app.get('/api/geraetetypen/:id', async (req, res) => {
  try {
    const geraetetypRow = await db.get(
      'SELECT * FROM geraetetypen WHERE id = ?',
      [req.params.id]
    );

    if (!geraetetypRow) {
      return res.status(404).json(createResponse(false, null, 'Gerätetyp nicht gefunden'));
    }

    // snake_case zu camelCase konvertieren
    const geraetetyp = {
      ...geraetetypRow,
      hostnamePrefix: geraetetypRow.hostname_prefix,
      hostname_prefix: undefined // altes Feld entfernen
    };

    res.json(createResponse(true, geraetetyp));
  } catch (error) {
    console.error('Fehler beim Abrufen des Gerätetyps:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Neuen Gerätetyp erstellen
app.post('/api/geraetetypen', async (req, res) => {
  try {
    const { name, beschreibung, icon, farbe, hostnamePrefix, kategorie } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json(createResponse(false, null, 'Name ist erforderlich'));
    }

    // Prüfen ob Name bereits existiert
    const existierend = await db.get('SELECT id FROM geraetetypen WHERE name = ?', [name.trim()]);
    if (existierend) {
      return res.status(400).json(createResponse(false, null, 'Gerätetyp mit diesem Namen existiert bereits'));
    }

    const geraetetypId = uuidv4();

    await db.run(`
      INSERT INTO geraetetypen (id, name, beschreibung, icon, farbe, hostname_prefix, kategorie, aktiv)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      geraetetypId, 
      name.trim(), 
      beschreibung || null, 
      icon || 'device_unknown', 
      farbe || '#757575',
      hostnamePrefix || 'XX',
      kategorie || 'IT'
    ]);

    res.status(201).json(createResponse(true, { id: geraetetypId }, 'Gerätetyp erfolgreich erstellt'));
  } catch (error) {
    console.error('Fehler beim Erstellen des Gerätetyps:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Gerätetyp aktualisieren
app.put('/api/geraetetypen/:id', async (req, res) => {
  try {
    const { name, beschreibung, icon, farbe, hostnamePrefix, kategorie, aktiv } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json(createResponse(false, null, 'Name ist erforderlich'));
    }

    const existierend = await db.get('SELECT id FROM geraetetypen WHERE id = ?', [req.params.id]);
    if (!existierend) {
      return res.status(404).json(createResponse(false, null, 'Gerätetyp nicht gefunden'));
    }

    // Prüfen ob Name bereits von anderem Gerätetyp verwendet wird
    const namensKonflikt = await db.get('SELECT id FROM geraetetypen WHERE name = ? AND id != ?', [name.trim(), req.params.id]);
    if (namensKonflikt) {
      return res.status(400).json(createResponse(false, null, 'Gerätetyp mit diesem Namen existiert bereits'));
    }

    await db.run(`
      UPDATE geraetetypen SET
        name = ?,
        beschreibung = ?,
        icon = ?,
        farbe = ?,
        hostname_prefix = ?,
        kategorie = ?,
        aktiv = ?
      WHERE id = ?
    `, [
      name.trim(), 
      beschreibung || null, 
      icon || 'device_unknown', 
      farbe || '#757575',
      hostnamePrefix || 'XX',
      kategorie || 'IT', 
      aktiv ? 1 : 0,
      req.params.id
    ]);

    res.json(createResponse(true, null, 'Gerätetyp erfolgreich aktualisiert'));
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Gerätetyps:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Gerätetyp löschen
app.delete('/api/geraetetypen/:id', async (req, res) => {
  try {
    // Prüfen ob Gerätetyp verwendet wird
    const verwendeteGeraete = await db.all(`
      SELECT name FROM geraete WHERE geraetetyp = (
        SELECT name FROM geraetetypen WHERE id = ?
      )
    `, [req.params.id]);

    if (verwendeteGeraete.length > 0) {
      return res.status(400).json(createResponse(false, null, `Gerätetyp wird noch von ${verwendeteGeraete.length} Gerät(en) verwendet`));
    }

    const result = await db.run('DELETE FROM geraetetypen WHERE id = ?', [req.params.id]);
    
    if (result.changes === 0) {
      return res.status(404).json(createResponse(false, null, 'Gerätetyp nicht gefunden'));
    }

    res.json(createResponse(true, null, 'Gerätetyp erfolgreich gelöscht'));
  } catch (error) {
    console.error('Fehler beim Löschen des Gerätetyps:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Gerätetyp automatisch hinzufügen wenn er nicht existiert
app.post('/api/geraetetypen/auto-create', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json(createResponse(false, null, 'Name ist erforderlich'));
    }

    // Prüfen ob bereits existiert
    const existierend = await db.get('SELECT id, name FROM geraetetypen WHERE name = ?', [name.trim()]);
    if (existierend) {
      return res.json(createResponse(true, existierend, 'Gerätetyp bereits vorhanden'));
    }

    // Neuen Gerätetyp erstellen
    const geraetetypId = uuidv4();
    await db.run(`
      INSERT INTO geraetetypen (id, name, beschreibung, icon, farbe, hostname_prefix, aktiv)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [
      geraetetypId, 
      name.trim(), 
      'Automatisch erstellter Gerätetyp', 
      'device_unknown', 
      '#757575',
      'XX' // Standard-Präfix für neue Gerätetypen
    ]);

    res.status(201).json(createResponse(true, { id: geraetetypId, name: name.trim() }, 'Gerätetyp automatisch erstellt'));
  } catch (error) {
    console.error('Fehler beim automatischen Erstellen des Gerätetyps:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== HOSTNAME-GENERIERUNG API ===================

// Nächste verfügbare Hostname-Nummer finden
const findNextAvailableNumber = async (standortId, geraetetypName) => {
  try {
    // Standort- und Gerätetyp-Präfix abrufen
    const standort = await db.get('SELECT hostname_prefix FROM standorte WHERE id = ?', [standortId]);
    const geraetetyp = await db.get('SELECT hostname_prefix FROM geraetetypen WHERE name = ?', [geraetetypName]);

    if (!standort?.hostname_prefix || !geraetetyp?.hostname_prefix) {
      return null; // Präfixe nicht konfiguriert
    }

    const baseHostname = `${standort.hostname_prefix}${geraetetyp.hostname_prefix}`;

    // Alle existierenden Hostnames mit diesem Präfix finden
    const existierendeHostnames = await db.all(`
      SELECT hostname FROM geraete 
      WHERE hostname LIKE ? AND hostname IS NOT NULL
      ORDER BY hostname
    `, [`${baseHostname}%`]);

    // Verwendete Nummern extrahieren
    const verwendeteNummern = new Set();
    for (const row of existierendeHostnames) {
      const match = row.hostname.match(new RegExp(`^${baseHostname}(\\d{3})$`));
      if (match) {
        verwendeteNummern.add(parseInt(match[1], 10));
      }
    }

    // Nächste verfügbare Nummer finden (Lücken bevorzugen)
    for (let num = 1; num <= 999; num++) {
      if (!verwendeteNummern.has(num)) {
        const nummer = num.toString().padStart(3, '0');
        return {
          hostname: `${baseHostname}${nummer}`,
          standortPrefix: standort.hostname_prefix,
          geraetetypPrefix: geraetetyp.hostname_prefix,
          nummer
        };
      }
    }

    return null; // Alle Nummern belegt
  } catch (error) {
    console.error('Fehler beim Finden der nächsten Hostname-Nummer:', error);
    return null;
  }
};

// Hostname generieren
app.post('/api/hostname/generate', async (req, res) => {
  try {
    const { standortId, geraetetypName } = req.body;

    if (!standortId || !geraetetypName) {
      return res.status(400).json(createResponse(false, null, 'Standort-ID und Gerätetyp sind erforderlich'));
    }

    const hostnameInfo = await findNextAvailableNumber(standortId, geraetetypName);

    if (!hostnameInfo) {
      return res.status(400).json(createResponse(false, null, 'Hostname konnte nicht generiert werden. Prüfen Sie die Präfix-Konfiguration oder alle Nummern sind belegt.'));
    }

    res.json(createResponse(true, hostnameInfo, 'Hostname erfolgreich generiert'));
  } catch (error) {
    console.error('Fehler beim Generieren des Hostnames:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Hostname-Verfügbarkeit prüfen
app.post('/api/hostname/check', async (req, res) => {
  try {
    const { hostname } = req.body;

    if (!hostname || hostname.trim() === '') {
      return res.status(400).json(createResponse(false, null, 'Hostname ist erforderlich'));
    }

    const existierendesGeraet = await db.get('SELECT id, name FROM geraete WHERE hostname = ?', [hostname.trim()]);

    res.json(createResponse(true, {
      available: !existierendesGeraet,
      conflictDevice: existierendesGeraet
    }));
  } catch (error) {
    console.error('Fehler beim Prüfen der Hostname-Verfügbarkeit:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Verfügbare Kabeltypen abrufen
app.get('/api/kabeltypen', (req, res) => {
  const kabeltypen = [
    'RJ45',
    'SFP/SFP+',
    'Coax',
    'Sonstiges'
  ];

  res.json(createResponse(true, kabeltypen));
});

// =================== ANSPRECHPARTNER API ===================

// Alle Ansprechpartner abrufen
app.get('/api/ansprechpartner', async (req, res) => {
  try {
    const ansprechpartner = await db.all(`
      SELECT * FROM ansprechpartner 
      ORDER BY name
    `);

    res.json(createResponse(true, ansprechpartner));
  } catch (error) {
    console.error('Fehler beim Abrufen der Ansprechpartner:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Einzelnen Ansprechpartner abrufen
app.get('/api/ansprechpartner/:id', async (req, res) => {
  try {
    const ansprechpartner = await db.get(
      'SELECT * FROM ansprechpartner WHERE id = ?',
      [req.params.id]
    );

    if (!ansprechpartner) {
      return res.status(404).json(createResponse(false, null, 'Ansprechpartner nicht gefunden'));
    }

    res.json(createResponse(true, ansprechpartner));
  } catch (error) {
    console.error('Fehler beim Abrufen des Ansprechpartners:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Neuen Ansprechpartner erstellen
app.post('/api/ansprechpartner', async (req, res) => {
  try {
    const { name, telefon, email, abteilung, firma, bemerkungen } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json(createResponse(false, null, 'Name ist erforderlich'));
    }

    const ansprechpartnerId = uuidv4();

    await db.run(`
      INSERT INTO ansprechpartner (id, name, telefon, email, abteilung, firma, bemerkungen)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [ansprechpartnerId, name.trim(), telefon || null, email || null, abteilung || null, firma || null, bemerkungen || null]);

    res.status(201).json(createResponse(true, { id: ansprechpartnerId }, 'Ansprechpartner erfolgreich erstellt'));
  } catch (error) {
    console.error('Fehler beim Erstellen des Ansprechpartners:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Ansprechpartner aktualisieren
app.put('/api/ansprechpartner/:id', async (req, res) => {
  try {
    const { name, telefon, email, abteilung, firma, bemerkungen } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json(createResponse(false, null, 'Name ist erforderlich'));
    }

    const existierend = await db.get('SELECT id FROM ansprechpartner WHERE id = ?', [req.params.id]);
    if (!existierend) {
      return res.status(404).json(createResponse(false, null, 'Ansprechpartner nicht gefunden'));
    }

    await db.run(`
      UPDATE ansprechpartner SET
        name = ?,
        telefon = ?,
        email = ?,
        abteilung = ?,
        firma = ?,
        bemerkungen = ?
      WHERE id = ?
    `, [name.trim(), telefon || null, email || null, abteilung || null, firma || null, bemerkungen || null, req.params.id]);

    res.json(createResponse(true, null, 'Ansprechpartner erfolgreich aktualisiert'));
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Ansprechpartners:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Ansprechpartner löschen
app.delete('/api/ansprechpartner/:id', async (req, res) => {
  try {
    // Prüfen ob Ansprechpartner verwendet wird
    const verwendungStandorte = await db.all(`
      SELECT name FROM standorte 
      WHERE ansprechpartner_it_id = ? OR ansprechpartner_vor_ort_id = ?
    `, [req.params.id, req.params.id]);

    if (verwendungStandorte.length > 0) {
      const standortNamen = verwendungStandorte.map(s => s.name).join(', ');
      return res.status(400).json(createResponse(false, null, `Ansprechpartner wird noch verwendet von: ${standortNamen}`));
    }

    const result = await db.run('DELETE FROM ansprechpartner WHERE id = ?', [req.params.id]);
    
    if (result.changes === 0) {
      return res.status(404).json(createResponse(false, null, 'Ansprechpartner nicht gefunden'));
    }

    res.json(createResponse(true, null, 'Ansprechpartner erfolgreich gelöscht'));
  } catch (error) {
    console.error('Fehler beim Löschen des Ansprechpartners:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== NETZBEREICHSVERWALTUNG API ===================

// Alle Netzbereich für einen Standort abrufen
app.get('/api/netzbereich-verwaltung', async (req, res) => {
  try {
    const { standort_id } = req.query;

    if (!standort_id) {
      return res.status(400).json(createResponse(false, null, 'Standort-ID ist erforderlich'));
    }

    const netzbereich = await db.all(`
      SELECT * FROM netzbereich_verwaltung 
      WHERE standort_id = ? 
      ORDER BY netztyp, name
    `, [standort_id]);

    res.json(createResponse(true, netzbereich));
  } catch (error) {
    console.error('Fehler beim Abrufen der Netzbereich-Liste:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Einzelnen Netzbereich abrufen
app.get('/api/netzbereich-verwaltung/:id', async (req, res) => {
  try {
    const netzbereich = await db.get(
      'SELECT * FROM netzbereich_verwaltung WHERE id = ?',
      [req.params.id]
    );

    if (!netzbereich) {
      return res.status(404).json(createResponse(false, null, 'Netzbereich nicht gefunden'));
    }

    res.json(createResponse(true, netzbereich));
  } catch (error) {
    console.error('Fehler beim Abrufen des Netzbereichs:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Neuen Netzbereich erstellen
app.post('/api/netzbereich-verwaltung', async (req, res) => {
  try {
    const { 
      name, 
      beschreibung, 
      ip_bereich, 
      netztyp, 
      standort_id, 
      vlan_id, 
      gateway, 
      dns_server, 
      ntp_server,
      dhcp_aktiv,
      dhcp_bereich,
      aktiv, 
      bemerkungen 
    } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json(createResponse(false, null, 'Name ist erforderlich'));
    }

    if (!ip_bereich || ip_bereich.trim() === '') {
      return res.status(400).json(createResponse(false, null, 'IP-Bereich ist erforderlich'));
    }

    if (!standort_id) {
      return res.status(400).json(createResponse(false, null, 'Standort-ID ist erforderlich'));
    }

    // Prüfen ob Name bereits existiert für diesen Standort
    const existierend = await db.get(
      'SELECT id FROM netzbereich_verwaltung WHERE name = ? AND standort_id = ?',
      [name.trim(), standort_id]
    );

    if (existierend) {
      return res.status(400).json(createResponse(false, null, 'Ein Netzbereich mit diesem Namen existiert bereits für diesen Standort'));
    }

    const netzbereichId = uuidv4();

    await db.run(`
      INSERT INTO netzbereich_verwaltung (
        id, name, beschreibung, ip_bereich, netztyp, standort_id, 
        vlan_id, gateway, dns_server, ntp_server, dhcp_aktiv, dhcp_bereich, aktiv, bemerkungen
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      netzbereichId, 
      name.trim(), 
      beschreibung || null, 
      ip_bereich.trim(), 
      netztyp || 'IT-Netz', 
      standort_id, 
      vlan_id || null, 
      gateway || null, 
      dns_server || null, 
      ntp_server || null,
      dhcp_aktiv !== undefined ? (dhcp_aktiv ? 1 : 0) : 0,
      dhcp_bereich || null,
      aktiv !== undefined ? (aktiv ? 1 : 0) : 1, 
      bemerkungen || null
    ]);

    res.status(201).json(createResponse(true, { id: netzbereichId }, 'Netzbereich erfolgreich erstellt'));
  } catch (error) {
    console.error('Fehler beim Erstellen des Netzbereichs:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Netzbereich aktualisieren
app.put('/api/netzbereich-verwaltung/:id', async (req, res) => {
  try {
    const { 
      name, 
      beschreibung, 
      ip_bereich, 
      netztyp, 
      standort_id, 
      vlan_id, 
      gateway, 
      dns_server, 
      ntp_server,
      dhcp_aktiv,
      dhcp_bereich,
      aktiv, 
      bemerkungen 
    } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json(createResponse(false, null, 'Name ist erforderlich'));
    }

    if (!ip_bereich || ip_bereich.trim() === '') {
      return res.status(400).json(createResponse(false, null, 'IP-Bereich ist erforderlich'));
    }

    if (!standort_id) {
      return res.status(400).json(createResponse(false, null, 'Standort-ID ist erforderlich'));
    }

    const existierend = await db.get('SELECT id FROM netzbereich_verwaltung WHERE id = ?', [req.params.id]);
    if (!existierend) {
      return res.status(404).json(createResponse(false, null, 'Netzbereich nicht gefunden'));
    }

    // Prüfen ob Name bereits existiert für diesen Standort (außer dem aktuellen)
    const namensKonflikt = await db.get(
      'SELECT id FROM netzbereich_verwaltung WHERE name = ? AND standort_id = ? AND id != ?',
      [name.trim(), standort_id, req.params.id]
    );

    if (namensKonflikt) {
      return res.status(400).json(createResponse(false, null, 'Ein Netzbereich mit diesem Namen existiert bereits für diesen Standort'));
    }

    await db.run(`
      UPDATE netzbereich_verwaltung SET
        name = ?,
        beschreibung = ?,
        ip_bereich = ?,
        netztyp = ?,
        standort_id = ?,
        vlan_id = ?,
        gateway = ?,
        dns_server = ?,
        ntp_server = ?,
        dhcp_aktiv = ?,
        dhcp_bereich = ?,
        aktiv = ?,
        bemerkungen = ?
      WHERE id = ?
    `, [
      name.trim(), 
      beschreibung || null, 
      ip_bereich.trim(), 
      netztyp || 'IT-Netz', 
      standort_id, 
      vlan_id || null, 
      gateway || null, 
      dns_server || null, 
      ntp_server || null,
      dhcp_aktiv !== undefined ? (dhcp_aktiv ? 1 : 0) : 0,
      dhcp_bereich || null,
      aktiv !== undefined ? (aktiv ? 1 : 0) : 1, 
      bemerkungen || null, 
      req.params.id
    ]);

    res.json(createResponse(true, null, 'Netzbereich erfolgreich aktualisiert'));
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Netzbereichs:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Netzbereich löschen
app.delete('/api/netzbereich-verwaltung/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM netzbereich_verwaltung WHERE id = ?', [req.params.id]);
    
    if (result.changes === 0) {
      return res.status(404).json(createResponse(false, null, 'Netzbereich nicht gefunden'));
    }

    res.json(createResponse(true, null, 'Netzbereich erfolgreich gelöscht'));
  } catch (error) {
    console.error('Fehler beim Löschen des Netzbereichs:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== IT/OT SECURITY APIs ===================

// Security Assessments für ein Gerät abrufen
app.get('/api/geraete/:geraetId/security-assessment', async (req, res) => {
  try {
    const assessment = await db.get(`
      SELECT * FROM security_assessments WHERE geraet_id = ?
    `, [req.params.geraetId]);

    if (!assessment) {
      return res.json(createResponse(true, null, 'Keine Security Assessment gefunden'));
    }

    const responseData = {
      id: assessment.id,
      geraetId: assessment.geraet_id,
      iec62443Level: assessment.iec62443_level,
      risikoEinstufung: assessment.risiko_einstufung,
      bedrohungsanalyse: assessment.bedrohungsanalyse,
      schutzmaßnahmen: assessment.schutzmassnahmen ? JSON.parse(assessment.schutzmassnahmen) : [],
      letzteBewertung: assessment.letzte_bewertung,
      naechsteBewertung: assessment.naechste_bewertung,
      verantwortlicher: assessment.verantwortlicher,
      bemerkungen: assessment.bemerkungen
    };

    res.json(createResponse(true, responseData));
  } catch (error) {
    console.error('Fehler beim Abrufen des Security Assessments:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Security Assessment erstellen oder aktualisieren
app.post('/api/geraete/:geraetId/security-assessment', async (req, res) => {
  try {
    const {
      iec62443Level,
      risikoEinstufung,
      bedrohungsanalyse,
      schutzmaßnahmen,
      letzteBewertung,
      naechsteBewertung,
      verantwortlicher,
      bemerkungen
    } = req.body;

    const assessmentId = uuidv4();

    await db.run(`
      INSERT OR REPLACE INTO security_assessments (
        id, geraet_id, iec62443_level, risiko_einstufung, bedrohungsanalyse,
        schutzmassnahmen, letzte_bewertung, naechste_bewertung, verantwortlicher, bemerkungen
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      assessmentId,
      req.params.geraetId,
      iec62443Level,
      risikoEinstufung,
      bedrohungsanalyse,
      JSON.stringify(schutzmaßnahmen || []),
      letzteBewertung,
      naechsteBewertung,
      verantwortlicher,
      bemerkungen
    ]);

    res.json(createResponse(true, { id: assessmentId }, 'Security Assessment erfolgreich gespeichert'));
  } catch (error) {
    console.error('Fehler beim Speichern des Security Assessments:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Network Segmentation für einen Standort abrufen
app.get('/api/standorte/:standortId/network-segmentation', async (req, res) => {
  try {
    const segments = await db.all(`
      SELECT ns.*, 
        (SELECT COUNT(*) FROM firewall_rules WHERE segmentation_id = ns.id) as rules_count
      FROM network_segmentation ns 
      WHERE ns.standort_id = ? AND ns.aktiv = 1
      ORDER BY ns.security_zone
    `, [req.params.standortId]);

    const responseData = segments.map(segment => ({
      id: segment.id,
      name: segment.name,
      beschreibung: segment.beschreibung,
      securityZone: segment.security_zone,
      vlanIds: segment.vlan_ids ? JSON.parse(segment.vlan_ids) : [],
      allowedProtocols: segment.allowed_protocols ? JSON.parse(segment.allowed_protocols) : [],
      accessControlList: segment.access_control_list ? JSON.parse(segment.access_control_list) : [],
      monitoringLevel: segment.monitoring_level,
      rulesCount: segment.rules_count,
      aktiv: Boolean(segment.aktiv),
      erstelltAm: segment.erstellt_am
    }));

    res.json(createResponse(true, responseData));
  } catch (error) {
    console.error('Fehler beim Abrufen der Network Segmentation:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== INDUSTRIAL PROTOCOL APIs ===================

// Communication Matrix für einen Standort abrufen
app.get('/api/standorte/:standortId/communication-matrix', async (req, res) => {
  try {
    const communications = await db.all(`
      SELECT cm.*, 
        g1.name as quell_name, g1.geraetetyp as quell_typ,
        g2.name as ziel_name, g2.geraetetyp as ziel_typ
      FROM communication_matrix cm
      JOIN geraete g1 ON cm.quell_geraet_id = g1.id
      JOIN geraete g2 ON cm.ziel_geraet_id = g2.id
      WHERE cm.standort_id = ?
      ORDER BY cm.protokoll, g1.name
    `, [req.params.standortId]);

    const responseData = communications.map(comm => ({
      id: comm.id,
      quellGeraetId: comm.quell_geraet_id,
      quellName: comm.quell_name,
      quellTyp: comm.quell_typ,
      zielGeraetId: comm.ziel_geraet_id,
      zielName: comm.ziel_name,
      zielTyp: comm.ziel_typ,
      protokoll: comm.protokoll,
      richtung: comm.richtung,
      datentyp: comm.datentyp,
      zykluszeit: comm.zykluszeit,
      prioritaet: comm.prioritaet,
      realTimeRequirement: Boolean(comm.real_time_requirement),
      maxLatenz: comm.max_latenz,
      maxJitter: comm.max_jitter,
      sicherheitsrelevant: Boolean(comm.sicherheitsrelevant),
      verschluesselung: Boolean(comm.verschluesselung),
      authentifizierung: Boolean(comm.authentifizierung),
      bemerkungen: comm.bemerkungen
    }));

    res.json(createResponse(true, responseData));
  } catch (error) {
    console.error('Fehler beim Abrufen der Communication Matrix:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Communication Matrix Eintrag erstellen
app.post('/api/standorte/:standortId/communication-matrix', async (req, res) => {
  try {
    const {
      quellGeraetId,
      zielGeraetId,
      protokoll,
      richtung,
      datentyp,
      zykluszeit,
      prioritaet,
      realTimeRequirement,
      maxLatenz,
      maxJitter,
      sicherheitsrelevant,
      verschluesselung,
      authentifizierung,
      bemerkungen
    } = req.body;

    const communicationId = uuidv4();

    await db.run(`
      INSERT INTO communication_matrix (
        id, quell_geraet_id, ziel_geraet_id, protokoll, richtung, datentyp,
        zykluszeit, prioritaet, real_time_requirement, max_latenz, max_jitter,
        sicherheitsrelevant, verschluesselung, authentifizierung, bemerkungen, standort_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      communicationId,
      quellGeraetId,
      zielGeraetId,
      protokoll,
      richtung,
      datentyp,
      zykluszeit,
      prioritaet,
      realTimeRequirement ? 1 : 0,
      maxLatenz,
      maxJitter,
      sicherheitsrelevant ? 1 : 0,
      verschluesselung ? 1 : 0,
      authentifizierung ? 1 : 0,
      bemerkungen,
      req.params.standortId
    ]);

    res.json(createResponse(true, { id: communicationId }, 'Communication Matrix Eintrag erstellt'));
  } catch (error) {
    console.error('Fehler beim Erstellen des Communication Matrix Eintrags:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== ASSET LIFECYCLE APIs ===================

// Asset Lifecycle für ein Gerät abrufen
app.get('/api/geraete/:geraetId/asset-lifecycle', async (req, res) => {
  try {
    const lifecycle = await db.get(`
      SELECT * FROM asset_lifecycle WHERE geraet_id = ?
    `, [req.params.geraetId]);

    if (!lifecycle) {
      return res.json(createResponse(true, null, 'Kein Asset Lifecycle gefunden'));
    }

    const responseData = {
      id: lifecycle.id,
      geraetId: lifecycle.geraet_id,
      installationsDatum: lifecycle.installations_datum,
      inbetriebnahmeDatum: lifecycle.inbetriebnahme_datum,
      geplantesEOL: lifecycle.geplantes_eol,
      erwarteteLebensdauer: lifecycle.erwartete_lebensdauer,
      aktuelleFirmwareVersion: lifecycle.aktuelle_firmware_version,
      letzteFirmwareUpdate: lifecycle.letzte_firmware_update,
      wartungsintervall: lifecycle.wartungsintervall,
      letzteWartung: lifecycle.letzte_wartung,
      naechsteWartung: lifecycle.naechste_wartung,
      wartungsverantwortlicher: lifecycle.wartungsverantwortlicher,
      kritikalitaet: lifecycle.kritikalitaet,
      ersatzteilVerfuegbarkeit: lifecycle.ersatzteil_verfuegbarkeit,
      supportStatus: lifecycle.support_status,
      bemerkungen: lifecycle.bemerkungen
    };

    res.json(createResponse(true, responseData));
  } catch (error) {
    console.error('Fehler beim Abrufen des Asset Lifecycle:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Asset Lifecycle erstellen oder aktualisieren
app.post('/api/geraete/:geraetId/asset-lifecycle', async (req, res) => {
  try {
    const {
      installationsDatum,
      inbetriebnahmeDatum,
      geplantesEOL,
      erwarteteLebensdauer,
      aktuelleFirmwareVersion,
      letzteFirmwareUpdate,
      wartungsintervall,
      letzteWartung,
      naechsteWartung,
      wartungsverantwortlicher,
      kritikalitaet,
      ersatzteilVerfuegbarkeit,
      supportStatus,
      bemerkungen
    } = req.body;

    const lifecycleId = uuidv4();

    await db.run(`
      INSERT OR REPLACE INTO asset_lifecycle (
        id, geraet_id, installations_datum, inbetriebnahme_datum, geplantes_eol,
        erwartete_lebensdauer, aktuelle_firmware_version, letzte_firmware_update,
        wartungsintervall, letzte_wartung, naechste_wartung, wartungsverantwortlicher,
        kritikalitaet, ersatzteil_verfuegbarkeit, support_status, bemerkungen
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      lifecycleId,
      req.params.geraetId,
      installationsDatum,
      inbetriebnahmeDatum,
      geplantesEOL,
      erwarteteLebensdauer,
      aktuelleFirmwareVersion,
      letzteFirmwareUpdate,
      wartungsintervall,
      letzteWartung,
      naechsteWartung,
      wartungsverantwortlicher,
      kritikalitaet,
      ersatzteilVerfuegbarkeit,
      supportStatus,
      bemerkungen
    ]);

    res.json(createResponse(true, { id: lifecycleId }, 'Asset Lifecycle erfolgreich gespeichert'));
  } catch (error) {
    console.error('Fehler beim Speichern des Asset Lifecycle:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Ersatzteile für ein Gerät abrufen
app.get('/api/geraete/:geraetId/ersatzteile', async (req, res) => {
  try {
    const ersatzteile = await db.all(`
      SELECT * FROM ersatzteil_management 
      WHERE geraet_id = ? 
      ORDER BY kritikalitaet DESC, bezeichnung ASC
    `, [req.params.geraetId]);

    const responseData = ersatzteile.map(teil => ({
      id: teil.id,
      geraetId: teil.geraet_id,
      teilenummer: teil.teilenummer,
      bezeichnung: teil.bezeichnung,
      lieferant: teil.lieferant,
      lagerbestand: teil.lagerbestand,
      mindestbestand: teil.mindestbestand,
      letzteBestellung: teil.letzte_bestellung,
      kostenstelle: teil.kostenstelle,
      kritikalitaet: teil.kritikalitaet,
      lagerort: teil.lagerort,
      bemerkungen: teil.bemerkungen
    }));

    res.json(createResponse(true, responseData));
  } catch (error) {
    console.error('Fehler beim Abrufen der Ersatzteile:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== CHANGE MANAGEMENT APIs ===================

// Change Requests für einen Standort abrufen
app.get('/api/standorte/:standortId/change-requests', async (req, res) => {
  try {
    const { status, prioritaet } = req.query;
    
    let whereClause = 'WHERE cm.standort_id = ?';
    let params = [req.params.standortId];
    
    if (status) {
      whereClause += ' AND cm.status = ?';
      params.push(status);
    }
    
    if (prioritaet) {
      whereClause += ' AND cm.prioritaet = ?';
      params.push(prioritaet);
    }

    const changes = await db.all(`
      SELECT cm.*, g.name as geraet_name 
      FROM change_management cm
      LEFT JOIN geraete g ON cm.geraet_id = g.id
      ${whereClause}
      ORDER BY cm.erstellt_am DESC
    `, params);

    const responseData = changes.map(change => ({
      id: change.id,
      changeNummer: change.change_nummer,
      titel: change.titel,
      beschreibung: change.beschreibung,
      changeTyp: change.change_typ,
      prioritaet: change.prioritaet,
      status: change.status,
      antragsteller: change.antragsteller,
      geraetId: change.geraet_id,
      geraetName: change.geraet_name,
      geplantesStartDatum: change.geplantes_start_datum,
      geplantesEndeDatum: change.geplantes_ende_datum,
      erstelltAm: change.erstellt_am
    }));

    res.json(createResponse(true, responseData));
  } catch (error) {
    console.error('Fehler beim Abrufen der Change Requests:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Change Request erstellen
app.post('/api/standorte/:standortId/change-requests', async (req, res) => {
  try {
    const {
      titel,
      beschreibung,
      changeTyp,
      prioritaet,
      antragsteller,
      antragsGrund,
      risikoAnalyse,
      implementierungsplan,
      rollbackPlan,
      testPlan,
      geraetId,
      geplantesStartDatum,
      geplantesEndeDatum
    } = req.body;

    const changeId = uuidv4();
    const changeNummer = `CHG-${Date.now()}`;

    await db.run(`
      INSERT INTO change_management (
        id, geraet_id, standort_id, change_nummer, titel, beschreibung,
        change_typ, prioritaet, antragsteller, antrags_grund, risiko_analyse,
        implementierungs_plan, rollback_plan, test_plan, geplantes_start_datum,
        geplantes_ende_datum, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft')
    `, [
      changeId,
      geraetId,
      req.params.standortId,
      changeNummer,
      titel,
      beschreibung,
      changeTyp,
      prioritaet,
      antragsteller,
      antragsGrund,
      risikoAnalyse,
      implementierungsplan,
      rollbackPlan,
      testPlan,
      geplantesStartDatum,
      geplantesEndeDatum
    ]);

    res.json(createResponse(true, { id: changeId, changeNummer }, 'Change Request erstellt'));
  } catch (error) {
    console.error('Fehler beim Erstellen des Change Requests:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== COMPLIANCE APIs ===================

// Compliance Requirements abrufen
app.get('/api/compliance-requirements', async (req, res) => {
  try {
    const { kategorie, standard } = req.query;
    
    let whereClause = 'WHERE aktiv = 1';
    let params = [];
    
    if (kategorie) {
      whereClause += ' AND kategorie = ?';
      params.push(kategorie);
    }
    
    if (standard) {
      whereClause += ' AND standard = ?';
      params.push(standard);
    }

    const requirements = await db.all(`
      SELECT * FROM compliance_requirements 
      ${whereClause}
      ORDER BY standard, kategorie, anforderung
    `, params);

    const responseData = requirements.map(req => ({
      id: req.id,
      standard: req.standard,
      anforderung: req.anforderung,
      beschreibung: req.beschreibung,
      kategorie: req.kategorie,
      anwendbarAuf: req.anwendbar_auf ? JSON.parse(req.anwendbar_auf) : [],
      pruefIntervall: req.pruef_intervall,
      verantwortlicher: req.verantwortlicher,
      dokumentationsErforderlich: Boolean(req.dokumentations_erforderlich)
    }));

    res.json(createResponse(true, responseData));
  } catch (error) {
    console.error('Fehler beim Abrufen der Compliance Requirements:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Compliance Assessments für ein Gerät abrufen
app.get('/api/geraete/:geraetId/compliance-assessments', async (req, res) => {
  try {
    const assessments = await db.all(`
      SELECT ca.*, cr.standard, cr.anforderung, cr.kategorie
      FROM compliance_assessments ca
      JOIN compliance_requirements cr ON ca.requirement_id = cr.id
      WHERE ca.geraet_id = ?
      ORDER BY ca.bewertungs_datum DESC
    `, [req.params.geraetId]);

    const responseData = assessments.map(assessment => ({
      id: assessment.id,
      geraetId: assessment.geraet_id,
      requirementId: assessment.requirement_id,
      standard: assessment.standard,
      anforderung: assessment.anforderung,
      kategorie: assessment.kategorie,
      bewertungsDatum: assessment.bewertungs_datum,
      bewerter: assessment.bewerter,
      konformitaetsStatus: assessment.konformitaets_status,
      abweichungen: assessment.abweichungen,
      massnahmen: assessment.massnahmen,
      frist: assessment.frist,
      naechstePruefung: assessment.naechste_pruefung,
      bemerkungen: assessment.bemerkungen
    }));

    res.json(createResponse(true, responseData));
  } catch (error) {
    console.error('Fehler beim Abrufen der Compliance Assessments:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== SECURITY ASSESSMENTS ===================

// Security Assessments für einen Standort abrufen
app.get('/api/standorte/:standortId/security-assessments', async (req, res) => {
  try {
    const assessments = await db.all(`
      SELECT sa.*, g.name as geraet_name
      FROM security_assessments sa
      JOIN geraete g ON sa.geraet_id = g.id
      WHERE g.standort_id = ?
      ORDER BY sa.letzte_bewertung DESC
    `, [req.params.standortId]);

    const responseData = assessments.map(assessment => ({
      id: assessment.id,
      geraetId: assessment.geraet_id,
      iec62443Level: assessment.iec62443_level,
      risikoEinstufung: assessment.risiko_einstufung,
      bedrohungsanalyse: assessment.bedrohungsanalyse,
      schutzmaßnahmen: assessment.schutzmassnahmen ? JSON.parse(assessment.schutzmassnahmen) : [],
      letzteBewertung: assessment.letzte_bewertung,
      naechsteBewertung: assessment.naechste_bewertung,
      verantwortlicher: assessment.verantwortlicher,
      bemerkungen: assessment.bemerkungen,
      geraetName: assessment.geraet_name
    }));

    res.json(createResponse(true, responseData));
  } catch (error) {
    console.error('Fehler beim Abrufen der Security Assessments:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Security Assessment erstellen
app.post('/api/geraete/:geraetId/security-assessments', async (req, res) => {
  try {
    const {
      iec62443Level,
      risikoEinstufung,
      bedrohungsanalyse,
      schutzmaßnahmen,
      naechsteBewertung,
      verantwortlicher,
      bemerkungen
    } = req.body;

    const assessmentId = uuidv4();
    const currentDate = new Date().toISOString();

    await db.run(`
      INSERT INTO security_assessments (
        id, geraet_id, iec62443_level, risiko_einstufung, bedrohungsanalyse,
        schutzmassnahmen, letzte_bewertung, naechste_bewertung, verantwortlicher,
        bemerkungen
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      assessmentId,
      req.params.geraetId,
      iec62443Level,
      risikoEinstufung,
      bedrohungsanalyse,
      JSON.stringify(schutzmaßnahmen),
      currentDate,
      naechsteBewertung,
      verantwortlicher,
      bemerkungen
    ]);

    res.json(createResponse(true, { id: assessmentId }, 'Security Assessment erstellt'));
  } catch (error) {
    console.error('Fehler beim Erstellen des Security Assessments:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== ASSET LIFECYCLE ===================

// Asset Lifecycle für einen Standort abrufen
app.get('/api/standorte/:standortId/asset-lifecycle', async (req, res) => {
  try {
    const assets = await db.all(`
      SELECT al.*, g.name as geraet_name
      FROM asset_lifecycle al
      JOIN geraete g ON al.geraet_id = g.id
      WHERE g.standort_id = ?
      ORDER BY al.installations_datum DESC
    `, [req.params.standortId]);

    const responseData = assets.map(asset => ({
      id: asset.id,
      geraetId: asset.geraet_id,
      installationsDatum: asset.installations_datum,
      inbetriebnahmeDatum: asset.inbetriebnahme_datum,
      geplantesEOL: asset.geplantes_eol,
      erwarteteLebensdauer: asset.erwartete_lebensdauer,
      aktuelleFirmwareVersion: asset.aktuelle_firmware_version,
      letzteFirmwareUpdate: asset.letzte_firmware_update,
      wartungsintervall: asset.wartungsintervall,
      letzteWartung: asset.letzte_wartung,
      naechsteWartung: asset.naechste_wartung,
      wartungsverantwortlicher: asset.wartungsverantwortlicher,
      kritikalitaet: asset.kritikalitaet,
      ersatzteilVerfuegbarkeit: asset.ersatzteil_verfuegbarkeit,
      supportStatus: asset.support_status,
      bemerkungen: asset.bemerkungen,
      geraetName: asset.geraet_name
    }));

    res.json(createResponse(true, responseData));
  } catch (error) {
    console.error('Fehler beim Abrufen der Asset Lifecycle Daten:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Asset Lifecycle erstellen
app.post('/api/geraete/:geraetId/asset-lifecycle', async (req, res) => {
  try {
    const {
      installationsDatum,
      inbetriebnahmeDatum,
      geplantesEOL,
      erwarteteLebensdauer,
      aktuelleFirmwareVersion,
      wartungsintervall,
      letzteWartung,
      naechsteWartung,
      wartungsverantwortlicher,
      kritikalitaet,
      ersatzteilVerfuegbarkeit,
      supportStatus,
      bemerkungen
    } = req.body;

    const lifecycleId = uuidv4();

    await db.run(`
      INSERT INTO asset_lifecycle (
        id, geraet_id, installations_datum, inbetriebnahme_datum, geplantes_eol,
        erwartete_lebensdauer, aktuelle_firmware_version, wartungsintervall,
        letzte_wartung, naechste_wartung, wartungsverantwortlicher, kritikalitaet,
        ersatzteil_verfuegbarkeit, support_status, bemerkungen
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      lifecycleId,
      req.params.geraetId,
      installationsDatum,
      inbetriebnahmeDatum,
      geplantesEOL,
      erwarteteLebensdauer,
      aktuelleFirmwareVersion,
      wartungsintervall,
      letzteWartung,
      naechsteWartung,
      wartungsverantwortlicher,
      kritikalitaet,
      ersatzteilVerfuegbarkeit,
      supportStatus,
      bemerkungen
    ]);

    res.json(createResponse(true, { id: lifecycleId }, 'Asset Lifecycle erstellt'));
  } catch (error) {
    console.error('Fehler beim Erstellen des Asset Lifecycle:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== COMPLIANCE ASSESSMENTS ===================

// Compliance Assessments für einen Standort abrufen
app.get('/api/standorte/:standortId/compliance-assessments', async (req, res) => {
  try {
    const assessments = await db.all(`
      SELECT ca.*, cr.standard, cr.anforderung, cr.kategorie, g.name as geraet_name
      FROM compliance_assessments ca
      JOIN compliance_requirements cr ON ca.requirement_id = cr.id
      JOIN geraete g ON ca.geraet_id = g.id
      WHERE g.standort_id = ?
      ORDER BY ca.bewertungs_datum DESC
    `, [req.params.standortId]);

    const responseData = assessments.map(assessment => ({
      id: assessment.id,
      geraetId: assessment.geraet_id,
      requirementId: assessment.requirement_id,
      standard: assessment.standard,
      anforderung: assessment.anforderung,
      kategorie: assessment.kategorie,
      bewertungsDatum: assessment.bewertungs_datum,
      bewerter: assessment.bewerter,
      konformitaetsStatus: assessment.konformitaets_status,
      abweichungen: assessment.abweichungen,
      massnahmen: assessment.massnahmen,
      frist: assessment.frist,
      naechstePruefung: assessment.naechste_pruefung,
      bemerkungen: assessment.bemerkungen,
      geraetName: assessment.geraet_name
    }));

    res.json(createResponse(true, responseData));
  } catch (error) {
    console.error('Fehler beim Abrufen der Compliance Assessments:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Compliance Assessment erstellen
app.post('/api/geraete/:geraetId/compliance-assessments', async (req, res) => {
  try {
    const {
      requirementId,
      bewerter,
      konformitaetsStatus,
      abweichungen,
      massnahmen,
      frist,
      naechstePruefung,
      bemerkungen
    } = req.body;

    const assessmentId = uuidv4();
    const currentDate = new Date().toISOString();

    await db.run(`
      INSERT INTO compliance_assessments (
        id, geraet_id, requirement_id, bewertungs_datum, bewerter,
        konformitaets_status, abweichungen, massnahmen, frist,
        naechste_pruefung, bemerkungen
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      assessmentId,
      req.params.geraetId,
      requirementId,
      currentDate,
      bewerter,
      konformitaetsStatus,
      abweichungen,
      massnahmen,
      frist,
      naechstePruefung,
      bemerkungen
    ]);

    res.json(createResponse(true, { id: assessmentId }, 'Compliance Assessment erstellt'));
  } catch (error) {
    console.error('Fehler beim Erstellen des Compliance Assessments:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== GERÄTE API ERWEITERUNGEN ===================

// Geräte API erweitern um Purdue Level und Security Zone
app.patch('/api/geraete/:id/it-ot-properties', async (req, res) => {
  try {
    const { purdueLevel, securityZone } = req.body;

    await db.run(`
      UPDATE geraete 
      SET purdue_level = ?, security_zone = ?
      WHERE id = ?
    `, [purdueLevel, securityZone, req.params.id]);

    res.json(createResponse(true, null, 'IT/OT-Eigenschaften erfolgreich aktualisiert'));
  } catch (error) {
    console.error('Fehler beim Aktualisieren der IT/OT-Eigenschaften:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Erweiterte Gerätesuche mit IT/OT-Filtern
app.get('/api/geraete/search', async (req, res) => {
  try {
    const { 
      standortId, 
      purdueLevel, 
      securityZone, 
      kritikalitaet, 
      geraetekategorie,
      search 
    } = req.query;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (standortId) {
      whereClause += ' AND g.standort_id = ?';
      params.push(standortId);
    }

    if (purdueLevel) {
      whereClause += ' AND g.purdue_level = ?';
      params.push(purdueLevel);
    }

    if (securityZone) {
      whereClause += ' AND g.security_zone = ?';
      params.push(securityZone);
    }

    if (geraetekategorie) {
      whereClause += ' AND g.geraetekategorie = ?';
      params.push(geraetekategorie);
    }

    if (kritikalitaet) {
      whereClause += ' AND al.kritikalitaet = ?';
      params.push(kritikalitaet);
    }

    if (search) {
      whereClause += ' AND (g.name LIKE ? OR g.modell LIKE ? OR g.seriennummer LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const geraete = await db.all(`
      SELECT g.*, al.kritikalitaet, al.naechste_wartung, s.name as standort_name
      FROM geraete g
      LEFT JOIN asset_lifecycle al ON g.id = al.geraet_id
      JOIN standorte s ON g.standort_id = s.id
      ${whereClause}
      ORDER BY g.name
    `, params);

    const responseData = geraete.map(geraet => ({
      id: geraet.id,
      name: geraet.name,
      hostname: geraet.hostname,
      geraetetyp: geraet.geraetetyp,
      modell: geraet.modell,
      seriennummer: geraet.seriennummer,
      standortName: geraet.standort_name,
      purdueLevel: geraet.purdue_level,
      securityZone: geraet.security_zone,
      geraetekategorie: geraet.geraetekategorie,
      kritikalitaet: geraet.kritikalitaet,
      naechsteWartung: geraet.naechste_wartung
    }));

    res.json(createResponse(true, responseData));
  } catch (error) {
    console.error('Fehler bei der erweiterten Gerätesuche:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== ITOT VERWALTUNG APIs ===================

// ITOTVerwaltung Dashboard-Daten für einen Standort abrufen
app.get('/api/standorte/:standortId/itot-dashboard', async (req, res) => {
  try {
    const standortId = req.params.standortId;
    
    // Geräte-Statistiken
    const geraeteStats = await db.get(`
      SELECT 
        COUNT(*) as gesamt,
        COUNT(CASE WHEN geraetekategorie = 'IT' THEN 1 END) as it_geraete,
        COUNT(CASE WHEN geraetekategorie = 'OT' THEN 1 END) as ot_geraete,
        COUNT(CASE WHEN geraetekategorie = 'Hybrid' THEN 1 END) as hybrid_geraete
      FROM geraete 
      WHERE standort_id = ?
    `, [standortId]);

    // Purdue Model Verteilung
    const purdueStats = await db.all(`
      SELECT purdue_level, COUNT(*) as anzahl
      FROM geraete 
      WHERE standort_id = ? AND purdue_level IS NOT NULL AND purdue_level != 'Nicht definiert'
      GROUP BY purdue_level
    `, [standortId]);

    // Security Zones Verteilung
    const securityZoneStats = await db.all(`
      SELECT security_zone, COUNT(*) as anzahl
      FROM geraete 
      WHERE standort_id = ? AND security_zone IS NOT NULL AND security_zone != 'Nicht definiert'
      GROUP BY security_zone
    `, [standortId]);

    // Security Assessments Statistiken
    const securityAssessmentStats = await db.get(`
      SELECT 
        COUNT(*) as gesamt,
        COUNT(CASE WHEN sa.risiko_einstufung = 'Niedrig' THEN 1 END) as niedrig,
        COUNT(CASE WHEN sa.risiko_einstufung = 'Mittel' THEN 1 END) as mittel,
        COUNT(CASE WHEN sa.risiko_einstufung = 'Hoch' THEN 1 END) as hoch,
        COUNT(CASE WHEN sa.risiko_einstufung = 'Kritisch' THEN 1 END) as kritisch
      FROM security_assessments sa
      JOIN geraete g ON sa.geraet_id = g.id
      WHERE g.standort_id = ?
    `, [standortId]);

    // Communication Matrix Statistiken
    const communicationStats = await db.get(`
      SELECT 
        COUNT(*) as gesamt,
        COUNT(CASE WHEN sicherheitsrelevant = 1 THEN 1 END) as sicherheitsrelevant,
        COUNT(CASE WHEN real_time_requirement = 1 THEN 1 END) as real_time
      FROM communication_matrix
      WHERE standort_id = ?
    `, [standortId]);

    // Change Requests Statistiken
    const changeRequestStats = await db.get(`
      SELECT 
        COUNT(*) as gesamt,
        COUNT(CASE WHEN status = 'Draft' THEN 1 END) as draft,
        COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed
      FROM change_management
      WHERE standort_id = ?
    `, [standortId]);

    // Compliance Assessments Statistiken
    const complianceStats = await db.get(`
      SELECT 
        COUNT(*) as gesamt,
        COUNT(CASE WHEN ca.konformitaets_status = 'Compliant' THEN 1 END) as compliant,
        COUNT(CASE WHEN ca.konformitaets_status = 'Non-Compliant' THEN 1 END) as non_compliant,
        COUNT(CASE WHEN ca.konformitaets_status = 'Partially Compliant' THEN 1 END) as partially_compliant
      FROM compliance_assessments ca
      JOIN geraete g ON ca.geraet_id = g.id
      WHERE g.standort_id = ?
    `, [standortId]);

    const dashboardData = {
      geraeteStats: {
        gesamt: geraeteStats.gesamt || 0,
        itGeraete: geraeteStats.it_geraete || 0,
        otGeraete: geraeteStats.ot_geraete || 0,
        hybridGeraete: geraeteStats.hybrid_geraete || 0
      },
      purdueStats: purdueStats.map(stat => ({
        level: stat.purdue_level,
        anzahl: stat.anzahl
      })),
      securityZoneStats: securityZoneStats.map(stat => ({
        zone: stat.security_zone,
        anzahl: stat.anzahl
      })),
      securityAssessmentStats: {
        gesamt: securityAssessmentStats.gesamt || 0,
        niedrig: securityAssessmentStats.niedrig || 0,
        mittel: securityAssessmentStats.mittel || 0,
        hoch: securityAssessmentStats.hoch || 0,
        kritisch: securityAssessmentStats.kritisch || 0
      },
      communicationStats: {
        gesamt: communicationStats.gesamt || 0,
        sicherheitsrelevant: communicationStats.sicherheitsrelevant || 0,
        realTime: communicationStats.real_time || 0
      },
      changeRequestStats: {
        gesamt: changeRequestStats.gesamt || 0,
        draft: changeRequestStats.draft || 0,
        inProgress: changeRequestStats.in_progress || 0,
        completed: changeRequestStats.completed || 0
      },
      complianceStats: {
        gesamt: complianceStats.gesamt || 0,
        compliant: complianceStats.compliant || 0,
        nonCompliant: complianceStats.non_compliant || 0,
        partiallyCompliant: complianceStats.partially_compliant || 0
      }
    };

    res.json(createResponse(true, dashboardData));
  } catch (error) {
    console.error('Fehler beim Abrufen der ITOTVerwaltung Dashboard-Daten:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Security Assessment aktualisieren
app.put('/api/security-assessments/:id', async (req, res) => {
  try {
    const {
      iec62443Level,
      risikoEinstufung,
      bedrohungsanalyse,
      schutzmaßnahmen,
      naechsteBewertung,
      verantwortlicher,
      bemerkungen
    } = req.body;

    const existierend = await db.get('SELECT id FROM security_assessments WHERE id = ?', [req.params.id]);
    if (!existierend) {
      return res.status(404).json(createResponse(false, null, 'Security Assessment nicht gefunden'));
    }

    await db.run(`
      UPDATE security_assessments SET
        iec62443_level = ?,
        risiko_einstufung = ?,
        bedrohungsanalyse = ?,
        schutzmassnahmen = ?,
        naechste_bewertung = ?,
        verantwortlicher = ?,
        bemerkungen = ?,
        aktualisiert_am = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      iec62443Level,
      risikoEinstufung,
      bedrohungsanalyse,
      JSON.stringify(schutzmaßnahmen || []),
      naechsteBewertung,
      verantwortlicher,
      bemerkungen,
      req.params.id
    ]);

    res.json(createResponse(true, null, 'Security Assessment erfolgreich aktualisiert'));
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Security Assessments:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Security Assessment löschen
app.delete('/api/security-assessments/:id', async (req, res) => {
  try {
    const existierend = await db.get('SELECT id FROM security_assessments WHERE id = ?', [req.params.id]);
    if (!existierend) {
      return res.status(404).json(createResponse(false, null, 'Security Assessment nicht gefunden'));
    }

    await db.run('DELETE FROM security_assessments WHERE id = ?', [req.params.id]);

    res.json(createResponse(true, null, 'Security Assessment erfolgreich gelöscht'));
  } catch (error) {
    console.error('Fehler beim Löschen des Security Assessments:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Communication Matrix Eintrag aktualisieren
app.put('/api/communication-matrix/:id', async (req, res) => {
  try {
    const {
      quellGeraetId,
      zielGeraetId,
      protokoll,
      richtung,
      datentyp,
      zykluszeit,
      prioritaet,
      realTimeRequirement,
      maxLatenz,
      maxJitter,
      sicherheitsrelevant,
      verschluesselung,
      authentifizierung,
      bemerkungen
    } = req.body;

    const existierend = await db.get('SELECT id FROM communication_matrix WHERE id = ?', [req.params.id]);
    if (!existierend) {
      return res.status(404).json(createResponse(false, null, 'Communication Matrix Eintrag nicht gefunden'));
    }

    await db.run(`
      UPDATE communication_matrix SET
        quell_geraet_id = ?,
        ziel_geraet_id = ?,
        protokoll = ?,
        richtung = ?,
        datentyp = ?,
        zykluszeit = ?,
        prioritaet = ?,
        real_time_requirement = ?,
        max_latenz = ?,
        max_jitter = ?,
        sicherheitsrelevant = ?,
        verschluesselung = ?,
        authentifizierung = ?,
        bemerkungen = ?,
        aktualisiert_am = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      quellGeraetId,
      zielGeraetId,
      protokoll,
      richtung,
      datentyp,
      zykluszeit,
      prioritaet,
      realTimeRequirement ? 1 : 0,
      maxLatenz,
      maxJitter,
      sicherheitsrelevant ? 1 : 0,
      verschluesselung ? 1 : 0,
      authentifizierung ? 1 : 0,
      bemerkungen,
      req.params.id
    ]);

    res.json(createResponse(true, null, 'Communication Matrix Eintrag erfolgreich aktualisiert'));
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Communication Matrix Eintrags:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Communication Matrix Eintrag löschen
app.delete('/api/communication-matrix/:id', async (req, res) => {
  try {
    const existierend = await db.get('SELECT id FROM communication_matrix WHERE id = ?', [req.params.id]);
    if (!existierend) {
      return res.status(404).json(createResponse(false, null, 'Communication Matrix Eintrag nicht gefunden'));
    }

    await db.run('DELETE FROM communication_matrix WHERE id = ?', [req.params.id]);

    res.json(createResponse(true, null, 'Communication Matrix Eintrag erfolgreich gelöscht'));
  } catch (error) {
    console.error('Fehler beim Löschen des Communication Matrix Eintrags:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Change Request aktualisieren
app.put('/api/change-requests/:id', async (req, res) => {
  try {
    const {
      titel,
      beschreibung,
      changeTyp,
      prioritaet,
      antragsteller,
      antragsGrund,
      risikoAnalyse,
      implementierungsplan,
      rollbackPlan,
      testPlan,
      geraetId,
      geplantesStartDatum,
      geplantesEndeDatum,
      status
    } = req.body;

    const existierend = await db.get('SELECT id FROM change_management WHERE id = ?', [req.params.id]);
    if (!existierend) {
      return res.status(404).json(createResponse(false, null, 'Change Request nicht gefunden'));
    }

    await db.run(`
      UPDATE change_management SET
        titel = ?,
        beschreibung = ?,
        change_typ = ?,
        prioritaet = ?,
        antragsteller = ?,
        antrags_grund = ?,
        risiko_analyse = ?,
        implementierungs_plan = ?,
        rollback_plan = ?,
        test_plan = ?,
        geraet_id = ?,
        geplantes_start_datum = ?,
        geplantes_ende_datum = ?,
        status = ?,
        aktualisiert_am = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      titel,
      beschreibung,
      changeTyp,
      prioritaet,
      antragsteller,
      antragsGrund,
      risikoAnalyse,
      implementierungsplan,
      rollbackPlan,
      testPlan,
      geraetId,
      geplantesStartDatum,
      geplantesEndeDatum,
      status,
      req.params.id
    ]);

    res.json(createResponse(true, null, 'Change Request erfolgreich aktualisiert'));
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Change Requests:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Change Request löschen
app.delete('/api/change-requests/:id', async (req, res) => {
  try {
    const existierend = await db.get('SELECT id FROM change_management WHERE id = ?', [req.params.id]);
    if (!existierend) {
      return res.status(404).json(createResponse(false, null, 'Change Request nicht gefunden'));
    }

    await db.run('DELETE FROM change_management WHERE id = ?', [req.params.id]);

    res.json(createResponse(true, null, 'Change Request erfolgreich gelöscht'));
  } catch (error) {
    console.error('Fehler beim Löschen des Change Requests:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Asset Lifecycle aktualisieren
app.put('/api/asset-lifecycle/:id', async (req, res) => {
  try {
    const {
      installationsDatum,
      inbetriebnahmeDatum,
      geplantesEOL,
      erwarteteLebensdauer,
      aktuelleFirmwareVersion,
      letzteFirmwareUpdate,
      wartungsintervall,
      letzteWartung,
      naechsteWartung,
      wartungsverantwortlicher,
      kritikalitaet,
      ersatzteilVerfuegbarkeit,
      supportStatus,
      bemerkungen
    } = req.body;

    const existierend = await db.get('SELECT id FROM asset_lifecycle WHERE id = ?', [req.params.id]);
    if (!existierend) {
      return res.status(404).json(createResponse(false, null, 'Asset Lifecycle nicht gefunden'));
    }

    await db.run(`
      UPDATE asset_lifecycle SET
        installations_datum = ?,
        inbetriebnahme_datum = ?,
        geplantes_eol = ?,
        erwartete_lebensdauer = ?,
        aktuelle_firmware_version = ?,
        letzte_firmware_update = ?,
        wartungsintervall = ?,
        letzte_wartung = ?,
        naechste_wartung = ?,
        wartungsverantwortlicher = ?,
        kritikalitaet = ?,
        ersatzteil_verfuegbarkeit = ?,
        support_status = ?,
        bemerkungen = ?,
        aktualisiert_am = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      installationsDatum,
      inbetriebnahmeDatum,
      geplantesEOL,
      erwarteteLebensdauer,
      aktuelleFirmwareVersion,
      letzteFirmwareUpdate,
      wartungsintervall,
      letzteWartung,
      naechsteWartung,
      wartungsverantwortlicher,
      kritikalitaet,
      ersatzteilVerfuegbarkeit,
      supportStatus,
      bemerkungen,
      req.params.id
    ]);

    res.json(createResponse(true, null, 'Asset Lifecycle erfolgreich aktualisiert'));
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Asset Lifecycle:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Asset Lifecycle löschen
app.delete('/api/asset-lifecycle/:id', async (req, res) => {
  try {
    const existierend = await db.get('SELECT id FROM asset_lifecycle WHERE id = ?', [req.params.id]);
    if (!existierend) {
      return res.status(404).json(createResponse(false, null, 'Asset Lifecycle nicht gefunden'));
    }

    await db.run('DELETE FROM asset_lifecycle WHERE id = ?', [req.params.id]);

    res.json(createResponse(true, null, 'Asset Lifecycle erfolgreich gelöscht'));
  } catch (error) {
    console.error('Fehler beim Löschen des Asset Lifecycle:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Compliance Assessment aktualisieren
app.put('/api/compliance-assessments/:id', async (req, res) => {
  try {
    const {
      requirementId,
      bewerter,
      konformitaetsStatus,
      abweichungen,
      massnahmen,
      frist,
      naechstePruefung,
      bemerkungen
    } = req.body;

    const existierend = await db.get('SELECT id FROM compliance_assessments WHERE id = ?', [req.params.id]);
    if (!existierend) {
      return res.status(404).json(createResponse(false, null, 'Compliance Assessment nicht gefunden'));
    }

    await db.run(`
      UPDATE compliance_assessments SET
        requirement_id = ?,
        bewerter = ?,
        konformitaets_status = ?,
        abweichungen = ?,
        massnahmen = ?,
        frist = ?,
        naechste_pruefung = ?,
        bemerkungen = ?,
        aktualisiert_am = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      requirementId,
      bewerter,
      konformitaetsStatus,
      abweichungen,
      massnahmen,
      frist,
      naechstePruefung,
      bemerkungen,
      req.params.id
    ]);

    res.json(createResponse(true, null, 'Compliance Assessment erfolgreich aktualisiert'));
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Compliance Assessments:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Compliance Assessment löschen
app.delete('/api/compliance-assessments/:id', async (req, res) => {
  try {
    const existierend = await db.get('SELECT id FROM compliance_assessments WHERE id = ?', [req.params.id]);
    if (!existierend) {
      return res.status(404).json(createResponse(false, null, 'Compliance Assessment nicht gefunden'));
    }

    await db.run('DELETE FROM compliance_assessments WHERE id = ?', [req.params.id]);

    res.json(createResponse(true, null, 'Compliance Assessment erfolgreich gelöscht'));
  } catch (error) {
    console.error('Fehler beim Löschen des Compliance Assessments:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Asset Lifecycle für ein Gerät abrufen
app.get('/api/geraete/:geraetId/asset-lifecycle', async (req, res) => {
  try {
    const lifecycle = await db.get(`
      SELECT * FROM asset_lifecycle WHERE geraet_id = ?
    `, [req.params.geraetId]);

    if (!lifecycle) {
      return res.json(createResponse(true, null, 'Kein Asset Lifecycle gefunden'));
    }

    const responseData = {
      id: lifecycle.id,
      geraetId: lifecycle.geraet_id,
      installationsDatum: lifecycle.installations_datum,
      inbetriebnahmeDatum: lifecycle.inbetriebnahme_datum,
      geplantesEOL: lifecycle.geplantes_eol,
      erwarteteLebensdauer: lifecycle.erwartete_lebensdauer,
      aktuelleFirmwareVersion: lifecycle.aktuelle_firmware_version,
      letzteFirmwareUpdate: lifecycle.letzte_firmware_update,
      wartungsintervall: lifecycle.wartungsintervall,
      letzteWartung: lifecycle.letzte_wartung,
      naechsteWartung: lifecycle.naechste_wartung,
      wartungsverantwortlicher: lifecycle.wartungsverantwortlicher,
      kritikalitaet: lifecycle.kritikalitaet,
      ersatzteilVerfuegbarkeit: lifecycle.ersatzteil_verfuegbarkeit,
      supportStatus: lifecycle.support_status,
      bemerkungen: lifecycle.bemerkungen
    };

    res.json(createResponse(true, responseData));
  } catch (error) {
    console.error('Fehler beim Abrufen des Asset Lifecycle:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Asset Lifecycle für einen Standort abrufen
app.get('/api/standorte/:standortId/asset-lifecycle', async (req, res) => {
  try {
    const lifecycles = await db.all(`
      SELECT al.*, g.name as geraet_name
      FROM asset_lifecycle al
      JOIN geraete g ON al.geraet_id = g.id
      WHERE g.standort_id = ?
      ORDER BY al.naechste_wartung ASC
    `, [req.params.standortId]);

    const responseData = lifecycles.map(lifecycle => ({
      id: lifecycle.id,
      geraetId: lifecycle.geraet_id,
      geraetName: lifecycle.geraet_name,
      installationsDatum: lifecycle.installations_datum,
      inbetriebnahmeDatum: lifecycle.inbetriebnahme_datum,
      geplantesEOL: lifecycle.geplantes_eol,
      erwarteteLebensdauer: lifecycle.erwartete_lebensdauer,
      aktuelleFirmwareVersion: lifecycle.aktuelle_firmware_version,
      letzteFirmwareUpdate: lifecycle.letzte_firmware_update,
      wartungsintervall: lifecycle.wartungsintervall,
      letzteWartung: lifecycle.letzte_wartung,
      naechsteWartung: lifecycle.naechste_wartung,
      wartungsverantwortlicher: lifecycle.wartungsverantwortlicher,
      kritikalitaet: lifecycle.kritikalitaet,
      ersatzteilVerfuegbarkeit: lifecycle.ersatzteil_verfuegbarkeit,
      supportStatus: lifecycle.support_status,
      bemerkungen: lifecycle.bemerkungen
    }));

    res.json(createResponse(true, responseData));
  } catch (error) {
    console.error('Fehler beim Abrufen der Asset Lifecycle Daten:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== NETZWERK-SCAN API ===================

// Aktive Scan-Sessions verwalten
const activeScanSessions = new Map();

// Socket.IO Verbindungen für Live-Updates
io.on('connection', (socket) => {
  console.log('Client verbunden für Netzwerk-Scan Updates:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client getrennt:', socket.id);
  });
});

// Netzwerk-Scan starten
app.post('/api/network-scan/start', async (req, res) => {
  try {
    const { ipRange, standortId } = req.body;
    
    if (!ipRange) {
      return res.status(400).json(createResponse(false, null, 'IP-Bereich ist erforderlich'));
    }
    
    if (!standortId) {
      return res.status(400).json(createResponse(false, null, 'Standort-ID ist erforderlich'));
    }

    const scanId = uuidv4();
    
    // Scan-Session erstellen
    activeScanSessions.set(scanId, {
      id: scanId,
      ipRange,
      standortId,
      startTime: new Date(),
      status: 'running',
      progress: { totalHosts: 0, scannedHosts: 0, foundHosts: 0, currentOperation: 'Initialisierung...' }
    });

    // Scan asynchron starten
    networkScanner.scanNetwork(ipRange, (progress) => {
      // Progress an alle verbundenen Clients senden
      io.emit('scan-progress', {
        scanId,
        progress,
        timestamp: new Date()
      });
      
      // Session aktualisieren
      const session = activeScanSessions.get(scanId);
      if (session) {
        session.progress = progress;
      }
    })
    .then((results) => {
      // Scan erfolgreich abgeschlossen
      const session = activeScanSessions.get(scanId);
      if (session) {
        session.status = 'completed';
        session.results = results;
        session.endTime = new Date();
      }
      
      io.emit('scan-completed', {
        scanId,
        results,
        timestamp: new Date()
      });
    })
    .catch((error) => {
      // Scan-Fehler
      const session = activeScanSessions.get(scanId);
      if (session) {
        session.status = 'error';
        session.error = error.message;
        session.endTime = new Date();
      }
      
      io.emit('scan-error', {
        scanId,
        error: error.message,
        timestamp: new Date()
      });
    });

    res.json(createResponse(true, { scanId }, 'Netzwerk-Scan gestartet'));
  } catch (error) {
    console.error('Fehler beim Starten des Netzwerk-Scans:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Scan-Status abrufen
app.get('/api/network-scan/:scanId/status', async (req, res) => {
  try {
    const { scanId } = req.params;
    const session = activeScanSessions.get(scanId);
    
    if (!session) {
      return res.status(404).json(createResponse(false, null, 'Scan-Session nicht gefunden'));
    }
    
    res.json(createResponse(true, session));
  } catch (error) {
    console.error('Fehler beim Abrufen des Scan-Status:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Scan-Ergebnisse abrufen
app.get('/api/network-scan/:scanId/results', async (req, res) => {
  try {
    const { scanId } = req.params;
    const session = activeScanSessions.get(scanId);
    
    if (!session) {
      return res.status(404).json(createResponse(false, null, 'Scan-Session nicht gefunden'));
    }
    
    if (session.status !== 'completed') {
      return res.status(400).json(createResponse(false, null, 'Scan noch nicht abgeschlossen'));
    }
    
    res.json(createResponse(true, session.results));
  } catch (error) {
    console.error('Fehler beim Abrufen der Scan-Ergebnisse:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Geräte aus Scan-Ergebnissen erstellen
app.post('/api/network-scan/:scanId/create-devices', async (req, res) => {
  try {
    const { scanId } = req.params;
    const { selectedDevices } = req.body;
    
    if (!selectedDevices || !Array.isArray(selectedDevices)) {
      return res.status(400).json(createResponse(false, null, 'Ausgewählte Geräte sind erforderlich'));
    }
    
    const session = activeScanSessions.get(scanId);
    if (!session) {
      return res.status(404).json(createResponse(false, null, 'Scan-Session nicht gefunden'));
    }
    
    const standortId = session.standortId;
    const createdDevices = [];
    
    await db.beginTransaction();
    
    for (const deviceData of selectedDevices) {
      const geraetId = uuidv4();
      
      // Gerät erstellen
      await db.run(`
        INSERT INTO geraete (
          id, standort_id, name, geraetetyp, modell, seriennummer,
          ip_typ, ip_adresse, netzwerkbereich, anzahl_netzwerkports,
          bemerkungen, geraetekategorie
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        geraetId,
        standortId,
        deviceData.name || deviceData.suggestedName,
        deviceData.deviceType || deviceData.suggestedDeviceType,
        'Unbekannt',
        null,
        'statisch',
        deviceData.ip,
        session.ipRange,
        deviceData.openPorts?.length || 0,
        `Automatisch erstellt durch Netzwerk-Scan. Gefundene Services: ${deviceData.categories?.join(', ') || 'Keine'}`,
        deviceData.categories?.includes('Industrial') ? 'OT' : 'IT'
      ]);
      
      // Ports erstellen basierend auf gefundenen offenen Ports
      if (deviceData.openPorts && deviceData.openPorts.length > 0) {
        for (let i = 0; i < deviceData.openPorts.length; i++) {
          const port = deviceData.openPorts[i];
          await db.run(`
            INSERT INTO port_belegungen (id, geraet_id, port_nummer, belegt, beschreibung, port_typ, geschwindigkeit)
            VALUES (?, ?, ?, 1, ?, 'RJ45', '1G')
          `, [
            uuidv4(),
            geraetId,
            i + 1,
            `${port.service.name} (Port ${port.port})`
          ]);
        }
      } else {
        // Standard-Port erstellen falls keine offenen Ports gefunden
        await db.run(`
          INSERT INTO port_belegungen (id, geraet_id, port_nummer, belegt, port_typ, geschwindigkeit)
          VALUES (?, ?, 1, 0, 'RJ45', '1G')
        `, [uuidv4(), geraetId]);
      }
      
      createdDevices.push({
        id: geraetId,
        name: deviceData.name || deviceData.suggestedName,
        ip: deviceData.ip,
        deviceType: deviceData.deviceType || deviceData.suggestedDeviceType
      });
    }
    
    await db.commit();
    
    // Scan-Session als verarbeitet markieren
    if (session) {
      session.status = 'processed';
      session.createdDevices = createdDevices;
    }
    
    res.json(createResponse(true, { createdDevices }, `${createdDevices.length} Geräte erfolgreich erstellt`));
  } catch (error) {
    await db.rollback();
    console.error('Fehler beim Erstellen der Geräte:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Scan-Session löschen
app.delete('/api/network-scan/:scanId', async (req, res) => {
  try {
    const { scanId } = req.params;
    
    if (activeScanSessions.has(scanId)) {
      activeScanSessions.delete(scanId);
      res.json(createResponse(true, null, 'Scan-Session gelöscht'));
    } else {
      res.status(404).json(createResponse(false, null, 'Scan-Session nicht gefunden'));
    }
  } catch (error) {
    console.error('Fehler beim Löschen der Scan-Session:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Verfügbare Gerätetypen abrufen
app.get('/api/device-types', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT DISTINCT name 
      FROM geraetetypen 
      WHERE name IS NOT NULL AND name != '' AND aktiv = 1
      ORDER BY name ASC
    `);
    
    // Standard-Gerätetypen hinzufügen falls keine in der DB vorhanden
    const defaultTypes = [
      'Switch', 'Router', 'Server', 'PC', 'Laptop', 'Drucker', 'Access Point',
      'Firewall', 'Load Balancer', 'NAS', 'IP-Kamera', 'VoIP-Telefon',
      'PLC', 'HMI', 'Sensor', 'Aktor', 'Gateway', 'Unbekannt'
    ];
    
    let deviceTypes = rows.map(row => row.name);
    
    // Fehlende Standard-Typen hinzufügen
    for (const type of defaultTypes) {
      if (!deviceTypes.includes(type)) {
        deviceTypes.push(type);
      }
    }
    
    deviceTypes.sort();
    
    res.json(createResponse(true, deviceTypes));
  } catch (error) {
    console.error('Fehler beim Abrufen der Gerätetypen:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== EINSTELLUNGEN API ===================

// Multer-Konfiguration für Datei-Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|ico|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt (JPEG, JPG, PNG, GIF, SVG, ICO, WebP)'));
    }
  }
});

// Einstellungen aus Datenbank laden
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.get('SELECT * FROM app_settings WHERE id = 1');
    
    if (!settings) {
      // Standard-Einstellungen erstellen falls nicht vorhanden
      const defaultSettings = {
        id: 1,
        logo_light: '/header_weis.png',
        logo_dark: '/header_weis.png',
        favicon: '/favicon.ico',
        app_name: 'Network Documentation Tool',
        company_name: 'Westfalen AG'
      };
      
      await db.run(`
        INSERT INTO app_settings (id, logo_light, logo_dark, favicon, app_name, company_name)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [1, defaultSettings.logo_light, defaultSettings.logo_dark, defaultSettings.favicon, 
          defaultSettings.app_name, defaultSettings.company_name]);
      
      res.json(createResponse(true, defaultSettings));
    } else {
      res.json(createResponse(true, settings));
    }
  } catch (error) {
    console.error('Fehler beim Laden der Einstellungen:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Logo hochladen
app.post('/api/settings/upload-logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(createResponse(false, null, 'Keine Datei hochgeladen'));
    }

    const { theme } = req.body; // 'light' oder 'dark'
    if (!theme || !['light', 'dark'].includes(theme)) {
      return res.status(400).json(createResponse(false, null, 'Theme muss "light" oder "dark" sein'));
    }

    const originalPath = req.file.path;
    const filename = req.file.filename;
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    
    // Optimiertes Logo erstellen (max 200px Höhe, WebP Format für bessere Performance)
    const optimizedPath = path.join(path.dirname(originalPath), `${baseName}_optimized.webp`);
    
    await sharp(originalPath)
      .resize({ height: 200, withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(optimizedPath);

    const logoUrl = `/uploads/${baseName}_optimized.webp`;
    
    // Datenbank aktualisieren
    const column = theme === 'light' ? 'logo_light' : 'logo_dark';
    await db.run(`UPDATE app_settings SET ${column} = ? WHERE id = 1`, [logoUrl]);

    // Original-Datei löschen (behalten nur die optimierte Version)
    fs.unlinkSync(originalPath);

    res.json(createResponse(true, { logoUrl, theme }, 'Logo erfolgreich hochgeladen'));
  } catch (error) {
    console.error('Fehler beim Logo-Upload:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Favicon hochladen
app.post('/api/settings/upload-favicon', upload.single('favicon'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(createResponse(false, null, 'Keine Datei hochgeladen'));
    }

    const originalPath = req.file.path;
    const filename = req.file.filename;
    const baseName = path.basename(filename, path.extname(filename));
    
    // Verschiedene Favicon-Größen generieren
    const sizes = [16, 32, 48, 64, 128, 180, 192, 512];
    const faviconPaths = [];

    for (const size of sizes) {
      const faviconPath = path.join(path.dirname(originalPath), `favicon-${size}x${size}.png`);
      await sharp(originalPath)
        .resize(size, size)
        .png()
        .toFile(faviconPath);
      
      faviconPaths.push(`/uploads/favicon-${size}x${size}.png`);
    }

    // Haupt-Favicon (32x32) als favicon.ico
    const mainFaviconPath = path.join(__dirname, '../public/favicon.ico');
    await sharp(originalPath)
      .resize(32, 32)
      .png()
      .toFile(mainFaviconPath);

    const faviconUrl = '/favicon.ico';
    
    // Datenbank aktualisieren
    await db.run('UPDATE app_settings SET favicon = ? WHERE id = 1', [faviconUrl]);

    // Original-Datei löschen
    fs.unlinkSync(originalPath);

    res.json(createResponse(true, { faviconUrl, generatedSizes: faviconPaths }, 'Favicon erfolgreich hochgeladen'));
  } catch (error) {
    console.error('Fehler beim Favicon-Upload:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// App-Einstellungen aktualisieren
app.put('/api/settings', async (req, res) => {
  try {
    const { app_name, company_name } = req.body;
    
    await db.run(`
      UPDATE app_settings 
      SET app_name = ?, company_name = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = 1
    `, [app_name, company_name]);

    res.json(createResponse(true, null, 'Einstellungen erfolgreich aktualisiert'));
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Einstellungen:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Auf Standard zurücksetzen
app.post('/api/settings/reset', async (req, res) => {
  try {
    const { type } = req.body; // 'logo', 'favicon', oder 'all'
    
    if (type === 'logo' || type === 'all') {
      await db.run(`
        UPDATE app_settings 
        SET logo_light = '/header_weis.png', logo_dark = '/header_weis.png' 
        WHERE id = 1
      `);
    }
    
    if (type === 'favicon' || type === 'all') {
      await db.run('UPDATE app_settings SET favicon = \'/favicon.ico\' WHERE id = 1');
    }
    
    if (type === 'all') {
      await db.run(`
        UPDATE app_settings 
        SET app_name = 'Network Documentation Tool', company_name = 'Westfalen AG' 
        WHERE id = 1
      `);
    }

    res.json(createResponse(true, null, 'Einstellungen erfolgreich zurückgesetzt'));
  } catch (error) {
    console.error('Fehler beim Zurücksetzen der Einstellungen:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unbehandelter Fehler:', err);
  res.status(500).json(createResponse(false, null, 'Interner Serverfehler', err.message));
});

// Server starten
server.listen(PORT, () => {
  console.log(`Westfalen Network Tool Server läuft auf Port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Server wird heruntergefahren...');
  await db.close();
  process.exit(0);
}); 