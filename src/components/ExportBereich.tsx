import React, { useState, useEffect, useRef } from 'react';
import {
  Typography,
  Box,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Card,
  CardContent,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  FormGroup,
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  LocationOn as LocationIcon,
  Router as RouterIcon,
  Cable as CableIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Standort, Geraet, Verbindung } from '../types';
import RackVisualisierung from './RackVisualisierung';

const ExportBereich: React.FC = () => {
  const [standorte, setStandorte] = useState<Standort[]>([]);
  const [selectedStandort, setSelectedStandort] = useState<string>('');
  const [standortData, setStandortData] = useState<{
    standort: Standort | null;
    geraete: Geraet[];
    verbindungen: Verbindung[];
  }>({
    standort: null,
    geraete: [],
    verbindungen: [],
  });
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportOptions, setExportOptions] = useState({
    standortDetails: true,
    geraeteUebersicht: true,
    verbindungsDetails: true,
    rackVisualisierung: true,
  });

  const exportRef = useRef<HTMLDivElement>(null);

  // Standorte laden
  const ladeStandorte = async () => {
    try {
      const response = await fetch('/api/standorte');
      const data = await response.json();
      if (data.success) {
        setStandorte(data.data);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Standorte:', err);
      setError('Fehler beim Laden der Standorte');
    }
  };

  // Standort-Daten laden
  const ladeStandortDaten = async (standortId: string) => {
    if (!standortId) return;

    try {
      setLoading(true);
      setError(null);

      // Standort-Details
      const standortResponse = await fetch(`/api/standorte/${standortId}`);
      const standortData = await standortResponse.json();

      // Geräte
      const geraeteResponse = await fetch(`/api/standorte/${standortId}/geraete`);
      const geraeteData = await geraeteResponse.json();

      // Verbindungen
      const verbindungenResponse = await fetch(`/api/standorte/${standortId}/verbindungen`);
      const verbindungenData = await verbindungenResponse.json();

      if (standortData.success && geraeteData.success && verbindungenData.success) {
        setStandortData({
          standort: standortData.data,
          geraete: geraeteData.data,
          verbindungen: verbindungenData.data,
        });
      } else {
        setError('Fehler beim Laden der Standort-Daten');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Standort-Daten:', err);
      setError('Fehler beim Laden der Standort-Daten');
    } finally {
      setLoading(false);
    }
  };

  // PNG Export
  const exportAsPNG = async () => {
    if (!exportRef.current) return;

    try {
      setExportLoading(true);
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `${standortData.standort?.name || 'standort'}_export.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) {
      console.error('Fehler beim PNG-Export:', err);
      setError('Fehler beim PNG-Export');
    } finally {
      setExportLoading(false);
    }
  };

  // PDF Export
  const exportAsPDF = async () => {
    if (!exportRef.current) return;

    try {
      setExportLoading(true);
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${standortData.standort?.name || 'standort'}_export.pdf`);
    } catch (err) {
      console.error('Fehler beim PDF-Export:', err);
      setError('Fehler beim PDF-Export');
    } finally {
      setExportLoading(false);
    }
  };

  // Geräte nach Typ gruppieren
  const geraeteNachTyp = standortData.geraete.reduce((acc, geraet) => {
    if (!acc[geraet.geraetetyp]) {
      acc[geraet.geraetetyp] = [];
    }
    acc[geraet.geraetetyp].push(geraet);
    return acc;
  }, {} as Record<string, Geraet[]>);

  useEffect(() => {
    ladeStandorte();
  }, []);

  useEffect(() => {
    if (selectedStandort) {
      ladeStandortDaten(selectedStandort);
    }
  }, [selectedStandort]);

  return (
    <Box>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Export-Bereich
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Exportieren Sie detaillierte Standort-Dokumentationen als PNG oder PDF
        </Typography>
      </Paper>

      {/* Fehler-Anzeige */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Kontrollbereich */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="flex-end">
          {/* Standort-Auswahl */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
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
          </Grid>

          {/* Export-Optionen */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              Export-Inhalte
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={exportOptions.standortDetails}
                    onChange={(e) =>
                      setExportOptions({ ...exportOptions, standortDetails: e.target.checked })
                    }
                  />
                }
                label="Standort-Details"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={exportOptions.geraeteUebersicht}
                    onChange={(e) =>
                      setExportOptions({ ...exportOptions, geraeteUebersicht: e.target.checked })
                    }
                  />
                }
                label="Geräte-Übersicht"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={exportOptions.verbindungsDetails}
                    onChange={(e) =>
                      setExportOptions({ ...exportOptions, verbindungsDetails: e.target.checked })
                    }
                  />
                }
                label="Verbindungs-Details"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={exportOptions.rackVisualisierung}
                    onChange={(e) =>
                      setExportOptions({ ...exportOptions, rackVisualisierung: e.target.checked })
                    }
                  />
                }
                label="Rack-Visualisierung"
              />
            </FormGroup>
          </Grid>

          {/* Export-Buttons */}
          <Grid item xs={12} md={4}>
            <Box display="flex" gap={2} flexDirection="column">
              <Button
                variant="contained"
                startIcon={exportLoading ? <CircularProgress size={20} /> : <ImageIcon />}
                onClick={exportAsPNG}
                disabled={!selectedStandort || loading || exportLoading}
                fullWidth
              >
                Als PNG exportieren
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={exportLoading ? <CircularProgress size={20} /> : <PdfIcon />}
                onClick={exportAsPDF}
                disabled={!selectedStandort || loading || exportLoading}
                fullWidth
              >
                Als PDF exportieren
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Vorschau / Export-Inhalt */}
      {selectedStandort && !loading && standortData.standort && (
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Vorschau
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <div ref={exportRef} style={{ backgroundColor: 'white', padding: '20px', color: '#000000' }}>
            {/* Header für Export */}
            <Box sx={{ mb: 4, borderBottom: '2px solid #c62828', pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <img 
                  src="/logo_schrift_schwarz.png" 
                  alt="Westfalen AG Logo" 
                  style={{ 
                    height: '60px', 
                    objectFit: 'contain'
                  }} 
                />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h4" component="h1" sx={{ color: '#c62828', fontWeight: 'bold' }}>
                    Netzwerk Dokumentation
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1, color: '#000000' }}>
                    Standort: {standortData.standort.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666666' }}>
                    Exportiert am: {new Date().toLocaleDateString('de-DE')}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Standort-Details */}
            {exportOptions.standortDetails && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#c62828', borderBottom: '1px solid #e0e0e0', pb: 1 }}>
                  <LocationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Standort-Details
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" sx={{ color: '#000000' }}>Adresse:</Typography>
                    <Typography variant="body2" sx={{ color: '#333333' }}>{standortData.standort.adresse}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" sx={{ color: '#000000' }}>Anzahl Geräte:</Typography>
                    <Typography variant="body2" sx={{ color: '#333333' }}>{standortData.geraete.length}</Typography>
                  </Grid>
                </Grid>

                {/* Ansprechpartner */}
                {(standortData.standort.ansprechpartnerIT || standortData.standort.ansprechpartnerVorOrt) && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ color: '#000000' }}>Ansprechpartner:</Typography>
                    <Grid container spacing={2}>
                      {standortData.standort.ansprechpartnerIT && (
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ color: '#333333' }}><strong>IT:</strong> {standortData.standort.ansprechpartnerIT.name}</Typography>
                          {standortData.standort.ansprechpartnerIT.telefon && (
                            <Typography variant="body2" sx={{ color: '#333333' }}>Tel: {standortData.standort.ansprechpartnerIT.telefon}</Typography>
                          )}
                          {standortData.standort.ansprechpartnerIT.email && (
                            <Typography variant="body2" sx={{ color: '#333333' }}>Email: {standortData.standort.ansprechpartnerIT.email}</Typography>
                          )}
                        </Grid>
                      )}
                      {standortData.standort.ansprechpartnerVorOrt && (
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ color: '#333333' }}><strong>Vor Ort:</strong> {standortData.standort.ansprechpartnerVorOrt.name}</Typography>
                          {standortData.standort.ansprechpartnerVorOrt.telefon && (
                            <Typography variant="body2" sx={{ color: '#333333' }}>Tel: {standortData.standort.ansprechpartnerVorOrt.telefon}</Typography>
                          )}
                          {standortData.standort.ansprechpartnerVorOrt.email && (
                            <Typography variant="body2" sx={{ color: '#333333' }}>Email: {standortData.standort.ansprechpartnerVorOrt.email}</Typography>
                          )}
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}
              </Box>
            )}

            {/* Geräte-Übersicht */}
            {exportOptions.geraeteUebersicht && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#c62828', borderBottom: '1px solid #e0e0e0', pb: 1 }}>
                  <RouterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Geräte-Übersicht
                </Typography>
                <TableContainer>
                  <Table size="small" sx={{ 
                    '& .MuiTableCell-root': { 
                      color: '#000000',
                      borderColor: '#e0e0e0'
                    }
                  }}>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell><strong>Typ</strong></TableCell>
                        <TableCell><strong>Modell</strong></TableCell>
                        <TableCell><strong>IP-Konfiguration</strong></TableCell>
                        <TableCell><strong>Ports</strong></TableCell>
                        <TableCell><strong>Standort/Raum</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[...standortData.geraete]
                        .sort((a, b) => {
                          // Sortierung wie in StandortDetails: Modem -> SD-WAN -> Firewall -> Switch -> APs -> Rest
                          const reihenfolge = [
                            'Router', // Modem
                            'SD-WAN Gateway',
                            'Firewall', 
                            'Switch',
                            'Access Point',
                            'Server',
                            'Kamera',
                            'VOIP-Phone',
                            'Drucker',
                            'NVR',
                            'Sensor',
                            'AI-Port',
                            'Zugangskontrolle',
                            'Serial Server',
                            'HMI'
                          ];
                          const indexA = reihenfolge.indexOf(a.geraetetyp);
                          const indexB = reihenfolge.indexOf(b.geraetetyp);
                          const priorityA = indexA === -1 ? 999 : indexA;
                          const priorityB = indexB === -1 ? 999 : indexB;
                          
                          if (priorityA !== priorityB) {
                            return priorityA - priorityB;
                          }
                          return a.name.localeCompare(b.name);
                        })
                        .map((geraet) => (
                        <TableRow key={geraet.id}>
                          <TableCell>{geraet.name}</TableCell>
                          <TableCell>{geraet.geraetetyp === 'Router' ? 'Modem' : geraet.geraetetyp}</TableCell>
                          <TableCell>{geraet.modell}</TableCell>
                          <TableCell>
                            {geraet.ipKonfiguration.typ === 'statisch' 
                              ? `Statisch: ${geraet.ipKonfiguration.ipAdresse || 'N/A'}` 
                              : 'DHCP'}
                          </TableCell>
                          <TableCell>{geraet.anzahlNetzwerkports}</TableCell>
                          <TableCell>
                            {(() => {
                              let standortInfo = geraet.standortDetails || '';
                              
                              // Rack-Information hinzufügen wenn vorhanden
                              if (geraet.rackPosition && geraet.rackPosition.rack && geraet.rackPosition.einheit > 0) {
                                const rackInfo = `${geraet.rackPosition.rack}, ${geraet.rackPosition.einheit}U`;
                                if (standortInfo) {
                                  standortInfo += ` - ${rackInfo}`;
                                } else {
                                  standortInfo = rackInfo;
                                }
                              }
                              
                              return standortInfo || '-';
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Verbindungs-Details */}
            {exportOptions.verbindungsDetails && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#c62828', borderBottom: '1px solid #e0e0e0', pb: 1 }}>
                  <CableIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Verbindungs-Details
                </Typography>
                {standortData.verbindungen.length > 0 ? (
                  <TableContainer>
                    <Table size="small" sx={{ 
                      '& .MuiTableCell-root': { 
                        color: '#000000',
                        borderColor: '#e0e0e0'
                      }
                    }}>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Quelle</strong></TableCell>
                          <TableCell><strong>Quell-Port</strong></TableCell>
                          <TableCell><strong>Ziel</strong></TableCell>
                          <TableCell><strong>Ziel-Port</strong></TableCell>
                          <TableCell><strong>Kabeltyp</strong></TableCell>
                          <TableCell><strong>Länge</strong></TableCell>
                          <TableCell><strong>Farbe</strong></TableCell>
                          <TableCell><strong>Kategorie</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {standortData.verbindungen.map((verbindung) => {
                          // Finde die Geräte für Port-Labels
                          const quellGeraet = standortData.geraete.find(g => g.id === (verbindung as any).quell_geraet_id);
                          const zielGeraet = standortData.geraete.find(g => g.id === (verbindung as any).ziel_geraet_id);
                          
                          // Finde Port-Labels
                          const quellPortLabel = quellGeraet?.belegteports?.find(p => p.portNummer === (verbindung as any).quell_port)?.label;
                          const zielPortLabel = zielGeraet?.belegteports?.find(p => p.portNummer === (verbindung as any).ziel_port)?.label;

                          return (
                            <TableRow key={verbindung.id}>
                              <TableCell>{(verbindung as any).quell_geraet_name}</TableCell>
                              <TableCell>
                                {(verbindung as any).quell_port}
                                {quellPortLabel && <div style={{ fontSize: '0.8em', color: '#666666' }}>({quellPortLabel})</div>}
                              </TableCell>
                              <TableCell>{(verbindung as any).ziel_geraet_name}</TableCell>
                              <TableCell>
                                {(verbindung as any).ziel_port}
                                {zielPortLabel && <div style={{ fontSize: '0.8em', color: '#666666' }}>({zielPortLabel})</div>}
                              </TableCell>
                              <TableCell>{(verbindung as any).kabeltyp}</TableCell>
                              <TableCell>{(verbindung as any).kabel_laenge ? `${(verbindung as any).kabel_laenge}m` : '-'}</TableCell>
                              <TableCell>{(verbindung as any).kabel_farbe || '-'}</TableCell>
                              <TableCell>{(verbindung as any).kabel_kategorie || '-'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" sx={{ color: '#666666' }}>
                    Keine Verbindungen konfiguriert
                  </Typography>
                )}
              </Box>
            )}

            {/* Rack-Visualisierung */}
            {exportOptions.rackVisualisierung && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#c62828', borderBottom: '1px solid #e0e0e0', pb: 1 }}>
                  <RouterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Rack-Visualisierung
                </Typography>
                <Box sx={{ 
                  mt: 2,
                  backgroundColor: '#ffffff',
                  '& .MuiTypography-root': {
                    color: '#000000 !important'
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#000000 !important'
                  }
                }}>
                  <RackVisualisierung 
                    geraete={standortData.geraete} 
                    standortId={standortData.standort.id}
                    exportMode={true}
                  />
                </Box>
              </Box>
            )}

            {/* Footer für Export */}
            <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#666666' }}>
                © 2025 Westfalen AG - Network Documentation Tool
      </Typography>
            </Box>
          </div>
        </Paper>
      )}

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};

export default ExportBereich; 