const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const Database = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Datenbank-Instanz
const db = new Database();

// Hilfsfunktionen
const createResponse = (success, data = null, message = '', error = null) => ({
  success,
  data,
  message,
  error
});

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

    // Uplinks für jeden Standort laden und Datenstruktur anpassen
    for (let standort of standorte) {
      const uplinks = await db.all(
        'SELECT * FROM uplinks WHERE standort_id = ?',
        [standort.id]
      );
      
      // Konvertiere snake_case zu camelCase
      standort.verfuegbareUplinks = uplinks.map(uplink => ({
        id: uplink.id,
        typ: uplink.typ,
        anbieter: uplink.anbieter,
        erwarteteGeschwindigkeit: {
          download: uplink.download_geschwindigkeit,
          upload: uplink.upload_geschwindigkeit
        },
        oeffentlicheIpVerfuegbar: Boolean(uplink.oeffentliche_ip_verfuegbar),
        statischeIp: uplink.statische_ip,
        bemerkungen: uplink.bemerkungen
      }));
      
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
      
      // Alte Properties entfernen
      delete standort.ansprechpartner_name;
      delete standort.ansprechpartner_telefon;
      delete standort.ansprechpartner_email;
      delete standort.ansprechpartner_it_id;
      delete standort.ansprechpartner_vor_ort_id;
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

    // Uplinks laden und Struktur anpassen
    const uplinks = await db.all(
      'SELECT * FROM uplinks WHERE standort_id = ?',
      [standort.id]
    );
    
    standort.verfuegbareUplinks = uplinks.map(uplink => ({
      id: uplink.id,
      typ: uplink.typ,
      anbieter: uplink.anbieter,
      erwarteteGeschwindigkeit: {
        download: uplink.download_geschwindigkeit,
        upload: uplink.upload_geschwindigkeit
      },
      oeffentlicheIpVerfuegbar: Boolean(uplink.oeffentliche_ip_verfuegbar),
      statischeIp: uplink.statische_ip,
      bemerkungen: uplink.bemerkungen
    }));
    
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
    
    // Alte Properties entfernen
    delete standort.ansprechpartner_name;
    delete standort.ansprechpartner_telefon;
    delete standort.ansprechpartner_email;
    delete standort.ansprechpartner_it_id;
    delete standort.ansprechpartner_vor_ort_id;

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
      verfuegbareUplinks = []
    } = req.body;

    const standortId = uuidv4();

    await db.beginTransaction();

    // Standort erstellen
    await db.run(`
      INSERT INTO standorte (
        id, name, adresse, ansprechpartner_name, 
        ansprechpartner_telefon, ansprechpartner_email,
        ansprechpartner_it_id, ansprechpartner_vor_ort_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      standortId,
      name,
      adresse,
      ansprechpartner?.name || '',
      ansprechpartner?.telefon || '',
      ansprechpartner?.email || '',
      ansprechpartnerITId || null,
      ansprechpartnerVorOrtId || null
    ]);

    // Uplinks erstellen
    for (const uplink of verfuegbareUplinks) {
      await db.run(`
        INSERT INTO uplinks (
          id, standort_id, typ, anbieter, download_geschwindigkeit,
          upload_geschwindigkeit, oeffentliche_ip_verfuegbar, statische_ip, bemerkungen
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(),
        standortId,
        uplink.typ,
        uplink.anbieter,
        uplink.erwarteteGeschwindigkeit?.download || 0,
        uplink.erwarteteGeschwindigkeit?.upload || 0,
        uplink.oeffentlicheIpVerfuegbar ? 1 : 0,
        uplink.statischeIp || null,
        uplink.bemerkungen || null
      ]);
    }

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
      verfuegbareUplinks = []
    } = req.body;

    const standortId = req.params.id;

    await db.beginTransaction();

    // Standort aktualisieren
    await db.run(`
      UPDATE standorte SET 
        name = ?, adresse = ?, ansprechpartner_name = ?, 
        ansprechpartner_telefon = ?, ansprechpartner_email = ?,
        ansprechpartner_it_id = ?, ansprechpartner_vor_ort_id = ?
      WHERE id = ?
    `, [
      name,
      adresse,
      ansprechpartner?.name || '',
      ansprechpartner?.telefon || '',
      ansprechpartner?.email || '',
      ansprechpartnerITId || null,
      ansprechpartnerVorOrtId || null,
      standortId
    ]);

    // Bestehende Uplinks löschen
    await db.run('DELETE FROM uplinks WHERE standort_id = ?', [standortId]);

    // Neue Uplinks hinzufügen
    for (const uplink of verfuegbareUplinks) {
      await db.run(`
        INSERT INTO uplinks (
          id, standort_id, typ, anbieter, download_geschwindigkeit,
          upload_geschwindigkeit, oeffentliche_ip_verfuegbar, statische_ip, bemerkungen
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(),
        standortId,
        uplink.typ,
        uplink.anbieter,
        uplink.erwarteteGeschwindigkeit?.download || 0,
        uplink.erwarteteGeschwindigkeit?.upload || 0,
        uplink.oeffentlicheIpVerfuegbar ? 1 : 0,
        uplink.statischeIp || null,
        uplink.bemerkungen || null
      ]);
    }

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

    // Port-Belegungen für jedes Gerät laden und Datenstruktur konvertieren
    const geraete = [];
    for (let geraetRow of geraeteRows) {
      const ports = await db.all(
        'SELECT * FROM port_belegungen WHERE geraet_id = ? ORDER BY port_nummer',
        [geraetRow.id]
      );

      // Datenbank-Felder zu Frontend-Format konvertieren
      const geraet = {
        id: geraetRow.id,
        standortId: geraetRow.standort_id,
        name: geraetRow.name,
        geraetetyp: geraetRow.geraetetyp,
        modell: geraetRow.modell,
        seriennummer: geraetRow.seriennummer,
        standortDetails: geraetRow.standort_details,
        bemerkungen: geraetRow.bemerkungen,
        ipKonfiguration: {
          typ: geraetRow.ip_typ || 'dhcp',
          ipAdresse: geraetRow.ip_adresse,
          netzwerkbereich: geraetRow.netzwerkbereich
        },
        macAdresse: geraetRow.mac_adresse,
        anzahlNetzwerkports: geraetRow.anzahl_netzwerkports || 0,
        // Router-spezifische öffentliche IP-Konfiguration
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
        }))
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
      geraetetyp,
      modell,
      seriennummer,
      standortDetails,
      bemerkungen,
      ipKonfiguration,
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
        id, standort_id, name, geraetetyp, modell, seriennummer, standort_details, bemerkungen,
        ip_typ, ip_adresse, netzwerkbereich, mac_adresse, anzahl_netzwerkports,
        position_x, position_y, rack_name, rack_einheit,
        hat_oeffentliche_ip, oeffentliche_ip_typ, dyndns_aktiv, dyndns_adresse, statische_oeffentliche_ip
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      geraetId,
      req.params.standortId,
      name,
      geraetetyp,
      modell,
      seriennummer || null,
      standortDetails || null,
      bemerkungen || null,
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
      geraetetyp,
      modell,
      seriennummer,
      standortDetails,
      bemerkungen,
      ipKonfiguration,
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
        name = ?, geraetetyp = ?, modell = ?, seriennummer = ?, standort_details = ?, bemerkungen = ?,
        ip_typ = ?, ip_adresse = ?, netzwerkbereich = ?, mac_adresse = ?, anzahl_netzwerkports = ?,
        position_x = ?, position_y = ?, rack_name = ?, rack_einheit = ?,
        hat_oeffentliche_ip = ?, oeffentliche_ip_typ = ?, dyndns_aktiv = ?, dyndns_adresse = ?, statische_oeffentliche_ip = ?
      WHERE id = ?
    `, [
      name,
      geraetetyp,
      modell,
      seriennummer || null,
      standortDetails || null,
      bemerkungen || null,
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

    await db.commit();

    res.json(createResponse(true, null, 'Gerät erfolgreich aktualisiert'));
  } catch (error) {
    await db.rollback();
    console.error('Fehler beim Aktualisieren des Geräts:', error);
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

// Debug: Alle Verbindungen in der Datenbank anzeigen
app.get('/api/debug/verbindungen/:standortId', async (req, res) => {
  try {
    console.log('Debug: Lade alle Verbindungen für Standort:', req.params.standortId);
    
    const alleVerbindungen = await db.all(`
      SELECT v.*, 
             g1.name as quell_geraet_name,
             g2.name as ziel_geraet_name
      FROM verbindungen v
      JOIN geraete g1 ON v.quell_geraet_id = g1.id
      JOIN geraete g2 ON v.ziel_geraet_id = g2.id
      WHERE v.standort_id = ?
      ORDER BY v.erstellt_am DESC
    `, [req.params.standortId]);

    console.log('Debug: Gefundene Verbindungen:', alleVerbindungen.length);
    alleVerbindungen.forEach((v, i) => {
      console.log(`${i+1}. ${v.quell_geraet_name}:${v.quell_port} -> ${v.ziel_geraet_name}:${v.ziel_port} (${v.kabeltyp}) [${v.bemerkungen || 'keine Bemerkung'}]`);
    });

    res.json(createResponse(true, {
      anzahl: alleVerbindungen.length,
      verbindungen: alleVerbindungen
    }));
  } catch (error) {
    console.error('Debug Fehler:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// Debug: Alle Stack-Verbindungen anzeigen
app.get('/api/debug/stack-verbindungen/:standortId', async (req, res) => {
  try {
    console.log('Debug: Lade alle Stack-Verbindungen für Standort:', req.params.standortId);
    
    const stackVerbindungen = await db.all(`
      SELECT sv.*, 
             s.name as stack_name,
             g1.name as quell_geraet_name,
             g2.name as ziel_geraet_name
      FROM stack_verbindungen sv
      JOIN switch_stacks s ON sv.stack_id = s.id
      JOIN geraete g1 ON sv.quell_geraet_id = g1.id
      JOIN geraete g2 ON sv.ziel_geraet_id = g2.id
      WHERE s.standort_id = ?
      ORDER BY s.name, sv.quell_port
    `, [req.params.standortId]);

    console.log('Debug: Gefundene Stack-Verbindungen:', stackVerbindungen.length);
    stackVerbindungen.forEach((v, i) => {
      console.log(`${i+1}. Stack "${v.stack_name}": ${v.quell_geraet_name}:${v.quell_port} -> ${v.ziel_geraet_name}:${v.ziel_port} (${v.verbindungstyp})`);
    });

    res.json(createResponse(true, {
      anzahl: stackVerbindungen.length,
      stackVerbindungen: stackVerbindungen
    }));
  } catch (error) {
    console.error('Debug Fehler:', error);
    res.status(500).json(createResponse(false, null, '', error.message));
  }
});

// =================== UTILITY API ===================

// Verfügbare Gerätetypen abrufen
app.get('/api/geraetetypen', (req, res) => {
  const geraetetypen = [
    'Router',
    'Switch', 
    'SD-WAN Gateway',
    'Firewall',
    'Access Point',
    'Kamera',
    'VOIP-Phone',
    'Drucker',
    'AI-Port',
    'NVR',
    'Zugangskontrolle',
    'Serial Server',
    'HMI',
    'Server',
    'Sensor',
    'Sonstiges'
  ];

  res.json(createResponse(true, geraetetypen));
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

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unbehandelter Fehler:', err);
  res.status(500).json(createResponse(false, null, 'Interner Serverfehler', err.message));
});

// Server starten
app.listen(PORT, () => {
  console.log(`Westfalen Network Tool Server läuft auf Port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Server wird heruntergefahren...');
  await db.close();
  process.exit(0);
}); 