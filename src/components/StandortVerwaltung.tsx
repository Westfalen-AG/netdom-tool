import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  LocationOn as LocationIcon,
  Router as RouterIcon,
  Cable as CableIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { Standort, Ansprechpartner } from '../types';
import { StandortContext } from '../App';

const StandortVerwaltung: React.FC = () => {
  const navigate = useNavigate();
  const { selectedStandort, setSelectedStandort } = useContext(StandortContext);

  const [alleStandorte, setAlleStandorte] = useState<Standort[]>([]);
  const [ansprechpartner, setAnsprechpartner] = useState<Ansprechpartner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bearbeitenDialogOpen, setBearbeitenDialogOpen] = useState(false);
  const [selectedStandortForEdit, setSelectedStandortForEdit] = useState<Standort | null>(null);
  const [neuStandort, setNeuStandort] = useState({
    name: '',
    adresse: '',
    ansprechpartnerITId: '',
    ansprechpartnerVorOrtId: '',
    hostnamePrefix: '',
    standardNetzbereich: '',
  });

  // Alle Standorte laden
  const ladeAlleStandorte = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/standorte');
      const data = await response.json();
      
      if (data.success) {
        setAlleStandorte(data.data);
      } else {
        setError(data.error || 'Fehler beim Laden der Standorte');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Laden der Standorte:', err);
    } finally {
      setLoading(false);
    }
  };

  // Ansprechpartner laden
  const ladeAnsprechpartner = async () => {
    try {
      const response = await fetch('/api/ansprechpartner');
      const data = await response.json();
      
      if (data.success) {
        setAnsprechpartner(data.data);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Ansprechpartner:', err);
    }
  };

  // Neuen Standort erstellen
  const erstelleStandort = async () => {
    try {
      const response = await fetch('/api/standorte', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(neuStandort),
      });

      const data = await response.json();
      
      if (data.success) {
        setDialogOpen(false);
        resetForm();
        ladeAlleStandorte();
      } else {
        setError(data.error || 'Fehler beim Erstellen des Standorts');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Erstellen des Standorts:', err);
    }
  };

  // Standort bearbeiten
  const aktualisiereStandort = async () => {
    try {
      if (!selectedStandortForEdit) return;

      const response = await fetch(`/api/standorte/${selectedStandortForEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(neuStandort),
      });

      const data = await response.json();
      
      if (data.success) {
        setBearbeitenDialogOpen(false);
        setSelectedStandortForEdit(null);
        resetForm();
        ladeAlleStandorte();
      } else {
        setError(data.error || 'Fehler beim Aktualisieren des Standorts');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Aktualisieren des Standorts:', err);
    }
  };

  const resetForm = () => {
    setNeuStandort({
      name: '',
      adresse: '',
      ansprechpartnerITId: '',
      ansprechpartnerVorOrtId: '',
      hostnamePrefix: '',
      standardNetzbereich: '',
    });
  };

  const startBearbeitung = (standort: Standort) => {
    setSelectedStandortForEdit(standort);
    setNeuStandort({
      name: standort.name,
      adresse: standort.adresse,
      ansprechpartnerITId: (standort.ansprechpartnerIT as any)?.id || '',
      ansprechpartnerVorOrtId: (standort.ansprechpartnerVorOrt as any)?.id || '',
      hostnamePrefix: standort.hostnamePrefix || '',
      standardNetzbereich: standort.standardNetzbereich || '',
    });
    setBearbeitenDialogOpen(true);
  };

  useEffect(() => {
    ladeAlleStandorte();
    ladeAnsprechpartner();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Lade Standorte...
        </Typography>
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
              Standort-Verwaltung
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Übersicht und Verwaltung aller OnSite-Anlagen der Westfalen AG
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Neuer Standort
          </Button>
        </Box>
      </Paper>

      {/* Fehler-Anzeige */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Standorte-Grid */}
      <Grid container spacing={3}>
        {alleStandorte.map((standort) => (
          <Grid item xs={12} sm={6} md={4} key={standort.id}>
            <Card 
              elevation={3}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                '&:hover': {
                  boxShadow: 6,
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <LocationIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="h2">
                    {standort.name}
                  </Typography>
                  {selectedStandort === standort.id && (
                    <Chip label="Ausgewählt" color="primary" size="small" sx={{ ml: 1 }} />
                  )}
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Adresse:</strong>
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {standort.adresse}
                </Typography>

                {standort.hostnamePrefix && (
                  <>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Hostname-Präfix:</strong>
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {standort.hostnamePrefix}
                    </Typography>
                  </>
                )}

                {standort.standardNetzbereich && (
                  <>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Standard-Netzbereich:</strong>
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      <Chip 
                        label={standort.standardNetzbereich} 
                        color="primary" 
                        variant="outlined" 
                        size="small"
                        sx={{ fontFamily: 'monospace' }}
                      />
                    </Typography>
                  </>
                )}

                {/* Ansprechpartner */}
                {standort.ansprechpartnerIT && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      <PeopleIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                      IT: {standort.ansprechpartnerIT.name}
                    </Typography>
                  </Box>
                )}
                
                {standort.ansprechpartnerVorOrt && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      <BusinessIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                      Vor Ort: {standort.ansprechpartnerVorOrt.name}
                    </Typography>
                  </Box>
                )}

                {/* Statistiken */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="primary">
                    <RouterIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    {(standort as any).anzahlGeraete || 0} Geräte
                  </Typography>
                  <Typography variant="body2" color="secondary.main">
                    <CableIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    {(standort as any).anzahlVerbindungen || 0} Verbindungen
                  </Typography>
                </Box>
              </CardContent>
              
              <CardActions>
                <Button 
                  size="small" 
                  startIcon={<ViewIcon />}
                  onClick={() => {
                    setSelectedStandort(standort.id);
                    navigate(`/standorte/${standort.name}`);
                  }}
                >
                  Details
                </Button>
                <Button 
                  size="small" 
                  startIcon={<EditIcon />}
                  onClick={() => startBearbeitung(standort)}
                >
                  Bearbeiten
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Leere Zustand */}
      {alleStandorte.length === 0 && !loading && (
        <Paper elevation={2} sx={{ p: 6, textAlign: 'center' }}>
          <LocationIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" component="h2" gutterBottom>
            Noch keine Standorte vorhanden
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Erstellen Sie Ihren ersten Standort, um mit der Netzwerk-Dokumentation zu beginnen.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Ersten Standort erstellen
          </Button>
        </Paper>
      )}

      {/* Dialog: Neuer Standort */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Neuen Standort erstellen</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Standort-Name"
                fullWidth
                value={neuStandort.name}
                onChange={(e) => setNeuStandort({ ...neuStandort, name: e.target.value })}
                placeholder="z.B. DELIN2, MELLE1"
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Adresse"
                fullWidth
                multiline
                rows={2}
                value={neuStandort.adresse}
                onChange={(e) => setNeuStandort({ ...neuStandort, adresse: e.target.value })}
                placeholder="Vollständige Anschrift des Standorts"
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Hostname-Präfix"
                fullWidth
                value={neuStandort.hostnamePrefix}
                onChange={(e) => setNeuStandort({ ...neuStandort, hostnamePrefix: e.target.value })}
                placeholder="z.B. DELIN2, MELLE1"
                helperText="Präfix für automatische Hostname-Generierung"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Standard-Netzbereich"
                fullWidth
                value={neuStandort.standardNetzbereich}
                onChange={(e) => setNeuStandort({ ...neuStandort, standardNetzbereich: e.target.value })}
                placeholder="z.B. 10.202.0.0/16"
                helperText="Standard /16 IT-Netzbereich für diesen Standort"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Ansprechpartner IT</InputLabel>
                <Select
                  value={neuStandort.ansprechpartnerITId}
                  onChange={(e) => setNeuStandort({ ...neuStandort, ansprechpartnerITId: e.target.value })}
                  label="Ansprechpartner IT"
                >
                  <MenuItem value="">
                    <em>Keinen auswählen</em>
                  </MenuItem>
                  {ansprechpartner.map((person) => (
                    <MenuItem key={person.id} value={person.id}>
                      {person.name} {person.abteilung && `(${person.abteilung})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Ansprechpartner Vor Ort</InputLabel>
                <Select
                  value={neuStandort.ansprechpartnerVorOrtId}
                  onChange={(e) => setNeuStandort({ ...neuStandort, ansprechpartnerVorOrtId: e.target.value })}
                  label="Ansprechpartner Vor Ort"
                >
                  <MenuItem value="">
                    <em>Keinen auswählen</em>
                  </MenuItem>
                  {ansprechpartner.map((person) => (
                    <MenuItem key={person.id} value={person.id}>
                      {person.name} {person.abteilung && `(${person.abteilung})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={erstelleStandort} variant="contained">
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Standort bearbeiten */}
      <Dialog 
        open={bearbeitenDialogOpen} 
        onClose={() => setBearbeitenDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Standort bearbeiten</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Standort-Name"
                fullWidth
                value={neuStandort.name}
                onChange={(e) => setNeuStandort({ ...neuStandort, name: e.target.value })}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Adresse"
                fullWidth
                multiline
                rows={2}
                value={neuStandort.adresse}
                onChange={(e) => setNeuStandort({ ...neuStandort, adresse: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Hostname-Präfix"
                fullWidth
                value={neuStandort.hostnamePrefix}
                onChange={(e) => setNeuStandort({ ...neuStandort, hostnamePrefix: e.target.value })}
                placeholder="z.B. DELIN2, MELLE1"
                helperText="Präfix für automatische Hostname-Generierung"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Standard-Netzbereich"
                fullWidth
                value={neuStandort.standardNetzbereich}
                onChange={(e) => setNeuStandort({ ...neuStandort, standardNetzbereich: e.target.value })}
                placeholder="z.B. 10.202.0.0/16"
                helperText="Standard /16 IT-Netzbereich für diesen Standort"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Ansprechpartner IT</InputLabel>
                <Select
                  value={neuStandort.ansprechpartnerITId}
                  onChange={(e) => setNeuStandort({ ...neuStandort, ansprechpartnerITId: e.target.value })}
                  label="Ansprechpartner IT"
                >
                  <MenuItem value="">
                    <em>Keinen auswählen</em>
                  </MenuItem>
                  {ansprechpartner.map((person) => (
                    <MenuItem key={person.id} value={person.id}>
                      {person.name} {person.abteilung && `(${person.abteilung})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Ansprechpartner Vor Ort</InputLabel>
                <Select
                  value={neuStandort.ansprechpartnerVorOrtId}
                  onChange={(e) => setNeuStandort({ ...neuStandort, ansprechpartnerVorOrtId: e.target.value })}
                  label="Ansprechpartner Vor Ort"
                >
                  <MenuItem value="">
                    <em>Keinen auswählen</em>
                  </MenuItem>
                  {ansprechpartner.map((person) => (
                    <MenuItem key={person.id} value={person.id}>
                      {person.name} {person.abteilung && `(${person.abteilung})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBearbeitenDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={aktualisiereStandort} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StandortVerwaltung; 