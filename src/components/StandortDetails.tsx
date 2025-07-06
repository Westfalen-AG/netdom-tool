import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  LocationOn as LocationIcon,
  Router as RouterIcon,
  Cable as CableIcon,
  People as PeopleIcon,
  Edit as EditIcon,
  Computer as ComputerIcon,
  Visibility as ViewIcon,
  AccountTree as DiagramIcon,
  Settings as SwitchIcon,
  Security as SecurityIcon,
  Wifi as WifiIcon,
  Storage as StorageIcon,
  Videocam as VideocamIcon,
  Print as PrintIcon,
  Phone as PhoneIcon,
  Sensors as SensorsIcon,
  Memory as MemoryIcon,
  Hub as HubIcon,
  Dns as ModemIcon,
} from '@mui/icons-material';
import { StandortMitStatistiken, Geraet, GeraeteTyp, Verbindung, PortBelegung } from '../types';
import RackVisualisierung from './RackVisualisierung';

const StandortDetails: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [standort, setStandort] = useState<StandortMitStatistiken | null>(null);
  const [geraete, setGeraete] = useState<Geraet[]>([]);
  const [verbindungen, setVerbindungen] = useState<Verbindung[]>([]);
  const [loading, setLoading] = useState(true);
  const [geraeteLoading, setGeraeteLoading] = useState(false);
  const [verbindungenLoading, setVerbindungenLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Standort-Daten laden (zuerst nach Name suchen, dann ID verwenden)
  const ladeStandort = async () => {
    try {
      setLoading(true);
      // Zuerst alle Standorte laden, um den Namen zu finden
      const alleStandorteResponse = await fetch('/api/standorte');
      const alleStandorteData = await alleStandorteResponse.json();
      
      if (alleStandorteData.success) {
        const gefundenerStandort = alleStandorteData.data.find(
          (s: any) => s.name === name
        );
        
        if (gefundenerStandort) {
          // Jetzt die vollständigen Daten für diesen Standort laden
          const response = await fetch(`/api/standorte/${gefundenerStandort.id}`);
          const data = await response.json();
          
          if (data.success) {
            setStandort(data.data);
          } else {
            setError(data.error || 'Standort nicht gefunden');
          }
        } else {
          setError('Standort nicht gefunden');
        }
      } else {
        setError('Fehler beim Laden der Standorte');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Laden des Standorts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Geräte laden
  const ladeGeraete = async () => {
    if (!standort) return;
    
    try {
      setGeraeteLoading(true);
      const response = await fetch(`/api/standorte/${standort.id}/geraete`);
      const data = await response.json();
      
      if (data.success) {
        setGeraete(data.data);
      } else {
        console.error('Fehler beim Laden der Geräte:', data.error);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Geräte:', err);
    } finally {
      setGeraeteLoading(false);
    }
  };

  // Verbindungen laden
  const ladeVerbindungen = async () => {
    if (!standort) return;
    
    try {
      setVerbindungenLoading(true);
      const response = await fetch(`/api/standorte/${standort.id}/verbindungen`);
      const data = await response.json();
      
      if (data.success) {
        setVerbindungen(data.data);
      } else {
        console.error('Fehler beim Laden der Verbindungen:', data.error);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Verbindungen:', err);
    } finally {
      setVerbindungenLoading(false);
    }
  };

  // Port-Belegung aus Verbindungen berechnen
  const berechnePortBelegung = (geraet: Geraet): Geraet => {
    const geraetVerbindungen = verbindungen.filter(
      v => (v as any).quell_geraet_id === geraet.id || (v as any).ziel_geraet_id === geraet.id
    );

    const aktualisiertePortBelegung: PortBelegung[] = [];
    
    // Erstelle Ports basierend auf anzahlNetzwerkports
    for (let i = 1; i <= geraet.anzahlNetzwerkports; i++) {
      const existierenderPort = geraet.belegteports?.find(p => p.portNummer === i);
      const verbindung = geraetVerbindungen.find(
        v => ((v as any).quell_geraet_id === geraet.id && (v as any).quell_port === i) ||
             ((v as any).ziel_geraet_id === geraet.id && (v as any).ziel_port === i)
      );

      aktualisiertePortBelegung.push({
        portNummer: i,
        verbindungId: verbindung?.id,
        beschreibung: existierenderPort?.beschreibung || '',
        belegt: !!verbindung,
        portTyp: existierenderPort?.portTyp || 'RJ45', // Default zu RJ45
        geschwindigkeit: existierenderPort?.geschwindigkeit || '1G',
        label: existierenderPort?.label || '',
      });
    }

    return {
      ...geraet,
      belegteports: aktualisiertePortBelegung,
    };
  };

  useEffect(() => {
    if (name) {
      ladeStandort();
    }
  }, [name]);

  // Geräte und Verbindungen laden, wenn Standort geladen wurde
  useEffect(() => {
    if (standort) {
      ladeGeraete();
      ladeVerbindungen();
    }
  }, [standort]);

  // Berechne Port-Belegung neu wenn Geräte oder Verbindungen sich ändern
  const geraeteMitAktualisiertePorts = useMemo(() => {
    return geraete.map(geraet => berechnePortBelegung(geraet));
  }, [geraete, verbindungen]);

  // Gruppen der Geräte nach Typ
  const geraeteNachTyp = useMemo(() => {
    return geraeteMitAktualisiertePorts.reduce((acc, geraet) => {
      if (!acc[geraet.geraetetyp]) {
        acc[geraet.geraetetyp] = [];
      }
      acc[geraet.geraetetyp].push(geraet);
      return acc;
    }, {} as Record<GeraeteTyp, Geraet[]>);
  }, [geraeteMitAktualisiertePorts]);

  // Gewünschte Reihenfolge der Gerätetypen
  const getGeraetetypReihenfolge = (): GeraeteTyp[] => {
    const gewuenschteReihenfolge: GeraeteTyp[] = [
      'Router',      // Modems zuerst
      'SD-WAN Gateway',
      'Firewall',
      'Switch',
      'Server',
      'Access Point',
      'Kamera',
      'VOIP-Phone', 
      'Drucker',
      'AI-Port',
      'NVR',
      'Zugangskontrolle',
      'Serial Server',
      'HMI',
      'Sensor',
      'Sonstiges'
    ];
    
    // Nur vorhandene Gerätetypen zurückgeben
    return gewuenschteReihenfolge.filter(typ => geraeteNachTyp[typ] && geraeteNachTyp[typ].length > 0);
  };

  // Gerät-Icon basierend auf Typ
  const getGeraetIcon = (geraetetyp: GeraeteTyp) => {
    switch (geraetetyp) {
      case 'Router':
        return <RouterIcon color="primary" />;
      case 'Switch':
        return <ModemIcon color="primary" />;
      case 'SD-WAN Gateway':
        return <HubIcon color="primary" />;
      case 'Firewall':
        return <SecurityIcon color="primary" />;
      case 'Server':
        return <ComputerIcon color="primary" />;
      case 'Access Point':
        return <WifiIcon color="primary" />;
      case 'Kamera':
        return <VideocamIcon color="primary" />;
      case 'VOIP-Phone':
        return <PhoneIcon color="primary" />;
      case 'Drucker':
        return <PrintIcon color="primary" />;
      case 'NVR':
        return <StorageIcon color="primary" />;
      case 'Sensor':
        return <SensorsIcon color="primary" />;
      case 'AI-Port':
      case 'Zugangskontrolle':
      case 'Serial Server':
      case 'HMI':
        return <MemoryIcon color="primary" />;
      default:
        return <ComputerIcon color="action" />;
    }
  };

  // Gerät-Farbe basierend auf Typ
  const getGeraetColor = (geraetetyp: GeraeteTyp): 'primary' | 'secondary' | 'success' | 'warning' | 'error' => {
    switch (geraetetyp) {
      case 'Router':
        return 'secondary';
      case 'Switch':
        return 'primary';
      case 'SD-WAN Gateway':
        return 'success';
      case 'Firewall':
        return 'error';
      case 'Server':
        return 'warning';
      case 'Access Point':
        return 'success';
      case 'Kamera':
        return 'primary';
      case 'VOIP-Phone':
        return 'secondary';
      case 'Drucker':
        return 'warning';
      case 'NVR':
        return 'warning';
      case 'Sensor':
        return 'success';
      case 'AI-Port':
      case 'Zugangskontrolle':
      case 'Serial Server':
      case 'HMI':
        return 'secondary';
      default:
        return 'primary';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !standort) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Standort nicht gefunden'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/standorte')}
        >
          Zurück zur Übersicht
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/standorte')}
          sx={{ textDecoration: 'none' }}
        >
          Standorte
        </Link>
        <Typography variant="body2" color="text.primary">
          {standort.name}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Box display="flex" alignItems="center" mb={2}>
              <LocationIcon color="primary" sx={{ mr: 1, fontSize: '2rem' }} />
              <Typography variant="h4" component="h1">
                {standort.name}
              </Typography>
            </Box>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {standort.adresse}
            </Typography>
          </Box>
          
          <Box>
            <Button
              startIcon={<DiagramIcon />}
              onClick={() => navigate(`/diagramm/${standort.id}`)}
              variant="contained"
              sx={{ mr: 1 }}
            >
              Netzwerkdiagramm
            </Button>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/standorte')}
              variant="outlined"
            >
              Zurück
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Standort-Informationen */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Ansprechpartner */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Ansprechpartner
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {standort.ansprechpartnerIT && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="primary">
                  IT-Ansprechpartner
                </Typography>
                <Typography variant="body2">
                  {standort.ansprechpartnerIT.name}
                </Typography>
                {standort.ansprechpartnerIT.telefon && (
                  <Typography variant="body2" color="text.secondary">
                    Tel: {standort.ansprechpartnerIT.telefon}
                  </Typography>
                )}
                {standort.ansprechpartnerIT.email && (
                  <Typography variant="body2" color="text.secondary">
                    Email: {standort.ansprechpartnerIT.email}
                  </Typography>
                )}
              </Box>
            )}
            
            {standort.ansprechpartnerVorOrt && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="primary">
                  Ansprechpartner vor Ort
                </Typography>
                <Typography variant="body2">
                  {standort.ansprechpartnerVorOrt.name}
                </Typography>
                {standort.ansprechpartnerVorOrt.telefon && (
                  <Typography variant="body2" color="text.secondary">
                    Tel: {standort.ansprechpartnerVorOrt.telefon}
                  </Typography>
                )}
                {standort.ansprechpartnerVorOrt.email && (
                  <Typography variant="body2" color="text.secondary">
                    Email: {standort.ansprechpartnerVorOrt.email}
                  </Typography>
                )}
              </Box>
            )}
            
            {/* Fallback für altes Ansprechpartner-Format */}
            {!standort.ansprechpartnerIT && !standort.ansprechpartnerVorOrt && standort.ansprechpartner?.name && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="primary">
                  Ansprechpartner
                </Typography>
                <Typography variant="body2">
                  {standort.ansprechpartner.name}
                </Typography>
                {standort.ansprechpartner.telefon && (
                  <Typography variant="body2" color="text.secondary">
                    Tel: {standort.ansprechpartner.telefon}
                  </Typography>
                )}
                {standort.ansprechpartner.email && (
                  <Typography variant="body2" color="text.secondary">
                    Email: {standort.ansprechpartner.email}
                  </Typography>
                )}
              </Box>
            )}
            
            {/* Fallback wenn keine Ansprechpartner vorhanden */}
            {!standort.ansprechpartnerIT && !standort.ansprechpartnerVorOrt && 
             (!standort.ansprechpartner?.name || standort.ansprechpartner.name.trim() === '') && (
              <Typography variant="body2" color="text.secondary">
                Keine Ansprechpartner konfiguriert
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Uplinks */}
        <Grid item xs={12} md={6}>
          <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              <CableIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Verfügbare Uplinks
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {/* Konfigurierte Uplinks */}
            {standort.verfuegbareUplinks && standort.verfuegbareUplinks.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                  Konfigurierte Uplinks
                </Typography>
                {standort.verfuegbareUplinks.map((uplink, index) => (
                  <Box key={index} sx={{ mb: 1 }}>
                    <Chip
                      label={uplink.typ}
                      color={uplink.oeffentlicheIpVerfuegbar ? 'primary' : 'default'}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body2" component="span">
                      {uplink.anbieter}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {uplink.erwarteteGeschwindigkeit.download}/{uplink.erwarteteGeschwindigkeit.upload} Mbps
                    </Typography>
                  </Box>
                ))}
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
                      <Typography variant="body2" color="text.secondary">
                        {router.ipKonfiguration.ipAdresse || 
                         (router.ipKonfiguration.typ === 'dhcp' ? 'DHCP' : 'IP nicht konfiguriert')}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : null;
            })()}
            
            {/* SD-WAN Gateways als Uplinks */}
            {(() => {
              const sdwanGeraete = geraete.filter(g => g.geraetetyp === 'SD-WAN Gateway');
              return sdwanGeraete.length > 0 ? (
                <Box>
                  <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                    SD-WAN Gateways (Bonding & HA)
                  </Typography>
                  {sdwanGeraete.map((gateway) => (
                    <Box key={gateway.id} sx={{ mb: 1 }}>
                      <Chip
                        label="SD-WAN Gateway"
                        color="success"
                        size="small"
                        sx={{ mr: 1 }}
                        icon={<HubIcon />}
                      />
                      <Typography variant="body2" component="span">
                        {gateway.name} ({gateway.modell})
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {gateway.ipKonfiguration.ipAdresse || 
                         (gateway.ipKonfiguration.typ === 'dhcp' ? 'DHCP' : 'IP nicht konfiguriert')}
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
            {(!standort.verfuegbareUplinks || standort.verfuegbareUplinks.length === 0) && 
             geraete.filter(g => g.geraetetyp === 'Router' || g.geraetetyp === 'SD-WAN Gateway').length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Keine Uplinks konfiguriert
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Geräte-Übersicht */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">
            <ComputerIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Geräte-Übersicht
          </Typography>
          <Button
            startIcon={<EditIcon />}
            onClick={() => navigate(`/geraete?standort=${standort.name}`)}
            variant="outlined"
          >
            Geräte verwalten
          </Button>
        </Box>
        
        {geraeteLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : geraeteMitAktualisiertePorts.length === 0 ? (
          <Alert severity="info">
            Für diesen Standort sind noch keine Geräte angelegt.
          </Alert>
        ) : (
          <Box>
            {/* Geräte nach Typ gruppiert */}
            {getGeraetetypReihenfolge().map((typ) => (
              <Box key={typ} sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {getGeraetIcon(typ as GeraeteTyp)}
                  <Box component="span" sx={{ ml: 1 }}>
                    {typ === 'Router' ? 'Modem' : typ} ({geraeteNachTyp[typ].length})
                  </Box>
                </Typography>
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Modell</TableCell>
                        <TableCell>IP-Adresse</TableCell>
                        <TableCell>MAC-Adresse</TableCell>
                        <TableCell>Ports</TableCell>
                        <TableCell>Standort/Raum</TableCell>
                        <TableCell>Rack-Position</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {geraeteNachTyp[typ].map((geraet) => (
                        <TableRow key={geraet.id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <Chip
                                label={geraet.name}
                                color={getGeraetColor(geraet.geraetetyp)}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          </TableCell>
                          <TableCell>{geraet.modell}</TableCell>
                          <TableCell>
                            {geraet.ipKonfiguration.ipAdresse || 
                             (geraet.ipKonfiguration.typ === 'dhcp' ? 'DHCP' : '-')}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {geraet.macAdresse || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {geraet.anzahlNetzwerkports > 0 ? (
                              <Typography variant="body2">
                                {geraet.belegteports?.filter(p => p.belegt).length || 0} / {geraet.anzahlNetzwerkports}
      </Typography>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {geraet.standortDetails || '-'}
                          </TableCell>
                          <TableCell>
                            {geraet.rackPosition?.rack && geraet.rackPosition?.einheit ? 
                              `${geraet.rackPosition.rack} / ${geraet.rackPosition.einheit}U` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Rack-Visualisierung */}
      <Box sx={{ mt: 3 }}>
        <RackVisualisierung geraete={geraeteMitAktualisiertePorts} standortId={standort.id} />
      </Box>
    </Box>
  );
};

export default StandortDetails; 