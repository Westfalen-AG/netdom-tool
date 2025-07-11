import React, { useState, useEffect, useContext } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Container,
  useTheme,
  Alert
} from '@mui/material';
import {
  Computer as ComputerIcon,
  Router as RouterIcon,
  Info as InfoIcon,
  ZoomIn as ZoomInIcon,
  Settings as SwitchIcon,
  Wifi as WifiIcon,
  Cable as CableIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  DeviceHub as DeviceHubIcon,
  Videocam as VideocamIcon,
  Print as PrintIcon,
  Phone as PhoneIcon,
  Sensors as SensorsIcon,
  Memory as MemoryIcon,
  Hub as HubIcon,
  Dns as ModemIcon,
} from '@mui/icons-material';
import { Geraet, GeraeteTyp, PortTyp } from '../types';
import { ThemeContext } from '../App';

interface RackVisualisierungProps {
  geraete: Geraet[];
  standortId?: string;
  exportMode?: boolean;
}

interface RackGeraet extends Geraet {
  rackPosition: {
    rack: string;
    einheit: number;
  };
}

const RackVisualisierung: React.FC<RackVisualisierungProps> = ({ geraete, standortId, exportMode = false }) => {
  const theme = useTheme();
  const { darkMode: contextDarkMode } = useContext(ThemeContext);
  const darkMode = exportMode ? false : contextDarkMode;
  
  const [selectedGeraet, setSelectedGeraet] = useState<RackGeraet | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [verbindungen, setVerbindungen] = useState<any[]>([]);
  const [stacks, setStacks] = useState<any[]>([]);
  const [geraeteStackZuordnung, setGeraeteStackZuordnung] = useState<Record<string, any>>({});
  const [portDetailsOpen, setPortDetailsOpen] = useState(false);
  const [selectedPortDetails, setSelectedPortDetails] = useState<any>(null);

  // Filtere Geräte mit Rack-Positionen
  const rackGeraete = geraete.filter((geraet): geraet is RackGeraet => 
    geraet.rackPosition !== undefined && 
    geraet.rackPosition.rack !== '' && 
    geraet.rackPosition.einheit > 0
  );

  // Gruppiere Geräte nach Rack
  const geraeteNachRack = rackGeraete.reduce((acc, geraet) => {
    const rackName = geraet.rackPosition.rack;
    if (!acc[rackName]) {
      acc[rackName] = [];
    }
    acc[rackName].push(geraet);
    return acc;
  }, {} as Record<string, RackGeraet[]>);

  // Verbindungen laden
  const ladeVerbindungen = async () => {
    if (!standortId) return;
    
    try {
      const response = await fetch(`/api/standorte/${standortId}/verbindungen`);
      const data = await response.json();
      if (data.success) {
        setVerbindungen(data.data || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Verbindungen:', error);
    }
  };

  // Stack-Informationen laden
  const ladeStacks = async () => {
    if (!standortId) return;
    
    try {
      const response = await fetch(`/api/standorte/${standortId}/stacks`);
      const data = await response.json();
      if (data.success) {
        setStacks(data.data || []);
        
        // Erstelle Zuordnung von Geräte-ID zu Stack-Information
        const zuordnung: Record<string, any> = {};
        for (const stack of data.data || []) {
          for (const mitglied of stack.mitglieder || []) {
            zuordnung[mitglied.geraet_id] = {
              stackId: stack.id,
              stackName: stack.name,
              stackNummer: mitglied.stack_nummer,
            };
          }
        }
        setGeraeteStackZuordnung(zuordnung);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Stacks:', error);
    }
  };

  // Port-Belegung aus Verbindungen berechnen
  const berechnePortBelegung = (geraet: RackGeraet): RackGeraet => {
    const geraetVerbindungen = verbindungen.filter(
      v => v.quell_geraet_id === geraet.id || v.ziel_geraet_id === geraet.id
    );

    const aktualisiertePortBelegung: any[] = [];
    
    // Erstelle Ports basierend auf anzahlNetzwerkports
    for (let i = 1; i <= geraet.anzahlNetzwerkports; i++) {
      const existierenderPort = geraet.belegteports?.find(p => p.portNummer === i);
      const verbindung = geraetVerbindungen.find(
        v => (v.quell_geraet_id === geraet.id && v.quell_port === i) ||
             (v.ziel_geraet_id === geraet.id && v.ziel_port === i)
      );

      aktualisiertePortBelegung.push({
        portNummer: i,
        verbindungId: verbindung?.id,
        beschreibung: existierenderPort?.beschreibung || '',
        belegt: !!verbindung,
        portTyp: existierenderPort?.portTyp || 'RJ45', // Default zu RJ45
        geschwindigkeit: existierenderPort?.geschwindigkeit || '1G',
        label: existierenderPort?.label || '',
      });
    }

    return {
      ...geraet,
      belegteports: aktualisiertePortBelegung,
    };
  };

  // Lade Verbindungen und Stacks beim Mount
  useEffect(() => {
    if (standortId) {
      ladeVerbindungen();
      ladeStacks();
    }
  }, [standortId]);

  // Gerät-Details Dialog öffnen
  const oeffneDetails = (geraet: RackGeraet) => {
    setSelectedGeraet(geraet);
    setDialogOpen(true);
  };

  // Gerät-Icon basierend auf Typ
  const getGeraetIcon = (geraetetyp: GeraeteTyp) => {
    switch (geraetetyp) {
      case 'Router':
        return <RouterIcon />;
      case 'Switch':
        return <ModemIcon />;
      case 'SD-WAN Gateway':
        return <HubIcon />;
      case 'Firewall':
        return <SecurityIcon />;
      case 'Server':
        return <ComputerIcon />;
      case 'Access Point':
        return <WifiIcon />;
      case 'Kamera':
        return <VideocamIcon />;
      case 'VOIP-Phone':
        return <PhoneIcon />;
      case 'Drucker':
        return <PrintIcon />;
      case 'NVR':
        return <StorageIcon />;
      case 'Sensor':
        return <SensorsIcon />;
      case 'AI-Port':
      case 'Zugangskontrolle':
      case 'Serial Server':
      case 'HMI':
        return <MemoryIcon />;
      default:
        return <ComputerIcon />;
    }
  };

  // Gerät-Farbe basierend auf Typ
  const getGeraetColor = (geraetetyp: GeraeteTyp): 'primary' | 'secondary' | 'success' | 'warning' | 'error' => {
    switch (geraetetyp) {
      case 'Router':
        return 'secondary';
      case 'Switch':
        return 'primary';
      case 'SD-WAN Gateway':
        return 'success';
      case 'Firewall':
        return 'error';
      case 'Server':
        return 'warning';
      case 'Access Point':
        return 'success';
      case 'Kamera':
        return 'primary';
      case 'VOIP-Phone':
        return 'secondary';
      case 'Drucker':
        return 'warning';
      case 'NVR':
        return 'warning';
      case 'Sensor':
        return 'success';
      case 'AI-Port':
      case 'Zugangskontrolle':
      case 'Serial Server':
      case 'HMI':
        return 'secondary';
      default:
        return 'primary';
    }
  };

  // Konvertiert Material-UI Farbpalette zu Hex-Farben für Export
  const getThemeColor = (color: 'primary' | 'secondary' | 'success' | 'warning' | 'error'): string => {
    switch (color) {
      case 'primary':
        return '#1976d2';
      case 'secondary':
        return '#9c27b0';
      case 'success':
        return '#2e7d32';
      case 'warning':
        return '#ed6c02';
      case 'error':
        return '#d32f2f';
      default:
        return '#1976d2';
    }
  };

  const getHerstellerLogo = (hersteller: string) => {
    const baseUrl = 'https://logos.freeformatter.com/uploads/generated/1629369100-';
    const fallbackUrl = 'https://via.placeholder.com/60x40/f0f0f0/333333?text=';
    
    switch (hersteller.toLowerCase()) {
      case 'cisco':
        return `${baseUrl}cisco-logo.png`;
      case 'hp':
      case 'hewlett packard':
        return `${baseUrl}hp-logo.png`;
      case 'dell':
        return `${baseUrl}dell-logo.png`;
      case 'juniper':
        return `${baseUrl}juniper-logo.png`;
      case 'netgear':
        return `${baseUrl}netgear-logo.png`;
      case 'ubiquiti':
        return `https://dl.ubnt.com/logos/ubnt-logo-black.png`;
      default:
        return `${fallbackUrl}${hersteller}`;
    }
  };

  // Farbnamen zu Hex-Farbcodes konvertieren
  const convertFarbeToHex = (farbe: string): string => {
    if (!farbe) return '#cccccc'; // Standard grau
    
    const farbeLower = farbe.toLowerCase().trim();
    
    const farbMap: Record<string, string> = {
      'rot': '#ff0000',
      'blau': '#0000ff',
      'grün': '#00ff00',
      'gelb': '#ffff00',
      'schwarz': '#000000',
      'weiß': '#ffffff',
      'weiss': '#ffffff',
      'grau': '#808080',
      'orange': '#ffa500',
      'lila': '#800080',
      'violett': '#800080',
      'pink': '#ff69b4',
      'rosa': '#ff69b4',
      'braun': '#964b00',
      'türkis': '#00ffff',
      'cyan': '#00ffff',
      'magenta': '#ff00ff',
      'lime': '#00ff00',
      'maroon': '#800000',
      'navy': '#000080',
      'olive': '#808000',
      'purple': '#800080',
      'silver': '#c0c0c0',
      'teal': '#008080',
      'aqua': '#00ffff',
      'fuchsia': '#ff00ff',
      'dunkelblau': '#000080',
      'hellblau': '#add8e6',
      'dunkelrot': '#8b0000',
      'hellrot': '#ff6b6b',
      'dunkelgrün': '#006400',
      'hellgrün': '#90ee90',
      'dunkelgrau': '#404040',
      'hellgrau': '#d3d3d3',
    };
    
    return farbMap[farbeLower] || '#cccccc';
  };

  const renderPortVisualisierung = (ports: any[], geraet: RackGeraet) => {
    if (!ports || ports.length === 0) return null;

    // Stack-Informationen für dieses Gerät
    const stackInfo = geraeteStackZuordnung[geraet.id];
    const istInStack = !!stackInfo && geraet.geraetetyp === 'Switch';

    const getPortColor = (port: any) => {
      if (!port.belegt) {
        return exportMode ? '#e0e0e0' : (darkMode ? theme.palette.grey[700] : '#f5f5f5');
      }
      
      // Finde die Verbindung für diesen Port
      const verbindung = verbindungen.find(v => 
        (v.quell_geraet_id === geraet.id && v.quell_port === port.portNummer) ||
        (v.ziel_geraet_id === geraet.id && v.ziel_port === port.portNummer)
      );
      
      // Verwende die Kabelfarbe wenn verfügbar
      if (verbindung?.kabel_farbe) {
        return convertFarbeToHex(verbindung.kabel_farbe);
      }
      
      // Fallback zu Standard-Farbe für belegte Ports
      return '#4caf50';
    };

    const getPortTextColor = (port: any) => {
      if (!port.belegt) {
        return exportMode ? '#000000' : (darkMode ? theme.palette.text.primary : '#666');
      }
      
      // Finde die Verbindung für diesen Port
      const verbindung = verbindungen.find(v => 
        (v.quell_geraet_id === geraet.id && v.quell_port === port.portNummer) ||
        (v.ziel_geraet_id === geraet.id && v.ziel_port === port.portNummer)
      );
      
      // Verwende kontrastierende Textfarbe für Kabelfarben (auch im Export!)
      if (verbindung?.kabel_farbe) {
        const hexColor = convertFarbeToHex(verbindung.kabel_farbe);
        const farbeName = verbindung.kabel_farbe.toLowerCase().trim();
        
        // Direkte Zuordnung für bessere Kontrolle
        if (['schwarz', 'dunkelblau', 'dunkelrot', 'dunkelgrün', 'dunkelgrau', 'braun', 'navy', 'maroon', 'purple', 'lila', 'violett'].includes(farbeName)) {
          return '#ffffff'; // Weiße Schrift für dunkle Farben
        } else if (['gelb', 'weiß', 'weiss', 'hellblau', 'hellrot', 'hellgrün', 'hellgrau', 'lime', 'cyan', 'aqua', 'silver'].includes(farbeName)) {
          return '#000000'; // Schwarze Schrift für helle Farben
        } else {
          // Fallback: Berechne Helligkeit für unbekannte Farben
          const r = parseInt(hexColor.slice(1, 3), 16);
          const g = parseInt(hexColor.slice(3, 5), 16);
          const b = parseInt(hexColor.slice(5, 7), 16);
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          
          return brightness > 128 ? '#000000' : '#ffffff';
        }
      }
      
      // Fallback für belegte Ports ohne Kabelfarbe (Standard grün)
      return '#ffffff'; // Weiße Schrift auf grünem Hintergrund
    };

    return (
      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: exportMode ? '3px' : '3px', width: '100%' }}>
        {ports.map((port, index) => {
          const isQSFP = port.portTyp === 'QSFP' || port.portTyp === 'QSFP28';
          const isSFP = port.portTyp === 'SFP' || port.portTyp === 'SFP+';
          const isRJ45 = port.portTyp === 'RJ45';
          
          const portSize = exportMode 
            ? (isQSFP ? '36px' : '29px') // 30% größere Ports für bessere Lesbarkeit im Export
            : (isQSFP ? '48px' : '36px'); // Normale Größe für Anzeige
          const portColor = getPortColor(port);
          const borderColor = isRJ45 ? '#4caf50' : isSFP ? '#ff9800' : '#9c27b0';
          const shape = isSFP ? '50%' : '6px';
          
          // Port-Nummer formatieren - für Stack-Switches im Format 1:01, 2:01, etc.
          const portDisplayText = istInStack && stackInfo?.stackNummer 
            ? `${stackInfo.stackNummer}:${String(port.portNummer).padStart(2, '0')}`
            : port.portNummer;
          
          // Verbindungsdetails für Tooltip
          const verbindungsDetails = port.belegt ? getPortVerbindungsDetails(geraet, port.portNummer) : null;
          
          let tooltipText = `Port ${portDisplayText} (${port.portTyp}) - ${port.belegt ? 'Belegt' : 'Frei'}`;
          if (port.geschwindigkeit) {
            tooltipText += ` - ${port.geschwindigkeit}`;
          }
          if (port.label) {
            tooltipText += `\nLabel: ${port.label}`;
          }
          
          if (verbindungsDetails?.zielGeraet) {
            const zielStackInfo = geraeteStackZuordnung[verbindungsDetails.zielGeraet.id];
            const zielIstInStack = !!zielStackInfo && verbindungsDetails.zielGeraet.geraetetyp === 'Switch';
            const zielDisplayName = zielIstInStack && zielStackInfo?.stackName ? zielStackInfo.stackName : verbindungsDetails.zielGeraet.name;
            const zielPortDisplay = zielIstInStack && zielStackInfo?.stackNummer 
              ? `${zielStackInfo.stackNummer}:${String(verbindungsDetails.zielPort).padStart(2, '0')}`
              : verbindungsDetails.zielPort;
            
            tooltipText += `\nVerbunden mit: ${zielDisplayName}`;
            tooltipText += `\nZiel-Port: ${zielPortDisplay}`;
            if (verbindungsDetails.verbindung.kabeltyp) {
              tooltipText += `\nKabel: ${verbindungsDetails.verbindung.kabeltyp}`;
            }
            if (verbindungsDetails.verbindung.kabel_farbe) {
              tooltipText += `\nKabel-Farbe: ${verbindungsDetails.verbindung.kabel_farbe}`;
            }
            tooltipText += `\n(Klicken für Details)`;
          }
          
          return (
            <Tooltip
              key={index}
              title={
                <Box sx={{ whiteSpace: 'pre-line', textAlign: 'left' }}>
                  {tooltipText}
                </Box>
              }
              arrow
            >
              <Box
                sx={{
                  width: portSize,
                  height: portSize,
                  backgroundColor: portColor,
                  border: `2px solid ${borderColor}`,
                  borderRadius: shape,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: exportMode ? '12px' : '12px',
                  fontWeight: 'bold',
                  color: getPortTextColor(port),
                  cursor: port.belegt && !exportMode ? 'pointer' : 'default',
                  '&:hover': exportMode ? {} : {
                    transform: 'scale(1.1)',
                    zIndex: 1,
                    boxShadow: port.belegt ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                  }
                }}
                onClick={(e) => {
                  if (!exportMode) {
                    e.stopPropagation(); // Verhindere, dass der Geräte-Dialog geöffnet wird
                    if (port.belegt) {
                      oeffnePortDetails(geraet, port);
                    }
                  }
                }}
              >
                <Box sx={{ 
                  textAlign: 'center',
                  lineHeight: 1.2,
                  fontSize: exportMode ? '10px' : '10px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}>
                  {portDisplayText}
                  {port.label && !exportMode && (
                    <div style={{ fontSize: '8px', opacity: 0.8 }}>
                      ({port.label})
                    </div>
                  )}
                </Box>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    );
  };

  // Einzelnes Rack rendern
  const renderRack = (rackName: string, rackGeraete: RackGeraet[], gesamtAnzahlRacks: number) => {
    // Geräte nach HU-Position sortieren und Port-Belegung aktualisieren
    const sortiertGeraete = [...rackGeraete]
      .sort((a, b) => a.rackPosition.einheit - b.rackPosition.einheit)
      .map(geraet => berechnePortBelegung(geraet));

    // Gruppiere Geräte nach HU-Einheit
    const geraeteNachHU = sortiertGeraete.reduce((acc, geraet) => {
      const hu = geraet.rackPosition.einheit;
      if (!acc[hu]) {
        acc[hu] = [];
      }
      acc[hu].push(geraet);
      return acc;
    }, {} as Record<number, RackGeraet[]>);

    const belegteHUs = Object.keys(geraeteNachHU).map(Number).sort((a, b) => a - b);
    const huHoehe = exportMode ? 100 : 110; // Angepasste HU-Höhe für Export mit größeren Ports

    // Dynamische Grid-Größe basierend auf Anzahl der Racks
    const gridSize = gesamtAnzahlRacks === 1 ? 
      { xs: 12, md: 12, lg: 12 } :  // Ein Rack = volle Breite
      { xs: 12, md: 6, lg: 4 };     // Mehrere Racks = aufgeteilt

    return (
      <Grid item xs={gridSize.xs} md={gridSize.md} lg={gridSize.lg} key={rackName}>
        <Paper elevation={exportMode ? 1 : 3} sx={{ 
          p: 2, 
          height: 'fit-content',
          bgcolor: exportMode ? '#ffffff' : 'inherit',
          color: exportMode ? '#000000' : 'inherit'
        }}>
          <Typography variant="h6" gutterBottom sx={{ 
            textAlign: 'center',
            color: exportMode ? '#000000' : 'inherit'
          }}>
            {rackName}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Box sx={{ 
            border: `2px solid ${exportMode ? '#424242' : (darkMode ? theme.palette.grey[600] : '#424242')}`,
            borderRadius: 1,
            bgcolor: exportMode ? '#ffffff' : (darkMode ? theme.palette.grey[900] : '#f8f9fa'),
            p: 2,
            pl: 5, // Mehr Platz links für die HU-Markierungen
            position: 'relative',
            minHeight: `${belegteHUs.length * (huHoehe + 8)}px`, // Berechne die minimale Höhe
            overflow: 'visible', // Stelle sicher, dass der Inhalt sichtbar ist
          }}>
            {/* Nur belegte HUs anzeigen */}
            {belegteHUs.map((hu, index) => {
              const huGeraete = geraeteNachHU[hu];
              const anzahlGeraete = huGeraete.length;
              
              return (
                <Box key={hu} sx={{ 
                  position: 'relative', 
                  height: huHoehe,
                  mb: 1,
                  display: 'flex',
                  alignItems: 'stretch',
                }}>
                  {/* HU-Markierung */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: -40,
                      top: 0,
                      width: 32,
                      height: huHoehe,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: exportMode ? '12px' : '16px',
                      fontWeight: 'bold',
                      color: exportMode ? '#000000' : (darkMode ? theme.palette.text.primary : '#666'),
                      bgcolor: exportMode ? '#ffffff' : (darkMode ? theme.palette.background.paper : '#fff'),
                      border: `1px solid ${exportMode ? '#ddd' : (darkMode ? theme.palette.divider : '#ddd')}`,
                      borderRadius: 1,
                      zIndex: 1,
                    }}
                  >
                    {hu}
                  </Box>

                  {/* Geräte in dieser HU */}
                  <Box sx={{ 
                    display: 'flex', 
                    width: '100%', 
                    height: huHoehe,
                    gap: anzahlGeraete > 1 ? 0.5 : 0,
                  }}>
                    {huGeraete.map((geraet, geraetIndex) => {
                      const breiteProGeraet = anzahlGeraete > 1 ? `calc((100% - ${(anzahlGeraete - 1) * 4}px) / ${anzahlGeraete})` : '100%';
                      const stackInfo = geraeteStackZuordnung[geraet.id];
                      const istInStack = !!stackInfo && geraet.geraetetyp === 'Switch';
                      
                      return (
                        <Card
                          key={geraet.id}
                          sx={{
                            width: breiteProGeraet,
                            height: huHoehe,
                            cursor: exportMode ? 'default' : 'pointer',
                            transition: exportMode ? 'none' : 'all 0.2s',
                            '&:hover': exportMode ? {} : {
                              transform: 'scale(1.02)',
                              zIndex: 10,
                              boxShadow: 3,
                            },
                            display: 'flex',
                            flexDirection: 'column',
                                                bgcolor: exportMode ? '#ffffff' : (darkMode ? getGeraetColor(geraet.geraetetyp) : '#ffffff'),
                    color: exportMode ? '#000000' : (darkMode ? 'white' : 'inherit'),
                            border: exportMode 
                              ? `2px solid ${getThemeColor(getGeraetColor(geraet.geraetetyp))}`
                              : (anzahlGeraete > 1 ? '1px solid rgba(255,255,255,0.3)' : 'none'),
                          }}
                          onClick={exportMode ? undefined : () => oeffneDetails(geraet)}
                        >
                        <CardContent sx={{ 
                          p: exportMode ? '2px 4px !important' : '4px 8px !important',
                          display: 'flex',
                          flexDirection: 'column',
                          width: '100%',
                          height: '100%',
                          justifyContent: 'flex-start',
                          overflow: 'visible',
                        }}>
                          {/* Geräte-Info */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: exportMode ? 0.5 : 1 }}>
                            <Box sx={{ fontSize: exportMode ? '16px' : '20px', mr: 1, color: exportMode ? '#000000' : (darkMode ? 'white' : 'inherit') }}>
                              {getGeraetIcon(geraet.geraetetyp)}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  fontSize: exportMode ? '10px' : '14px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'block',
                                }}
                              >
                                {istInStack && stackInfo?.stackName ? stackInfo.stackName : geraet.name}
                              </Typography>
                              {!exportMode && (
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    fontSize: '12px',
                                    opacity: 0.8,
                                    display: 'block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {geraet.modell}
                                </Typography>
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexDirection: exportMode ? 'row' : 'column' }}>
                              {!exportMode && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {anzahlGeraete > 1 && geraet.geraetetyp === 'Firewall' && (
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        fontSize: '11px',
                                        opacity: 0.8,
                                        fontWeight: 'bold',
                                      }}
                                    >
                                      HA
                                    </Typography>
                                  )}
                                  {istInStack && (
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        fontSize: '11px',
                                        opacity: 0.8,
                                        fontWeight: 'bold',
                                        color: '#90caf9', // Hellblau für Stack
                                      }}
                                    >
                                      Stack
                                    </Typography>
                                  )}
                                </Box>
                              )}
                              <Typography variant="caption" sx={{ fontSize: exportMode ? '9px' : '12px', opacity: 0.8, fontWeight: 'bold' }}>
                                {geraet.belegteports?.filter(p => p.belegt).length || 0}/{geraet.anzahlNetzwerkports}
                              </Typography>
                            </Box>
                          </Box>
                          
                          {/* Port-Visualisierung */}
                          {geraet.anzahlNetzwerkports > 0 && (
                            renderPortVisualisierung(geraet.belegteports, geraet)
                          )}
                        </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
          </Box>
          
          <Typography variant="caption" sx={{ 
            mt: 1, 
            display: 'block', 
            textAlign: 'center',
            color: exportMode ? '#666666' : 'text.secondary'
          }}>
            {rackGeraete.length} Geräte • {belegteHUs.length} belegte HUs
          </Typography>
        </Paper>
      </Grid>
    );
  };

  // Verbindungsdetails für einen Port abrufen
  const getPortVerbindungsDetails = (geraet: RackGeraet, portNummer: number) => {
    const verbindung = verbindungen.find(
      v => (v.quell_geraet_id === geraet.id && v.quell_port === portNummer) ||
           (v.ziel_geraet_id === geraet.id && v.ziel_port === portNummer)
    );
    
    if (!verbindung) return null;
    
    // Bestimme welches das Zielgerät ist
    const istQuellGeraet = verbindung.quell_geraet_id === geraet.id;
    const zielGeraetId = istQuellGeraet ? verbindung.ziel_geraet_id : verbindung.quell_geraet_id;
    const zielPort = istQuellGeraet ? verbindung.ziel_port : verbindung.quell_port;
    
    // Finde das Zielgerät
    const zielGeraet = geraete.find(g => g.id === zielGeraetId);
    
    return {
      verbindung,
      zielGeraet,
      zielPort,
      istQuellGeraet,
    };
  };

  // Port-Details-Dialog öffnen
  const oeffnePortDetails = (geraet: RackGeraet, port: any) => {
    if (!port.belegt) return;
    
    const verbindungsDetails = getPortVerbindungsDetails(geraet, port.portNummer);
    if (!verbindungsDetails) return;
    
    setSelectedPortDetails({
      quellGeraet: geraet,
      port,
      ...verbindungsDetails,
    });
    setPortDetailsOpen(true);
  };

  if (Object.keys(geraeteNachRack).length === 0) {
    return (
      <Paper elevation={1} sx={{ 
        p: 3, 
        textAlign: 'center',
        bgcolor: exportMode ? '#ffffff' : 'inherit',
        color: exportMode ? '#000000' : 'inherit'
      }}>
        <ComputerIcon sx={{ 
          fontSize: 48, 
          color: exportMode ? '#666666' : 'text.secondary', 
          mb: 2 
        }} />
        <Typography variant="h6" sx={{
          color: exportMode ? '#000000' : 'text.secondary'
        }}>
          Keine Rack-Geräte gefunden
        </Typography>
        <Typography variant="body2" sx={{
          color: exportMode ? '#666666' : 'text.secondary'
        }}>
          Geräte müssen eine Rack-Position haben, um hier angezeigt zu werden.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper elevation={exportMode ? 1 : 2} sx={{ 
        p: exportMode ? 0 : 3,
        bgcolor: exportMode ? '#ffffff' : 'inherit',
        color: exportMode ? '#000000' : 'inherit'
      }}>
        {!exportMode && (
          <Typography variant="h5" gutterBottom sx={{
            color: exportMode ? '#000000' : 'inherit'
          }}>
            <ComputerIcon sx={{ 
              mr: 1, 
              verticalAlign: 'middle',
              color: exportMode ? '#000000' : 'inherit'
            }} />
            Rack-Visualisierung
          </Typography>
        )}
        
        <Grid container spacing={3}>
          {Object.entries(geraeteNachRack).map(([rackName, rackGeraete]) =>
            renderRack(rackName, rackGeraete, Object.keys(geraeteNachRack).length)
          )}
        </Grid>
      </Paper>

      {/* Port-Details Dialog */}
      <Dialog open={portDetailsOpen} onClose={() => setPortDetailsOpen(false)} maxWidth="md" fullWidth>
        {selectedPortDetails && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
              <CableIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Box>
                <Typography variant="h6">
                  Port-Verbindung Details
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {(() => {
                    const stackInfo = geraeteStackZuordnung[selectedPortDetails.quellGeraet.id];
                    const istInStack = !!stackInfo && selectedPortDetails.quellGeraet.geraetetyp === 'Switch';
                    const displayName = istInStack && stackInfo?.stackName ? stackInfo.stackName : selectedPortDetails.quellGeraet.name;
                    const portDisplay = istInStack && stackInfo?.stackNummer 
                      ? `${stackInfo.stackNummer}:${String(selectedPortDetails.port.portNummer).padStart(2, '0')}`
                      : selectedPortDetails.port.portNummer;
                    return `${displayName} - Port ${portDisplay}`;
                  })()}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                {/* Quell-Gerät */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Quell-Gerät
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Gerät
                      </Typography>
                      <Typography variant="body2">
                        {(() => {
                          const stackInfo = geraeteStackZuordnung[selectedPortDetails.quellGeraet.id];
                          const istInStack = !!stackInfo && selectedPortDetails.quellGeraet.geraetetyp === 'Switch';
                          return istInStack && stackInfo?.stackName ? stackInfo.stackName : selectedPortDetails.quellGeraet.name;
                        })()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedPortDetails.quellGeraet.modell}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Port
                      </Typography>
                      <Chip 
                        label={`Port ${(() => {
                          const stackInfo = geraeteStackZuordnung[selectedPortDetails.quellGeraet.id];
                          const istInStack = !!stackInfo && selectedPortDetails.quellGeraet.geraetetyp === 'Switch';
                          return istInStack && stackInfo?.stackNummer 
                            ? `${stackInfo.stackNummer}:${String(selectedPortDetails.port.portNummer).padStart(2, '0')}`
                            : selectedPortDetails.port.portNummer;
                        })()}`}
                        color="primary"
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Chip 
                        label={selectedPortDetails.port.portTyp}
                        variant="outlined"
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Chip 
                        label={selectedPortDetails.port.geschwindigkeit}
                        variant="outlined"
                        size="small"
                      />
                      {selectedPortDetails.port.label && (
                        <Chip 
                          label={selectedPortDetails.port.label}
                          color="secondary"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        IP-Adresse
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        LAN: {selectedPortDetails.quellGeraet.ipKonfiguration.ipAdresse || 
                             (selectedPortDetails.quellGeraet.ipKonfiguration.typ === 'dhcp' ? 'DHCP' : 'Nicht konfiguriert')}
                      </Typography>
                      {/* Router öffentliche IP */}
                      {selectedPortDetails.quellGeraet.geraetetyp === 'Router' && selectedPortDetails.quellGeraet.hatOeffentlicheIp && (
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'primary.main', mt: 1 }}>
                          WAN: {selectedPortDetails.quellGeraet.oeffentlicheIpTyp === 'statisch' && selectedPortDetails.quellGeraet.statischeOeffentlicheIp ? 
                            selectedPortDetails.quellGeraet.statischeOeffentlicheIp :
                          selectedPortDetails.quellGeraet.oeffentlicheIpTyp === 'dynamisch' && selectedPortDetails.quellGeraet.dyndnsAktiv && selectedPortDetails.quellGeraet.dyndnsAdresse ? 
                            selectedPortDetails.quellGeraet.dyndnsAdresse :
                          selectedPortDetails.quellGeraet.oeffentlicheIpTyp === 'dynamisch' ? 
                            'Dynamisch' : 
                            'Verfügbar'
                          }
                        </Typography>
                      )}
                    </Box>
                    
                    {selectedPortDetails.quellGeraet.rackPosition && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Rack-Position
                        </Typography>
                        <Typography variant="body2">
                          {selectedPortDetails.quellGeraet.rackPosition.rack} - {selectedPortDetails.quellGeraet.rackPosition.einheit}U
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>
                
                {/* Ziel-Gerät */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom color="secondary">
                      Ziel-Gerät
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    {selectedPortDetails.zielGeraet ? (
                      <>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Gerät
                          </Typography>
                          <Typography variant="body2">
                            {(() => {
                              const stackInfo = geraeteStackZuordnung[selectedPortDetails.zielGeraet.id];
                              const istInStack = !!stackInfo && selectedPortDetails.zielGeraet.geraetetyp === 'Switch';
                              return istInStack && stackInfo?.stackName ? stackInfo.stackName : selectedPortDetails.zielGeraet.name;
                            })()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {selectedPortDetails.zielGeraet.modell}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Port
                          </Typography>
                          <Chip 
                            label={`Port ${(() => {
                              const stackInfo = geraeteStackZuordnung[selectedPortDetails.zielGeraet.id];
                              const istInStack = !!stackInfo && selectedPortDetails.zielGeraet.geraetetyp === 'Switch';
                              return istInStack && stackInfo?.stackNummer 
                                ? `${stackInfo.stackNummer}:${String(selectedPortDetails.zielPort).padStart(2, '0')}`
                                : selectedPortDetails.zielPort;
                            })()}`}
                            color="secondary"
                            size="small"
                          />
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            IP-Adresse
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            LAN: {selectedPortDetails.zielGeraet.ipKonfiguration.ipAdresse || 
                                 (selectedPortDetails.zielGeraet.ipKonfiguration.typ === 'dhcp' ? 'DHCP' : 'Nicht konfiguriert')}
                          </Typography>
                          {/* Router öffentliche IP */}
                          {selectedPortDetails.zielGeraet.geraetetyp === 'Router' && selectedPortDetails.zielGeraet.hatOeffentlicheIp && (
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'primary.main', mt: 1 }}>
                              WAN: {selectedPortDetails.zielGeraet.oeffentlicheIpTyp === 'statisch' && selectedPortDetails.zielGeraet.statischeOeffentlicheIp ? 
                                selectedPortDetails.zielGeraet.statischeOeffentlicheIp :
                              selectedPortDetails.zielGeraet.oeffentlicheIpTyp === 'dynamisch' && selectedPortDetails.zielGeraet.dyndnsAktiv && selectedPortDetails.zielGeraet.dyndnsAdresse ? 
                                selectedPortDetails.zielGeraet.dyndnsAdresse :
                              selectedPortDetails.zielGeraet.oeffentlicheIpTyp === 'dynamisch' ? 
                                'Dynamisch' : 
                                'Verfügbar'
                              }
                            </Typography>
                          )}
                        </Box>
                        
                        {selectedPortDetails.zielGeraet.rackPosition && (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Rack-Position
                            </Typography>
                            <Typography variant="body2">
                              {selectedPortDetails.zielGeraet.rackPosition.rack} - {selectedPortDetails.zielGeraet.rackPosition.einheit}U
                            </Typography>
                          </Box>
                        )}
                      </>
                    ) : (
                      <Alert severity="warning">
                        Ziel-Gerät nicht gefunden oder außerhalb des aktuellen Standorts
                      </Alert>
                    )}
                  </Paper>
                </Grid>
                
                {/* Verbindungsdetails */}
                <Grid item xs={12}>
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Verbindungsdetails
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle2" gutterBottom>
                          Kabel-Typ
                        </Typography>
                        <Typography variant="body2">
                          {selectedPortDetails.verbindung.kabeltyp || 'Nicht spezifiziert'}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle2" gutterBottom>
                          Kabel-Länge
                        </Typography>
                        <Typography variant="body2">
                          {selectedPortDetails.verbindung.kabel_laenge ? `${selectedPortDetails.verbindung.kabel_laenge}m` : 'Nicht spezifiziert'}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle2" gutterBottom>
                          Kabel-Farbe
                        </Typography>
                        <Typography variant="body2">
                          {selectedPortDetails.verbindung.kabel_farbe || 'Nicht spezifiziert'}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle2" gutterBottom>
                          Kategorie
                        </Typography>
                        <Typography variant="body2">
                          {selectedPortDetails.verbindung.kabel_kategorie || 'Nicht spezifiziert'}
                        </Typography>
                      </Grid>
                      
                      {selectedPortDetails.verbindung.bemerkungen && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" gutterBottom>
                            Bemerkungen
                          </Typography>
                          <Typography variant="body2">
                            {selectedPortDetails.verbindung.bemerkungen}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPortDetailsOpen(false)}>
                Schließen
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Gerät-Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedGeraet && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
              {getGeraetIcon(selectedGeraet!.geraetetyp)}
              <Box sx={{ ml: 1 }}>
                {(() => {
                  const stackInfo = geraeteStackZuordnung[selectedGeraet!.id];
                  const istInStack = !!stackInfo && selectedGeraet!.geraetetyp === 'Switch';
                  return istInStack && stackInfo?.stackName ? stackInfo.stackName : selectedGeraet!.name;
                })()}
                <Typography variant="body2" color="text.secondary">
                  {selectedGeraet!.modell}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Rack-Position
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {selectedGeraet!.rackPosition?.rack} - {selectedGeraet!.rackPosition?.einheit}U
                  </Typography>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Gerätetyp
                  </Typography>
                  <Chip 
                    label={selectedGeraet!.geraetetyp}
                    color={getGeraetColor(selectedGeraet!.geraetetyp)}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    IP-Konfiguration
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    LAN: {selectedGeraet!.ipKonfiguration?.ipAdresse || 
                         (selectedGeraet!.ipKonfiguration?.typ === 'dhcp' ? 'DHCP' : 'Nicht konfiguriert')}
                  </Typography>
                  {/* Router öffentliche IP */}
                  {selectedGeraet!.geraetetyp === 'Router' && selectedGeraet!.hatOeffentlicheIp && (
                    <Typography variant="body2" sx={{ color: 'primary.main', mb: 2 }}>
                      WAN: {selectedGeraet!.oeffentlicheIpTyp === 'statisch' && selectedGeraet!.statischeOeffentlicheIp ? 
                        selectedGeraet!.statischeOeffentlicheIp :
                      selectedGeraet!.oeffentlicheIpTyp === 'dynamisch' && selectedGeraet!.dyndnsAktiv && selectedGeraet!.dyndnsAdresse ? 
                        selectedGeraet!.dyndnsAdresse :
                      selectedGeraet!.oeffentlicheIpTyp === 'dynamisch' ? 
                        'Dynamisch' : 
                        'Verfügbar'
                      }
                    </Typography>
                  )}
                  {!selectedGeraet!.hatOeffentlicheIp && selectedGeraet!.geraetetyp === 'Router' && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, fontStyle: 'italic' }}>
                      Keine öffentliche IP konfiguriert
                    </Typography>
                  )}
                  {selectedGeraet!.geraetetyp !== 'Router' && (
                    <Box sx={{ mb: 2 }} />
                  )}
                  
                  {selectedGeraet!.macAdresse && (
                    <>
                      <Typography variant="subtitle2" gutterBottom>
                        MAC-Adresse
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
                        {selectedGeraet!.macAdresse}
                      </Typography>
                    </>
                  )}
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Netzwerk-Ports
                  </Typography>
                  <Typography variant="body2">
                    {selectedGeraet!.belegteports?.filter(p => p.belegt).length || 0} / {selectedGeraet!.anzahlNetzwerkports} belegt
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>
                Schließen
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

export default RackVisualisierung; 