import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
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
  Switch,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  NetworkWifi as NetworkIcon,
  ExpandMore as ExpandMoreIcon,
  Lan as LanIcon,
  Storage as StorageIcon,
  Scanner as ScanIcon,
  Radar as RadarIcon,
  DeviceHub as DeviceHubIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  PlayArrow as PlayIcon
} from '@mui/icons-material';
import { StandortContext } from '../App';
import io from 'socket.io-client';
import { Netzbereich, NetzbereichTyp, NetzbereichFormData } from '../types';

const NetzbereichsVerwaltung: React.FC = () => {
  const { selectedStandort, selectedStandortData } = useContext(StandortContext);
  const [netzbereichListe, setNetzbereichListe] = useState<Netzbereich[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNetzbereich, setEditingNetzbereich] = useState<Netzbereich | null>(null);
  const [formData, setFormData] = useState<NetzbereichFormData>({
    name: '',
    beschreibung: '',
    ip_bereich: '',
    netztyp: NetzbereichTyp.IT_NETZ,
    standort_id: selectedStandort,
    vlan_id: undefined,
    gateway: '',
    dns_server: '',
    ntp_server: '',
    dhcp_aktiv: false,
    dhcp_bereich: '',
    aktiv: true,
    bemerkungen: ''
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Netzwerk-Scan State
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [scanInProgress, setScanInProgress] = useState(false);
  const [scanProgress, setScanProgress] = useState({
    totalHosts: 0,
    scannedHosts: 0,
    foundHosts: 0,
    currentOperation: ''
  });
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const [scanResultsDialogOpen, setScanResultsDialogOpen] = useState(false);
  const [availableDeviceTypes, setAvailableDeviceTypes] = useState<string[]>([]);

  useEffect(() => {
    if (selectedStandort) {
      ladeNetzbereichListe();
    }
  }, [selectedStandort]); // eslint-disable-line react-hooks/exhaustive-deps

  // Verfügbare Gerätetypen laden
  useEffect(() => {
    ladeVerfuegbareGeraetetypen();
  }, []);

  const ladeVerfuegbareGeraetetypen = async () => {
    try {
      const response = await fetch('/api/device-types');
      const data = await response.json();
      if (data.success) {
        setAvailableDeviceTypes(data.data);
      } else {
        console.error('Fehler beim Laden der Gerätetypen:', data.error);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Gerätetypen:', error);
    }
  };

  const ladeNetzbereichListe = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/netzbereich-verwaltung?standort_id=${selectedStandort}`);
      const data = await response.json();
      if (data.success) {
        setNetzbereichListe(data.data);
      } else {
        throw new Error(data.message || 'Fehler beim Laden der Netzbereich-Liste');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Netzbereich-Liste:', error);
      setSnackbarMessage('Fehler beim Laden der Netzbereich-Liste');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDialogOpen = (netzbereich?: Netzbereich) => {
    if (netzbereich) {
      setEditingNetzbereich(netzbereich);
      setFormData({
        name: netzbereich.name,
        beschreibung: netzbereich.beschreibung,
        ip_bereich: netzbereich.ip_bereich,
        netztyp: netzbereich.netztyp,
        standort_id: netzbereich.standort_id,
        vlan_id: netzbereich.vlan_id,
        gateway: netzbereich.gateway || '',
        dns_server: netzbereich.dns_server || '',
        ntp_server: netzbereich.ntp_server || '',
        dhcp_aktiv: netzbereich.dhcp_aktiv,
        dhcp_bereich: netzbereich.dhcp_bereich || '',
        aktiv: netzbereich.aktiv,
        bemerkungen: netzbereich.bemerkungen || ''
      });
    } else {
      setEditingNetzbereich(null);
      setFormData({
        name: '',
        beschreibung: '',
        ip_bereich: '',
        netztyp: NetzbereichTyp.IT_NETZ,
        standort_id: selectedStandort,
        vlan_id: undefined,
        gateway: '',
        dns_server: '',
        ntp_server: '',
        dhcp_aktiv: false,
        dhcp_bereich: '',
        aktiv: true,
        bemerkungen: ''
      });
    }
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingNetzbereich(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingNetzbereich 
        ? `/api/netzbereich-verwaltung/${editingNetzbereich.id}`
        : '/api/netzbereich-verwaltung';
      
      const method = editingNetzbereich ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        setSnackbarMessage(editingNetzbereich ? 'Netzbereich erfolgreich aktualisiert' : 'Netzbereich erfolgreich erstellt');
        setSnackbarOpen(true);
        handleDialogClose();
        ladeNetzbereichListe();
      } else {
        throw new Error(data.message || 'Fehler beim Speichern des Netzbereichs');
      }
    } catch (error) {
      console.error('Fehler beim Speichern des Netzbereichs:', error);
      setSnackbarMessage('Fehler beim Speichern des Netzbereichs');
      setSnackbarOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Möchten Sie diesen Netzbereich wirklich löschen?')) {
      try {
        const response = await fetch(`/api/netzbereich-verwaltung/${id}`, {
          method: 'DELETE',
        });

        const data = await response.json();
        
        if (data.success) {
          setSnackbarMessage('Netzbereich erfolgreich gelöscht');
          setSnackbarOpen(true);
          ladeNetzbereichListe();
        } else {
          throw new Error(data.message || 'Fehler beim Löschen des Netzbereichs');
        }
      } catch (error) {
        console.error('Fehler beim Löschen des Netzbereichs:', error);
        setSnackbarMessage('Fehler beim Löschen des Netzbereichs');
        setSnackbarOpen(true);
      }
    }
  };

  const getNetzbereichIcon = (netztyp: NetzbereichTyp) => {
    switch (netztyp) {
      case NetzbereichTyp.IT_NETZ:
        return <NetworkIcon />;
      case NetzbereichTyp.OT_NETZ:
        return <StorageIcon />;
      case NetzbereichTyp.SONSTIGES:
        return <LanIcon />;
      default:
        return <LanIcon />;
    }
  };

  const getNetzbereichFarbe = (netztyp: NetzbereichTyp) => {
    switch (netztyp) {
      case NetzbereichTyp.IT_NETZ:
        return 'primary';
      case NetzbereichTyp.OT_NETZ:
        return 'secondary';
      case NetzbereichTyp.SONSTIGES:
        return 'default';
      default:
        return 'default';
    }
  };

  const bereicherProNetztyp = () => {
    const gruppiert = netzbereichListe.reduce((acc, netzbereich) => {
      if (!acc[netzbereich.netztyp]) {
        acc[netzbereich.netztyp] = [];
      }
      acc[netzbereich.netztyp].push(netzbereich);
      return acc;
    }, {} as Record<NetzbereichTyp, Netzbereich[]>);

    return Object.entries(gruppiert).map(([netztyp, bereiche]) => ({
      netztyp: netztyp as NetzbereichTyp,
      bereiche
    }));
  };

  // Socket.IO Verbindung für Live-Updates
  useEffect(() => {
    if (!currentScanId) return;

    const socket = io('http://localhost:3001');

    socket.on('scan-progress', (data: any) => {
      if (data.scanId === currentScanId) {
        setScanProgress(data.progress);
      }
    });

    socket.on('scan-completed', (data: any) => {
      if (data.scanId === currentScanId) {
        setScanInProgress(false);
        setScanResults(data.results);
        setScanResultsDialogOpen(true);
        setScanDialogOpen(false);
      }
    });

    socket.on('scan-error', (data: any) => {
      if (data.scanId === currentScanId) {
        setScanInProgress(false);
        setSnackbarMessage(`Scan-Fehler: ${data.error}`);
        setSnackbarOpen(true);
        setScanDialogOpen(false);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [currentScanId]);

  // Netzwerk-Scan starten
  const startNetworkScan = async (ipRange: string) => {
    try {
      setScanInProgress(true);
      setScanProgress({ totalHosts: 0, scannedHosts: 0, foundHosts: 0, currentOperation: 'Initialisierung...' });
      
      const response = await fetch('/api/network-scan/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ipRange,
          standortId: selectedStandort
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCurrentScanId(data.data.scanId);
      } else {
        throw new Error(data.error || 'Fehler beim Starten des Scans');
      }
    } catch (error) {
      setScanInProgress(false);
      setSnackbarMessage(`Fehler beim Starten des Scans: ${error}`);
      setSnackbarOpen(true);
    }
  };

  // Ausgewählte Geräte aus Scan-Ergebnissen erstellen
  const createDevicesFromScan = async () => {
    try {
      if (!currentScanId || selectedDevices.size === 0) return;

      const selectedDeviceData = scanResults.filter((_, index) => 
        selectedDevices.has(index.toString())
      ).map(device => ({
        ...device,
        // Stelle sicher, dass der ausgewählte Gerätetyp verwendet wird
        deviceType: device.suggestedDeviceType,
        name: device.suggestedName
      }));

      const response = await fetch(`/api/network-scan/${currentScanId}/create-devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedDevices: selectedDeviceData
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSnackbarMessage(`${data.data.createdDevices.length} Geräte erfolgreich erstellt!`);
        setSnackbarOpen(true);
        setScanResultsDialogOpen(false);
        setSelectedDevices(new Set());
        setScanResults([]);
        setCurrentScanId(null);
      } else {
        throw new Error(data.error || 'Fehler beim Erstellen der Geräte');
      }
    } catch (error) {
      setSnackbarMessage(`Fehler beim Erstellen der Geräte: ${error}`);
      setSnackbarOpen(true);
    }
  };

  // Geräte-Auswahl umschalten
  const toggleDeviceSelection = (index: number) => {
    const newSelection = new Set(selectedDevices);
    const indexStr = index.toString();
    
    if (newSelection.has(indexStr)) {
      newSelection.delete(indexStr);
    } else {
      newSelection.add(indexStr);
    }
    
    setSelectedDevices(newSelection);
  };

  // Alle Geräte auswählen/abwählen
  const toggleAllDevices = () => {
    if (selectedDevices.size === scanResults.length) {
      setSelectedDevices(new Set());
    } else {
      setSelectedDevices(new Set(scanResults.map((_, index) => index.toString())));
    }
  };

  if (!selectedStandortData) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="warning">
          Bitte wählen Sie einen Standort aus, um die Netzbereichsverwaltung zu verwenden.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Netzbereichsverwaltung
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleDialogOpen()}
        >
          Netzbereich hinzufügen
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Standort: {selectedStandortData.name}
          </Typography>
          {selectedStandortData.standardNetzbereich && (
            <Typography variant="body2" color="primary" gutterBottom>
              Standard-Netzbereich: {selectedStandortData.standardNetzbereich}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            Verwalten Sie hier die Netzbereichsaufteilung für IT-Netze (inkl. DMZ und Management-Bereiche) und OT-Netze (inkl. SPS/PLS-Geräte). 
            IT-Netze beginnen typischerweise mit 10.x.x.x/16, OT-Netze können andere Bereiche wie 192.168.x.x/24 haben.
            {selectedStandortData.standardNetzbereich && ' Die Subnetze sollten innerhalb des Standard-Netzbereichs liegen.'}
          </Typography>
        </CardContent>
      </Card>

      {loading ? (
        <Typography>Lade Netzbereich-Liste...</Typography>
      ) : (
        <Grid container spacing={3}>
          {bereicherProNetztyp().map(({ netztyp, bereiche }) => (
            <Grid item xs={12} key={netztyp}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {getNetzbereichIcon(netztyp)}
                    <Typography variant="h6">
                      {netztyp} ({bereiche.length})
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>IP-Bereich</TableCell>
                          <TableCell>VLAN</TableCell>
                          <TableCell>Gateway</TableCell>
                          <TableCell>DNS</TableCell>
                          <TableCell>NTP</TableCell>
                          <TableCell>DHCP</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Aktionen</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {bereiche.map((netzbereich) => (
                          <TableRow key={netzbereich.id}>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight="bold">
                                  {netzbereich.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {netzbereich.beschreibung}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={netzbereich.ip_bereich}
                                color={getNetzbereichFarbe(netzbereich.netztyp)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {netzbereich.vlan_id ? `VLAN ${netzbereich.vlan_id}` : '-'}
                            </TableCell>
                            <TableCell>{netzbereich.gateway || '-'}</TableCell>
                            <TableCell>{netzbereich.dns_server || '-'}</TableCell>
                            <TableCell>{netzbereich.ntp_server || '-'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={netzbereich.dhcp_aktiv ? 'Aktiv' : 'Inaktiv'}
                                color={netzbereich.dhcp_aktiv ? 'info' : 'default'}
                                size="small"
                              />
                              {netzbereich.dhcp_aktiv && netzbereich.dhcp_bereich && (
                                <Typography variant="caption" display="block" sx={{ mt: 0.5, fontSize: '0.7rem' }}>
                                  {netzbereich.dhcp_bereich}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={netzbereich.aktiv ? 'Aktiv' : 'Inaktiv'}
                                color={netzbereich.aktiv ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="Bearbeiten">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDialogOpen(netzbereich)}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Löschen">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDelete(netzbereich.id)}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Netzwerk scannen">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => {
                                      setScanDialogOpen(true);
                                      setFormData(prev => ({ ...prev, ip_bereich: netzbereich.ip_bereich }));
                                    }}
                                    disabled={scanInProgress}
                                  >
                                    <ScanIcon />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog für Netzbereich erstellen/bearbeiten */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingNetzbereich ? 'Netzbereich bearbeiten' : 'Neuen Netzbereich erstellen'}
        </DialogTitle>
        <form onSubmit={handleFormSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Netztyp</InputLabel>
                  <Select
                    value={formData.netztyp}
                    onChange={(e) => setFormData({ ...formData, netztyp: e.target.value as NetzbereichTyp })}
                    label="Netztyp"
                  >
                    {Object.values(NetzbereichTyp).map((typ) => (
                      <MenuItem key={typ} value={typ}>
                        {typ}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Beschreibung"
                  value={formData.beschreibung}
                  onChange={(e) => setFormData({ ...formData, beschreibung: e.target.value })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="IP-Bereich (z.B. 10.202.0.0/16)"
                  value={formData.ip_bereich}
                  onChange={(e) => setFormData({ ...formData, ip_bereich: e.target.value })}
                  required
                  margin="normal"
                  placeholder="10.202.0.0/16"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="VLAN ID"
                  type="number"
                  value={formData.vlan_id || ''}
                  onChange={(e) => setFormData({ ...formData, vlan_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Gateway"
                  value={formData.gateway}
                  onChange={(e) => setFormData({ ...formData, gateway: e.target.value })}
                  margin="normal"
                  placeholder="10.202.0.1"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="DNS Server"
                  value={formData.dns_server}
                  onChange={(e) => setFormData({ ...formData, dns_server: e.target.value })}
                  margin="normal"
                  placeholder="8.8.8.8, 8.8.4.4"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="NTP Server"
                  value={formData.ntp_server}
                  onChange={(e) => setFormData({ ...formData, ntp_server: e.target.value })}
                  margin="normal"
                  placeholder="192.168.1.1"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.dhcp_aktiv}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        dhcp_aktiv: e.target.checked,
                        dhcp_bereich: e.target.checked ? formData.dhcp_bereich : '' // Leeren wenn DHCP deaktiviert wird
                      })}
                    />
                  }
                  label="DHCP aktiv"
                />
              </Grid>
              {formData.dhcp_aktiv && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="DHCP-Bereich"
                    value={formData.dhcp_bereich}
                    onChange={(e) => setFormData({ ...formData, dhcp_bereich: e.target.value })}
                    margin="normal"
                    placeholder="10.202.1.100-10.202.1.200"
                    helperText="IP-Bereich für DHCP-Zuweisung (z.B. 10.202.1.100-10.202.1.200)"
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bemerkungen"
                  value={formData.bemerkungen}
                  onChange={(e) => setFormData({ ...formData, bemerkungen: e.target.value })}
                  margin="normal"
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.aktiv}
                      onChange={(e) => setFormData({ ...formData, aktiv: e.target.checked })}
                    />
                  }
                  label="Aktiv"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>Abbrechen</Button>
            <Button type="submit" variant="contained">
              {editingNetzbereich ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Netzwerk-Scan Dialog */}
      <Dialog open={scanDialogOpen} onClose={() => !scanInProgress && setScanDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RadarIcon />
            Netzwerk-Scan
          </Box>
        </DialogTitle>
        <DialogContent>
          {!scanInProgress ? (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="IP-Bereich"
                value={formData.ip_bereich}
                onChange={(e) => setFormData(prev => ({ ...prev, ip_bereich: e.target.value }))}
                placeholder="z.B. 192.168.1.0/24 oder 192.168.1.1-192.168.1.254"
                helperText="Unterstützt CIDR-Notation (/24) oder IP-Bereiche (1.1.1.1-1.1.1.254)"
                sx={{ mb: 2 }}
              />
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Der Scan wird folgende Aktionen durchführen:</strong>
                </Typography>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>Host-Discovery mit Ping und TCP-Verbindungsversuchen</li>
                  <li>Port-Scan auf häufig verwendete Services (Web, SSH, RDP, VNC, Datenbanken, etc.)</li>
                  <li>Automatische Geräteerkennung basierend auf offenen Ports</li>
                  <li>Vorschläge für Gerätetypen und Namen</li>
                </ul>
              </Alert>
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    Scan läuft...
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ 
                        width: '100%', 
                        bgcolor: 'grey.300', 
                        borderRadius: 1,
                        height: 8,
                        overflow: 'hidden'
                      }}>
                        <Box sx={{
                          width: `${scanProgress.totalHosts > 0 ? (scanProgress.scannedHosts / scanProgress.totalHosts) * 100 : 0}%`,
                          height: '100%',
                          bgcolor: 'primary.main',
                          transition: 'width 0.3s ease'
                        }} />
                      </Box>
                    </Box>
                    <Typography variant="body2" sx={{ minWidth: 80 }}>
                      {scanProgress.scannedHosts}/{scanProgress.totalHosts}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {scanProgress.currentOperation}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary.main">
                        {scanProgress.foundHosts}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Gefundene Hosts
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main">
                        {scanProgress.scannedHosts}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Gescannte IPs
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {Math.round((scanProgress.scannedHosts / Math.max(scanProgress.totalHosts, 1)) * 100)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Fortschritt
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanDialogOpen(false)} disabled={scanInProgress}>
            Abbrechen
          </Button>
          {!scanInProgress && (
            <Button 
              onClick={() => startNetworkScan(formData.ip_bereich)} 
              variant="contained"
              startIcon={<PlayIcon />}
              disabled={!formData.ip_bereich.trim()}
            >
              Scan starten
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Scan-Ergebnisse Dialog */}
      <Dialog open={scanResultsDialogOpen} onClose={() => setScanResultsDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DeviceHubIcon />
              Scan-Ergebnisse ({scanResults.length} Geräte gefunden)
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={toggleAllDevices}
              startIcon={selectedDevices.size === scanResults.length ? <CancelIcon /> : <CheckIcon />}
            >
              {selectedDevices.size === scanResults.length ? 'Alle abwählen' : 'Alle auswählen'}
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">Auswahl</TableCell>
                  <TableCell>IP-Adresse / Hostname</TableCell>
                  <TableCell>Gerätetyp</TableCell>
                  <TableCell>Gerätename</TableCell>
                  <TableCell>Offene Ports</TableCell>
                  <TableCell>Services</TableCell>
                  <TableCell>Kategorien</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scanResults.map((device, index) => (
                  <TableRow key={index} hover>
                    <TableCell padding="checkbox">
                      <IconButton
                        onClick={() => toggleDeviceSelection(index)}
                        color={selectedDevices.has(index.toString()) ? 'primary' : 'default'}
                      >
                        {selectedDevices.has(index.toString()) ? <CheckIcon /> : <CancelIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {device.ip}
                      </Typography>
                      {device.hostname && (
                        <Typography variant="body2" color="primary">
                          {device.hostname}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {device.discoveryMethod}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={device.suggestedDeviceType || ''}
                          onChange={(e) => {
                            const newResults = [...scanResults];
                            newResults[index].suggestedDeviceType = e.target.value;
                            setScanResults(newResults);
                          }}
                          displayEmpty
                        >
                          <MenuItem value="" disabled>
                            Gerätetyp wählen
                          </MenuItem>
                          {availableDeviceTypes.map((type) => (
                            <MenuItem key={type} value={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={device.suggestedName}
                        onChange={(e) => {
                          const newResults = [...scanResults];
                          newResults[index].suggestedName = e.target.value;
                          setScanResults(newResults);
                        }}
                        placeholder="Gerätename"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {device.portCount} Port{device.portCount !== 1 ? 's' : ''}
                      </Typography>
                      {device.openPorts.slice(0, 3).map((port: any) => (
                        <Chip
                          key={port.port}
                          label={`${port.port}/${port.service.name}`}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                      {device.openPorts.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          +{device.openPorts.length - 3} weitere
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {device.openPorts.slice(0, 2).map((port: any) => (
                        <Typography key={port.port} variant="caption" display="block">
                          {port.service.service}
                        </Typography>
                      ))}
                      {device.openPorts.length > 2 && (
                        <Typography variant="caption" color="text.secondary">
                          +{device.openPorts.length - 2} weitere
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {device.categories?.map((category: string) => (
                        <Chip
                          key={category}
                          label={category}
                          size="small"
                          color={category === 'Industrial' ? 'warning' : 'info'}
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {scanResults.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Keine Geräte gefunden.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanResultsDialogOpen(false)}>
            Schließen
          </Button>
          <Button
            onClick={createDevicesFromScan}
            variant="contained"
            disabled={selectedDevices.size === 0}
            startIcon={<CheckIcon />}
          >
            {selectedDevices.size} Gerät{selectedDevices.size !== 1 ? 'e' : ''} erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar für Benachrichtigungen */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default NetzbereichsVerwaltung; 