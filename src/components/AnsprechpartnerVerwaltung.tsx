import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  People as PeopleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { Ansprechpartner } from '../types';

const AnsprechpartnerVerwaltung: React.FC = () => {
  const [ansprechpartner, setAnsprechpartner] = useState<Ansprechpartner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bearbeitenDialogOpen, setBearbeitenDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAnsprechpartner, setSelectedAnsprechpartner] = useState<Ansprechpartner | null>(null);
  const [neuAnsprechpartner, setNeuAnsprechpartner] = useState({
    name: '',
    telefon: '',
    email: '',
    abteilung: '',
    firma: '',
    bemerkungen: '',
  });

  // Ansprechpartner laden
  const ladeAnsprechpartner = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ansprechpartner');
      const data = await response.json();
      
      if (data.success) {
        setAnsprechpartner(data.data);
      } else {
        setError(data.error || 'Fehler beim Laden der Ansprechpartner');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Laden der Ansprechpartner:', err);
    } finally {
      setLoading(false);
    }
  };

  // Neuen Ansprechpartner erstellen
  const erstelleAnsprechpartner = async () => {
    try {
      const response = await fetch('/api/ansprechpartner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(neuAnsprechpartner),
      });

      const data = await response.json();
      
      if (data.success) {
        setDialogOpen(false);
        resetForm();
        ladeAnsprechpartner();
      } else {
        setError(data.error || 'Fehler beim Erstellen des Ansprechpartners');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Erstellen des Ansprechpartners:', err);
    }
  };

  // Ansprechpartner aktualisieren
  const aktualisiereAnsprechpartner = async () => {
    try {
      if (!selectedAnsprechpartner) return;

      const response = await fetch(`/api/ansprechpartner/${selectedAnsprechpartner.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedAnsprechpartner),
      });

      const data = await response.json();
      
      if (data.success) {
        setBearbeitenDialogOpen(false);
        setSelectedAnsprechpartner(null);
        ladeAnsprechpartner();
      } else {
        setError(data.error || 'Fehler beim Aktualisieren des Ansprechpartners');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Aktualisieren des Ansprechpartners:', err);
    }
  };

  // Ansprechpartner löschen
  const loescheAnsprechpartner = async () => {
    try {
      if (!selectedAnsprechpartner) return;

      const response = await fetch(`/api/ansprechpartner/${selectedAnsprechpartner.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setDeleteDialogOpen(false);
        setSelectedAnsprechpartner(null);
        ladeAnsprechpartner();
      } else {
        setError(data.error || 'Fehler beim Löschen des Ansprechpartners');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Löschen des Ansprechpartners:', err);
    }
  };

  const resetForm = () => {
    setNeuAnsprechpartner({
      name: '',
      telefon: '',
      email: '',
      abteilung: '',
      firma: '',
      bemerkungen: '',
    });
  };

  const oeffneBearbeitungsDialog = (ansprechpartner: Ansprechpartner) => {
    setSelectedAnsprechpartner({ ...ansprechpartner });
    setBearbeitenDialogOpen(true);
  };

  const oeffneLoeschDialog = (ansprechpartner: Ansprechpartner) => {
    setSelectedAnsprechpartner(ansprechpartner);
    setDeleteDialogOpen(true);
  };

  useEffect(() => {
    ladeAnsprechpartner();
  }, []);

  return (
    <Box>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Ansprechpartner-Verwaltung
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Verwalten Sie alle Ansprechpartner für IT und Vor-Ort-Betreuung
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            size="large"
          >
            Neuer Ansprechpartner
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

      {/* Ansprechpartner-Übersicht */}
      {!loading && (
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Alle Ansprechpartner ({ansprechpartner.length})
          </Typography>
          
          {ansprechpartner.length === 0 ? (
            <Box textAlign="center" py={6}>
              <PeopleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Noch keine Ansprechpartner vorhanden
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Erstellen Sie den ersten Ansprechpartner für Ihre Standorte.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setDialogOpen(true)}
              >
                Ersten Ansprechpartner erstellen
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {ansprechpartner.map((person) => (
                <Grid item xs={12} sm={6} md={4} key={person.id}>
                  <Card elevation={3} sx={{ height: '100%' }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <PeopleIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" component="h3">
                          {person.name}
                        </Typography>
                      </Box>
                      
                      {person.abteilung && (
                        <Chip
                          label={person.abteilung}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mb: 2 }}
                        />
                      )}
                      
                      {person.firma && (
                        <Box display="flex" alignItems="center" mb={1}>
                          <BusinessIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {person.firma}
                          </Typography>
                        </Box>
                      )}
                      
                      {person.telefon && (
                        <Box display="flex" alignItems="center" mb={1}>
                          <PhoneIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {person.telefon}
                          </Typography>
                        </Box>
                      )}
                      
                      {person.email && (
                        <Box display="flex" alignItems="center" mb={1}>
                          <EmailIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                            {person.email}
                          </Typography>
                        </Box>
                      )}
                      
                      {person.bemerkungen && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
                          {person.bemerkungen}
                        </Typography>
                      )}
                    </CardContent>
                    
                    <CardActions sx={{ justifyContent: 'space-between' }}>
                      <Tooltip title="Bearbeiten">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => oeffneBearbeitungsDialog(person)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Löschen">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => oeffneLoeschDialog(person)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}

      {/* Dialog für neuen Ansprechpartner */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Neuen Ansprechpartner erstellen</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  autoFocus
                  label="Name"
                  fullWidth
                  variant="outlined"
                  value={neuAnsprechpartner.name}
                  onChange={(e) => setNeuAnsprechpartner({ ...neuAnsprechpartner, name: e.target.value })}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Abteilung"
                  fullWidth
                  variant="outlined"
                  placeholder="z.B. IT, Technik, Verwaltung"
                  value={neuAnsprechpartner.abteilung}
                  onChange={(e) => setNeuAnsprechpartner({ ...neuAnsprechpartner, abteilung: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Telefon"
                  fullWidth
                  variant="outlined"
                  value={neuAnsprechpartner.telefon}
                  onChange={(e) => setNeuAnsprechpartner({ ...neuAnsprechpartner, telefon: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="E-Mail"
                  type="email"
                  fullWidth
                  variant="outlined"
                  value={neuAnsprechpartner.email}
                  onChange={(e) => setNeuAnsprechpartner({ ...neuAnsprechpartner, email: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Firma"
                  fullWidth
                  variant="outlined"
                  placeholder="z.B. Westfalen AG, Externe Firma"
                  value={neuAnsprechpartner.firma}
                  onChange={(e) => setNeuAnsprechpartner({ ...neuAnsprechpartner, firma: e.target.value })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Bemerkungen"
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                  value={neuAnsprechpartner.bemerkungen}
                  onChange={(e) => setNeuAnsprechpartner({ ...neuAnsprechpartner, bemerkungen: e.target.value })}
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
            onClick={erstelleAnsprechpartner}
            variant="contained"
            disabled={!neuAnsprechpartner.name.trim()}
          >
            Ansprechpartner erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog für Ansprechpartner bearbeiten */}
      <Dialog 
        open={bearbeitenDialogOpen} 
        onClose={() => setBearbeitenDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Ansprechpartner bearbeiten
        </DialogTitle>
        <DialogContent>
          {selectedAnsprechpartner && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    autoFocus
                    label="Name"
                    fullWidth
                    variant="outlined"
                    value={selectedAnsprechpartner.name}
                    onChange={(e) => setSelectedAnsprechpartner({ ...selectedAnsprechpartner, name: e.target.value })}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Abteilung"
                    fullWidth
                    variant="outlined"
                    placeholder="z.B. IT, Technik, Verwaltung"
                    value={selectedAnsprechpartner.abteilung || ''}
                    onChange={(e) => setSelectedAnsprechpartner({ ...selectedAnsprechpartner, abteilung: e.target.value })}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Telefon"
                    fullWidth
                    variant="outlined"
                    value={selectedAnsprechpartner.telefon || ''}
                    onChange={(e) => setSelectedAnsprechpartner({ ...selectedAnsprechpartner, telefon: e.target.value })}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="E-Mail"
                    type="email"
                    fullWidth
                    variant="outlined"
                    value={selectedAnsprechpartner.email || ''}
                    onChange={(e) => setSelectedAnsprechpartner({ ...selectedAnsprechpartner, email: e.target.value })}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Firma"
                    fullWidth
                    variant="outlined"
                    placeholder="z.B. Westfalen AG, Externe Firma"
                    value={selectedAnsprechpartner.firma || ''}
                    onChange={(e) => setSelectedAnsprechpartner({ ...selectedAnsprechpartner, firma: e.target.value })}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Bemerkungen"
                    fullWidth
                    multiline
                    rows={3}
                    variant="outlined"
                    value={selectedAnsprechpartner.bemerkungen || ''}
                    onChange={(e) => setSelectedAnsprechpartner({ ...selectedAnsprechpartner, bemerkungen: e.target.value })}
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
            onClick={aktualisiereAnsprechpartner}
            variant="contained"
            disabled={!selectedAnsprechpartner?.name?.trim()}
          >
            Änderungen speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lösch-Bestätigung Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>
          Ansprechpartner löschen
        </DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie den Ansprechpartner "{selectedAnsprechpartner?.name}" wirklich löschen?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={loescheAnsprechpartner}
            color="error"
            variant="contained"
          >
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AnsprechpartnerVerwaltung; 