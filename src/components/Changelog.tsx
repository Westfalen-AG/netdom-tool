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
      version: '1.3.0',
      date: '2025-01-17',
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
      date: '2025-07-15',
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
      date: '2024-12-28',
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
      date: '2024-12-15',
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