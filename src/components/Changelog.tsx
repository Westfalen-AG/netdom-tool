import React from 'react';
import {
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  History as HistoryIcon,
  Add as AddIcon,
  Build as BuildIcon,
  BugReport as BugIcon,
  Security as SecurityIcon,
  Update as UpdateIcon,
} from '@mui/icons-material';

interface ChangelogEntry {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch';
  changes: {
    type: 'added' | 'changed' | 'fixed' | 'security';
    description: string;
  }[];
}

const Changelog: React.FC = () => {
  const changelogData: ChangelogEntry[] = [
    {
      version: '1.7.0',
      date: '2025-07-31',
      type: 'minor',
      changes: [
        {
          type: 'added',
          description: 'Vollautomatisches Netzwerk-Scanning mit intelligenter Geräteerkennung implementiert'
        },
        {
          type: 'added',
          description: 'Parallele Host-Discovery: 25 Hosts gleichzeitig scannen für 5-8x bessere Performance'
        },
        {
          type: 'added',
          description: 'Multi-Methoden-Erkennung: Ping + TCP-Connect für Hosts, die nicht auf Ping antworten'
        },
        {
          type: 'added',
          description: 'Port-Scanning für 50+ bekannte Services (Web, SSH, RDP, VNC, Datenbanken, Industrial, etc.)'
        },
        {
          type: 'added',
          description: 'Intelligente Geräteerkennung basierend auf offenen Port-Kombinationen'
        },
        {
          type: 'added',
          description: 'Hostname-Auflösung via DNS Reverse Lookup für bessere Gerätenamen-Vorschläge'
        },
        {
          type: 'added',
          description: 'Live-Progress-Tracking mit Echzeit-Updates über WebSocket-Verbindung'
        },
        {
          type: 'added',
          description: 'Interaktive Geräteauswahl mit Dropdown für Gerätetypen aus Datenbank'
        },
        {
          type: 'added',
          description: 'Batch-Geräteerstellung: Mehrere Geräte gleichzeitig aus Scan-Ergebnissen erstellen'
        },
        {
          type: 'added',
          description: 'Einstellungsseite mit vollständiger App-Anpassung implementiert'
        },
        {
          type: 'added',
          description: 'Logo-Upload: Separate Logos für Hell- und Dunkel-Modus mit automatischer WebP-Optimierung'
        },
        {
          type: 'added',
          description: 'Favicon-Management: Automatische Generierung aller benötigten Größen (16x16 bis 512x512px)'
        },
        {
          type: 'added',
          description: 'App-Branding: Anpassbare App-Namen und Firmenbezeichnungen'
        },
        {
          type: 'added',
          description: 'Reset-Funktionalität: Zurücksetzen auf Standard-Westfalen-Branding'
        },
        {
          type: 'changed',
          description: 'Netzbereichs-Verwaltung um Scan-Funktionalität erweitert'
        },
        {
          type: 'changed',
          description: 'Performance-Optimierungen: Netzwerk-Scans sind jetzt 5-8x schneller durch Parallelisierung'
        },
        {
          type: 'fixed',
          description: 'ESLint-Warnungen in NetzbereichsVerwaltung.tsx behoben'
        },
        {
          type: 'fixed',
          description: 'Datenbankfehler bei Gerätetypen-API behoben (korrekte Spaltenreferenz)'
        }
      ]
    },
    {
      version: '1.6.0',
      date: '2025-07-13',
      type: 'minor',
      changes: [
        {
          type: 'added',
          description: 'IT/OT-Verwaltung mit vollständiger Infrastruktur-Management-Funktionalität implementiert'
        },
        {
          type: 'added',
          description: 'Dashboard mit umfassenden Statistiken für IT/OT-Geräte, Purdue Model und Security Zones'
        },
        {
          type: 'added',
          description: 'Purdue Model Integration mit Klassifizierung von Level 0 bis Level 5'
        },
        {
          type: 'added',
          description: 'Security Zones Verwaltung (Manufacturing, Control, DMZ, Corporate Network, Safety, Remote Access)'
        },
        {
          type: 'added',
          description: 'Security Assessments nach IEC 62443 Standard mit Risikoanalyse und Bedrohungsbewertung'
        },
        {
          type: 'added',
          description: 'Communication Matrix für industrielle Protokolle (PROFINET, Modbus TCP, OPC UA, etc.)'
        },
        {
          type: 'added',
          description: 'Change Management System mit Standard-, Normal- und Emergency-Changes'
        },
        {
          type: 'added',
          description: 'Asset Lifecycle Management mit Wartungsplanung und Kritikalitätsbewertung'
        },
        {
          type: 'added',
          description: 'Compliance Management für Standards wie IEC 62443, ISO 27001, FDA 21 CFR Part 11'
        },
        {
          type: 'added',
          description: 'Netzbereichs-Verwaltung mit erweiterten IT/OT-Netzwerkbereich-Funktionen'
        },
        {
          type: 'added',
          description: 'Vollständige CRUD-Operationen für alle IT/OT-Entitäten mit Server-API-Unterstützung'
        },
        {
          type: 'added',
          description: 'Erweiterte Gerätesuche mit IT/OT-Filtern (Purdue Level, Security Zone, Kritikalität)'
        },
        {
          type: 'changed',
          description: 'Standort-Übersicht mit einheitlichen Kartenhöhen und "Netzwerkbereiche" statt "Statische IPs"'
        },
        {
          type: 'changed',
          description: 'Server-API um umfassende IT/OT-Verwaltung-Endpunkte erweitert'
        },
        {
          type: 'changed',
          description: 'Datenbank-Schema um IT/OT-spezifische Tabellen erweitert'
        },
        {
          type: 'fixed',
          description: 'Verbesserte Datenlade-Funktionen mit Fallback-Mechanismen für fehlende APIs'
        }
      ]
    },
    {
      version: '1.5.0',
      date: '2025-07-11',
      type: 'minor',
      changes: [
        {
          type: 'added',
          description: 'Automatisches Hostname-System mit standort- und gerätetypabhängiger Namensgenerierung implementiert'
        },
        {
          type: 'added',
          description: 'Gerätetyp-Verwaltung mit konfigurierbaren Hostname-Präfixen hinzugefügt (CM, SW, FW, etc.)'
        },
        {
          type: 'added',
          description: 'Intelligente Hostname-Generierung mit Format: [StandortPrefix][GeraetetypPrefix][3-stellige-Nummer]'
        },
        {
          type: 'added',
          description: 'Automatische Nummern-Vergabe mit Gap-Detection (wiederverwendung gelöschter Nummern)'
        },
        {
          type: 'added',
          description: 'Hostname-Präfix-Konfiguration für Standorte (z.B. DELIN2, MELLE1)'
        },
        {
          type: 'added',
          description: 'Manueller Hostname-Refresh-Button für nachträgliche Aktualisierung'
        },
        {
          type: 'added',
          description: '16 vordefinierte Gerätetypen mit Standard-Präfixen für gängige Netzwerkgeräte'
        },
        {
          type: 'changed',
          description: 'Code-Bereinigung: Unverwendete Uplinks-Tabelle und zugehörige APIs entfernt'
        },
        {
          type: 'changed',
          description: 'Debug-APIs entfernt (wurden nie vom Frontend verwendet)'
        },
        {
          type: 'changed',
          description: 'UplinkTyp Interface entfernt und durch automatische Router/SD-WAN Erkennung ersetzt'
        },
        {
          type: 'changed',
          description: 'Unverwendete netzwerk_diagramme Datenbank-Tabelle entfernt'
        },
        {
          type: 'fixed',
          description: 'Hostname-Präfix Speicherung und Anzeige in Gerätetyp-Verwaltung korrigiert'
        },
        {
          type: 'fixed',
          description: 'Snake_case zu camelCase Mapping in API-Endpunkten für Hostname-Felder'
        }
      ]
    },
    {
      version: '1.4.0',
      date: '2025-07-07',
      type: 'minor',
      changes: [
        {
          type: 'added',
          description: 'Router-öffentliche IP-Verwaltung mit vollständiger Konfiguration implementiert'
        },
        {
          type: 'added',
          description: 'Checkbox für "Hat öffentliche IP-Adresse" in Router-Konfiguration'
        },
        {
          type: 'added',
          description: 'Auswahl zwischen dynamischer und statischer öffentlicher IP'
        },
        {
          type: 'added',
          description: 'DynDNS-Unterstützung mit Adresseingabe für dynamische IPs'
        },
        {
          type: 'added',
          description: 'Statische öffentliche IP-Adresseingabe für Router'
        },
        {
          type: 'added',
          description: 'Bemerkungsfelder für alle Gerätetypen hinzugefügt'
        },
        {
          type: 'added',
          description: 'WAN/LAN IP-Unterscheidung in allen Übersichten und Visualisierungen'
        },
        {
          type: 'added',
          description: 'Farbkodierte Anzeige für WAN-IP-Informationen (blau)'
        },
        {
          type: 'changed',
          description: 'Router-Anzeige in Netzwerkdiagrammen um WAN-IP-Informationen erweitert'
        },
        {
          type: 'changed',
          description: 'Rack-Visualisierung zeigt nun LAN- und WAN-IP getrennt an'
        },
        {
          type: 'changed',
          description: 'Export-Funktionen um öffentliche IP-Spalte für Router erweitert'
        },
        {
          type: 'changed',
          description: 'Geräte-Verwaltung mit verbesserter Router-spezifischer Konfiguration'
        },
        {
          type: 'changed',
          description: 'Intelligente IP-Anzeige mit Priorität: Statisch > DynDNS > Dynamisch > Verfügbar'
        }
      ]
    },
    {
      version: '1.3.0',
      date: '2025-07-06',
      type: 'minor',
      changes: [
        {
          type: 'added',
          description: 'Kabelfarben-basierte Port-Visualisierung in Rack-Diagrammen implementiert'
        },
        {
          type: 'added',
          description: 'Intelligente Kontrastberechnung für Port-Nummern auf farbigen Hintergründen'
        },
        {
          type: 'added',
          description: 'Klickbares Logo im Header (führt zur Standort-Übersicht)'
        },
        {
          type: 'added',
          description: 'Klickbare Versionsanzeige im Footer (führt zum Changelog)'
        },
        {
          type: 'changed',
          description: 'Export-Design mit Westfalen AG Branding und roter Akzentfarbe'
        },
        {
          type: 'changed',
          description: 'Verbesserte Darstellung von Rack-Informationen in Standort/Raum-Spalte'
        },
        {
          type: 'changed',
          description: 'Vollständige Anzeige aller Verbindungsdetails (Farbe, Kategorie, Länge, Labels)'
        },
        {
          type: 'fixed',
          description: 'Optimierte Lesbarkeit in Light- und Dark-Mode sowie Export-Modus'
        }
      ]
    },
    {
      version: '1.2.0',
      date: '2025-07-04',
      type: 'minor',
      changes: [
        {
          type: 'added',
          description: 'Export-Funktion für PNG und PDF mit vollständiger Standort-Dokumentation hinzugefügt'
        },
        {
          type: 'added',
          description: 'Rack-Visualisierung im Export-Bereich integriert'
        },
        {
          type: 'added',
          description: 'Changelog-Seite und Versionierung hinzugefügt'
        },
        {
          type: 'added',
          description: 'Standort-Details-Feld für Geräte (Raum, Container, etc.) hinzugefügt'
        },
        {
          type: 'changed',
          description: 'Footer-Design an Container-Breite angepasst'
        },
        {
          type: 'changed',
          description: 'Statistiken-Icons aus Standort-Details entfernt für cleanes Design'
        },
        {
          type: 'changed',
          description: 'Support-Kontakte erweitert: Niklas Terhorst per E-Mail oder Teams erreichbar'
        }
      ]
    },
    {
      version: '1.1.0',
      date: '2025-07-03',
      type: 'minor',
      changes: [
        {
          type: 'added',
          description: 'Switch-Stack-Verwaltung mit Konfiguration und Verbindungen'
        },
        {
          type: 'added',
          description: 'Rack-Visualisierung mit Stack-Unterstützung'
        },
        {
          type: 'added',
          description: 'Port-Labels für bessere Identifikation'
        },
        {
          type: 'changed',
          description: 'Kabeltyp-Verwaltung vereinfacht (RJ45, SFP/SFP+, Coax, Sonstiges)'
        },
        {
          type: 'changed',
          description: 'Icon-Zuordnung: Switches verwenden jetzt DNS-Icon, Router verwenden Antenna-Icon'
        },
        {
          type: 'fixed',
          description: 'Port-Label-Anzeige in Verbindungsauswahl implementiert'
        }
      ]
    },
    {
      version: '1.0.0',
      date: '2025-07-01',
      type: 'major',
      changes: [
        {
          type: 'added',
          description: 'Initiale Veröffentlichung des Network Documentation Tools'
        },
        {
          type: 'added',
          description: 'Standort-Verwaltung mit Ansprechpartner-Integration'
        },
        {
          type: 'added',
          description: 'Geräte-Verwaltung mit Port-Konfiguration'
        },
        {
          type: 'added',
          description: 'Verbindungs-Management mit Kabel-Eigenschaften'
        },
        {
          type: 'added',
          description: 'Dark/Light Mode Unterstützung'
        },
        {
          type: 'added',
          description: 'Responsive Design für verschiedene Bildschirmgrößen'
        }
      ]
    }
  ];

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <AddIcon sx={{ color: '#4caf50' }} />;
      case 'changed':
        return <UpdateIcon sx={{ color: '#ff9800' }} />;
      case 'fixed':
        return <BugIcon sx={{ color: '#f44336' }} />;
      case 'security':
        return <SecurityIcon sx={{ color: '#9c27b0' }} />;
      default:
        return <BuildIcon sx={{ color: '#757575' }} />;
    }
  };

  const getVersionColor = (type: string): 'error' | 'warning' | 'success' => {
    switch (type) {
      case 'major':
        return 'error';
      case 'minor':
        return 'warning';
      case 'patch':
        return 'success';
      default:
        return 'success';
    }
  };

  const getChangeTypeLabel = (type: string): string => {
    switch (type) {
      case 'added':
        return 'Hinzugefügt';
      case 'changed':
        return 'Geändert';
      case 'fixed':
        return 'Behoben';
      case 'security':
        return 'Sicherheit';
      default:
        return 'Sonstiges';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <HistoryIcon color="primary" sx={{ mr: 2, fontSize: '2rem' }} />
          <Typography variant="h4" component="h1">
            Changelog
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Übersicht aller Änderungen und Verbesserungen am Network Documentation Tool
        </Typography>
      </Paper>

      {/* Changelog Entries */}
      {changelogData.map((entry, index) => (
        <Card key={entry.version} elevation={1} sx={{ mb: 3 }}>
          <CardContent>
            {/* Version Header */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h5" component="h2">
                  Version {entry.version}
                </Typography>
                <Chip 
                  label={entry.type.toUpperCase()} 
                  color={getVersionColor(entry.type)}
                  size="small"
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {new Date(entry.date).toLocaleDateString('de-DE', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Typography>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Changes */}
            <List dense>
              {entry.changes.map((change, changeIndex) => (
                <ListItem key={changeIndex} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getChangeIcon(change.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box>
                        <Chip
                          label={getChangeTypeLabel(change.type)}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 1, fontSize: '0.75rem' }}
                        />
                        {change.description}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      ))}

      {/* Info Box */}
      <Paper elevation={1} sx={{ p: 3, mt: 4, backgroundColor: 'action.hover' }}>
        <Typography variant="h6" gutterBottom>
          Legende
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip label="MAJOR" color="error" size="small" />
            <Typography variant="body2">Große Änderungen oder neue Hauptfunktionen</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip label="MINOR" color="warning" size="small" />
            <Typography variant="body2">Neue Features oder Verbesserungen</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip label="PATCH" color="success" size="small" />
            <Typography variant="body2">Fehlerbehebungen oder kleine Anpassungen</Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Changelog; 