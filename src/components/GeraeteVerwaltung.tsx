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
} from '@mui/material';
import {
  Add as AddIcon,
  Router as RouterIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Computer as ComputerIcon,
  Dns as ModemIcon,
} from '@mui/icons-material';
import { Geraet, GeraeteTyp, Standort, PortTyp, PortBelegung } from '../types';
import { ThemeContext } from '../App';

const GeraeteVerwaltung: React.FC = () => {
  const theme = useTheme();
  const { darkMode } = useContext(ThemeContext);
  
  const [standorte, setStandorte] = useState<Standort[]>([]);
  const [selectedStandort, setSelectedStandort] = useState<string>('');
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
  const [neuGeraet, setNeuGeraet] = useState({
    name: '',
    geraetetyp: '' as GeraeteTyp,
    modell: '',
    seriennummer: '',
    standortDetails: '',
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
  });

  // Daten laden
  const ladeStandorte = async () => {
    try {
      const response = await fetch('/api/standorte');
      const data = await response.json();
      if (data.success) {
        setStandorte(data.data);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Standorte:', err);
    }
  };

  const ladeGeraetetypen = async () => {
    try {
      const response = await fetch('/api/geraetetypen');
      const data = await response.json();
      if (data.success) {
        setGeraetetypen(data.data);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Gerätetypen:', err);
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
        setError('Bitte wählen Sie zuerst einen Standort aus');
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
      geraetetyp: '' as GeraeteTyp,
      modell: '',
      seriennummer: '',
      standortDetails: '',
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

  useEffect(() => {
    ladeStandorte();
    ladeGeraetetypen();
  }, []);

  useEffect(() => {
    if (selectedStandort) {
      ladeGeraete(selectedStandort);
    }
  }, [selectedStandort]);

  return (
    <Box>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Geräte-Verwaltung
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Verwalten Sie alle Netzwerkgeräte an Ihren Standorten
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Standort auswählen</InputLabel>
              <Select
                value={selectedStandort}
                onChange={(e) => setSelectedStandort(e.target.value)}
                label="Standort auswählen"
              >
                {standorte.map((standort) => (
                  <MenuItem key={standort.id} value={standort.id}>
                    {standort.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              disabled={!selectedStandort}
              size="large"
            >
              Neues Gerät
            </Button>
          </Box>
        </Box>
      </Paper>

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
      {selectedStandort && !loading && (
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Geräte am Standort: {standorte.find(s => s.id === selectedStandort)?.name}
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
          ) : (
            <Grid container spacing={2}>
              {geraete.map((geraet) => (
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
                          <strong>IP:</strong> {geraet.ipKonfiguration.ipAdresse}
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
                        Bearbeiten
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
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
                <FormControl fullWidth required>
                  <InputLabel>Gerätetyp</InputLabel>
                  <Select
                    value={neuGeraet.geraetetyp}
                    onChange={(e) => setNeuGeraet({ ...neuGeraet, geraetetyp: e.target.value as GeraeteTyp })}
                    label="Gerätetyp"
                  >
                    {geraetetypen.map((typ) => (
                      <MenuItem key={typ} value={typ}>
                        {typ}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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

              {/* IP-Konfiguration */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Netzwerk-Konfiguration
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">IP-Adress-Typ</FormLabel>
                  <RadioGroup
                    row
                    value={neuGeraet.ipKonfiguration.typ}
                    onChange={(e) => setNeuGeraet({
                      ...neuGeraet,
                      ipKonfiguration: { ...neuGeraet.ipKonfiguration, typ: e.target.value as 'dhcp' | 'statisch' }
                    })}
                  >
                    <FormControlLabel value="dhcp" control={<Radio />} label="DHCP" />
                    <FormControlLabel value="statisch" control={<Radio />} label="Statische IP" />
                  </RadioGroup>
                </FormControl>
              </Grid>
              
              {neuGeraet.ipKonfiguration.typ === 'statisch' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="IP-Adresse"
                      fullWidth
                      variant="outlined"
                      placeholder="192.168.1.100"
                      value={neuGeraet.ipKonfiguration.ipAdresse}
                      onChange={(e) => setNeuGeraet({
                        ...neuGeraet,
                        ipKonfiguration: { ...neuGeraet.ipKonfiguration, ipAdresse: e.target.value }
                      })}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Netzwerkbereich"
                      fullWidth
                      variant="outlined"
                      placeholder="192.168.1.0/24"
                      value={neuGeraet.ipKonfiguration.netzwerkbereich}
                      onChange={(e) => setNeuGeraet({
                        ...neuGeraet,
                        ipKonfiguration: { ...neuGeraet.ipKonfiguration, netzwerkbereich: e.target.value }
                      })}
                    />
                  </Grid>
                </>
              )}
              
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
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Anzahl Netzwerkports"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={neuGeraet.anzahlNetzwerkports}
                  onChange={(e) => {
                    const anzahl = parseInt(e.target.value) || 0;
                    const neuePortKonfiguration = generierePortKonfiguration(anzahl, false, neuGeraet.portKonfiguration);
                    setNeuGeraet({ 
                      ...neuGeraet, 
                      anzahlNetzwerkports: anzahl,
                      portKonfiguration: neuePortKonfiguration
                    });
                  }}
                  inputProps={{ min: 0, max: 48 }}
                />
              </Grid>

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
                          IP-Adresse
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
                  <FormControl fullWidth required>
                    <InputLabel>Gerätetyp</InputLabel>
                    <Select
                      value={selectedGeraet.geraetetyp}
                      onChange={(e) => setSelectedGeraet({ ...selectedGeraet, geraetetyp: e.target.value as GeraeteTyp })}
                      label="Gerätetyp"
                    >
                      {geraetetypen.map((typ) => (
                        <MenuItem key={typ} value={typ}>
                          {typ}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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

                {/* IP-Konfiguration */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Netzwerk-Konfiguration
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">IP-Adress-Typ</FormLabel>
                    <RadioGroup
                      row
                      value={selectedGeraet.ipKonfiguration?.typ || 'dhcp'}
                      onChange={(e) => setSelectedGeraet({
                        ...selectedGeraet,
                        ipKonfiguration: { 
                          ...selectedGeraet.ipKonfiguration, 
                          typ: e.target.value as 'dhcp' | 'statisch' 
                        }
                      })}
                    >
                      <FormControlLabel value="dhcp" control={<Radio />} label="DHCP" />
                      <FormControlLabel value="statisch" control={<Radio />} label="Statische IP" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                
                {selectedGeraet.ipKonfiguration?.typ === 'statisch' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="IP-Adresse"
                        fullWidth
                        variant="outlined"
                        placeholder="192.168.1.100"
                        value={selectedGeraet.ipKonfiguration?.ipAdresse || ''}
                        onChange={(e) => setSelectedGeraet({
                          ...selectedGeraet,
                          ipKonfiguration: { 
                            ...selectedGeraet.ipKonfiguration, 
                            ipAdresse: e.target.value 
                          }
                        })}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Netzwerkbereich"
                        fullWidth
                        variant="outlined"
                        placeholder="192.168.1.0/24"
                        value={selectedGeraet.ipKonfiguration?.netzwerkbereich || ''}
                        onChange={(e) => setSelectedGeraet({
                          ...selectedGeraet,
                          ipKonfiguration: { 
                            ...selectedGeraet.ipKonfiguration, 
                            netzwerkbereich: e.target.value 
                          }
                        })}
                      />
                    </Grid>
                  </>
                )}
                
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
                  />
                </Grid>

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