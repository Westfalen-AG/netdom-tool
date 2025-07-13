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
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Router as RouterIcon,
  Cable as CableIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Business as BusinessIcon,
  Category as CategoryIcon,
  Language as LanguageIcon,
  Lan as LanIcon,
} from '@mui/icons-material';
import { StandortMitStatistiken, Geraet } from '../types';
import { StandortContext } from '../App';

const StandortUebersicht: React.FC = () => {
  const navigate = useNavigate();
  const { selectedStandort, selectedStandortData } = useContext(StandortContext);

  const [standortDetails, setStandortDetails] = useState<StandortMitStatistiken | null>(null);
  const [geraete, setGeraete] = useState<Geraet[]>([]);
  const [verbindungen, setVerbindungen] = useState<any[]>([]);
  const [netzbereichs, setNetzbereichs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detaillierte Standortdaten laden
  const ladeStandortDetails = async (standortId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Geräte, Verbindungen und Netzbereichs parallel laden
      const [geraeteResponse, verbindungenResponse, netzbereichsResponse] = await Promise.all([
        fetch(`/api/standorte/${standortId}/geraete`),
        fetch(`/api/standorte/${standortId}/verbindungen`),
        fetch(`/api/netzbereich-verwaltung?standort_id=${standortId}`)
      ]);

      const geraeteData = await geraeteResponse.json();
      const verbindungenData = await verbindungenResponse.json();
      const netzbereichsData = await netzbereichsResponse.json();

      if (geraeteData.success) {
        setGeraete(geraeteData.data || []);
      } else {
        console.warn('Fehler beim Laden der Geräte:', geraeteData.error);
        setGeraete([]);
      }

      if (verbindungenData.success) {
        setVerbindungen(verbindungenData.data || []);
      } else {
        console.warn('Fehler beim Laden der Verbindungen:', verbindungenData.error);
        setVerbindungen([]);
      }

      if (netzbereichsData.success) {
        setNetzbereichs(netzbereichsData.data || []);
      } else {
        console.warn('Fehler beim Laden der Netzbereichs:', netzbereichsData.error);
        setNetzbereichs([]);
      }

      // Verwende die Standortdaten aus dem Context statt eines separaten API-Calls
      if (selectedStandortData) {
        setStandortDetails({
          ...selectedStandortData,
          anzahlGeraete: geraeteData.data?.length || 0,
          anzahlVerbindungen: verbindungenData.data?.length || 0,
          letzteAktualisierung: new Date(),
        });
      }

    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Laden der Standort-Details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Daten laden wenn sich der ausgewählte Standort ändert
  useEffect(() => {
    if (selectedStandort) {
      ladeStandortDetails(selectedStandort);
    }
  }, [selectedStandort]);

  // Legacy-Uplink-Chips (nicht mehr verwendet)
  const getUplinkChips = (uplinks: any[]) => {
    return uplinks.map((uplink, index) => (
      <Chip
        key={index}
        label={uplink.typ || 'Unbekannt'}
        size="small"
        variant="outlined"
        sx={{ mr: 0.5, mb: 0.5 }}
        color={uplink.oeffentlicheIpVerfuegbar ? 'primary' : 'default'}
      />
    ));
  };

  // Geräte nach Typ gruppieren
  const geraeteNachTyp = geraete.reduce((acc, geraet) => {
    const typ = geraet.geraetetyp;
    if (!acc[typ]) {
      acc[typ] = [];
    }
    acc[typ].push(geraet);
    return acc;
  }, {} as Record<string, Geraet[]>);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!selectedStandort) {
    return (
      <Box>
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <LocationIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" component="h1" gutterBottom>
            Kein Standort ausgewählt
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Bitte wählen Sie einen Standort in der oberen Navigationsleiste aus, um die Übersicht anzuzeigen.
          </Typography>
          <Button
            variant="contained"
            startIcon={<LocationIcon />}
            onClick={() => navigate('/standorte')}
          >
            Standorte verwalten
          </Button>
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
              Standort: {selectedStandortData?.name || 'Unbekannt'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Detailübersicht für den ausgewählten Standort
            </Typography>
          </Box>
          <Box>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate('/standorte')}
              sx={{ mr: 2 }}
            >
              Standorte verwalten
            </Button>
            <Button
              variant="contained"
              startIcon={<ViewIcon />}
              onClick={() => navigate('/diagramm')}
            >
              Netzwerkdiagramm
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

      {/* Standort-Informationen */}
      {selectedStandortData && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Grundinformationen */}
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                                 <Box display="flex" alignItems="center" mb={2}>
                   <BusinessIcon color="primary" sx={{ mr: 1 }} />
                   <Typography variant="h6">Standort-Informationen</Typography>
                 </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Adresse:</strong>
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedStandortData.adresse}
                </Typography>

                {/* Ansprechpartner IT */}
                {selectedStandortData.ansprechpartnerIT && (
                  <>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Ansprechpartner IT:</strong>
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      {selectedStandortData.ansprechpartnerIT.name}
                      {selectedStandortData.ansprechpartnerIT.abteilung && 
                        ` (${selectedStandortData.ansprechpartnerIT.abteilung})`}
                    </Typography>
                    {selectedStandortData.ansprechpartnerIT.telefon && (
                      <Typography variant="body2" color="text.secondary">
                        Tel: {selectedStandortData.ansprechpartnerIT.telefon}
                      </Typography>
                    )}
                    {selectedStandortData.ansprechpartnerIT.email && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Email: {selectedStandortData.ansprechpartnerIT.email}
                      </Typography>
                    )}
                  </>
                )}

                {/* Ansprechpartner Vor Ort */}
                {selectedStandortData.ansprechpartnerVorOrt && (
                  <>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Ansprechpartner Vor Ort:</strong>
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      {selectedStandortData.ansprechpartnerVorOrt.name}
                      {selectedStandortData.ansprechpartnerVorOrt.abteilung && 
                        ` (${selectedStandortData.ansprechpartnerVorOrt.abteilung})`}
                    </Typography>
                    {selectedStandortData.ansprechpartnerVorOrt.telefon && (
                      <Typography variant="body2" color="text.secondary">
                        Tel: {selectedStandortData.ansprechpartnerVorOrt.telefon}
                      </Typography>
                    )}
                    {selectedStandortData.ansprechpartnerVorOrt.email && (
                      <Typography variant="body2" color="text.secondary">
                        Email: {selectedStandortData.ansprechpartnerVorOrt.email}
                      </Typography>
                    )}
                  </>
                )}

                {/* Legacy Ansprechpartner */}
                {selectedStandortData.ansprechpartner?.name && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Ansprechpartner (Legacy):</strong>
                    </Typography>
                    <Typography variant="body1">{selectedStandortData.ansprechpartner.name}</Typography>
                    {selectedStandortData.ansprechpartner.telefon && (
                      <Typography variant="body2" color="text.secondary">
                        Tel: {selectedStandortData.ansprechpartner.telefon}
                      </Typography>
                    )}
                    {selectedStandortData.ansprechpartner.email && (
                      <Typography variant="body2" color="text.secondary">
                        Email: {selectedStandortData.ansprechpartner.email}
                      </Typography>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Verfügbare Uplinks */}
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <CableIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Verfügbare Uplinks</Typography>
                </Box>
                
                {/* Konfigurierte Uplinks */}
                {selectedStandortData.verfuegbareUplinks && selectedStandortData.verfuegbareUplinks.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                      Konfigurierte Uplinks
                    </Typography>
                    {getUplinkChips(selectedStandortData.verfuegbareUplinks)}
                  </Box>
                )}
                
                {/* Router als Uplinks */}
                {(() => {
                  const routerGeraete = geraete.filter(g => g.geraetetyp === 'Router');
                  return routerGeraete.length > 0 ? (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                        Modem-Uplinks
                      </Typography>
                      {routerGeraete.map((router) => (
                        <Box key={router.id} sx={{ mb: 1 }}>
                          <Chip
                            label="Modem"
                            color="secondary"
                            size="small"
                            sx={{ mr: 1 }}
                            icon={<RouterIcon />}
                          />
                          <Typography variant="body2" component="span">
                            {router.name} ({router.modell})
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                            LAN: {router.ipKonfiguration?.ipAdresse || 
                                 (router.ipKonfiguration?.typ === 'dhcp' ? 'DHCP' : 'IP nicht konfiguriert')}
                          </Typography>
                          {/* Öffentliche IP-Informationen anzeigen */}
                          {router.hatOeffentlicheIp && (
                            <Typography variant="body2" color="primary" sx={{ fontWeight: 500, display: 'block' }}>
                              {router.oeffentlicheIpTyp === 'statisch' && router.statischeOeffentlicheIp ? (
                                `WAN: ${router.statischeOeffentlicheIp} (statisch)`
                              ) : router.oeffentlicheIpTyp === 'dynamisch' && router.dyndnsAktiv && router.dyndnsAdresse ? (
                                `WAN: ${router.dyndnsAdresse} (DynDNS)`
                              ) : router.oeffentlicheIpTyp === 'dynamisch' ? (
                                'WAN: Dynamische IP'
                              ) : (
                                'WAN: Öffentliche IP verfügbar'
                              )}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  ) : null;
                })()}
                
                {/* SD-WAN Gateways als Uplinks */}
                {(() => {
                  const sdwanGeraete = geraete.filter(g => g.geraetetyp === 'SD-WAN Gateway');
                  return sdwanGeraete.length > 0 ? (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                        SD-WAN Gateways
                      </Typography>
                      {sdwanGeraete.map((gateway) => (
                        <Box key={gateway.id} sx={{ mb: 1 }}>
                          <Chip
                            label="SD-WAN Gateway"
                            color="success"
                            size="small"
                            sx={{ mr: 1 }}
                            icon={<CableIcon />}
                          />
                          <Typography variant="body2" component="span">
                            {gateway.name} ({gateway.modell})
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                            {gateway.ipKonfiguration?.ipAdresse || 
                             (gateway.ipKonfiguration?.typ === 'dhcp' ? 'DHCP' : 'IP nicht konfiguriert')}
                            {gateway.anzahlNetzwerkports > 0 && (
                              <span> • {gateway.anzahlNetzwerkports} Ports</span>
                            )}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : null;
                })()}
                
                {/* Fallback wenn keine Uplinks vorhanden */}
                {(!selectedStandortData.verfuegbareUplinks || selectedStandortData.verfuegbareUplinks.length === 0) && 
                 geraete.filter(g => g.geraetetyp === 'Router' || g.geraetetyp === 'SD-WAN Gateway').length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Keine Uplinks konfiguriert
                  </Typography>
                )}
                
                {/* Leerer Bereich für einheitliche Höhe */}
                <Box sx={{ flexGrow: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Statistiken */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ textAlign: 'center', flexGrow: 1 }}>
              <RouterIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" component="div" color="primary.main">
                {geraete.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Geräte insgesamt
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/geraete')} fullWidth>
                Verwalten
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ textAlign: 'center', flexGrow: 1 }}>
              <CableIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h4" component="div" color="secondary.main">
                {verbindungen.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Verbindungen
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/verbindungen')} fullWidth>
                Verwalten
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ textAlign: 'center', flexGrow: 1 }}>
              <CategoryIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" component="div" color="success.main">
                {Object.keys(geraeteNachTyp).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gerätetypen
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/geraetetypen')} fullWidth>
                Verwalten
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ textAlign: 'center', flexGrow: 1 }}>
              <LanIcon sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" component="div" color="info.main">
                {netzbereichs.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Netzwerkbereiche
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/netzbereichsverwaltung')} fullWidth>
                Verwalten
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Geräteübersicht */}
      {Object.keys(geraeteNachTyp).length > 0 && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Geräte nach Typ
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(geraeteNachTyp).map(([typ, geraeteList]) => (
              <Grid item xs={12} sm={6} md={4} key={typ}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {typ}
                    </Typography>
                    <Typography variant="h6" color="primary.main">
                      {geraeteList.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Geräte
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Aktuelle Geräte */}
      {geraete.length > 0 && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Zuletzt hinzugefügte Geräte
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Typ</TableCell>
                  <TableCell>Modell</TableCell>
                  <TableCell>IP-Adresse</TableCell>
                  <TableCell>Hinzugefügt</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {geraete
                  .sort((a, b) => new Date(b.erstelltAm).getTime() - new Date(a.erstelltAm).getTime())
                  .slice(0, 5)
                  .map((geraet) => (
                    <TableRow key={geraet.id}>
                      <TableCell>{geraet.name}</TableCell>
                      <TableCell>
                        <Chip label={geraet.geraetetyp} size="small" />
                      </TableCell>
                      <TableCell>{geraet.modell}</TableCell>
                      <TableCell>
                        {geraet.ipKonfiguration?.ipAdresse || 'DHCP'}
                      </TableCell>
                      <TableCell>
                        {new Date(geraet.erstelltAm).toLocaleDateString('de-DE')}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          {geraete.length > 5 && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button onClick={() => navigate('/geraete')}>
                Alle Geräte anzeigen ({geraete.length})
              </Button>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default StandortUebersicht; 