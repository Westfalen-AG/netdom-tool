import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
  Grid,
  MenuItem,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Router as RouterIcon,
  SettingsEthernet as SwitchIcon,
  Security as SecurityIcon,
  Wifi as WifiIcon,
  Print as PrintIcon,
  Storage as StorageIcon,
  Dns as ServerIcon,
  DeviceUnknown as UnknownIcon,
  Cable as CableIcon,
  Lock as LockIcon,
  Monitor as MonitorIcon,
  Phone as PhoneIcon,
  Videocam as VideocamIcon,
  Sensors as SensorsIcon,
  Hub as HubIcon,
  Cloud as CloudIcon
} from '@mui/icons-material';
import { GeraetetypDefinition } from '../types';

const GeraetetypVerwaltung: React.FC = () => {
  const [geraetetypen, setGeraetetypen] = useState<GeraetetypDefinition[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isBearbeiten, setIsBearbeiten] = useState(false);
  const [currentGeraetetyp, setCurrentGeraetetyp] = useState<Partial<GeraetetypDefinition>>({
    name: '',
    beschreibung: '',
    icon: 'device_unknown',
    farbe: '#757575',
    hostnamePrefix: '',
    aktiv: true
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Verfügbare Icons
  const verfuegbareIcons = [
    { name: 'router', label: 'Router', icon: <RouterIcon /> },
    { name: 'switch', label: 'Switch', icon: <SwitchIcon /> },
    { name: 'security', label: 'Firewall', icon: <SecurityIcon /> },
    { name: 'wifi', label: 'WLAN', icon: <WifiIcon /> },
    { name: 'print', label: 'Drucker', icon: <PrintIcon /> },
    { name: 'storage', label: 'Storage/NVR', icon: <StorageIcon /> },
    { name: 'dns', label: 'Server', icon: <ServerIcon /> },
    { name: 'cable', label: 'Kabel/Serial', icon: <CableIcon /> },
    { name: 'lock', label: 'Zugang', icon: <LockIcon /> },
    { name: 'monitor', label: 'Monitor/HMI', icon: <MonitorIcon /> },
    { name: 'phone', label: 'Telefon', icon: <PhoneIcon /> },
    { name: 'videocam', label: 'Kamera', icon: <VideocamIcon /> },
    { name: 'sensors', label: 'Sensor', icon: <SensorsIcon /> },
    { name: 'hub', label: 'Hub/AI-Port', icon: <HubIcon /> },
    { name: 'cloud', label: 'Cloud/Gateway', icon: <CloudIcon /> },
    { name: 'device_unknown', label: 'Unbekannt', icon: <UnknownIcon /> }
  ];

  // Vorgegebene Farben
  const verfuegbareFarben = [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
    '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39',
    '#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#795548', '#9e9e9e',
    '#607d8b', '#757575'
  ];

  useEffect(() => {
    ladeGeraetetypen();
  }, []);

  const ladeGeraetetypen = async () => {
    try {
      const response = await fetch('/api/geraetetypen/alle');
      const data = await response.json();
      if (data.success) {
        setGeraetetypen(data.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Gerätetypen:', error);
    }
  };

  const handleDialogOpen = (geraetetyp?: GeraetetypDefinition) => {
    if (geraetetyp) {
      setCurrentGeraetetyp(geraetetyp);
      setIsBearbeiten(true);
    } else {
      setCurrentGeraetetyp({
        name: '',
        beschreibung: '',
        icon: 'device_unknown',
        farbe: '#757575',
        hostnamePrefix: '',
        aktiv: true
      });
      setIsBearbeiten(false);
    }
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setCurrentGeraetetyp({
      name: '',
      beschreibung: '',
      icon: 'device_unknown',
      farbe: '#757575',
      hostnamePrefix: '',
      aktiv: true
    });
  };

  const handleSpeichern = async () => {
    try {
      const url = isBearbeiten ? `/api/geraetetypen/${currentGeraetetyp.id}` : '/api/geraetetypen';
      const method = isBearbeiten ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentGeraetetyp),
      });

      const data = await response.json();
      if (data.success) {
        setSnackbar({
          open: true,
          message: isBearbeiten ? 'Gerätetyp erfolgreich aktualisiert' : 'Gerätetyp erfolgreich erstellt',
          severity: 'success'
        });
        ladeGeraetetypen();
        handleDialogClose();
      } else {
        setSnackbar({
          open: true,
          message: data.message || 'Fehler beim Speichern',
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Fehler beim Speichern des Gerätetyps',
        severity: 'error'
      });
    }
  };

  const handleLoeschen = async (id: string) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diesen Gerätetyp löschen möchten?')) {
      return;
    }

    try {
      const response = await fetch(`/api/geraetetypen/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setSnackbar({
          open: true,
          message: 'Gerätetyp erfolgreich gelöscht',
          severity: 'success'
        });
        ladeGeraetetypen();
      } else {
        setSnackbar({
          open: true,
          message: data.message || 'Fehler beim Löschen',
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Fehler beim Löschen des Gerätetyps',
        severity: 'error'
      });
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconConfig = verfuegbareIcons.find(icon => icon.name === iconName);
    return iconConfig ? iconConfig.icon : <UnknownIcon />;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Gerätetyp-Verwaltung
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleDialogOpen()}
        >
          Neuer Gerätetyp
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Icon</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Hostname-Präfix</TableCell>
              <TableCell>Beschreibung</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Erstellt</TableCell>
              <TableCell align="right">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {geraetetypen.map((geraetetyp) => (
              <TableRow key={geraetetyp.id} hover>
                <TableCell>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      color: geraetetyp.farbe,
                    }}
                  >
                    {getIconComponent(geraetetyp.icon || 'device_unknown')}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body1" fontWeight="medium">
                    {geraetetyp.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="mono" color="primary">
                    {geraetetyp.hostnamePrefix || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {geraetetyp.beschreibung || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={geraetetyp.aktiv ? 'Aktiv' : 'Inaktiv'}
                    color={geraetetyp.aktiv ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {geraetetyp.erstellt_am ? new Date(geraetetyp.erstellt_am).toLocaleDateString('de-DE') : '-'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Bearbeiten">
                    <IconButton
                      size="small"
                      onClick={() => handleDialogOpen(geraetetyp)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Löschen">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleLoeschen(geraetetyp.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog für Erstellen/Bearbeiten */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isBearbeiten ? 'Gerätetyp bearbeiten' : 'Neuer Gerätetyp'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Name"
                fullWidth
                required
                value={currentGeraetetyp.name || ''}
                onChange={(e) => setCurrentGeraetetyp({ ...currentGeraetetyp, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Hostname-Präfix"
                fullWidth
                required
                placeholder="z.B. CM, SW, RT"
                value={currentGeraetetyp.hostnamePrefix || ''}
                onChange={(e) => setCurrentGeraetetyp({ ...currentGeraetetyp, hostnamePrefix: e.target.value.toUpperCase() })}
                inputProps={{ maxLength: 4 }}
                helperText="Max. 4 Zeichen (z.B. CM für Kamera)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Beschreibung"
                fullWidth
                multiline
                rows={2}
                value={currentGeraetetyp.beschreibung || ''}
                onChange={(e) => setCurrentGeraetetyp({ ...currentGeraetetyp, beschreibung: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Icon"
                fullWidth
                value={currentGeraetetyp.icon || 'device_unknown'}
                onChange={(e) => setCurrentGeraetetyp({ ...currentGeraetetyp, icon: e.target.value })}
              >
                {verfuegbareIcons.map((icon) => (
                  <MenuItem key={icon.name} value={icon.name}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {icon.icon}
                      {icon.label}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Farbe"
                fullWidth
                value={currentGeraetetyp.farbe || '#757575'}
                onChange={(e) => setCurrentGeraetetyp({ ...currentGeraetetyp, farbe: e.target.value })}
              >
                {verfuegbareFarben.map((farbe) => (
                  <MenuItem key={farbe} value={farbe}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          backgroundColor: farbe,
                          borderRadius: '50%',
                          border: '1px solid #ccc'
                        }}
                      />
                      {farbe}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={currentGeraetetyp.aktiv || false}
                    onChange={(e) => setCurrentGeraetetyp({ ...currentGeraetetyp, aktiv: e.target.checked })}
                  />
                }
                label="Aktiv"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Abbrechen</Button>
          <Button 
            onClick={handleSpeichern} 
            variant="contained" 
            disabled={!currentGeraetetyp.name?.trim() || !currentGeraetetyp.hostnamePrefix?.trim()}
          >
            {isBearbeiten ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar für Nachrichten */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GeraetetypVerwaltung; 