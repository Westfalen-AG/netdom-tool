import React, { useState, useEffect, useContext } from 'react';
import {
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Divider,
  useTheme,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Router as RouterIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Computer as ComputerIcon,
  Dns as ModemIcon,
  LocationOn as LocationIcon,
  ViewModule as CardViewIcon,
  List as ListViewIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { Geraet, GeraeteTyp, PortTyp, IPKonfiguration, OeffentlicheIPKonfiguration, OeffentlicheIP } from '../types';
import { ThemeContext, StandortContext } from '../App';

const GeraeteVerwaltung: React.FC = () => {
  const theme = useTheme();
  const { darkMode } = useContext(ThemeContext);
  const { selectedStandort, selectedStandortData } = useContext(StandortContext);
  
  const [geraete, setGeraete] = useState<Geraet[]>([]);
  const [geraetetypen, setGeraetetypen] = useState<string[]>([]);
  const [geraeteVerbindungen, setGeraeteVerbindungen] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [verbindungenLoading, setVerbindungenLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [bearbeitenDialogOpen, setBearbeitenDialogOpen] = useState(false);
  const [selectedGeraet, setSelectedGeraet] = useState<Geraet | null>(null);
  
  // Filter- und Ansichtsoptionen
  const [geraetetypFilter, setGeraetetypFilter] = useState<string>('alle');
  const [ansichtsModus, setAnsichtsModus] = useState<'cards' | 'list'>('cards');
  const [neuGeraet, setNeuGeraet] = useState({
    name: '',
    hostname: '',
    geraetetyp: '' as GeraeteTyp,
    modell: '',
    seriennummer: '',
    standortDetails: '',
    bemerkungen: '',
    // Neue IP-Konfiguration
    ipKonfigurationen: [] as IPKonfiguration[],
    oeffentlicheIPKonfigurationen: [] as OeffentlicheIPKonfiguration[],
    // Legacy-Kompatibilität
    ipKonfiguration: {
      typ: 'dhcp' as 'dhcp' | 'statisch',
      ipAdresse: '',
      netzwerkbereich: '',
    },
    macAdresse: '',
    anzahlNetzwerkports: 0,
    portKonfiguration: [] as Array<{ portNummer: number; portTyp: PortTyp; geschwindigkeit: string }>,
    rackPosition: {
      rack: '',
      einheit: 0,
    },
    // Router-spezifische öffentliche IP-Konfiguration
    hatOeffentlicheIp: false,
    oeffentlicheIpTyp: 'dynamisch' as 'dynamisch' | 'statisch',
    dyndnsAktiv: false,
    dyndnsAdresse: '',
    statischeOeffentlicheIp: '',
  });

  // Daten laden
  const ladeGeraetetypen = async () => {
    try {
      const response = await fetch('/api/geraetetypen');
      const data = await response.json();
      if (data.success) {
        // Nur die Namen für das Dropdown extrahieren
        setGeraetetypen(data.data.map((typ: any) => typ.name));
      }
    } catch (err) {
      console.error('Fehler beim Laden der Gerätetypen:', err);
    }
  };

  // Gerätetyp automatisch erstellen falls nicht vorhanden
  const handleGeraetetypChange = async (neuerTyp: string) => {
    if (neuerTyp && !geraetetypen.includes(neuerTyp)) {
      try {
        const response = await fetch('/api/geraetetypen/auto-create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: neuerTyp }),
        });

        const data = await response.json();
        if (data.success) {
          // Gerätetypen neu laden um den neuen Typ einzuschließen
          ladeGeraetetypen();
        }
      } catch (error) {
        console.error('Fehler beim automatischen Erstellen des Gerätetyps:', error);
      }
    }
  };

  // Hostname automatisch generieren
  const generiereHostname = async (geraetetypName: string) => {
    if (!selectedStandort || !geraetetypName) {
      return;
    }

    try {
      const response = await fetch('/api/hostname/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          standortId: selectedStandort,
          geraetetypName: geraetetypName,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNeuGeraet(prev => ({ ...prev, hostname: data.data.hostname }));
      } else {
        console.warn('Hostname konnte nicht generiert werden:', data.message);
      }
    } catch (error) {
      console.error('Fehler beim Generieren des Hostnames:', error);
    }
  };

  // Hostname für Bearbeiten-Dialog generieren
  const generiereHostnameForEdit = async (geraetetypName: string) => {
    if (!selectedStandort || !geraetetypName || !selectedGeraet) {
      return;
    }

    try {
      const response = await fetch('/api/hostname/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          standortId: selectedStandort,
          geraetetypName: geraetetypName,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSelectedGeraet(prev => ({ ...prev!, hostname: data.data.hostname }));
      } else {
        console.warn('Hostname konnte nicht generiert werden:', data.message);
      }
    } catch (error) {
      console.error('Fehler beim Generieren des Hostnames:', error);
    }
  };

  const ladeGeraete = async (standortId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/standorte/${standortId}/geraete`);
      const data = await response.json();
      
      if (data.success) {
        setGeraete(data.data);
      } else {
        setError(data.error || 'Fehler beim Laden der Geräte');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Laden der Geräte:', err);
    } finally {
      setLoading(false);
    }
  };

  // Verbindungen für ein spezifisches Gerät laden
  const ladeGeraeteVerbindungen = async (geraetId: string) => {
    try {
      setVerbindungenLoading(true);
      const response = await fetch(`/api/geraete/${geraetId}/verbindungen`);
      const data = await response.json();
      
      if (data.success) {
        setGeraeteVerbindungen(data.data);
      } else {
        console.error('Fehler beim Laden der Verbindungen:', data.error);
        setGeraeteVerbindungen([]);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Verbindungen:', err);
      setGeraeteVerbindungen([]);
    } finally {
      setVerbindungenLoading(false);
    }
  };

  // Neues Gerät erstellen
  const erstelleGeraet = async () => {
    try {
      if (!selectedStandort) {
        setError('Kein Standort ausgewählt');
        return;
      }

      // Gerätedaten mit Port-Konfiguration zusammenstellen
      const geraetDaten = {
        ...neuGeraet,
        belegteports: neuGeraet.portKonfiguration.map(p => ({
          portNummer: p.portNummer,
          portTyp: p.portTyp,
          geschwindigkeit: p.geschwindigkeit,
          belegt: false,
          beschreibung: '',
        }))
      };

      // Entferne portKonfiguration aus den Daten (wird nicht vom Backend erwartet)
      const { portKonfiguration, ...geraetOhnePortKonfiguration } = geraetDaten;

      const response = await fetch(`/api/standorte/${selectedStandort}/geraete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geraetOhnePortKonfiguration),
      });

      const data = await response.json();
      
      if (data.success) {
        setDialogOpen(false);
        resetForm();
        ladeGeraete(selectedStandort);
      } else {
        setError(data.error || 'Fehler beim Erstellen des Geräts');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Erstellen des Geräts:', err);
    }
  };

  const resetForm = () => {
    setNeuGeraet({
      name: '',
      hostname: '',
      geraetetyp: '' as GeraeteTyp,
      modell: '',
      seriennummer: '',
      standortDetails: '',
      bemerkungen: '',
      // Neue IP-Konfiguration
      ipKonfigurationen: [],
      oeffentlicheIPKonfigurationen: [],
      // Legacy-Kompatibilität
      ipKonfiguration: {
        typ: 'dhcp',
        ipAdresse: '',
        netzwerkbereich: '',
      },
      macAdresse: '',
      anzahlNetzwerkports: 0,
      portKonfiguration: [],
      rackPosition: {
        rack: '',
        einheit: 0,
      },
      // Router-spezifische öffentliche IP-Konfiguration
      hatOeffentlicheIp: false,
      oeffentlicheIpTyp: 'dynamisch',
      dyndnsAktiv: false,
      dyndnsAdresse: '',
      statischeOeffentlicheIp: '',
    });
  };

  // Port-Konfiguration generieren wenn Anzahl Ports sich ändert
  const generierePortKonfiguration = (anzahlPorts: number, isBearbeiten = false, existierendeKonfiguration?: any[]) => {
    const ports = [];
    for (let i = 1; i <= anzahlPorts; i++) {
      const existierenderPort = existierendeKonfiguration?.find(p => p.portNummer === i);
      ports.push({
        portNummer: i,
        portTyp: existierenderPort?.portTyp || 'RJ45' as PortTyp,
        geschwindigkeit: existierenderPort?.geschwindigkeit || '1G',
        label: existierenderPort?.label || '',
      });
    }
    return ports;
  };

  // Port-Konfiguration aktualisieren
  const aktualisierePortKonfiguration = (portNummer: number, feld: 'portTyp' | 'geschwindigkeit' | 'label', wert: any, isBearbeiten = false) => {
    if (isBearbeiten && selectedGeraet) {
      const portKonfiguration = selectedGeraet.belegteports || [];
      const neueKonfiguration = portKonfiguration.map((port, index) => {
        const actualPortNummer = port.portNummer || (index + 1);
        return actualPortNummer === portNummer 
          ? { ...port, [feld]: wert, portNummer: actualPortNummer }
          : port;
      });
      setSelectedGeraet({ ...selectedGeraet, belegteports: neueKonfiguration });
    } else {
      const neueKonfiguration = neuGeraet.portKonfiguration.map((port, index) => {
        const actualPortNummer = port.portNummer || (index + 1);
        return actualPortNummer === portNummer 
          ? { ...port, [feld]: wert, portNummer: actualPortNummer }
          : port;
      });
      setNeuGeraet({ ...neuGeraet, portKonfiguration: neueKonfiguration });
    }
  };

  // Port-Konfiguration Komponente
  const renderPortKonfiguration = (ports: any[], isBearbeiten = false) => {
    if (!ports || ports.length === 0) return null;

    const verfuegbarePortTypen: PortTyp[] = ['RJ45', 'SFP', 'SFP+', 'QSFP', 'SFP28', 'QSFP28', 'PoE'];
    const verfuegbareGeschwindigkeiten = ['10M', '100M', '1G', '2.5G', '5G', '10G', '25G', '40G', '100G'];

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Port-Konfiguration
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={2}>
          {ports.map((port, index) => (
            <Grid item xs={12} key={port.portNummer || (index + 1)}>
              <Box sx={{ 
                border: `1px solid ${darkMode ? theme.palette.divider : '#e0e0e0'}`,
                borderRadius: 1, 
                p: 2, 
                backgroundColor: darkMode ? theme.palette.background.paper : '#fafafa',
                '&:hover': {
                  backgroundColor: darkMode 
                    ? theme.palette.action.hover 
                    : 'rgba(0, 0, 0, 0.04)',
                },
                transition: 'background-color 0.2s ease'
              }}>
                <Typography 
                  variant="subtitle2" 
                  gutterBottom
                  sx={{ 
                    color: darkMode ? theme.palette.primary.light : theme.palette.primary.main,
                    fontWeight: 600 
                  }}
                >
                  Port {port.portNummer || (index + 1)}
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ 
                        color: darkMode ? theme.palette.text.secondary : undefined 
                      }}>
                        Port-Typ
                      </InputLabel>
                      <Select
                        value={port.portTyp || 'RJ45'}
                        onChange={(e) => aktualisierePortKonfiguration(port.portNummer || (index + 1), 'portTyp', e.target.value, isBearbeiten)}
                        label="Port-Typ"
                        sx={{
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: darkMode ? theme.palette.divider : undefined,
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: darkMode ? theme.palette.primary.main : undefined,
                          },
                        }}
                      >
                        {verfuegbarePortTypen.map((typ) => (
                          <MenuItem 
                            key={typ} 
                            value={typ}
                            sx={{
                              '&:hover': {
                                backgroundColor: darkMode 
                                  ? theme.palette.action.hover 
                                  : undefined,
                              },
                            }}
                          >
                            {typ}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ 
                        color: darkMode ? theme.palette.text.secondary : undefined 
                      }}>
                        Geschwindigkeit
                      </InputLabel>
                      <Select
                        value={port.geschwindigkeit || '1G'}
                        onChange={(e) => aktualisierePortKonfiguration(port.portNummer || (index + 1), 'geschwindigkeit', e.target.value, isBearbeiten)}
                        label="Geschwindigkeit"
                        sx={{
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: darkMode ? theme.palette.divider : undefined,
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: darkMode ? theme.palette.primary.main : undefined,
                          },
                        }}
                      >
                        {verfuegbareGeschwindigkeiten.map((speed) => (
                          <MenuItem 
                            key={speed} 
                            value={speed}
                            sx={{
                              '&:hover': {
                                backgroundColor: darkMode 
                                  ? theme.palette.action.hover 
                                  : undefined,
                              },
                            }}
                          >
                            {speed}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Label (optional)"
                      placeholder="z.B. DMZ, WAN, LAN"
                      fullWidth
                      size="small"
                      value={port.label || ''}
                      onChange={(e) => aktualisierePortKonfiguration(port.portNummer || (index + 1), 'label', e.target.value, isBearbeiten)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: darkMode ? theme.palette.divider : undefined,
                          },
                          '&:hover fieldset': {
                            borderColor: darkMode ? theme.palette.primary.main : undefined,
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: darkMode ? theme.palette.text.secondary : undefined,
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  // Gerät bearbeiten
  const aktualisiereGeraet = async () => {
    try {
      if (!selectedGeraet) return;

      // Port-Konfiguration korrekt strukturieren
      const geraetDaten = {
        ...selectedGeraet,
        belegteports: (selectedGeraet.belegteports || []).map(port => ({
          portNummer: port.portNummer,
          portTyp: port.portTyp,
          geschwindigkeit: port.geschwindigkeit,
          belegt: port.belegt || false,
          beschreibung: port.beschreibung || '',
          label: port.label || '',
        }))
      };

      const response = await fetch(`/api/geraete/${selectedGeraet.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geraetDaten),
      });

      const data = await response.json();
      
      if (data.success) {
        setBearbeitenDialogOpen(false);
        setSelectedGeraet(null);
        if (selectedStandort) {
          ladeGeraete(selectedStandort);
        }
      } else {
        setError(data.error || 'Fehler beim Aktualisieren des Geräts');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Aktualisieren des Geräts:', err);
    }
  };

  const getGeraetIcon = (geraetetyp: GeraeteTyp) => {
    const iconMap: Record<string, React.ReactNode> = {
      'Router': <RouterIcon />,
      'Switch': <ModemIcon />,
      'SD-WAN Gateway': <RouterIcon />,
      'Firewall': <RouterIcon />,
      'Access Point': <RouterIcon />,
      'Kamera': <ComputerIcon />,
      'VOIP-Phone': <ComputerIcon />,
      'Drucker': <ComputerIcon />,
      'AI-Port': <ComputerIcon />,
      'NVR': <ComputerIcon />,
      'Zugangskontrolle': <ComputerIcon />,
      'Serial Server': <ComputerIcon />,
      'HMI': <ComputerIcon />,
      'Server': <ComputerIcon />,
      'Sensor': <ComputerIcon />,
      'Sonstiges': <ComputerIcon />,
    };
    return iconMap[geraetetyp] || <ComputerIcon />;
  };

  const getGeraetColor = (geraetetyp: GeraeteTyp): string => {
    const colorMap: Record<string, string> = {
      'Router': '#f44336',
      'Switch': '#2196f3',
      'SD-WAN Gateway': '#ff9800',
      'Firewall': '#e91e63',
      'Access Point': '#9c27b0',
      'Kamera': '#4caf50',
      'VOIP-Phone': '#00bcd4',
      'Drucker': '#ff5722',
      'AI-Port': '#795548',
      'NVR': '#607d8b',
      'Zugangskontrolle': '#ffeb3b',
      'Serial Server': '#cddc39',
      'HMI': '#8bc34a',
      'Server': '#3f51b5',
      'Sensor': '#009688',
      'Sonstiges': '#9e9e9e',
    };
    return colorMap[geraetetyp] || '#9e9e9e';
  };

  const getKabelFarbe = (kabeltyp: string): string => {
    const farbMap: Record<string, string> = {
      'RJ45 Cat5e': '#2196f3',
      'RJ45 Cat6': '#4caf50',
      'RJ45 Cat6a': '#8bc34a',
      'Fibre Singlemode': '#ff9800',
      'Fibre Multimode': '#f44336',
      'Coax': '#9c27b0',
      'Sonstiges': '#607d8b',
    };
    return farbMap[kabeltyp] || '#607d8b';
  };

  // Gefilterte Geräte berechnen
  const gefilterteGeraete = geraete.filter(geraet => {
    if (geraetetypFilter === 'alle') return true;
    return geraet.geraetetyp === geraetetypFilter;
  });

  // Einzigartige Gerätetypen aus den vorhandenen Geräten ermitteln
  const verfuegbareGeraetetypen = Array.from(new Set(geraete.map(g => g.geraetetyp)));

  // Helper-Funktionen für neue IP-Konfiguration
  const generiereNeueIPKonfiguration = (portNummer: number): IPKonfiguration => ({
    id: `ip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: '',
    portNummer,
    typ: 'dhcp',
    netzwerkbereich: '',
    aktiv: true,
    prioritaet: 1,
  });

  const migriereAlteFeldZuNeueIPKonfiguration = (geraet: Geraet): IPKonfiguration[] => {
    // Wenn bereits neue IP-Konfigurationen vorhanden sind, diese verwenden
    if (geraet.ipKonfigurationen && geraet.ipKonfigurationen.length > 0) {
      return geraet.ipKonfigurationen;
    }
    
    // Legacy-Migration: Alte ipKonfiguration zu neuer Struktur
    if (geraet.ipKonfiguration && geraet.anzahlNetzwerkports > 0) {
      return [{
        id: `legacy-${geraet.id}`,
        name: 'Legacy Migration',
        portNummer: 1, // Erste Port als Standard
        typ: geraet.ipKonfiguration.typ,
        ipAdresse: geraet.ipKonfiguration.ipAdresse,
        netzwerkbereich: geraet.ipKonfiguration.netzwerkbereich || '',
        aktiv: true,
        prioritaet: 1,
      }];
    }
    
    return [];
  };

  const aktualisiereIPKonfiguration = (
    ipKonfigurationen: IPKonfiguration[], 
    id: string, 
    updates: Partial<IPKonfiguration>
  ): IPKonfiguration[] => {
    return ipKonfigurationen.map(config => 
      config.id === id ? { ...config, ...updates } : config
    );
  };

  const entferneIPKonfiguration = (ipKonfigurationen: IPKonfiguration[], id: string): IPKonfiguration[] => {
    return ipKonfigurationen.filter(config => config.id !== id);
  };

  // Helper-Funktionen für öffentliche IP-Konfiguration
  const generiereNeueOeffentlicheIPKonfiguration = (typ: 'einzelip' | 'subnet'): OeffentlicheIPKonfiguration => ({
    id: `oip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    typ,
    aktiv: true,
    ...(typ === 'einzelip' ? {
      einzelIP: {
        dynamisch: true,
        dyndnsAktiv: false,
      }
    } : {
      subnet: {
        netzwerkadresse: '',
        gateway: '',
        nutzbareIPs: []
      }
    })
  });

  const generiereNeueOeffentlicheIP = (subnet: string): OeffentlicheIP => ({
    id: `ip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ipAdresse: '',
    belegt: false,
  });

  const aktualisiereOeffentlicheIPKonfiguration = (
    configs: OeffentlicheIPKonfiguration[], 
    id: string, 
    updates: Partial<OeffentlicheIPKonfiguration>
  ): OeffentlicheIPKonfiguration[] => {
    return configs.map(config => 
      config.id === id ? { ...config, ...updates } : config
    );
  };

  const entferneOeffentlicheIPKonfiguration = (configs: OeffentlicheIPKonfiguration[], id: string): OeffentlicheIPKonfiguration[] => {
    return configs.filter(config => config.id !== id);
  };



  // IP-Konfiguration UI rendern
  const renderIPKonfigurationUI = (
    ipKonfigurationen: IPKonfiguration[], 
    updateIPKonfigurationen: (configs: IPKonfiguration[]) => void,
    anzahlPorts: number
  ) => {
    if (anzahlPorts === 0) {
      return (
        <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Keine IP-Konfiguration möglich - keine Netzwerkports konfiguriert
          </Typography>
        </Box>
      );
    }

    const verfuegbarePorts = Array.from({ length: anzahlPorts }, (_, i) => i + 1);

    return (
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1" fontWeight="medium">
            IP-Konfigurationen ({ipKonfigurationen.length})
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              const neueKonfiguration = generiereNeueIPKonfiguration(1);
              updateIPKonfigurationen([...ipKonfigurationen, neueKonfiguration]);
            }}
          >
            IP-Konfiguration hinzufügen
          </Button>
        </Box>

        {ipKonfigurationen.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Noch keine IP-Konfigurationen definiert
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Fügen Sie IP-Konfigurationen für die verschiedenen Ports hinzu
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {ipKonfigurationen.map((ipConfig, index) => (
              <Grid item xs={12} key={ipConfig.id}>
                <Paper elevation={1} sx={{ p: 2, position: 'relative' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="subtitle2" color="primary">
                      IP-Konfiguration #{index + 1}
                    </Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => updateIPKonfigurationen(entferneIPKonfiguration(ipKonfigurationen, ipConfig.id))}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Grid container spacing={2}>
                    {/* Name/Beschreibung */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Name/Beschreibung"
                        fullWidth
                        size="small"
                        placeholder="z.B. Management, Daten, Gast"
                        value={ipConfig.name}
                        onChange={(e) => updateIPKonfigurationen(
                          aktualisiereIPKonfiguration(ipKonfigurationen, ipConfig.id, { name: e.target.value })
                        )}
                      />
                    </Grid>

                    {/* Port-Zuordnung */}
                    <Grid item xs={12} sm={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Port</InputLabel>
                        <Select
                          value={ipConfig.portNummer}
                          onChange={(e) => updateIPKonfigurationen(
                            aktualisiereIPKonfiguration(ipKonfigurationen, ipConfig.id, { portNummer: Number(e.target.value) })
                          )}
                          label="Port"
                        >
                          {verfuegbarePorts.map(port => (
                            <MenuItem key={port} value={port}>
                              Port {port}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Priorität */}
                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="Priorität"
                        type="number"
                        fullWidth
                        size="small"
                        value={ipConfig.prioritaet || 1}
                        onChange={(e) => updateIPKonfigurationen(
                          aktualisiereIPKonfiguration(ipKonfigurationen, ipConfig.id, { prioritaet: Number(e.target.value) })
                        )}
                        inputProps={{ min: 1, max: 10 }}
                        helperText="1 = höchste Priorität"
                      />
                    </Grid>

                    {/* IP-Typ */}
                    <Grid item xs={12} sm={6}>
                      <FormControl component="fieldset">
                        <FormLabel component="legend">IP-Typ</FormLabel>
                        <RadioGroup
                          row
                          value={ipConfig.typ}
                          onChange={(e) => updateIPKonfigurationen(
                            aktualisiereIPKonfiguration(ipKonfigurationen, ipConfig.id, { typ: e.target.value as 'dhcp' | 'statisch' })
                          )}
                        >
                          <FormControlLabel value="dhcp" control={<Radio size="small" />} label="DHCP" />
                          <FormControlLabel value="statisch" control={<Radio size="small" />} label="Statisch" />
                        </RadioGroup>
                      </FormControl>
                    </Grid>

                    {/* Aktiv-Status */}
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <input
                            type="checkbox"
                            checked={ipConfig.aktiv}
                            onChange={(e) => updateIPKonfigurationen(
                              aktualisiereIPKonfiguration(ipKonfigurationen, ipConfig.id, { aktiv: e.target.checked })
                            )}
                            style={{ 
                              accentColor: darkMode ? '#90caf9' : '#1976d2',
                              transform: 'scale(1.2)',
                              marginRight: '8px'
                            }}
                          />
                        }
                        label="Aktiv"
                      />
                    </Grid>

                    {/* Netzwerkbereich (immer anzeigen) */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Netzwerkbereich"
                        fullWidth
                        size="small"
                        placeholder="192.168.1.0/24"
                        value={ipConfig.netzwerkbereich}
                        onChange={(e) => updateIPKonfigurationen(
                          aktualisiereIPKonfiguration(ipKonfigurationen, ipConfig.id, { netzwerkbereich: e.target.value })
                        )}
                        helperText="Auch bei DHCP für Filter angeben"
                        required
                      />
                    </Grid>

                    {/* IP-Adresse (nur bei statisch erforderlich) */}
                    {ipConfig.typ === 'statisch' && (
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="IP-Adresse"
                          fullWidth
                          size="small"
                          placeholder="192.168.1.100"
                          value={ipConfig.ipAdresse || ''}
                          onChange={(e) => updateIPKonfigurationen(
                            aktualisiereIPKonfiguration(ipKonfigurationen, ipConfig.id, { ipAdresse: e.target.value })
                          )}
                          required
                        />
                      </Grid>
                    )}

                    {/* Gateway (optional bei statisch) */}
                    {ipConfig.typ === 'statisch' && (
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Gateway"
                          fullWidth
                          size="small"
                          placeholder="192.168.1.1"
                          value={ipConfig.gateway || ''}
                          onChange={(e) => updateIPKonfigurationen(
                            aktualisiereIPKonfiguration(ipKonfigurationen, ipConfig.id, { gateway: e.target.value })
                          )}
                        />
                      </Grid>
                    )}

                    {/* VLAN-Konfiguration */}
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        VLAN-Konfiguration (optional)
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="VLAN ID"
                        type="number"
                        fullWidth
                        size="small"
                        placeholder="100"
                        value={ipConfig.vlan?.vlanId || ''}
                        onChange={(e) => {
                          const vlanId = parseInt(e.target.value) || 0;
                          updateIPKonfigurationen(
                            aktualisiereIPKonfiguration(ipKonfigurationen, ipConfig.id, { 
                              vlan: { 
                                ...ipConfig.vlan,
                                vlanId,
                                tagged: ipConfig.vlan?.tagged || false
                              } 
                            })
                          );
                        }}
                        inputProps={{ min: 1, max: 4094 }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="VLAN Name"
                        fullWidth
                        size="small"
                        placeholder="Management"
                        value={ipConfig.vlan?.vlanName || ''}
                        onChange={(e) => updateIPKonfigurationen(
                          aktualisiereIPKonfiguration(ipKonfigurationen, ipConfig.id, { 
                            vlan: { 
                              ...ipConfig.vlan,
                              vlanId: ipConfig.vlan?.vlanId || 0,
                              tagged: ipConfig.vlan?.tagged || false,
                              vlanName: e.target.value
                            } 
                          })
                        )}
                      />
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <FormControl component="fieldset">
                        <FormLabel component="legend">VLAN-Typ</FormLabel>
                        <RadioGroup
                          row
                          value={ipConfig.vlan?.tagged ? 'tagged' : 'untagged'}
                          onChange={(e) => updateIPKonfigurationen(
                            aktualisiereIPKonfiguration(ipKonfigurationen, ipConfig.id, { 
                              vlan: { 
                                ...ipConfig.vlan,
                                vlanId: ipConfig.vlan?.vlanId || 0,
                                tagged: e.target.value === 'tagged'
                              } 
                            })
                          )}
                        >
                          <FormControlLabel value="untagged" control={<Radio size="small" />} label="Untagged" />
                          <FormControlLabel value="tagged" control={<Radio size="small" />} label="Tagged" />
                        </RadioGroup>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <FormControlLabel
                        control={
                          <input
                            type="checkbox"
                            checked={ipConfig.vlan?.nacZugewiesen || false}
                            onChange={(e) => updateIPKonfigurationen(
                              aktualisiereIPKonfiguration(ipKonfigurationen, ipConfig.id, { 
                                vlan: { 
                                  ...ipConfig.vlan,
                                  vlanId: ipConfig.vlan?.vlanId || 0,
                                  tagged: ipConfig.vlan?.tagged || false,
                                  nacZugewiesen: e.target.checked
                                } 
                              })
                            )}
                            style={{ 
                              accentColor: darkMode ? '#90caf9' : '#1976d2',
                              transform: 'scale(1.2)',
                              marginRight: '8px'
                            }}
                          />
                        }
                        label="NAC-Zuweisung"
                      />
                    </Grid>

                    {/* VLAN Bemerkungen */}
                    {ipConfig.vlan?.vlanId && (
                      <Grid item xs={12}>
                        <TextField
                          label="VLAN Bemerkungen"
                          fullWidth
                          size="small"
                          placeholder="Zusätzliche VLAN-Informationen..."
                          value={ipConfig.vlan?.bemerkungen || ''}
                          onChange={(e) => updateIPKonfigurationen(
                            aktualisiereIPKonfiguration(ipKonfigurationen, ipConfig.id, { 
                              vlan: { 
                                ...ipConfig.vlan,
                                vlanId: ipConfig.vlan?.vlanId || 0,
                                tagged: ipConfig.vlan?.tagged || false,
                                bemerkungen: e.target.value
                              } 
                            })
                          )}
                        />
                      </Grid>
                    )}

                    {/* Bemerkungen */}
                    <Grid item xs={12}>
                      <TextField
                        label="Bemerkungen"
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                        placeholder="Zusätzliche Informationen zur IP-Konfiguration..."
                        value={ipConfig.bemerkungen || ''}
                        onChange={(e) => updateIPKonfigurationen(
                          aktualisiereIPKonfiguration(ipKonfigurationen, ipConfig.id, { bemerkungen: e.target.value })
                        )}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    );
  };

  // Erweiterte öffentliche IP-Konfiguration UI rendern
  const renderOeffentlicheIPKonfigurationUI = (
    oeffentlicheIPKonfigurationen: OeffentlicheIPKonfiguration[],
    updateOeffentlicheIPKonfigurationen: (configs: OeffentlicheIPKonfiguration[]) => void
  ) => {
    return (
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1" fontWeight="medium">
            Öffentliche IP-Konfigurationen ({oeffentlicheIPKonfigurationen.length})
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => {
                const neueKonfiguration = generiereNeueOeffentlicheIPKonfiguration('einzelip');
                updateOeffentlicheIPKonfigurationen([...oeffentlicheIPKonfigurationen, neueKonfiguration]);
              }}
            >
              Einzelne IP
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => {
                const neueKonfiguration = generiereNeueOeffentlicheIPKonfiguration('subnet');
                updateOeffentlicheIPKonfigurationen([...oeffentlicheIPKonfigurationen, neueKonfiguration]);
              }}
            >
              Subnet
            </Button>
          </Box>
        </Box>

        {oeffentlicheIPKonfigurationen.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Noch keine öffentlichen IP-Konfigurationen definiert
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Fügen Sie Einzelne IPs oder Subnet-Konfigurationen hinzu
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {oeffentlicheIPKonfigurationen.map((ipConfig, index) => (
              <Grid item xs={12} key={ipConfig.id}>
                <Paper elevation={1} sx={{ p: 2, position: 'relative' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="subtitle2" color="primary">
                      {ipConfig.typ === 'einzelip' ? 'Einzelne IP' : 'Subnet'} #{index + 1}
                    </Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => updateOeffentlicheIPKonfigurationen(
                        entferneOeffentlicheIPKonfiguration(oeffentlicheIPKonfigurationen, ipConfig.id)
                      )}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Grid container spacing={2}>
                    {/* Aktiv-Status */}
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <input
                            type="checkbox"
                            checked={ipConfig.aktiv}
                            onChange={(e) => updateOeffentlicheIPKonfigurationen(
                              aktualisiereOeffentlicheIPKonfiguration(oeffentlicheIPKonfigurationen, ipConfig.id, { aktiv: e.target.checked })
                            )}
                            style={{ 
                              accentColor: darkMode ? '#90caf9' : '#1976d2',
                              transform: 'scale(1.2)',
                              marginRight: '8px'
                            }}
                          />
                        }
                        label="Aktiv"
                      />
                    </Grid>

                    {/* Einzelne IP Konfiguration */}
                    {ipConfig.typ === 'einzelip' && ipConfig.einzelIP && (
                      <>
                        <Grid item xs={12}>
                          <FormControl component="fieldset">
                            <FormLabel component="legend">IP-Typ</FormLabel>
                            <RadioGroup
                              row
                              value={ipConfig.einzelIP.dynamisch ? 'dynamisch' : 'statisch'}
                              onChange={(e) => updateOeffentlicheIPKonfigurationen(
                                aktualisiereOeffentlicheIPKonfiguration(oeffentlicheIPKonfigurationen, ipConfig.id, {
                                  einzelIP: {
                                    ...ipConfig.einzelIP,
                                    dynamisch: e.target.value === 'dynamisch'
                                  }
                                })
                              )}
                            >
                              <FormControlLabel value="dynamisch" control={<Radio size="small" />} label="Dynamisch" />
                              <FormControlLabel value="statisch" control={<Radio size="small" />} label="Statisch" />
                            </RadioGroup>
                          </FormControl>
                        </Grid>

                        {!ipConfig.einzelIP.dynamisch && (
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Statische IP-Adresse"
                              fullWidth
                              size="small"
                              placeholder="203.0.113.1"
                              value={ipConfig.einzelIP.adresse || ''}
                                                             onChange={(e) => updateOeffentlicheIPKonfigurationen(
                                 aktualisiereOeffentlicheIPKonfiguration(oeffentlicheIPKonfigurationen, ipConfig.id, {
                                   einzelIP: {
                                     dynamisch: ipConfig.einzelIP?.dynamisch || false,
                                     dyndnsAktiv: ipConfig.einzelIP?.dyndnsAktiv,
                                     dyndnsAdresse: ipConfig.einzelIP?.dyndnsAdresse,
                                     adresse: e.target.value
                                   }
                                 })
                               )}
                            />
                          </Grid>
                        )}

                        {ipConfig.einzelIP.dynamisch && (
                          <>
                            <Grid item xs={12} sm={6}>
                              <FormControlLabel
                                control={
                                  <input
                                    type="checkbox"
                                    checked={ipConfig.einzelIP.dyndnsAktiv || false}
                                                                           onChange={(e) => updateOeffentlicheIPKonfigurationen(
                                         aktualisiereOeffentlicheIPKonfiguration(oeffentlicheIPKonfigurationen, ipConfig.id, {
                                           einzelIP: {
                                             dynamisch: ipConfig.einzelIP?.dynamisch ?? true,
                                             adresse: ipConfig.einzelIP?.adresse,
                                             dyndnsAdresse: ipConfig.einzelIP?.dyndnsAdresse,
                                             dyndnsAktiv: e.target.checked
                                           }
                                         })
                                       )}
                                    style={{ 
                                      accentColor: darkMode ? '#90caf9' : '#1976d2',
                                      transform: 'scale(1.2)',
                                      marginRight: '8px'
                                    }}
                                  />
                                }
                                label="DynDNS verwenden"
                              />
                            </Grid>

                            {ipConfig.einzelIP.dyndnsAktiv && (
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  label="DynDNS-Adresse"
                                  fullWidth
                                  size="small"
                                  placeholder="beispiel.dyndns.org"
                                  value={ipConfig.einzelIP.dyndnsAdresse || ''}
                                  onChange={(e) => updateOeffentlicheIPKonfigurationen(
                                    aktualisiereOeffentlicheIPKonfiguration(oeffentlicheIPKonfigurationen, ipConfig.id, {
                                      einzelIP: {
                                        ...ipConfig.einzelIP,
                                        dyndnsAdresse: e.target.value
                                      }
                                    })
                                  )}
                                />
                              </Grid>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {/* Subnet Konfiguration */}
                    {ipConfig.typ === 'subnet' && ipConfig.subnet && (
                      <>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Netzwerkadresse"
                            fullWidth
                            size="small"
                            placeholder="203.0.113.0/29"
                            value={ipConfig.subnet.netzwerkadresse}
                            onChange={(e) => updateOeffentlicheIPKonfigurationen(
                              aktualisiereOeffentlicheIPKonfiguration(oeffentlicheIPKonfigurationen, ipConfig.id, {
                                subnet: {
                                  ...ipConfig.subnet,
                                  netzwerkadresse: e.target.value
                                }
                              })
                            )}
                            helperText="z.B. 203.0.113.0/29 für 6 nutzbare IPs"
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Gateway"
                            fullWidth
                            size="small"
                            placeholder="203.0.113.1"
                            value={ipConfig.subnet.gateway}
                            onChange={(e) => updateOeffentlicheIPKonfigurationen(
                              aktualisiereOeffentlicheIPKonfiguration(oeffentlicheIPKonfigurationen, ipConfig.id, {
                                subnet: {
                                  ...ipConfig.subnet,
                                  gateway: e.target.value
                                }
                              })
                            )}
                          />
                        </Grid>

                        {/* Nutzbare IPs Verwaltung */}
                        <Grid item xs={12}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="body2" fontWeight="medium">
                              Nutzbare IPs ({ipConfig.subnet?.nutzbareIPs?.length || 0})
                            </Typography>
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<AddIcon />}
                                                             onClick={() => {
                                 if (ipConfig.subnet) {
                                   const neueIP = generiereNeueOeffentlicheIP(ipConfig.subnet.netzwerkadresse || '');
                                   updateOeffentlicheIPKonfigurationen(
                                     aktualisiereOeffentlicheIPKonfiguration(oeffentlicheIPKonfigurationen, ipConfig.id, {
                                       subnet: {
                                         netzwerkadresse: ipConfig.subnet.netzwerkadresse || '',
                                         gateway: ipConfig.subnet.gateway || '',
                                         nutzbareIPs: [...(ipConfig.subnet.nutzbareIPs || []), neueIP]
                                       }
                                     })
                                   );
                                 }
                               }}
                            >
                              IP hinzufügen
                            </Button>
                          </Box>

                                                     {(ipConfig.subnet?.nutzbareIPs || []).map((nutzareIP, ipIndex) => (
                            <Grid container spacing={1} key={nutzareIP.id} sx={{ mb: 1 }}>
                              <Grid item xs={3}>
                                <TextField
                                  label="IP-Adresse"
                                  fullWidth
                                  size="small"
                                  placeholder="203.0.113.2"
                                  value={nutzareIP.ipAdresse}
                                                                     onChange={(e) => {
                                     if (ipConfig.subnet?.nutzbareIPs) {
                                       const aktualisiereNutzbareIPs = ipConfig.subnet.nutzbareIPs.map(ip => 
                                         ip.id === nutzareIP.id ? { ...ip, ipAdresse: e.target.value } : ip
                                       );
                                       updateOeffentlicheIPKonfigurationen(
                                         aktualisiereOeffentlicheIPKonfiguration(oeffentlicheIPKonfigurationen, ipConfig.id, {
                                           subnet: {
                                             netzwerkadresse: ipConfig.subnet.netzwerkadresse || '',
                                             gateway: ipConfig.subnet.gateway || '',
                                             nutzbareIPs: aktualisiereNutzbareIPs
                                           }
                                         })
                                       );
                                     }
                                   }}
                                />
                              </Grid>
                              <Grid item xs={3}>
                                <TextField
                                  label="Verwendung"
                                  fullWidth
                                  size="small"
                                  placeholder="Webserver"
                                  value={nutzareIP.verwendung || ''}
                                  onChange={(e) => {
                                    // @ts-ignore - subnet ist hier durch Kontext garantiert definiert
                                    const aktualisiereNutzbareIPs = ipConfig.subnet.nutzbareIPs.map(ip => 
                                      ip.id === nutzareIP.id ? { ...ip, verwendung: e.target.value } : ip
                                    );
                                    updateOeffentlicheIPKonfigurationen(
                                      aktualisiereOeffentlicheIPKonfiguration(oeffentlicheIPKonfigurationen, ipConfig.id, {
                                        subnet: {
                                          ...ipConfig.subnet,
                                          nutzbareIPs: aktualisiereNutzbareIPs
                                        }
                                      })
                                    );
                                  }}
                                />
                              </Grid>
                              <Grid item xs={2}>
                                <FormControlLabel
                                  control={
                                    <input
                                      type="checkbox"
                                      checked={nutzareIP.belegt}
                                      onChange={(e) => {
                                        // @ts-ignore - subnet ist hier durch Kontext garantiert definiert
                                        const aktualisiereNutzbareIPs = ipConfig.subnet.nutzbareIPs.map(ip => 
                                          ip.id === nutzareIP.id ? { ...ip, belegt: e.target.checked } : ip
                                        );
                                        updateOeffentlicheIPKonfigurationen(
                                          aktualisiereOeffentlicheIPKonfiguration(oeffentlicheIPKonfigurationen, ipConfig.id, {
                                            subnet: {
                                              ...ipConfig.subnet,
                                              nutzbareIPs: aktualisiereNutzbareIPs
                                            }
                                          })
                                        );
                                      }}
                                      style={{ 
                                        accentColor: darkMode ? '#90caf9' : '#1976d2',
                                        transform: 'scale(1.2)'
                                      }}
                                    />
                                  }
                                  label="Belegt"
                                />
                              </Grid>
                              <Grid item xs={3}>
                                <TextField
                                  label="Bemerkungen"
                                  fullWidth
                                  size="small"
                                  value={nutzareIP.bemerkungen || ''}
                                  onChange={(e) => {
                                    // @ts-ignore - subnet ist hier durch Kontext garantiert definiert
                                    const aktualisiereNutzbareIPs = ipConfig.subnet.nutzbareIPs.map(ip => 
                                      ip.id === nutzareIP.id ? { ...ip, bemerkungen: e.target.value } : ip
                                    );
                                    updateOeffentlicheIPKonfigurationen(
                                      aktualisiereOeffentlicheIPKonfiguration(oeffentlicheIPKonfigurationen, ipConfig.id, {
                                        subnet: {
                                          ...ipConfig.subnet,
                                          nutzbareIPs: aktualisiereNutzbareIPs
                                        }
                                      })
                                    );
                                  }}
                                />
                              </Grid>
                              <Grid item xs={1}>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    // @ts-ignore - subnet ist hier durch Kontext garantiert definiert  
                                    const aktualisiereNutzbareIPs = ipConfig.subnet.nutzbareIPs.filter(ip => ip.id !== nutzareIP.id);
                                    updateOeffentlicheIPKonfigurationen(
                                      aktualisiereOeffentlicheIPKonfiguration(oeffentlicheIPKonfigurationen, ipConfig.id, {
                                        subnet: {
                                          ...ipConfig.subnet,
                                          nutzbareIPs: aktualisiereNutzbareIPs
                                        }
                                      })
                                    );
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Grid>
                            </Grid>
                          ))}
                        </Grid>
                      </>
                    )}

                    {/* Bemerkungen */}
                    <Grid item xs={12}>
                      <TextField
                        label="Bemerkungen"
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                        placeholder="Zusätzliche Informationen zur öffentlichen IP-Konfiguration..."
                        value={ipConfig.bemerkungen || ''}
                        onChange={(e) => updateOeffentlicheIPKonfigurationen(
                          aktualisiereOeffentlicheIPKonfiguration(oeffentlicheIPKonfigurationen, ipConfig.id, { bemerkungen: e.target.value })
                        )}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    );
  };

  // Tabellen-Ansicht rendern
  const renderTabellenAnsicht = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Typ</TableCell>
            <TableCell>Modell</TableCell>
            <TableCell>LAN IP</TableCell>
            <TableCell>WAN IP</TableCell>
            <TableCell>Ports</TableCell>
            <TableCell>MAC-Adresse</TableCell>
            <TableCell>Rack</TableCell>
            <TableCell align="right">Aktionen</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {gefilterteGeraete.map((geraet) => (
            <TableRow key={geraet.id} hover>
              <TableCell>
                <Box display="flex" alignItems="center">
                  <Box
                    sx={{
                      color: getGeraetColor(geraet.geraetetyp),
                      mr: 1,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {getGeraetIcon(geraet.geraetetyp)}
                  </Box>
                  {geraet.name}
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={geraet.geraetetyp}
                  size="small"
                  sx={{
                    backgroundColor: getGeraetColor(geraet.geraetetyp),
                    color: 'white',
                  }}
                />
              </TableCell>
              <TableCell>{geraet.modell}</TableCell>
              <TableCell>{geraet.ipKonfiguration?.ipAdresse || '-'}</TableCell>
              <TableCell>
                {geraet.geraetetyp === 'Router' && geraet.hatOeffentlicheIp ? (
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 'medium' }}>
                    {geraet.oeffentlicheIpTyp === 'statisch' && geraet.statischeOeffentlicheIp ? 
                      geraet.statischeOeffentlicheIp :
                    geraet.oeffentlicheIpTyp === 'dynamisch' && geraet.dyndnsAktiv && geraet.dyndnsAdresse ? 
                      geraet.dyndnsAdresse :
                    geraet.oeffentlicheIpTyp === 'dynamisch' ? 
                      'Dynamisch' : 
                      'Verfügbar'
                    }
                  </Typography>
                ) : '-'}
              </TableCell>
              <TableCell>{geraet.anzahlNetzwerkports}</TableCell>
              <TableCell>{geraet.macAdresse || '-'}</TableCell>
              <TableCell>
                {geraet.rackPosition?.rack ? 
                  `${geraet.rackPosition.rack} - HE ${geraet.rackPosition.einheit}` : 
                  '-'
                }
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Details anzeigen">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedGeraet(geraet);
                      setDetailDialogOpen(true);
                      ladeGeraeteVerbindungen(geraet.id);
                    }}
                  >
                    <ViewIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Bearbeiten">
                  <IconButton
                    size="small"
                    onClick={() => {
                      // Gerät in bearbeitbares Format kopieren
                      const bearbeitbaresGeraet = {
                        ...geraet,
                        ipKonfiguration: {
                          typ: geraet.ipKonfiguration?.typ || 'dhcp',
                          ipAdresse: geraet.ipKonfiguration?.ipAdresse || '',
                          netzwerkbereich: geraet.ipKonfiguration?.netzwerkbereich || '',
                        },
                        rackPosition: {
                          rack: geraet.rackPosition?.rack || '',
                          einheit: geraet.rackPosition?.einheit || 0,
                        },
                        belegteports: geraet.belegteports || generierePortKonfiguration(geraet.anzahlNetzwerkports, false, [])
                      };
                      setSelectedGeraet(bearbeitbaresGeraet);
                      setBearbeitenDialogOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  useEffect(() => {
    ladeGeraetetypen();
  }, []);

  useEffect(() => {
    if (selectedStandort) {
      ladeGeraete(selectedStandort);
    }
  }, [selectedStandort]);

  if (!selectedStandort) {
    return (
      <Box>
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <LocationIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" component="h1" gutterBottom>
            Kein Standort ausgewählt
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Bitte wählen Sie einen Standort in der oberen Navigationsleiste aus, um Geräte zu verwalten.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Geräte-Verwaltung: {selectedStandortData?.name}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Verwalten Sie alle Netzwerkgeräte am ausgewählten Standort
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            size="large"
          >
            Neues Gerät
          </Button>
        </Box>
      </Paper>

      {/* Filter- und Ansichts-Toolbar */}
      {geraete.length > 0 && (
        <Paper elevation={1} sx={{ mb: 3 }}>
          <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px !important' }}>
            <Box display="flex" alignItems="center" gap={2}>
              <FilterIcon color="primary" />
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Gerätetyp filtern</InputLabel>
                <Select
                  value={geraetetypFilter}
                  onChange={(e) => setGeraetetypFilter(e.target.value)}
                  label="Gerätetyp filtern"
                >
                  <MenuItem value="alle">Alle Gerätetypen</MenuItem>
                  {verfuegbareGeraetetypen.map((typ) => (
                    <MenuItem key={typ} value={typ}>
                      <Box display="flex" alignItems="center">
                        <Box
                          sx={{
                            color: getGeraetColor(typ as GeraeteTyp),
                            mr: 1,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {getGeraetIcon(typ as GeraeteTyp)}
                        </Box>
                        {typ}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {geraetetypFilter !== 'alle' && (
                <Typography variant="body2" color="text.secondary">
                  {gefilterteGeraete.length} von {geraete.length} Geräten
                </Typography>
              )}
            </Box>

            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="body2" color="text.secondary">
                Ansicht:
              </Typography>
              <ToggleButtonGroup
                value={ansichtsModus}
                exclusive
                onChange={(e, newValue) => newValue && setAnsichtsModus(newValue)}
                size="small"
              >
                <ToggleButton value="cards" aria-label="Karten-Ansicht">
                  <Tooltip title="Karten-Ansicht (Details)">
                    <CardViewIcon />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="list" aria-label="Listen-Ansicht">
                  <Tooltip title="Listen-Ansicht (Tabelle)">
                    <ListViewIcon />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Toolbar>
        </Paper>
      )}

      {/* Fehler-Anzeige */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Lade-Indikator */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" p={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Geräte-Übersicht */}
      {!loading && (
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Geräte am Standort: {selectedStandortData?.name}
            {geraetetypFilter !== 'alle' && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                (gefiltert nach {geraetetypFilter})
              </Typography>
            )}
          </Typography>
          
          {geraete.length === 0 ? (
            <Box textAlign="center" py={6}>
              <ComputerIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Noch keine Geräte vorhanden
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Fügen Sie das erste Gerät für diesen Standort hinzu.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setDialogOpen(true)}
              >
                Erstes Gerät hinzufügen
              </Button>
            </Box>
          ) : gefilterteGeraete.length === 0 ? (
            <Box textAlign="center" py={6}>
              <FilterIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Keine Geräte entsprechen dem Filter
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Versuchen Sie einen anderen Filter oder setzen Sie den Filter zurück.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setGeraetetypFilter('alle')}
              >
                Filter zurücksetzen
              </Button>
            </Box>
          ) : ansichtsModus === 'cards' ? (
            <Grid container spacing={2}>
              {gefilterteGeraete.map((geraet) => (
                <Grid item xs={12} sm={6} md={4} key={geraet.id}>
                  <Card elevation={3} sx={{ height: '100%' }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Box
                          sx={{
                            color: getGeraetColor(geraet.geraetetyp),
                            mr: 1,
                          }}
                        >
                          {getGeraetIcon(geraet.geraetetyp)}
                        </Box>
                        <Typography variant="h6" component="h3">
                          {geraet.name}
                        </Typography>
                      </Box>
                      
                      <Chip
                        label={geraet.geraetetyp}
                        size="small"
                        sx={{
                          backgroundColor: getGeraetColor(geraet.geraetetyp),
                          color: 'white',
                          mb: 2,
                        }}
                      />
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Modell:</strong> {geraet.modell}
                      </Typography>
                      
                      {geraet.ipKonfiguration?.ipAdresse && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>LAN IP:</strong> {geraet.ipKonfiguration.ipAdresse}
                        </Typography>
                      )}
                      
                      {/* Router öffentliche IP anzeigen */}
                      {geraet.geraetetyp === 'Router' && geraet.hatOeffentlicheIp && (
                        <Typography variant="body2" color="primary" gutterBottom sx={{ fontWeight: 'medium' }}>
                          <strong>WAN:</strong> {
                            geraet.oeffentlicheIpTyp === 'statisch' && geraet.statischeOeffentlicheIp ? 
                              geraet.statischeOeffentlicheIp :
                            geraet.oeffentlicheIpTyp === 'dynamisch' && geraet.dyndnsAktiv && geraet.dyndnsAdresse ? 
                              geraet.dyndnsAdresse :
                            geraet.oeffentlicheIpTyp === 'dynamisch' ? 
                              'Dynamisch' : 
                              'Verfügbar'
                          }
                        </Typography>
                      )}
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Ports:</strong> {geraet.anzahlNetzwerkports}
                      </Typography>
                      
                      {geraet.macAdresse && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>MAC:</strong> {geraet.macAdresse}
                        </Typography>
                      )}
                      
                      {geraet.rackPosition?.rack && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Rack:</strong> {geraet.rackPosition.rack} - HE {geraet.rackPosition.einheit}
                        </Typography>
                      )}
                    </CardContent>
                    
                    <CardActions sx={{ justifyContent: 'space-between' }}>
                      <Button 
                        size="small" 
                        startIcon={<ViewIcon />}
                        onClick={() => {
                          setSelectedGeraet(geraet);
                          setDetailDialogOpen(true);
                          ladeGeraeteVerbindungen(geraet.id);
                        }}
                      >
                        Details
                      </Button>
                      <Button 
                        size="small" 
                        startIcon={<EditIcon />}
                        onClick={() => {
                          // Gerät in bearbeitbares Format kopieren mit IP-Konfiguration Migration
                          const bearbeitbaresGeraet = {
                            ...geraet,
                            ipKonfiguration: {
                              typ: geraet.ipKonfiguration?.typ || 'dhcp',
                              ipAdresse: geraet.ipKonfiguration?.ipAdresse || '',
                              netzwerkbereich: geraet.ipKonfiguration?.netzwerkbereich || '',
                            },
                            // Neue IP-Konfigurationen - Migration von Legacy-Daten
                            ipKonfigurationen: migriereAlteFeldZuNeueIPKonfiguration(geraet),
                            oeffentlicheIPKonfigurationen: geraet.oeffentlicheIPKonfigurationen || [],
                            rackPosition: {
                              rack: geraet.rackPosition?.rack || '',
                              einheit: geraet.rackPosition?.einheit || 0,
                            },
                            belegteports: geraet.belegteports || generierePortKonfiguration(geraet.anzahlNetzwerkports, false, [])
                          };
                          setSelectedGeraet(bearbeitbaresGeraet);
                          setBearbeitenDialogOpen(true);
                        }}
                      >
                        Bearbeiten
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            renderTabellenAnsicht()
          )}
        </Paper>
      )}

      {/* Leerer Zustand */}
      {!selectedStandort && !loading && (
        <Box textAlign="center" py={8}>
          <ComputerIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Wählen Sie einen Standort aus
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Wählen Sie oben einen Standort aus, um dessen Geräte zu verwalten.
          </Typography>
        </Box>
      )}

      {/* Dialog für neues Gerät */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Neues Gerät hinzufügen</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={3}>
              {/* Grundlegende Informationen */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Grundlegende Informationen
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  autoFocus
                  label="Gerätename"
                  fullWidth
                  variant="outlined"
                  value={neuGeraet.name}
                  onChange={(e) => setNeuGeraet({ ...neuGeraet, name: e.target.value })}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Standort/Raum"
                  fullWidth
                  variant="outlined"
                  placeholder="z.B. Raum 101, Container A, Technikraum"
                  value={neuGeraet.standortDetails}
                  onChange={(e) => setNeuGeraet({ ...neuGeraet, standortDetails: e.target.value })}
                  helperText="Genaue Standortangabe (Raum, Container, etc.)"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={geraetetypen}
                  value={neuGeraet.geraetetyp}
                  onChange={(event, newValue) => {
                    const geraetetypValue = newValue || '';
                    setNeuGeraet({ ...neuGeraet, geraetetyp: geraetetypValue as GeraeteTyp });
                    handleGeraetetypChange(geraetetypValue);
                    // Hostname automatisch generieren wenn Gerätetyp ausgewählt wird
                    if (geraetetypValue) {
                      generiereHostname(geraetetypValue);
                    }
                  }}
                  onInputChange={(event, newInputValue) => {
                    setNeuGeraet({ ...neuGeraet, geraetetyp: newInputValue as GeraeteTyp });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Gerätetyp"
                      required
                      helperText="Auswählen oder neuen Typ eingeben"
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Hostname"
                  fullWidth
                  variant="outlined"
                  value={neuGeraet.hostname}
                  onChange={(e) => setNeuGeraet({ ...neuGeraet, hostname: e.target.value })}
                  placeholder="Automatisch generiert"
                  helperText="Wird automatisch basierend auf Standort und Gerätetyp generiert"
                  InputProps={{
                    endAdornment: neuGeraet.geraetetyp && (
                      <Button
                        size="small"
                        onClick={() => generiereHostname(neuGeraet.geraetetyp)}
                        sx={{ minWidth: 'auto', px: 1 }}
                      >
                        🔄
                      </Button>
                    )
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Modell"
                  fullWidth
                  variant="outlined"
                  value={neuGeraet.modell}
                  onChange={(e) => setNeuGeraet({ ...neuGeraet, modell: e.target.value })}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Seriennummer"
                  fullWidth
                  variant="outlined"
                  value={neuGeraet.seriennummer}
                  onChange={(e) => setNeuGeraet({ ...neuGeraet, seriennummer: e.target.value })}
                />
              </Grid>

              {/* Netzwerk-Konfiguration */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Netzwerk-Konfiguration
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Anzahl Netzwerkports"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={neuGeraet.anzahlNetzwerkports}
                  onChange={(e) => {
                    const anzahl = parseInt(e.target.value) || 0;
                    const neuePortKonfiguration = generierePortKonfiguration(anzahl);
                    setNeuGeraet({ 
                      ...neuGeraet, 
                      anzahlNetzwerkports: anzahl,
                      portKonfiguration: neuePortKonfiguration,
                      // IP-Konfigurationen zurücksetzen wenn keine Ports
                      ipKonfigurationen: anzahl === 0 ? [] : neuGeraet.ipKonfigurationen
                    });
                  }}
                  inputProps={{ min: 0, max: 48 }}
                  helperText="0 = keine IP-Konfiguration möglich"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="MAC-Adresse"
                  fullWidth
                  variant="outlined"
                  placeholder="00:11:22:33:44:55"
                  value={neuGeraet.macAdresse}
                  onChange={(e) => setNeuGeraet({ ...neuGeraet, macAdresse: e.target.value })}
                />
              </Grid>

              {/* Neue IP-Konfiguration UI */}
              <Grid item xs={12}>
                {renderIPKonfigurationUI(
                  neuGeraet.ipKonfigurationen,
                  (configs) => setNeuGeraet({ ...neuGeraet, ipKonfigurationen: configs }),
                  neuGeraet.anzahlNetzwerkports
                )}
              </Grid>

              {/* Bemerkungen */}
              <Grid item xs={12}>
                <TextField
                  label="Bemerkungen"
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={3}
                  placeholder="Zusätzliche Informationen über das Gerät..."
                  value={neuGeraet.bemerkungen}
                  onChange={(e) => setNeuGeraet({ ...neuGeraet, bemerkungen: e.target.value })}
                />
              </Grid>

              {/* Router-spezifische öffentliche IP-Konfiguration */}
              {neuGeraet.geraetetyp === 'Router' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Öffentliche IP-Konfiguration (nur Router)
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                  </Grid>

                  {/* Neue erweiterte öffentliche IP-Konfiguration */}
                  <Grid item xs={12}>
                    {renderOeffentlicheIPKonfigurationUI(
                      neuGeraet.oeffentlicheIPKonfigurationen,
                      (configs) => setNeuGeraet({ ...neuGeraet, oeffentlicheIPKonfigurationen: configs })
                    )}
                  </Grid>
                </>
              )}

              {/* Port-Konfiguration anzeigen wenn Ports vorhanden */}
              {neuGeraet.anzahlNetzwerkports > 0 && (
                <Grid item xs={12}>
                  {renderPortKonfiguration(neuGeraet.portKonfiguration, false)}
                </Grid>
              )}

              {/* Rack-Position */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Rack-Position (optional)
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Rack-Name"
                  fullWidth
                  variant="outlined"
                  placeholder="Serverschrank A"
                  value={neuGeraet.rackPosition.rack}
                  onChange={(e) => setNeuGeraet({
                    ...neuGeraet,
                    rackPosition: { ...neuGeraet.rackPosition, rack: e.target.value }
                  })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Höheneinheit (HE)"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={neuGeraet.rackPosition.einheit || ''}
                  onChange={(e) => setNeuGeraet({
                    ...neuGeraet,
                    rackPosition: { ...neuGeraet.rackPosition, einheit: parseInt(e.target.value) || 0 }
                  })}
                  inputProps={{ min: 1, max: 42 }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={erstelleGeraet}
            variant="contained"
            disabled={!neuGeraet.name || !neuGeraet.geraetetyp || !neuGeraet.modell}
          >
            Gerät erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog für Geräte-Details */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Geräte-Details: {selectedGeraet?.name}
        </DialogTitle>
        <DialogContent>
          {selectedGeraet && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Gerätetyp
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedGeraet.geraetetyp}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Modell
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedGeraet.modell}
                  </Typography>
                </Grid>
                
                {selectedGeraet.seriennummer && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Seriennummer
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedGeraet.seriennummer}
                    </Typography>
                  </Grid>
                )}
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Anzahl Ports
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedGeraet.anzahlNetzwerkports}
                  </Typography>
                </Grid>
                
                {selectedGeraet.ipKonfiguration && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        IP-Konfiguration
                      </Typography>
                      <Divider />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        IP-Typ
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {selectedGeraet.ipKonfiguration.typ === 'dhcp' ? 'DHCP' : 'Statische IP'}
                      </Typography>
                    </Grid>
                    
                    {selectedGeraet.ipKonfiguration.ipAdresse && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          LAN IP-Adresse
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {selectedGeraet.ipKonfiguration.ipAdresse}
                        </Typography>
                      </Grid>
                    )}
                    
                    {selectedGeraet.ipKonfiguration.netzwerkbereich && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Netzwerkbereich
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {selectedGeraet.ipKonfiguration.netzwerkbereich}
                        </Typography>
                      </Grid>
                    )}
                    
                    {/* Router öffentliche IP-Konfiguration */}
                    {selectedGeraet.geraetetyp === 'Router' && (
                      <>
                        <Grid item xs={12}>
                          <Typography variant="subtitle1" gutterBottom sx={{ mt: 1, fontWeight: 'medium' }}>
                            Öffentliche IP-Konfiguration
                          </Typography>
                        </Grid>
                        
                        {selectedGeraet.hatOeffentlicheIp ? (
                          <>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="subtitle2" color="text.secondary">
                                WAN IP-Typ
                              </Typography>
                              <Typography variant="body1" gutterBottom>
                                {selectedGeraet.oeffentlicheIpTyp === 'statisch' ? 'Statische IP' : 'Dynamische IP'}
                              </Typography>
                            </Grid>
                            
                            {selectedGeraet.oeffentlicheIpTyp === 'statisch' && selectedGeraet.statischeOeffentlicheIp && (
                              <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">
                                  Statische WAN IP
                                </Typography>
                                <Typography variant="body1" gutterBottom color="primary">
                                  {selectedGeraet.statischeOeffentlicheIp}
                                </Typography>
                              </Grid>
                            )}
                            
                            {selectedGeraet.oeffentlicheIpTyp === 'dynamisch' && selectedGeraet.dyndnsAktiv && selectedGeraet.dyndnsAdresse && (
                              <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">
                                  DynDNS-Adresse
                                </Typography>
                                <Typography variant="body1" gutterBottom color="primary">
                                  {selectedGeraet.dyndnsAdresse}
                                </Typography>
                              </Grid>
                            )}
                          </>
                        ) : (
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              Keine öffentliche IP konfiguriert
                            </Typography>
                          </Grid>
                        )}
                      </>
                    )}
                  </>
                )}
                
                {selectedGeraet.macAdresse && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      MAC-Adresse
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedGeraet.macAdresse}
                    </Typography>
                  </Grid>
                )}
                
                {selectedGeraet.rackPosition?.rack && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        Rack-Position
                      </Typography>
                      <Divider />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Rack
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {selectedGeraet.rackPosition.rack}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Höheneinheit (HE)
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {selectedGeraet.rackPosition.einheit}
                      </Typography>
                    </Grid>
                  </>
                )}
                
                {/* Port-Belegung und Verbindungen */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Port-Belegung und Verbindungen
                  </Typography>
                  <Divider />
                </Grid>
                
                <Grid item xs={12}>
                  {verbindungenLoading ? (
                    <Box display="flex" justifyContent="center" p={3}>
                      <CircularProgress size={24} />
                      <Typography variant="body2" sx={{ ml: 2 }}>
                        Lade Verbindungen...
                      </Typography>
                    </Box>
                  ) : geraeteVerbindungen.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Port</strong></TableCell>
                            <TableCell><strong>Verbunden mit</strong></TableCell>
                            <TableCell><strong>Remote Port</strong></TableCell>
                            <TableCell><strong>Kabeltyp</strong></TableCell>
                            <TableCell><strong>Bemerkungen</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {geraeteVerbindungen.map((verbindung) => (
                            <TableRow key={verbindung.id}>
                              <TableCell>
                                <Box display="flex" alignItems="center">
                                  <Chip 
                                    label={`Port ${verbindung.eigener_port}`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                  {/* Port-Label anzeigen falls vorhanden */}
                                  {(() => {
                                    const port = selectedGeraet.belegteports?.find(p => p.portNummer === verbindung.eigener_port);
                                    if (port?.label) {
                                      return (
                                        <Chip 
                                          label={port.label}
                                          size="small"
                                          color="secondary"
                                          variant="outlined"
                                          sx={{ ml: 1 }}
                                        />
                                      );
                                    }
                                    return null;
                                  })()}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {verbindung.verbundenes_geraet_name}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={`Port ${verbindung.verbundener_port}`}
                                  size="small"
                                  variant="outlined"
                                />
                                {/* Remote-Port-Label anzeigen falls vorhanden */}
                                {verbindung.remote_port_label && (
                                  <Chip 
                                    label={verbindung.remote_port_label}
                                    size="small"
                                    color="secondary"
                                    variant="outlined"
                                    sx={{ ml: 1 }}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={verbindung.kabeltyp}
                                  size="small"
                                  sx={{
                                    backgroundColor: getKabelFarbe(verbindung.kabeltyp),
                                    color: 'white',
                                    fontWeight: 500,
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {verbindung.bemerkungen || '-'}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Box textAlign="center" py={4}>
                      <Typography variant="body2" color="text.secondary">
                        Keine Verbindungen vorhanden
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Alle {selectedGeraet?.anzahlNetzwerkports || 0} Ports sind frei
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDetailDialogOpen(false);
            setGeraeteVerbindungen([]);
          }}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog für Geräte-Bearbeitung */}
      <Dialog 
        open={bearbeitenDialogOpen} 
        onClose={() => setBearbeitenDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Gerät bearbeiten: {selectedGeraet?.name}
        </DialogTitle>
        <DialogContent>
          {selectedGeraet && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={3}>
                {/* Grundlegende Informationen */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Grundlegende Informationen
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    autoFocus
                    label="Gerätename"
                    fullWidth
                    variant="outlined"
                    value={selectedGeraet.name}
                    onChange={(e) => setSelectedGeraet({ ...selectedGeraet, name: e.target.value })}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Hostname"
                    fullWidth
                    variant="outlined"
                    value={selectedGeraet.hostname || ''}
                    onChange={(e) => setSelectedGeraet({ ...selectedGeraet, hostname: e.target.value })}
                    placeholder="Automatisch generiert"
                    helperText="Wird automatisch basierend auf Standort und Gerätetyp generiert"
                    InputProps={{
                      endAdornment: selectedGeraet.geraetetyp && (
                        <Button
                          size="small"
                          onClick={() => generiereHostnameForEdit(selectedGeraet.geraetetyp)}
                          sx={{ minWidth: 'auto', px: 1 }}
                        >
                          🔄
                        </Button>
                      )
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Standort/Raum"
                    fullWidth
                    variant="outlined"
                    placeholder="z.B. Raum 101, Container A, Technikraum"
                    value={selectedGeraet.standortDetails || ''}
                    onChange={(e) => setSelectedGeraet({ ...selectedGeraet, standortDetails: e.target.value })}
                    helperText="Genaue Standortangabe (Raum, Container, etc.)"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    freeSolo
                    options={geraetetypen}
                    value={selectedGeraet.geraetetyp}
                                      onChange={(event, newValue) => {
                    const geraetetypValue = newValue || '';
                    setSelectedGeraet({ ...selectedGeraet, geraetetyp: geraetetypValue as GeraeteTyp });
                    handleGeraetetypChange(geraetetypValue);
                    // Hostname automatisch regenerieren wenn Gerätetyp geändert wird (nur wenn noch kein Hostname vorhanden)
                    if (geraetetypValue && !selectedGeraet.hostname) {
                      generiereHostnameForEdit(geraetetypValue);
                    }
                  }}
                    onInputChange={(event, newInputValue) => {
                      setSelectedGeraet({ ...selectedGeraet, geraetetyp: newInputValue as GeraeteTyp });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Gerätetyp"
                        required
                        helperText="Auswählen oder neuen Typ eingeben"
                      />
                    )}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Modell"
                    fullWidth
                    variant="outlined"
                    value={selectedGeraet.modell}
                    onChange={(e) => setSelectedGeraet({ ...selectedGeraet, modell: e.target.value })}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Seriennummer"
                    fullWidth
                    variant="outlined"
                    value={selectedGeraet.seriennummer || ''}
                    onChange={(e) => setSelectedGeraet({ ...selectedGeraet, seriennummer: e.target.value })}
                  />
                </Grid>

                {/* Netzwerk-Konfiguration */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Netzwerk-Konfiguration
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Anzahl Netzwerkports"
                    type="number"
                    fullWidth
                    variant="outlined"
                    value={selectedGeraet.anzahlNetzwerkports}
                    onChange={(e) => {
                      const anzahl = parseInt(e.target.value) || 0;
                      const neuePortKonfiguration = generierePortKonfiguration(anzahl, true, selectedGeraet.belegteports);
                      setSelectedGeraet({ 
                        ...selectedGeraet, 
                        anzahlNetzwerkports: anzahl,
                        // IP-Konfigurationen zurücksetzen wenn keine Ports
                        ipKonfigurationen: anzahl === 0 ? [] : selectedGeraet.ipKonfigurationen || [],
                        belegteports: neuePortKonfiguration.map(p => ({
                          portNummer: p.portNummer,
                          portTyp: p.portTyp,
                          geschwindigkeit: p.geschwindigkeit,
                          belegt: selectedGeraet.belegteports?.find(bp => bp.portNummer === p.portNummer)?.belegt || false,
                          verbindungId: selectedGeraet.belegteports?.find(bp => bp.portNummer === p.portNummer)?.verbindungId,
                          beschreibung: selectedGeraet.belegteports?.find(bp => bp.portNummer === p.portNummer)?.beschreibung || '',
                        }))
                      });
                    }}
                    inputProps={{ min: 0, max: 48 }}
                    helperText="0 = keine IP-Konfiguration möglich"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="MAC-Adresse"
                    fullWidth
                    variant="outlined"
                    placeholder="00:11:22:33:44:55"
                    value={selectedGeraet.macAdresse || ''}
                    onChange={(e) => setSelectedGeraet({ ...selectedGeraet, macAdresse: e.target.value })}
                  />
                </Grid>

                {/* Neue IP-Konfiguration UI */}
                <Grid item xs={12}>
                  {renderIPKonfigurationUI(
                    selectedGeraet.ipKonfigurationen || [],
                    (configs) => setSelectedGeraet({ ...selectedGeraet, ipKonfigurationen: configs }),
                    selectedGeraet.anzahlNetzwerkports
                  )}
                </Grid>

                {/* Bemerkungen */}
                <Grid item xs={12}>
                  <TextField
                    label="Bemerkungen"
                    fullWidth
                    variant="outlined"
                    multiline
                    rows={3}
                    placeholder="Zusätzliche Informationen über das Gerät..."
                    value={selectedGeraet.bemerkungen || ''}
                    onChange={(e) => setSelectedGeraet({ ...selectedGeraet, bemerkungen: e.target.value })}
                  />
                </Grid>

                {/* Router-spezifische öffentliche IP-Konfiguration */}
                {selectedGeraet.geraetetyp === 'Router' && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        Öffentliche IP-Konfiguration (nur Router)
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                    </Grid>

                    <Grid item xs={12}>
                                             <FormControlLabel
                         control={
                           <input
                             type="checkbox"
                             checked={selectedGeraet.hatOeffentlicheIp || false}
                             onChange={(e) => setSelectedGeraet({ ...selectedGeraet, hatOeffentlicheIp: e.target.checked })}
                             style={{ 
                               accentColor: darkMode ? '#90caf9' : '#1976d2',
                               transform: 'scale(1.2)'
                             }}
                           />
                         }
                         label="Hat öffentliche IP-Adresse"
                       />
                    </Grid>

                    {selectedGeraet.hatOeffentlicheIp && (
                      <>
                        <Grid item xs={12}>
                          <FormControl component="fieldset">
                            <FormLabel component="legend">Öffentliche IP-Typ</FormLabel>
                            <RadioGroup
                              row
                              value={selectedGeraet.oeffentlicheIpTyp || 'dynamisch'}
                              onChange={(e) => setSelectedGeraet({
                                ...selectedGeraet,
                                oeffentlicheIpTyp: e.target.value as 'dynamisch' | 'statisch'
                              })}
                            >
                              <FormControlLabel value="dynamisch" control={<Radio />} label="Dynamische IP" />
                              <FormControlLabel value="statisch" control={<Radio />} label="Statische IP" />
                            </RadioGroup>
                          </FormControl>
                        </Grid>

                        {selectedGeraet.oeffentlicheIpTyp === 'dynamisch' && (
                          <>
                            <Grid item xs={12}>
                                                             <FormControlLabel
                                 control={
                                   <input
                                     type="checkbox"
                                     checked={selectedGeraet.dyndnsAktiv || false}
                                     onChange={(e) => setSelectedGeraet({ ...selectedGeraet, dyndnsAktiv: e.target.checked })}
                                     style={{ 
                                       accentColor: darkMode ? '#90caf9' : '#1976d2',
                                       transform: 'scale(1.2)'
                                     }}
                                   />
                                 }
                                 label="DynDNS verwenden"
                               />
                            </Grid>

                            {selectedGeraet.dyndnsAktiv && (
                              <Grid item xs={12}>
                                <TextField
                                  label="DynDNS-Adresse"
                                  fullWidth
                                  variant="outlined"
                                  placeholder="beispiel.dyndns.org"
                                  value={selectedGeraet.dyndnsAdresse || ''}
                                  onChange={(e) => setSelectedGeraet({ ...selectedGeraet, dyndnsAdresse: e.target.value })}
                                />
                              </Grid>
                            )}
                          </>
                        )}

                        {selectedGeraet.oeffentlicheIpTyp === 'statisch' && (
                          <Grid item xs={12}>
                            <TextField
                              label="Statische öffentliche IP-Adresse"
                              fullWidth
                              variant="outlined"
                              placeholder="203.0.113.1"
                              value={selectedGeraet.statischeOeffentlicheIp || ''}
                              onChange={(e) => setSelectedGeraet({ ...selectedGeraet, statischeOeffentlicheIp: e.target.value })}
                            />
                          </Grid>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* Port-Konfiguration anzeigen wenn Ports vorhanden */}
                {selectedGeraet.anzahlNetzwerkports > 0 && (
                  <Grid item xs={12}>
                    {renderPortKonfiguration(selectedGeraet.belegteports || [], true)}
                  </Grid>
                )}

                {/* Rack-Position */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Rack-Position (optional)
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Rack-Name"
                    fullWidth
                    variant="outlined"
                    placeholder="Serverschrank A"
                    value={selectedGeraet.rackPosition?.rack || ''}
                    onChange={(e) => setSelectedGeraet({
                      ...selectedGeraet,
                      rackPosition: { 
                        rack: e.target.value,
                        einheit: selectedGeraet.rackPosition?.einheit || 0
                      }
                    })}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Höheneinheit (HE)"
                    type="number"
                    fullWidth
                    variant="outlined"
                    value={selectedGeraet.rackPosition?.einheit || ''}
                    onChange={(e) => setSelectedGeraet({
                      ...selectedGeraet,
                      rackPosition: { 
                        rack: selectedGeraet.rackPosition?.rack || '',
                        einheit: parseInt(e.target.value) || 0 
                      }
                    })}
                    inputProps={{ min: 1, max: 42 }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBearbeitenDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={aktualisiereGeraet}
            variant="contained"
            disabled={!selectedGeraet?.name || !selectedGeraet?.geraetetyp || !selectedGeraet?.modell}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GeraeteVerwaltung; 