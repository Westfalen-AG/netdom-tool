import React, { useState, useEffect, useContext } from 'react';
import {
  Paper,
  Typography,
  Button,
  Grid,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  Chip,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Cable as CableIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { Geraet, Standort, Kabeltyp } from '../types';
import { StandortContext } from '../App';

const VerbindungsVerwaltung: React.FC = () => {
  const { selectedStandort, selectedStandortData } = useContext(StandortContext);
  
  const [verbindungen, setVerbindungen] = useState<any[]>([]);
  const [geraete, setGeraete] = useState<Geraet[]>([]);
  const [kabeltypen, setKabeltypen] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bearbeitenDialogOpen, setBearbeitenDialogOpen] = useState(false);
  const [selectedVerbindung, setSelectedVerbindung] = useState<any>(null);
  const [neuVerbindung, setNeuVerbindung] = useState({
    quellGeraetId: '',
    quellPort: 1,
    zielGeraetId: '',
    zielPort: 1,
    kabeltyp: '' as Kabeltyp,
    kabeleigenschaften: {
      laenge: 0,
      farbe: '',
      kategorie: '',
    },
    bemerkungen: '',
  });

  // Daten laden
  const ladeKabeltypen = async () => {
    try {
      const response = await fetch('/api/kabeltypen');
      const data = await response.json();
      if (data.success) {
        setKabeltypen(data.data);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Kabeltypen:', err);
    }
  };

  const ladeGeraete = async (standortId: string) => {
    try {
      const response = await fetch(`/api/standorte/${standortId}/geraete`);
      const data = await response.json();
      if (data.success) {
        setGeraete(data.data);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Geräte:', err);
    }
  };

  const ladeVerbindungen = async (standortId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/standorte/${standortId}/verbindungen`);
      const data = await response.json();
      
      if (data.success) {
        setVerbindungen(data.data);
      } else {
        setError(data.error || 'Fehler beim Laden der Verbindungen');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Laden der Verbindungen:', err);
    } finally {
      setLoading(false);
    }
  };

  // Neue Verbindung erstellen
  const erstelleVerbindung = async () => {
    try {
      if (!selectedStandort) {
        setError('Kein Standort ausgewählt');
        return;
      }

      const response = await fetch(`/api/standorte/${selectedStandort}/verbindungen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(neuVerbindung),
      });

      const data = await response.json();
      
      if (data.success) {
        setDialogOpen(false);
        resetForm();
        ladeVerbindungen(selectedStandort);
        ladeGeraete(selectedStandort); // Neu laden für aktualisierte Port-Status
      } else {
        setError(data.error || 'Fehler beim Erstellen der Verbindung');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Erstellen der Verbindung:', err);
    }
  };

  // Verbindung löschen
  const loescheVerbindung = async (verbindungId: string) => {
    try {
      const response = await fetch(`/api/verbindungen/${verbindungId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        ladeVerbindungen(selectedStandort);
        ladeGeraete(selectedStandort); // Neu laden für aktualisierte Port-Status
      } else {
        setError(data.error || 'Fehler beim Löschen der Verbindung');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Löschen der Verbindung:', err);
    }
  };

  // Verbindung aktualisieren
  const aktualisiereVerbindung = async () => {
    try {
      if (!selectedVerbindung) return;

      const response = await fetch(`/api/verbindungen/${selectedVerbindung.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kabeltyp: selectedVerbindung.kabeltyp,
          kabeleigenschaften: {
            laenge: selectedVerbindung.kabel_laenge,
            farbe: selectedVerbindung.kabel_farbe,
            kategorie: selectedVerbindung.kabel_kategorie,
          },
          bemerkungen: selectedVerbindung.bemerkungen,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setBearbeitenDialogOpen(false);
        setSelectedVerbindung(null);
        ladeVerbindungen(selectedStandort);
      } else {
        setError(data.error || 'Fehler beim Aktualisieren der Verbindung');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Aktualisieren der Verbindung:', err);
    }
  };

  const resetForm = () => {
    setNeuVerbindung({
      quellGeraetId: '',
      quellPort: 1,
      zielGeraetId: '',
      zielPort: 1,
      kabeltyp: '' as Kabeltyp,
      kabeleigenschaften: {
        laenge: 0,
        farbe: '',
        kategorie: '',
      },
      bemerkungen: '',
    });
  };

  // Verfügbare Ports für ein Gerät ermitteln (berücksichtigt Stack-Ports)
  const getVerfuegbarePorts = (geraetId: string): number[] => {
    const geraet = geraete.find(g => g.id === geraetId);
    if (!geraet) return [];

    const verfuegbarePorts: number[] = [];
    for (let i = 1; i <= geraet.anzahlNetzwerkports; i++) {
      const portBelegt = geraet.belegteports?.some(p => p.portNummer === i && p.belegt);
      if (!portBelegt) {
        verfuegbarePorts.push(i);
      }
    }
    return verfuegbarePorts;
  };

  const getVerfuegbarePortsWithLabels = (geraetId: string): Array<{port: number, label?: string}> => {
    const geraet = geraete.find(g => g.id === geraetId);
    if (!geraet) return [];

    const verfuegbarePorts: Array<{port: number, label?: string}> = [];
    for (let i = 1; i <= geraet.anzahlNetzwerkports; i++) {
      const portBelegt = geraet.belegteports?.some(p => p.portNummer === i && p.belegt);
      if (!portBelegt) {
        const portInfo = geraet.belegteports?.find(p => p.portNummer === i);
        verfuegbarePorts.push({
          port: i,
          label: portInfo?.label || undefined
        });
      }
    }
    return verfuegbarePorts;
  };

  const getPortAnzeige = (geraetId: string, portNummer: number): string => {
    const geraet = geraete.find(g => g.id === geraetId);
    if (!geraet) return `Port ${portNummer}`;
    
    const portInfo = geraet.belegteports?.find(p => p.portNummer === portNummer);
    return portInfo?.label ? `Port ${portNummer} (${portInfo.label})` : `Port ${portNummer}`;
  };

  // Port-Bezeichnung für Stack-Geräte (für spätere Verwendung vorbereitet)
  // const getPortBezeichnung = (geraetId: string, portNummer: number): string => {
  //   const geraet = geraete.find(g => g.id === geraetId);
  //   if (!geraet || geraet.geraetetyp !== 'Switch') {
  //     return `Port ${portNummer}`;
  //   }
  //   // TODO: Hier könnte Stack-Info abgerufen werden für Stack-Port-Bezeichnungen wie "1:24"
  //   return `Port ${portNummer}`;
  // };

  const getKabelFarbe = (kabeltyp: string): string => {
    const farbMap: Record<string, string> = {
      'RJ45': '#2196f3',           // Blau für RJ45
      'SFP/SFP+': '#ff9800',       // Orange für SFP/SFP+
      'Coax': '#9c27b0',           // Lila für Coax
      'Sonstiges': '#607d8b',      // Grau für Sonstiges
      
      // Rückwärtskompatibilität für alte Einträge
      'RJ45 Cat5e': '#2196f3',
      'RJ45 Cat6': '#2196f3',
      'RJ45 Cat6a': '#2196f3',
      'Fibre Singlemode': '#ff9800',
      'Fibre Multimode': '#ff9800',
      
      // Profinet-Kabel (grüne Töne für Industrial Ethernet)
      'Profinet Standard': '#2e7d32',
      'Profinet Fast Connect': '#388e3c',
      'Profinet Robust': '#43a047',
      'Profinet Marine': '#4caf50',
      // M12/M8 Industriesteckverbindungen (blaue Töne)
      'M12 4-polig': '#1976d2',
      'M12 8-polig': '#1565c0',
      'M8 3-polig': '#0d47a1',
      'M8 4-polig': '#0277bd',
    };
    return farbMap[kabeltyp] || '#607d8b';
  };

  useEffect(() => {
    ladeKabeltypen();
  }, []);

  useEffect(() => {
    if (selectedStandort) {
      ladeVerbindungen(selectedStandort);
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
            Bitte wählen Sie einen Standort in der oberen Navigationsleiste aus, um Verbindungen zu verwalten.
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
              Verbindungs-Verwaltung: {selectedStandortData?.name}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Verwalten Sie alle Kabelverbindungen zwischen den Geräten am ausgewählten Standort
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            disabled={geraete.length < 2}
            size="large"
          >
            Neue Verbindung
          </Button>
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

      {/* Verbindungen-Tabelle */}
      {!loading && (
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Verbindungen am Standort: {selectedStandortData?.name}
          </Typography>
          
          {verbindungen.length === 0 ? (
            <Box textAlign="center" py={6}>
              <CableIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Noch keine Verbindungen vorhanden
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {geraete.length < 2 
                  ? 'Sie benötigen mindestens 2 Geräte, um Verbindungen zu erstellen.'
                  : 'Erstellen Sie die erste Verbindung zwischen Ihren Geräten.'
                }
              </Typography>
              {geraete.length >= 2 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setDialogOpen(true)}
                >
                  Erste Verbindung erstellen
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Quell-Gerät</TableCell>
                    <TableCell>Port</TableCell>
                    <TableCell>→</TableCell>
                    <TableCell>Ziel-Gerät</TableCell>
                    <TableCell>Port</TableCell>
                    <TableCell>Kabeltyp</TableCell>
                    <TableCell>Länge</TableCell>
                    <TableCell>Eigenschaften</TableCell>
                    <TableCell>Bemerkungen</TableCell>
                    <TableCell>Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {verbindungen.map((verbindung) => (
                    <TableRow key={verbindung.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {verbindung.bemerkungen?.includes('Stack-Verbindung:') && (
                            <Chip 
                              label="Stack" 
                              size="small" 
                              color="secondary" 
                              sx={{ fontSize: '0.7rem' }}
                            />
                          )}
                          <Typography variant="body2" fontWeight="medium">
                            {verbindung.quell_geraet_name || verbindung.quellGeraetName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={verbindung.quell_geraet_id ? 
                            getPortAnzeige(verbindung.quell_geraet_id, verbindung.quell_port || verbindung.quellPort) : 
                            `Port ${verbindung.quell_port || verbindung.quellPort}`} 
                          size="small" 
                          variant="outlined" 
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <CableIcon color="action" />
                          {verbindung.bemerkungen?.includes('Stack-Verbindung:') && (
                            <Chip 
                              label="Stack" 
                              size="small" 
                              color="secondary" 
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {verbindung.bemerkungen?.includes('Stack-Verbindung:') && (
                            <Chip 
                              label="Stack" 
                              size="small" 
                              color="secondary" 
                              sx={{ fontSize: '0.7rem' }}
                            />
                          )}
                          <Typography variant="body2" fontWeight="medium">
                            {verbindung.ziel_geraet_name || verbindung.zielGeraetName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={verbindung.ziel_geraet_id ? 
                            getPortAnzeige(verbindung.ziel_geraet_id, verbindung.ziel_port || verbindung.zielPort) : 
                            `Port ${verbindung.ziel_port || verbindung.zielPort}`} 
                          size="small" 
                          variant="outlined" 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={verbindung.kabeltyp}
                          size="small"
                          sx={{
                            backgroundColor: getKabelFarbe(verbindung.kabeltyp),
                            color: 'white',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {verbindung.kabel_laenge ? `${verbindung.kabel_laenge}m` : '-'}
                      </TableCell>
                      <TableCell>
                        <Box>
                          {verbindung.kabel_farbe && (
                            <Typography variant="caption" display="block">
                              Farbe: {verbindung.kabel_farbe}
                            </Typography>
                          )}
                          {verbindung.kabel_kategorie && (
                            <Typography variant="caption" display="block">
                              Kategorie: {verbindung.kabel_kategorie}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {verbindung.bemerkungen || '-'}
                          {verbindung.bemerkungen?.includes('Stack-Verbindung:') && (
                            <Chip 
                              label="Stack" 
                              size="small" 
                              color="secondary" 
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', ml: 1 }}
                            />
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          {verbindung.bemerkungen?.includes('Stack-Verbindung:') ? (
                            <>
                              <Tooltip title="Stack-Verbindungen können nur über die Stack-Verwaltung bearbeitet werden">
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled
                                    sx={{ color: 'text.disabled' }}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Stack-Verbindungen können nur über die Stack-Verwaltung gelöscht werden">
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled
                                    sx={{ color: 'text.disabled' }}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </>
                          ) : (
                            <>
                              <Tooltip title="Verbindung bearbeiten">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    setSelectedVerbindung({
                                      ...verbindung,
                                      bemerkungen: verbindung.bemerkungen || ''
                                    });
                                    setBearbeitenDialogOpen(true);
                                  }}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Verbindung löschen">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => loescheVerbindung(verbindung.id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Leerer Zustand */}
      {!selectedStandort && !loading && (
        <Box textAlign="center" py={8}>
          <CableIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Wählen Sie einen Standort aus
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Wählen Sie oben einen Standort aus, um dessen Verbindungen zu verwalten.
          </Typography>
        </Box>
      )}

      {/* Dialog für neue Verbindung */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Neue Verbindung erstellen</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={3}>
              {/* Quell-Gerät */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Quell-Gerät
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Quell-Gerät</InputLabel>
                  <Select
                    value={neuVerbindung.quellGeraetId}
                    onChange={(e) => setNeuVerbindung({ ...neuVerbindung, quellGeraetId: e.target.value, quellPort: 1 })}
                    label="Quell-Gerät"
                  >
                    {geraete.map((geraet) => (
                      <MenuItem key={geraet.id} value={geraet.id}>
                        {geraet.name} ({geraet.geraetetyp})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required disabled={!neuVerbindung.quellGeraetId}>
                  <InputLabel>Quell-Port</InputLabel>
                  <Select
                    value={neuVerbindung.quellPort}
                    onChange={(e) => setNeuVerbindung({ ...neuVerbindung, quellPort: Number(e.target.value) })}
                    label="Quell-Port"
                  >
                    {getVerfuegbarePortsWithLabels(neuVerbindung.quellGeraetId).map((portInfo) => (
                      <MenuItem key={portInfo.port} value={portInfo.port}>
                        Port {portInfo.port}{portInfo.label ? ` (${portInfo.label})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Ziel-Gerät */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Ziel-Gerät
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Ziel-Gerät</InputLabel>
                  <Select
                    value={neuVerbindung.zielGeraetId}
                    onChange={(e) => setNeuVerbindung({ ...neuVerbindung, zielGeraetId: e.target.value, zielPort: 1 })}
                    label="Ziel-Gerät"
                  >
                    {geraete
                      .filter(g => g.id !== neuVerbindung.quellGeraetId)
                      .map((geraet) => (
                        <MenuItem key={geraet.id} value={geraet.id}>
                          {geraet.name} ({geraet.geraetetyp})
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required disabled={!neuVerbindung.zielGeraetId}>
                  <InputLabel>Ziel-Port</InputLabel>
                  <Select
                    value={neuVerbindung.zielPort}
                    onChange={(e) => setNeuVerbindung({ ...neuVerbindung, zielPort: Number(e.target.value) })}
                    label="Ziel-Port"
                  >
                    {getVerfuegbarePortsWithLabels(neuVerbindung.zielGeraetId).map((portInfo) => (
                      <MenuItem key={portInfo.port} value={portInfo.port}>
                        Port {portInfo.port}{portInfo.label ? ` (${portInfo.label})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Kabel-Eigenschaften */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Kabel-Eigenschaften
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Kabeltyp</InputLabel>
                  <Select
                    value={neuVerbindung.kabeltyp}
                    onChange={(e) => setNeuVerbindung({ ...neuVerbindung, kabeltyp: e.target.value as Kabeltyp })}
                    label="Kabeltyp"
                  >
                    {kabeltypen.map((typ) => (
                      <MenuItem key={typ} value={typ}>
                        {typ}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Kabellänge (Meter)"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={neuVerbindung.kabeleigenschaften.laenge || ''}
                  onChange={(e) => setNeuVerbindung({
                    ...neuVerbindung,
                    kabeleigenschaften: { ...neuVerbindung.kabeleigenschaften, laenge: parseFloat(e.target.value) || 0 }
                  })}
                  inputProps={{ min: 0, step: 0.1 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Kabelfarbe"
                  fullWidth
                  variant="outlined"
                  value={neuVerbindung.kabeleigenschaften.farbe}
                  onChange={(e) => setNeuVerbindung({
                    ...neuVerbindung,
                    kabeleigenschaften: { ...neuVerbindung.kabeleigenschaften, farbe: e.target.value }
                  })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Kategorie"
                  fullWidth
                  variant="outlined"
                  placeholder="z.B. Cat6a, Singlemode, Multimode, DAC"
                  value={neuVerbindung.kabeleigenschaften.kategorie}
                  onChange={(e) => setNeuVerbindung({
                    ...neuVerbindung,
                    kabeleigenschaften: { ...neuVerbindung.kabeleigenschaften, kategorie: e.target.value }
                  })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Bemerkungen"
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                  value={neuVerbindung.bemerkungen}
                  onChange={(e) => setNeuVerbindung({ ...neuVerbindung, bemerkungen: e.target.value })}
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
            onClick={erstelleVerbindung}
            variant="contained"
            disabled={
              !neuVerbindung.quellGeraetId || 
              !neuVerbindung.zielGeraetId || 
              !neuVerbindung.kabeltyp ||
              neuVerbindung.quellGeraetId === neuVerbindung.zielGeraetId
            }
          >
            Verbindung erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog für Verbindung bearbeiten */}
      <Dialog 
        open={bearbeitenDialogOpen} 
        onClose={() => setBearbeitenDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Verbindung bearbeiten
        </DialogTitle>
        <DialogContent>
          {selectedVerbindung && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={3}>
                {/* Verbindungsinfo (nur anzeigen) */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Verbindungsdetails
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Von Gerät"
                    fullWidth
                    variant="outlined"
                    value={selectedVerbindung.quell_geraet_name || ''}
                    disabled
                    InputProps={{
                      style: { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Von Port"
                    fullWidth
                    variant="outlined"
                    value={selectedVerbindung.quell_geraet_id ? 
                      getPortAnzeige(selectedVerbindung.quell_geraet_id, selectedVerbindung.quell_port) : 
                      `Port ${selectedVerbindung.quell_port || ''}`}
                    disabled
                    InputProps={{
                      style: { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Zu Gerät"
                    fullWidth
                    variant="outlined"
                    value={selectedVerbindung.ziel_geraet_name || ''}
                    disabled
                    InputProps={{
                      style: { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Zu Port"
                    fullWidth
                    variant="outlined"
                    value={selectedVerbindung.ziel_geraet_id ? 
                      getPortAnzeige(selectedVerbindung.ziel_geraet_id, selectedVerbindung.ziel_port) : 
                      `Port ${selectedVerbindung.ziel_port || ''}`}
                    disabled
                    InputProps={{
                      style: { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                  />
                </Grid>

                {/* Bearbeitbare Kabel-Eigenschaften */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Kabel-Eigenschaften
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Kabeltyp</InputLabel>
                    <Select
                      value={selectedVerbindung.kabeltyp || ''}
                      onChange={(e) => setSelectedVerbindung({ 
                        ...selectedVerbindung, 
                        kabeltyp: e.target.value 
                      })}
                      label="Kabeltyp"
                    >
                      {kabeltypen.map((typ) => (
                        <MenuItem key={typ} value={typ}>
                          {typ}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Kabellänge (Meter)"
                    type="number"
                    fullWidth
                    variant="outlined"
                    value={selectedVerbindung.kabel_laenge || ''}
                    onChange={(e) => setSelectedVerbindung({
                      ...selectedVerbindung,
                      kabel_laenge: parseFloat(e.target.value) || 0
                    })}
                    inputProps={{ min: 0, step: 0.1 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Kabelfarbe"
                    fullWidth
                    variant="outlined"
                    value={selectedVerbindung.kabel_farbe || ''}
                    onChange={(e) => setSelectedVerbindung({
                      ...selectedVerbindung,
                      kabel_farbe: e.target.value
                    })}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Kategorie"
                    fullWidth
                    variant="outlined"
                    placeholder="z.B. Cat6a, Singlemode, Multimode, DAC"
                    value={selectedVerbindung.kabel_kategorie || ''}
                    onChange={(e) => setSelectedVerbindung({
                      ...selectedVerbindung,
                      kabel_kategorie: e.target.value
                    })}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Bemerkungen"
                    fullWidth
                    multiline
                    rows={3}
                    variant="outlined"
                    value={selectedVerbindung.bemerkungen || ''}
                    onChange={(e) => setSelectedVerbindung({
                      ...selectedVerbindung,
                      bemerkungen: e.target.value
                    })}
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
            onClick={aktualisiereVerbindung}
            variant="contained"
            disabled={!selectedVerbindung?.kabeltyp}
          >
            Änderungen speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VerbindungsVerwaltung; 