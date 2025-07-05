import React, { useState, useEffect } from 'react';
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
  FormGroup,
  FormLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
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
} from '@mui/icons-material';
import { StandortMitStatistiken, UplinkTyp, Ansprechpartner } from '../types';

const StandortUebersicht: React.FC = () => {
  const [standorte, setStandorte] = useState<StandortMitStatistiken[]>([]);
  const [ansprechpartner, setAnsprechpartner] = useState<Ansprechpartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bearbeitenDialogOpen, setBearbeitenDialogOpen] = useState(false);
  const [selectedStandort, setSelectedStandort] = useState<StandortMitStatistiken | null>(null);
  const [neuStandort, setNeuStandort] = useState({
    name: '',
    adresse: '',
    ansprechpartner: {
      name: '',
      telefon: '',
      email: '',
    },
    ansprechpartnerITId: '',
    ansprechpartnerVorOrtId: '',
  });
  const [bearbeitenStandort, setBearbeitenStandort] = useState({
    name: '',
    adresse: '',
    ansprechpartner: {
      name: '',
      telefon: '',
      email: '',
    },
    ansprechpartnerITId: '',
    ansprechpartnerVorOrtId: '',
  });

  const navigate = useNavigate();

  // Standorte laden
  const ladeStandorte = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/standorte');
      const data = await response.json();
      
      if (data.success) {
        setStandorte(data.data);
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
      } else {
        console.error('Fehler beim Laden der Ansprechpartner:', data.error);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Ansprechpartner:', err);
    }
  };

  useEffect(() => {
    ladeStandorte();
    ladeAnsprechpartner();
  }, []);

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
        setNeuStandort({
          name: '',
          adresse: '',
          ansprechpartner: { name: '', telefon: '', email: '' },
          ansprechpartnerITId: '',
          ansprechpartnerVorOrtId: '',
        });
        ladeStandorte(); // Liste neu laden
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
      if (!selectedStandort) return;

      const response = await fetch(`/api/standorte/${selectedStandort.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bearbeitenStandort),
      });

      const data = await response.json();
      
      if (data.success) {
        setBearbeitenDialogOpen(false);
        setSelectedStandort(null);
        ladeStandorte(); // Liste neu laden
      } else {
        setError(data.error || 'Fehler beim Aktualisieren des Standorts');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Aktualisieren des Standorts:', err);
    }
  };

  // Bearbeitungsdialog öffnen
  const oeffneBearbeitungsDialog = (standort: StandortMitStatistiken) => {
    setSelectedStandort(standort);
    setBearbeitenStandort({
      name: standort.name,
      adresse: standort.adresse,
      ansprechpartner: {
        name: standort.ansprechpartner?.name || '',
        telefon: standort.ansprechpartner?.telefon || '',
        email: standort.ansprechpartner?.email || '',
      },
      ansprechpartnerITId: standort.ansprechpartnerIT?.id || '',
      ansprechpartnerVorOrtId: standort.ansprechpartnerVorOrt?.id || '',
    });
    setBearbeitenDialogOpen(true);
  };

  // Uplink-Typen zu Chips konvertieren
  const getUplinkChips = (uplinks: UplinkTyp[]) => {
    return uplinks.map((uplink, index) => (
      <Chip
        key={index}
        label={uplink.typ}
        size="small"
        variant="outlined"
        sx={{ mr: 0.5, mb: 0.5 }}
        color={uplink.oeffentlicheIpVerfuegbar ? 'primary' : 'default'}
      />
    ));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
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
              Standort-Übersicht
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Verwalten Sie alle OnSite-Anlagen der Westfalen AG
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            size="large"
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

      {/* Standort-Karten */}
      <Grid container spacing={3}>
        {standorte.map((standort) => (
          <Grid item xs={12} sm={6} lg={4} key={standort.id}>
            <Card 
              elevation={3}
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 6,
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <LocationIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="h2">
                    {standort.name}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {standort.adresse}
                </Typography>

                <Divider sx={{ my: 1 }} />

                {/* Statistiken */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center">
                      <RouterIcon color="action" sx={{ mr: 0.5, fontSize: '1rem' }} />
                      <Typography variant="body2">
                        {standort.anzahlGeraete} Geräte
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center">
                      <CableIcon color="action" sx={{ mr: 0.5, fontSize: '1rem' }} />
                      <Typography variant="body2">
                        {standort.anzahlVerbindungen} Verbindungen
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Uplinks */}
                {standort.verfuegbareUplinks && standort.verfuegbareUplinks.length > 0 && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Verfügbare Uplinks:
                    </Typography>
                    <Box>
                      {getUplinkChips(standort.verfuegbareUplinks)}
                    </Box>
                  </Box>
                )}

                {/* Ansprechpartner */}
                <Box sx={{ mt: 2 }}>
                  {standort.ansprechpartnerIT && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary" component="span">
                        IT: {standort.ansprechpartnerIT.name}
                        {standort.ansprechpartnerIT.telefon && ` (${standort.ansprechpartnerIT.telefon})`}
                      </Typography>
                    </Box>
                  )}
                  {standort.ansprechpartnerVorOrt && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary" component="span">
                        Vor Ort: {standort.ansprechpartnerVorOrt.name}
                        {standort.ansprechpartnerVorOrt.telefon && ` (${standort.ansprechpartnerVorOrt.telefon})`}
                      </Typography>
                    </Box>
                  )}
                  {/* Fallback für alte Ansprechpartner */}
                  {!standort.ansprechpartnerIT && !standort.ansprechpartnerVorOrt && standort.ansprechpartner?.name && (
                    <Typography variant="body2" color="text.secondary">
                      Ansprechpartner: {standort.ansprechpartner.name}
                    </Typography>
                  )}
                </Box>
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Box>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => navigate(`/standorte/${standort.name}`)}
                    sx={{ mr: 1 }}
                  >
                    Details
                  </Button>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => oeffneBearbeitungsDialog(standort)}
                  >
                    Bearbeiten
                  </Button>
                </Box>
                <Button
                  size="small"
                  startIcon={<RouterIcon />}
                  onClick={() => navigate(`/diagramm/${standort.name}`)}
                >
                  Diagramm
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Leerer Zustand */}
      {standorte.length === 0 && !loading && (
        <Box textAlign="center" py={6}>
          <LocationIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Noch keine Standorte vorhanden
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Erstellen Sie Ihren ersten Standort, um mit der Dokumentation zu beginnen.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Ersten Standort erstellen
          </Button>
        </Box>
      )}

      {/* Dialog für neuen Standort */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Neuen Standort erstellen</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              label="Standort-Name"
              placeholder="z.B. DELIN1, DELIN2"
              fullWidth
              variant="outlined"
              value={neuStandort.name}
              onChange={(e) => setNeuStandort({ ...neuStandort, name: e.target.value })}
              sx={{ mb: 2 }}
              required
            />
            
            <TextField
              label="Adresse"
              placeholder="Vollständige Adresse des Standorts"
              fullWidth
              multiline
              rows={2}
              variant="outlined"
              value={neuStandort.adresse}
              onChange={(e) => setNeuStandort({ ...neuStandort, adresse: e.target.value })}
              sx={{ mb: 3 }}
              required
            />

            <FormLabel component="legend" sx={{ mb: 2 }}>
              Ansprechpartner
            </FormLabel>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Ansprechpartner IT</InputLabel>
                  <Select
                    value={neuStandort.ansprechpartnerITId}
                    onChange={(e) => setNeuStandort({ ...neuStandort, ansprechpartnerITId: e.target.value })}
                    label="Ansprechpartner IT"
                  >
                    <MenuItem value="">
                      <em>Kein Ansprechpartner</em>
                    </MenuItem>
                    {ansprechpartner.map((person) => (
                      <MenuItem key={person.id} value={person.id}>
                        {person.name} {person.abteilung && `(${person.abteilung})`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Ansprechpartner Vor Ort</InputLabel>
                  <Select
                    value={neuStandort.ansprechpartnerVorOrtId}
                    onChange={(e) => setNeuStandort({ ...neuStandort, ansprechpartnerVorOrtId: e.target.value })}
                    label="Ansprechpartner Vor Ort"
                  >
                    <MenuItem value="">
                      <em>Kein Ansprechpartner</em>
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

            <FormLabel component="legend" sx={{ mb: 2 }}>
              Ansprechpartner (Legacy - optional)
            </FormLabel>
            
            <TextField
              label="Name"
              fullWidth
              variant="outlined"
              value={neuStandort.ansprechpartner.name}
              onChange={(e) => setNeuStandort({
                ...neuStandort,
                ansprechpartner: { ...neuStandort.ansprechpartner, name: e.target.value }
              })}
              sx={{ mb: 2 }}
            />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Telefon"
                  fullWidth
                  variant="outlined"
                  value={neuStandort.ansprechpartner.telefon}
                  onChange={(e) => setNeuStandort({
                    ...neuStandort,
                    ansprechpartner: { ...neuStandort.ansprechpartner, telefon: e.target.value }
                  })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="E-Mail"
                  type="email"
                  fullWidth
                  variant="outlined"
                  value={neuStandort.ansprechpartner.email}
                  onChange={(e) => setNeuStandort({
                    ...neuStandort,
                    ansprechpartner: { ...neuStandort.ansprechpartner, email: e.target.value }
                  })}
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
            onClick={erstelleStandort}
            variant="contained"
            disabled={!neuStandort.name || !neuStandort.adresse}
          >
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog für Standort bearbeiten */}
      <Dialog open={bearbeitenDialogOpen} onClose={() => setBearbeitenDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Standort bearbeiten</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              label="Standort-Name"
              placeholder="z.B. DELIN1, DELIN2"
              fullWidth
              variant="outlined"
              value={bearbeitenStandort.name}
              onChange={(e) => setBearbeitenStandort({ ...bearbeitenStandort, name: e.target.value })}
              sx={{ mb: 2 }}
              required
            />
            
            <TextField
              label="Adresse"
              placeholder="Vollständige Adresse des Standorts"
              fullWidth
              multiline
              rows={2}
              variant="outlined"
              value={bearbeitenStandort.adresse}
              onChange={(e) => setBearbeitenStandort({ ...bearbeitenStandort, adresse: e.target.value })}
              sx={{ mb: 3 }}
              required
            />

            <FormLabel component="legend" sx={{ mb: 2 }}>
              Ansprechpartner
            </FormLabel>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Ansprechpartner IT</InputLabel>
                  <Select
                    value={bearbeitenStandort.ansprechpartnerITId}
                    onChange={(e) => setBearbeitenStandort({ ...bearbeitenStandort, ansprechpartnerITId: e.target.value })}
                    label="Ansprechpartner IT"
                  >
                    <MenuItem value="">
                      <em>Kein Ansprechpartner</em>
                    </MenuItem>
                    {ansprechpartner.map((person) => (
                      <MenuItem key={person.id} value={person.id}>
                        {person.name} {person.abteilung && `(${person.abteilung})`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Ansprechpartner Vor Ort</InputLabel>
                  <Select
                    value={bearbeitenStandort.ansprechpartnerVorOrtId}
                    onChange={(e) => setBearbeitenStandort({ ...bearbeitenStandort, ansprechpartnerVorOrtId: e.target.value })}
                    label="Ansprechpartner Vor Ort"
                  >
                    <MenuItem value="">
                      <em>Kein Ansprechpartner</em>
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

            <FormLabel component="legend" sx={{ mb: 2 }}>
              Ansprechpartner (Legacy - optional)
            </FormLabel>
            
            <TextField
              label="Name"
              fullWidth
              variant="outlined"
              value={bearbeitenStandort.ansprechpartner.name}
              onChange={(e) => setBearbeitenStandort({
                ...bearbeitenStandort,
                ansprechpartner: { ...bearbeitenStandort.ansprechpartner, name: e.target.value }
              })}
              sx={{ mb: 2 }}
            />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Telefon"
                  fullWidth
                  variant="outlined"
                  value={bearbeitenStandort.ansprechpartner.telefon}
                  onChange={(e) => setBearbeitenStandort({
                    ...bearbeitenStandort,
                    ansprechpartner: { ...bearbeitenStandort.ansprechpartner, telefon: e.target.value }
                  })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="E-Mail"
                  type="email"
                  fullWidth
                  variant="outlined"
                  value={bearbeitenStandort.ansprechpartner.email}
                  onChange={(e) => setBearbeitenStandort({
                    ...bearbeitenStandort,
                    ansprechpartner: { ...bearbeitenStandort.ansprechpartner, email: e.target.value }
                  })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBearbeitenDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={aktualisiereStandort}
            variant="contained"
            disabled={!bearbeitenStandort.name || !bearbeitenStandort.adresse}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StandortUebersicht; 