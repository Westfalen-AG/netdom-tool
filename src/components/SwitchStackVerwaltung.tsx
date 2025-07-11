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
  Card,
  CardContent,
  CardActions,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Router as RouterIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  Cable as CableIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { SwitchStack, StackMitglied, StackVerbindung } from '../types';
import { StandortContext } from '../App';

const SwitchStackVerwaltung: React.FC = () => {
  const { selectedStandort, selectedStandortData } = useContext(StandortContext);
  
  const [stacks, setStacks] = useState<SwitchStack[]>([]);
  const [verfuegbareSwitches, setVerfuegbareSwitches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStack, setSelectedStack] = useState<any>(null);
  const [stackToDelete, setStackToDelete] = useState<any>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  // Stack-Erstellung States
  const [neuerStack, setNeuerStack] = useState({
    name: '',
    beschreibung: '',
    mitglieder: [] as any[],
    stackVerbindungen: [] as any[]
  });

  // Stack-Bearbeitung States
  const [bearbeitetStack, setBearbeitetStack] = useState({
    id: '',
    name: '',
    beschreibung: '',
    mitglieder: [] as any[],
    stackVerbindungen: [] as any[]
  });

  const steps = ['Stack-Informationen', 'Switches auswählen', 'Stack-Verbindungen konfigurieren'];

  // Switch-Stacks laden
  const ladeStacks = async (standortId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/standorte/${standortId}/stacks`);
      const data = await response.json();
      
      if (data.success) {
        setStacks(data.data);
      } else {
        setError(data.error || 'Fehler beim Laden der Switch-Stacks');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Laden der Switch-Stacks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Verfügbare Switches laden
  const ladeVerfuegbareSwitches = async (standortId: string) => {
    try {
      const response = await fetch(`/api/standorte/${standortId}/verfuegbare-switches`);
      const data = await response.json();
      
      if (data.success) {
        setVerfuegbareSwitches(data.data);
      } else {
        console.error('Fehler beim Laden verfügbarer Switches:', data.error);
      }
    } catch (err) {
      console.error('Fehler beim Laden verfügbarer Switches:', err);
    }
  };

  // Stack erstellen
  const erstelleStack = async () => {
    try {
      if (!selectedStandort) return;

      setSubmitting(true);
      const response = await fetch(`/api/standorte/${selectedStandort}/stacks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(neuerStack),
      });

      const data = await response.json();
      
      if (data.success) {
        setDialogOpen(false);
        resetStackForm();
        ladeStacks(selectedStandort);
        ladeVerfuegbareSwitches(selectedStandort);
      } else {
        setError(data.error || 'Fehler beim Erstellen des Switch-Stacks');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Erstellen des Switch-Stacks:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Stack bearbeiten
  const bearbeiteStack = async () => {
    try {
      setEditing(true);
      const response = await fetch(`/api/stacks/${bearbeitetStack.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: bearbeitetStack.name,
          beschreibung: bearbeitetStack.beschreibung,
          mitglieder: bearbeitetStack.mitglieder,
          stackVerbindungen: bearbeitetStack.stackVerbindungen
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setEditDialogOpen(false);
        setBearbeitetStack({
          id: '',
          name: '',
          beschreibung: '',
          mitglieder: [],
          stackVerbindungen: []
        });
        if (selectedStandort) {
          ladeStacks(selectedStandort);
          ladeVerfuegbareSwitches(selectedStandort);
        }
      } else {
        setError(data.error || 'Fehler beim Bearbeiten des Switch-Stacks');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Bearbeiten des Switch-Stacks:', err);
    } finally {
      setEditing(false);
    }
  };

  const resetStackForm = () => {
    setNeuerStack({
      name: '',
      beschreibung: '',
      mitglieder: [],
      stackVerbindungen: []
    });
    setActiveStep(0);
  };

  // Switch zu Stack hinzufügen
  const addSwitchToStack = (switchId: string) => {
    const switchGeraet = verfuegbareSwitches.find(s => s.id === switchId);
    if (!switchGeraet) return;

    const nextStackNumber = neuerStack.mitglieder.length + 1;
    const newMitglied = {
      geraetId: switchId,
      stackNummer: nextStackNumber,
      prioritaet: 0,
      geraet: switchGeraet
    };

    setNeuerStack({
      ...neuerStack,
      mitglieder: [...neuerStack.mitglieder, newMitglied]
    });
  };

  // Switch aus Stack entfernen
  const removeSwitchFromStack = (geraetId: string) => {
    const newMitglieder = neuerStack.mitglieder
      .filter(m => m.geraetId !== geraetId)
      .map((m, index) => ({ ...m, stackNummer: index + 1 }));

    setNeuerStack({
      ...neuerStack,
      mitglieder: newMitglieder
    });
  };

  // Stack-Verbindung hinzufügen
  const addStackVerbindung = () => {
    if (neuerStack.mitglieder.length < 2) return;

    const newVerbindung = {
      quellGeraetId: neuerStack.mitglieder[0].geraetId,
      quellPort: 1,
      zielGeraetId: neuerStack.mitglieder[1].geraetId,
      zielPort: 1,
      verbindungstyp: 'SFP/SFP+',
      kategorie: '',
      farbe: '',
      bemerkungen: ''
    };

    setNeuerStack({
      ...neuerStack,
      stackVerbindungen: [...neuerStack.stackVerbindungen, newVerbindung]
    });
  };

  // Stepper Navigation
  const handleNext = () => {
    if (activeStep === 0 && (!neuerStack.name || neuerStack.name.trim() === '')) {
      setError('Bitte geben Sie einen Stack-Namen ein');
      return;
    }
    if (activeStep === 1 && neuerStack.mitglieder.length < 2) {
      setError('Ein Stack muss mindestens 2 Switches enthalten');
      return;
    }
    setActiveStep((prevStep) => prevStep + 1);
    setError(null);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  // Stack löschen
  const loescheStack = async () => {
    if (!stackToDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/stacks/${stackToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setDeleteDialogOpen(false);
        setStackToDelete(null);
        if (selectedStandort) {
          ladeStacks(selectedStandort);
          ladeVerfuegbareSwitches(selectedStandort);
        }
      } else {
        setError(data.error || 'Fehler beim Löschen des Switch-Stacks');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Löschen des Switch-Stacks:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteClick = (stack: any) => {
    setStackToDelete(stack);
    setDeleteDialogOpen(true);
  };

  // Stack zum Bearbeiten öffnen
  const handleEditClick = (stack: any) => {
    setBearbeitetStack({
      id: stack.id,
      name: stack.name,
      beschreibung: stack.beschreibung || '',
      mitglieder: stack.mitglieder || [],
      stackVerbindungen: stack.stackVerbindungen || []
    });
    setEditDialogOpen(true);
  };

  useEffect(() => {
    if (selectedStandort) {
      ladeStacks(selectedStandort);
      ladeVerfuegbareSwitches(selectedStandort);
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
            Bitte wählen Sie einen Standort in der oberen Navigationsleiste aus, um Switch-Stacks zu verwalten.
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
              Switch-Stack Verwaltung: {selectedStandortData?.name}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Verwalten Sie Switch-Stacks für redundante Netzwerkinfrastruktur am ausgewählten Standort
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            size="large"
          >
            Neuer Stack
          </Button>
        </Box>
      </Paper>

      {/* Fehler-Anzeige */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stack-Übersicht */}
      {selectedStandort && !loading && (
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Switch-Stacks am Standort: {selectedStandortData?.name}
          </Typography>
          
          {stacks.length === 0 ? (
            <Box textAlign="center" py={6}>
              <RouterIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Noch keine Switch-Stacks vorhanden
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Erstellen Sie den ersten Switch-Stack für diesen Standort.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setDialogOpen(true)}
              >
                Ersten Stack erstellen
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {stacks.map((stack) => (
                <Grid item xs={12} sm={6} md={4} key={stack.id}>
                  <Card elevation={3}>
                    <CardContent>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {stack.name}
                      </Typography>
                      {stack.beschreibung && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {stack.beschreibung}
                        </Typography>
                      )}
                      <Chip
                        label={`${stack.mitglieder ? stack.mitglieder.length : 0} Switches`}
                        size="small"
                        color="primary"
                        sx={{ mb: 1 }}
                      />
                      {stack.mitglieder && stack.mitglieder.map((mitglied: any) => (
                        <Typography key={mitglied.id} variant="body2" sx={{ ml: 1 }}>
                          • Stack {mitglied.stack_nummer}: {mitglied.geraet_name}
                        </Typography>
                      ))}
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        startIcon={<ViewIcon />}
                        onClick={() => {
                          setSelectedStack(stack);
                          setDetailDialogOpen(true);
                        }}
                      >
                        Details
                      </Button>
                      <Button 
                        size="small" 
                        color="primary"
                        startIcon={<EditIcon />}
                        onClick={() => handleEditClick(stack)}
                      >
                        Bearbeiten
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteClick(stack)}
                      >
                        Löschen
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}

      {/* Dialog für Stack-Erstellung */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Neuen Switch-Stack erstellen</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Schritt 1: Stack-Informationen */}
            {activeStep === 0 && (
              <Box>
                <TextField
                  autoFocus
                  label="Stack-Name"
                  placeholder="z.B. Core-Stack-1"
                  fullWidth
                  variant="outlined"
                  value={neuerStack.name}
                  onChange={(e) => setNeuerStack({ ...neuerStack, name: e.target.value })}
                  sx={{ mb: 2 }}
                  required
                />
                <TextField
                  label="Beschreibung (optional)"
                  placeholder="Beschreibung des Switch-Stacks"
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                  value={neuerStack.beschreibung}
                  onChange={(e) => setNeuerStack({ ...neuerStack, beschreibung: e.target.value })}
                />
              </Box>
            )}

            {/* Schritt 2: Switch-Auswahl */}
            {activeStep === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Verfügbare Switches
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {verfuegbareSwitches
                    .filter(s => !neuerStack.mitglieder.find(m => m.geraetId === s.id))
                    .map((switchGeraet) => (
                    <Grid item xs={12} sm={6} md={4} key={switchGeraet.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1">{switchGeraet.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {switchGeraet.modell}
                          </Typography>
                          <Typography variant="body2">
                            Ports: {switchGeraet.anzahlNetzwerkports}
                          </Typography>
                          {switchGeraet.ipKonfiguration?.ipAdresse && (
                            <Typography variant="body2" color="text.secondary">
                              IP: {switchGeraet.ipKonfiguration.ipAdresse}
                            </Typography>
                          )}
                        </CardContent>
                        <CardActions>
                          <Button 
                            size="small" 
                            onClick={() => addSwitchToStack(switchGeraet.id)}
                            startIcon={<AddIcon />}
                          >
                            Hinzufügen
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {neuerStack.mitglieder.length > 0 && (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Stack-Mitglieder
                    </Typography>
                    <List>
                      {neuerStack.mitglieder.map((mitglied) => (
                        <ListItem key={mitglied.geraetId}>
                          <ListItemText
                            primary={`Stack ${mitglied.stackNummer}: ${mitglied.geraet?.name}`}
                            secondary={`${mitglied.geraet?.modell} • ${mitglied.geraet?.anzahlNetzwerkports} Ports`}
                          />
                          <IconButton 
                              edge="end" 
                              onClick={() => removeSwitchFromStack(mitglied.geraetId)}
                            >
                              <DeleteIcon />
                            </IconButton>
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}
              </Box>
            )}

            {/* Schritt 3: Stack-Verbindungen */}
            {activeStep === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Stack-Verbindungen konfigurieren
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Konfigurieren Sie die physischen Verbindungen zwischen den Switches im Stack.
                </Typography>

                <Button 
                  variant="outlined" 
                  startIcon={<CableIcon />}
                  onClick={addStackVerbindung}
                  sx={{ mb: 2 }}
                  disabled={neuerStack.mitglieder.length < 2}
                >
                  Verbindung hinzufügen
                </Button>

                {neuerStack.stackVerbindungen.map((verbindung, index) => (
                  <Card key={index} sx={{ mb: 2 }}>
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Quell-Switch</InputLabel>
                            <Select
                              value={verbindung.quellGeraetId}
                              onChange={(e) => {
                                const newVerbindungen = [...neuerStack.stackVerbindungen];
                                newVerbindungen[index].quellGeraetId = e.target.value;
                                setNeuerStack({ ...neuerStack, stackVerbindungen: newVerbindungen });
                              }}
                            >
                              {neuerStack.mitglieder.map((mitglied) => (
                                <MenuItem key={mitglied.geraetId} value={mitglied.geraetId}>
                                  Stack {mitglied.stackNummer}: {mitglied.geraet?.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Quell-Port"
                            type="number"
                            fullWidth
                            value={verbindung.quellPort}
                            onChange={(e) => {
                              const newVerbindungen = [...neuerStack.stackVerbindungen];
                              newVerbindungen[index].quellPort = parseInt(e.target.value) || 1;
                              setNeuerStack({ ...neuerStack, stackVerbindungen: newVerbindungen });
                            }}
                            inputProps={{ min: 1, max: 48 }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Ziel-Switch</InputLabel>
                            <Select
                              value={verbindung.zielGeraetId}
                              onChange={(e) => {
                                const newVerbindungen = [...neuerStack.stackVerbindungen];
                                newVerbindungen[index].zielGeraetId = e.target.value;
                                setNeuerStack({ ...neuerStack, stackVerbindungen: newVerbindungen });
                              }}
                            >
                              {neuerStack.mitglieder.map((mitglied) => (
                                <MenuItem key={mitglied.geraetId} value={mitglied.geraetId}>
                                  Stack {mitglied.stackNummer}: {mitglied.geraet?.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Ziel-Port"
                            type="number"
                            fullWidth
                            value={verbindung.zielPort}
                            onChange={(e) => {
                              const newVerbindungen = [...neuerStack.stackVerbindungen];
                              newVerbindungen[index].zielPort = parseInt(e.target.value) || 1;
                              setNeuerStack({ ...neuerStack, stackVerbindungen: newVerbindungen });
                            }}
                            inputProps={{ min: 1, max: 48 }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Verbindungstyp</InputLabel>
                            <Select
                              value={verbindung.verbindungstyp}
                              onChange={(e) => {
                                const newVerbindungen = [...neuerStack.stackVerbindungen];
                                newVerbindungen[index].verbindungstyp = e.target.value;
                                setNeuerStack({ ...neuerStack, stackVerbindungen: newVerbindungen });
                              }}
                            >
                              <MenuItem value="RJ45">RJ45</MenuItem>
                              <MenuItem value="SFP/SFP+">SFP/SFP+</MenuItem>
                              <MenuItem value="Coax">Coax</MenuItem>
                              <MenuItem value="Sonstiges">Sonstiges</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Kategorie"
                            fullWidth
                            variant="outlined"
                            placeholder="z.B. Cat6a, DAC, Singlemode, Multimode"
                            value={verbindung.kategorie || ''}
                            onChange={(e) => {
                              const newVerbindungen = [...neuerStack.stackVerbindungen];
                              newVerbindungen[index].kategorie = e.target.value;
                              setNeuerStack({ ...neuerStack, stackVerbindungen: newVerbindungen });
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Kabelfarbe"
                            fullWidth
                            variant="outlined"
                            placeholder="z.B. Orange, Blau, Grün"
                            value={verbindung.farbe || ''}
                            onChange={(e) => {
                              const newVerbindungen = [...neuerStack.stackVerbindungen];
                              newVerbindungen[index].farbe = e.target.value;
                              setNeuerStack({ ...neuerStack, stackVerbindungen: newVerbindungen });
                            }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label="Bemerkungen (optional)"
                            fullWidth
                            multiline
                            rows={2}
                            value={verbindung.bemerkungen || ''}
                            onChange={(e) => {
                              const newVerbindungen = [...neuerStack.stackVerbindungen];
                              newVerbindungen[index].bemerkungen = e.target.value;
                              setNeuerStack({ ...neuerStack, stackVerbindungen: newVerbindungen });
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sx={{ textAlign: 'right' }}>
                          <Button
                            color="error"
                            onClick={() => {
                              const newVerbindungen = neuerStack.stackVerbindungen.filter((_, i) => i !== index);
                              setNeuerStack({ ...neuerStack, stackVerbindungen: newVerbindungen });
                            }}
                            startIcon={<DeleteIcon />}
                          >
                            Verbindung entfernen
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}

                {neuerStack.stackVerbindungen.length === 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Fügen Sie mindestens eine Stack-Verbindung hinzu, um die Switches physisch zu verbinden.
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDialogOpen(false);
            resetStackForm();
          }}>
            Abbrechen
          </Button>
          {activeStep > 0 && (
            <Button onClick={handleBack}>
              Zurück
            </Button>
          )}
          {activeStep < steps.length - 1 ? (
            <Button onClick={handleNext} variant="contained">
              Weiter
            </Button>
          ) : (
            <Button 
              onClick={erstelleStack}
              variant="contained"
              disabled={neuerStack.mitglieder.length < 2 || submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : null}
            >
              {submitting ? 'Erstelle Stack...' : 'Stack erstellen'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Stack-Details: {selectedStack?.name}
        </DialogTitle>
        <DialogContent>
          {selectedStack && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="h6" gutterBottom>
                Stack-Mitglieder
              </Typography>
              {/* This table is now managed by the global StandortContext */}
              {/* <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Stack #</TableCell>
                      <TableCell>Switch Name</TableCell>
                      <TableCell>Modell</TableCell>
                      <TableCell>Priorität</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedStack.mitglieder && selectedStack.mitglieder.map((mitglied: any) => (
                      <TableRow key={mitglied.id}>
                        <TableCell>{mitglied.stack_nummer}</TableCell>
                        <TableCell>{mitglied.geraet_name}</TableCell>
                        <TableCell>{mitglied.modell}</TableCell>
                        <TableCell>{mitglied.prioritaet}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer> */}

              {selectedStack.mitglieder && selectedStack.mitglieder.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Stack-Mitglieder
                  </Typography>
                  <List>
                    {selectedStack.mitglieder.map((mitglied: any) => (
                      <ListItem key={mitglied.id}>
                        <ListItemText
                          primary={`Stack ${mitglied.stack_nummer}: ${mitglied.geraet_name}`}
                          secondary={`${mitglied.modell} • ${mitglied.anzahlNetzwerkports} Ports`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}

              {selectedStack.stackVerbindungen && selectedStack.stackVerbindungen.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Stack-Verbindungen
                  </Typography>
                  {/* This table is now managed by the global StandortContext */}
                  {/* <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Von</TableCell>
                          <TableCell>Port</TableCell>
                          <TableCell>Nach</TableCell>
                          <TableCell>Port</TableCell>
                          <TableCell>Typ</TableCell>
                          <TableCell>Kategorie</TableCell>
                          <TableCell>Farbe</TableCell>
                          <TableCell>Bemerkungen</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedStack.stackVerbindungen.map((verbindung: any) => (
                          <TableRow key={verbindung.id}>
                            <TableCell>{verbindung.quell_geraet_name}</TableCell>
                            <TableCell>{verbindung.quell_port}</TableCell>
                            <TableCell>{verbindung.ziel_geraet_name}</TableCell>
                            <TableCell>{verbindung.ziel_port}</TableCell>
                            <TableCell>{verbindung.verbindungstyp}</TableCell>
                            <TableCell>{verbindung.kategorie || '-'}</TableCell>
                            <TableCell>{verbindung.farbe || '-'}</TableCell>
                            <TableCell>{verbindung.bemerkungen || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer> */}
                  <List>
                    {selectedStack.stackVerbindungen.map((verbindung: any, index: number) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={`${verbindung.quell_geraet_name} (Port ${verbindung.quell_port}) -> ${verbindung.ziel_geraet_name} (Port ${verbindung.ziel_port})`}
                          secondary={`Typ: ${verbindung.verbindungstyp}, Kategorie: ${verbindung.kategorie || '-'}, Farbe: ${verbindung.farbe || '-'}, Bemerkungen: ${verbindung.bemerkungen || '-'}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bearbeiten Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Switch-Stack bearbeiten: {bearbeitetStack.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Stack-Informationen */}
            <Typography variant="h6" gutterBottom>
              Stack-Informationen
            </Typography>
            <TextField
              label="Stack-Name"
              fullWidth
              variant="outlined"
              value={bearbeitetStack.name}
              onChange={(e) => setBearbeitetStack({ ...bearbeitetStack, name: e.target.value })}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              label="Beschreibung (optional)"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={bearbeitetStack.beschreibung}
              onChange={(e) => setBearbeitetStack({ ...bearbeitetStack, beschreibung: e.target.value })}
              sx={{ mb: 3 }}
            />

            {/* Stack-Verbindungen bearbeiten */}
            <Typography variant="h6" gutterBottom>
              Stack-Verbindungen
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Bearbeiten Sie die physischen Verbindungen zwischen den Switches im Stack.
            </Typography>

            <Button 
              variant="outlined" 
              startIcon={<CableIcon />}
              onClick={() => {
                const newVerbindung = {
                  quellGeraetId: bearbeitetStack.mitglieder[0]?.geraet_id || '',
                  quellPort: 1,
                  zielGeraetId: bearbeitetStack.mitglieder[1]?.geraet_id || '',
                  zielPort: 1,
                  verbindungstyp: 'SFP/SFP+',
                  kategorie: '',
                  farbe: '',
                  bemerkungen: ''
                };
                setBearbeitetStack({
                  ...bearbeitetStack,
                  stackVerbindungen: [...bearbeitetStack.stackVerbindungen, newVerbindung]
                });
              }}
              sx={{ mb: 2 }}
              disabled={bearbeitetStack.mitglieder.length < 2}
            >
              Verbindung hinzufügen
            </Button>

            {bearbeitetStack.stackVerbindungen.map((verbindung: any, index: number) => (
              <Card key={index} sx={{ mb: 2 }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Quell-Switch</InputLabel>
                        <Select
                          value={verbindung.quellGeraetId || verbindung.quell_geraet_id}
                          onChange={(e) => {
                            const newVerbindungen = [...bearbeitetStack.stackVerbindungen];
                            newVerbindungen[index] = { ...newVerbindungen[index], quellGeraetId: e.target.value };
                            setBearbeitetStack({ ...bearbeitetStack, stackVerbindungen: newVerbindungen });
                          }}
                        >
                          {bearbeitetStack.mitglieder.map((mitglied: any) => (
                            <MenuItem key={mitglied.geraet_id || mitglied.id} value={mitglied.geraet_id || mitglied.id}>
                              Stack {mitglied.stack_nummer}: {mitglied.geraet_name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Quell-Port"
                        type="number"
                        fullWidth
                        value={verbindung.quellPort || verbindung.quell_port}
                        onChange={(e) => {
                          const newVerbindungen = [...bearbeitetStack.stackVerbindungen];
                          newVerbindungen[index] = { ...newVerbindungen[index], quellPort: parseInt(e.target.value) || 1 };
                          setBearbeitetStack({ ...bearbeitetStack, stackVerbindungen: newVerbindungen });
                        }}
                        inputProps={{ min: 1, max: 48 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Ziel-Switch</InputLabel>
                        <Select
                          value={verbindung.zielGeraetId || verbindung.ziel_geraet_id}
                          onChange={(e) => {
                            const newVerbindungen = [...bearbeitetStack.stackVerbindungen];
                            newVerbindungen[index] = { ...newVerbindungen[index], zielGeraetId: e.target.value };
                            setBearbeitetStack({ ...bearbeitetStack, stackVerbindungen: newVerbindungen });
                          }}
                        >
                          {bearbeitetStack.mitglieder.map((mitglied: any) => (
                            <MenuItem key={mitglied.geraet_id || mitglied.id} value={mitglied.geraet_id || mitglied.id}>
                              Stack {mitglied.stack_nummer}: {mitglied.geraet_name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Ziel-Port"
                        type="number"
                        fullWidth
                        value={verbindung.zielPort || verbindung.ziel_port}
                        onChange={(e) => {
                          const newVerbindungen = [...bearbeitetStack.stackVerbindungen];
                          newVerbindungen[index] = { ...newVerbindungen[index], zielPort: parseInt(e.target.value) || 1 };
                          setBearbeitetStack({ ...bearbeitetStack, stackVerbindungen: newVerbindungen });
                        }}
                        inputProps={{ min: 1, max: 48 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Verbindungstyp</InputLabel>
                        <Select
                          value={verbindung.verbindungstyp}
                          onChange={(e) => {
                            const newVerbindungen = [...bearbeitetStack.stackVerbindungen];
                            newVerbindungen[index] = { ...newVerbindungen[index], verbindungstyp: e.target.value };
                            setBearbeitetStack({ ...bearbeitetStack, stackVerbindungen: newVerbindungen });
                          }}
                        >
                          <MenuItem value="RJ45">RJ45</MenuItem>
                          <MenuItem value="SFP/SFP+">SFP/SFP+</MenuItem>
                          <MenuItem value="Coax">Coax</MenuItem>
                          <MenuItem value="Sonstiges">Sonstiges</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Kategorie"
                        fullWidth
                        variant="outlined"
                        placeholder="z.B. Cat6a, DAC, Singlemode, Multimode"
                        value={verbindung.kategorie || ''}
                        onChange={(e) => {
                          const newVerbindungen = [...bearbeitetStack.stackVerbindungen];
                          newVerbindungen[index] = { ...newVerbindungen[index], kategorie: e.target.value };
                          setBearbeitetStack({ ...bearbeitetStack, stackVerbindungen: newVerbindungen });
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Kabelfarbe"
                        fullWidth
                        variant="outlined"
                        placeholder="z.B. Orange, Blau, Grün"
                        value={verbindung.farbe || ''}
                        onChange={(e) => {
                          const newVerbindungen = [...bearbeitetStack.stackVerbindungen];
                          newVerbindungen[index] = { ...newVerbindungen[index], farbe: e.target.value };
                          setBearbeitetStack({ ...bearbeitetStack, stackVerbindungen: newVerbindungen });
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Bemerkungen (optional)"
                        fullWidth
                        multiline
                        rows={2}
                        value={verbindung.bemerkungen || ''}
                        onChange={(e) => {
                          const newVerbindungen = [...bearbeitetStack.stackVerbindungen];
                          newVerbindungen[index] = { ...newVerbindungen[index], bemerkungen: e.target.value };
                          setBearbeitetStack({ ...bearbeitetStack, stackVerbindungen: newVerbindungen });
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sx={{ textAlign: 'right' }}>
                      <Button
                        color="error"
                        onClick={() => {
                          const newVerbindungen = bearbeitetStack.stackVerbindungen.filter((_, i: number) => i !== index);
                          setBearbeitetStack({ ...bearbeitetStack, stackVerbindungen: newVerbindungen });
                        }}
                        startIcon={<DeleteIcon />}
                      >
                        Verbindung entfernen
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}

            {bearbeitetStack.stackVerbindungen.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Fügen Sie mindestens eine Stack-Verbindung hinzu, um die Switches physisch zu verbinden.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={bearbeiteStack}
            variant="contained"
            disabled={!bearbeitetStack.name || editing}
            startIcon={editing ? <CircularProgress size={20} /> : <EditIcon />}
          >
            {editing ? 'Speichere...' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lösch-Bestätigungs-Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Switch-Stack löschen</DialogTitle>
        <DialogContent>
          <Typography>
            Sind Sie sicher, dass Sie den Switch-Stack "<strong>{stackToDelete?.name}</strong>" löschen möchten?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Diese Aktion kann nicht rückgängig gemacht werden. Alle Stack-Verbindungen werden entfernt 
            und die beteiligten Ports werden wieder als frei markiert.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={loescheStack}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? 'Lösche...' : 'Löschen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SwitchStackVerwaltung; 