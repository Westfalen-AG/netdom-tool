import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  Paper,
  Typography,
  Button,
  Grid,
  Box,

  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Divider,

  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,

} from '@mui/material';
import {

  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  LocationOn as LocationIcon,
  Router as RouterIcon,
  Cable as CableIcon,
} from '@mui/icons-material';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Standort, Geraet, Verbindung } from '../types';
import { StandortContext } from '../App';
import RackVisualisierung from './RackVisualisierung';

const ExportBereich: React.FC = () => {
  const { selectedStandort, selectedStandortData } = useContext(StandortContext);
  
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

  // Standortdaten laden
  const ladeStandortDaten = async (standortId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Parallele Anfragen für bessere Performance
      const [standortResponse, geraeteResponse, verbindungenResponse] = await Promise.all([
        fetch(`/api/standorte/${standortId}`),
        fetch(`/api/standorte/${standortId}/geraete`),
        fetch(`/api/standorte/${standortId}/verbindungen`)
      ]);

      const standortResult = await standortResponse.json();
      const geraeteResult = await geraeteResponse.json();
      const verbindungenResult = await verbindungenResponse.json();

      if (standortResult.success && geraeteResult.success && verbindungenResult.success) {
        setStandortData({
          standort: standortResult.data,
          geraete: geraeteResult.data || [],
          verbindungen: verbindungenResult.data || [],
        });
      } else {
        setError('Fehler beim Laden der Standortdaten');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Standortdaten:', err);
      setError('Fehler beim Laden der Standortdaten');
    } finally {
      setLoading(false);
    }
  };

  // Daten laden wenn sich der Standort ändert
  useEffect(() => {
    if (selectedStandort) {
      ladeStandortDaten(selectedStandort);
    } else {
      setStandortData({
        standort: null,
        geraete: [],
        verbindungen: [],
      });
    }
  }, [selectedStandort]);

  // PNG Export
  const exportAsPNG = async () => {
    if (!exportRef.current) return;

    try {
      setExportLoading(true);
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `${standortData.standort?.name || 'export'}_dokumentation.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Fehler beim PNG-Export:', error);
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
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${standortData.standort?.name || 'export'}_dokumentation.pdf`);
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error);
      setError('Fehler beim PDF-Export');
    } finally {
      setExportLoading(false);
    }
  };

  // Hilfsfunktion zum Gruppieren der Geräte nach Typ
  const geraeteNachTyp = standortData.geraete.reduce((acc, geraet) => {
    const typ = geraet.geraetetyp;
    if (!acc[typ]) {
      acc[typ] = [];
    }
    acc[typ].push(geraet);
    return acc;
  }, {} as Record<string, Geraet[]>);

  if (!selectedStandort) {
    return (
      <Box>
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <LocationIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" component="h1" gutterBottom>
            Kein Standort ausgewählt
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Bitte wählen Sie einen Standort in der oberen Navigationsleiste aus, um Exporte zu erstellen.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Export-Bereich: {selectedStandortData?.name}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Exportieren Sie detaillierte Dokumentationen für den ausgewählten Standort als PNG oder PDF
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
          {/* Export-Optionen */}
          <Grid item xs={12} md={8}>
            <Typography variant="subtitle1" gutterBottom>
              Export-Optionen
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.standortDetails}
                      onChange={(e) => setExportOptions({...exportOptions, standortDetails: e.target.checked})}
                    />
                  }
                  label="Standort-Details"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.geraeteUebersicht}
                      onChange={(e) => setExportOptions({...exportOptions, geraeteUebersicht: e.target.checked})}
                    />
                  }
                  label="Geräte-Übersicht"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.verbindungsDetails}
                      onChange={(e) => setExportOptions({...exportOptions, verbindungsDetails: e.target.checked})}
                    />
                  }
                  label="Verbindungs-Details"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.rackVisualisierung}
                      onChange={(e) => setExportOptions({...exportOptions, rackVisualisierung: e.target.checked})}
                    />
                  }
                  label="Rack-Visualisierung"
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Export-Buttons */}
          <Grid item xs={12} md={4}>
            <Box display="flex" gap={2} flexDirection="column">
              <Button
                variant="contained"
                startIcon={exportLoading ? <CircularProgress size={20} /> : <ImageIcon />}
                onClick={exportAsPNG}
                disabled={loading || exportLoading}
                fullWidth
              >
                Als PNG exportieren
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={exportLoading ? <CircularProgress size={20} /> : <PdfIcon />}
                onClick={exportAsPDF}
                disabled={loading || exportLoading}
                fullWidth
              >
                Als PDF exportieren
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Vorschau / Export-Inhalt */}
      {!loading && standortData.standort && (
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Vorschau
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <div ref={exportRef} style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            color: '#000000'
          }}>
            {/* Header für Export */}
            <Box className="export-header" sx={{ mb: 4, borderBottom: '2px solid #c62828', pb: 2 }}>
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
              <Box className="export-section" sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom className="export-section-title" sx={{ color: '#c62828', borderBottom: '1px solid #e0e0e0', pb: 1 }}>
                  <LocationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Standort-Details
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" sx={{ color: '#000000' }}>Adresse:</Typography>
                    <Typography variant="body2" sx={{ color: '#666666', mb: 2 }}>
                      {standortData.standort.adresse}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" sx={{ color: '#000000' }}>Ansprechpartner:</Typography>
                    <Typography variant="body2" sx={{ color: '#666666', mb: 2 }}>
                      {standortData.standort.ansprechpartner?.name || 'Nicht angegeben'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Geräte-Übersicht */}
            {exportOptions.geraeteUebersicht && (
              <Box className="export-section" sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom className="export-section-title" sx={{ color: '#c62828', borderBottom: '1px solid #e0e0e0', pb: 1 }}>
                  <RouterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Geräte-Übersicht
                </Typography>
                <TableContainer className="export-table">
                  <Table size="small" sx={{ '& td, & th': { color: '#000000' } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Typ</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Modell</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>IP-Adresse</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Ports</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Bemerkungen</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {standortData.geraete.map((geraet) => (
                        <TableRow key={geraet.id}>
                          <TableCell>{geraet.name}</TableCell>
                          <TableCell>
                            <Chip 
                              label={geraet.geraetetyp} 
                              size="small" 
                              variant="outlined"
                              sx={{ 
                                borderColor: '#c62828',
                                color: '#c62828'
                              }}
                            />
                          </TableCell>
                          <TableCell>{geraet.modell}</TableCell>
                          <TableCell>
                            {geraet.ipKonfiguration?.ipAdresse || 'DHCP'}
                          </TableCell>
                          <TableCell>{geraet.anzahlNetzwerkports}</TableCell>
                          <TableCell>{geraet.bemerkungen || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Verbindungs-Details */}
            {exportOptions.verbindungsDetails && (
              <Box className="export-section" sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom className="export-section-title" sx={{ color: '#c62828', borderBottom: '1px solid #e0e0e0', pb: 1 }}>
                  <CableIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Verbindungs-Details
                </Typography>
                {standortData.verbindungen.length > 0 ? (
                  <TableContainer className="export-table">
                    <Table size="small" sx={{ '& td, & th': { color: '#000000' } }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Quell-Gerät</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Port</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Ziel-Gerät</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Port</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Kabeltyp</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Länge</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {standortData.verbindungen.map((verbindung: any) => (
                          <TableRow key={verbindung.id}>
                            <TableCell>{verbindung.quell_geraet_name || verbindung.quellGeraetName}</TableCell>
                            <TableCell>{verbindung.quell_port || verbindung.quellPort}</TableCell>
                            <TableCell>{verbindung.ziel_geraet_name || verbindung.zielGeraetName}</TableCell>
                            <TableCell>{verbindung.ziel_port || verbindung.zielPort}</TableCell>
                            <TableCell>
                              <Chip 
                                label={verbindung.kabeltyp} 
                                size="small" 
                                variant="outlined"
                                sx={{ 
                                  borderColor: '#c62828',
                                  color: '#c62828'
                                }}
                              />
                            </TableCell>
                            <TableCell>{verbindung.kabel_laenge ? `${verbindung.kabel_laenge}m` : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" sx={{ color: '#666666', fontStyle: 'italic' }}>
                    Keine Verbindungen dokumentiert.
                  </Typography>
                )}
              </Box>
            )}

            {/* Rack-Visualisierung */}
            {exportOptions.rackVisualisierung && (
              <Box className="export-section" sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom className="export-section-title" sx={{ color: '#c62828', borderBottom: '1px solid #e0e0e0', pb: 1 }}>
                  <RouterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Rack-Visualisierung
                </Typography>
                <Box sx={{ 
                  '& *': { 
                    color: '#000000 !important',
                    backgroundColor: 'transparent !important' 
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
          </div>
        </Paper>
      )}

      {/* Lade-Indikator */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" p={4}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};

export default ExportBereich; 