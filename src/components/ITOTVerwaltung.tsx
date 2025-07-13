import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Tooltip,
  LinearProgress,
  Badge
} from '@mui/material';
import {
  Security,
  NetworkCheck,
  Build,
  Assignment,
  Timeline,
  BarChart,
  Warning,
  Visibility,
  AccountTree,
  PlaylistAddCheck,
  Router,
  Memory
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';

// Types importieren
import {
  PurdueLevel,
  SecurityZone,
  IEC62443SecurityLevel,
  IndustrialProtocol,
  SecurityAssessment,
  AssetLifecycle,
  CommunicationMatrix,
  ChangeManagement,
  ComplianceRequirement,
  ComplianceAssessment,
  Geraet
} from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`it-ot-tabpanel-${index}`}
      aria-labelledby={`it-ot-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface ITOTVerwaltungProps {}

const ITOTVerwaltung: React.FC<ITOTVerwaltungProps> = () => {
  const navigate = useNavigate();
  const { standortId } = useParams<{ standortId: string }>();
  
  // State Management
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data State
  const [geraete, setGeraete] = useState<Geraet[]>([]);
  const [securityAssessments, setSecurityAssessments] = useState<SecurityAssessment[]>([]);
  const [assetLifecycles, setAssetLifecycles] = useState<AssetLifecycle[]>([]);
  const [communicationMatrix, setCommunicationMatrix] = useState<CommunicationMatrix[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeManagement[]>([]);
  const [complianceRequirements, setComplianceRequirements] = useState<ComplianceRequirement[]>([]);
  const [complianceAssessments, setComplianceAssessments] = useState<ComplianceAssessment[]>([]);
  
  // Filter State
  const [filters, setFilters] = useState({
    purdueLevel: '',
    securityZone: '',
    kritikalitaet: '',
    geraetekategorie: '',
    search: ''
  });

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'security' | 'lifecycle' | 'communication' | 'change' | 'compliance'>('security');
  const [selectedGeraet, setSelectedGeraet] = useState<Geraet | null>(null);

  // Helper function for default compliance requirements
  const getDefaultComplianceRequirements = (): ComplianceRequirement[] => [
    {
      id: '1',
      standard: 'IEC 62443',
      anforderung: 'Netzwerksegmentierung',
      beschreibung: 'Trennung von IT- und OT-Netzwerken',
      kategorie: 'Security',
      anwendbarAuf: ['IT', 'OT'],
      pruefintervall: 12,
      verantwortlicher: 'IT-Sicherheit',
      dokumentationsErforderlich: true,
      aktiv: true
    },
    {
      id: '2',
      standard: 'ISO 27001',
      anforderung: 'Zugangskontrolle',
      beschreibung: 'Kontrolle des Zugangs zu kritischen Systemen',
      kategorie: 'Security',
      anwendbarAuf: ['IT', 'OT', 'Hybrid'],
      pruefintervall: 6,
      verantwortlicher: 'IT-Sicherheit',
      dokumentationsErforderlich: true,
      aktiv: true
    },
    {
      id: '3',
      standard: 'FDA 21 CFR Part 11',
      anforderung: 'Elektronische Aufzeichnungen',
      beschreibung: 'Validierung elektronischer Systeme',
      kategorie: 'Regulatory',
      anwendbarAuf: ['IT', 'Hybrid'],
      pruefintervall: 12,
      verantwortlicher: 'QA',
      dokumentationsErforderlich: true,
      aktiv: true
    }
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Lade Geräte mit erweiterten IT/OT-Informationen
      const geraeteResponse = await fetch(`/api/standorte/${standortId}/geraete`);
      if (geraeteResponse.ok) {
        const geraeteData = await geraeteResponse.json();
        if (geraeteData.success) {
          // Erweitere Geräte-Daten mit IT/OT-spezifischen Eigenschaften
          const erweitertGeraete = geraeteData.data.map((geraet: any) => ({
            ...geraet,
            purdueLevel: geraet.purdueLevel || PurdueLevel.UNDEFINED,
            securityZone: geraet.securityZone || SecurityZone.UNDEFINED,
            geraetekategorie: geraet.geraetekategorie || (
              ['Router', 'Switch', 'Firewall', 'Server', 'Access Point'].includes(geraet.geraetetyp) ? 'IT' :
              ['SPS', 'Industrial Switch', 'Verdichter', 'H2-Versorger'].includes(geraet.geraetetyp) ? 'OT' :
              'Hybrid'
            )
          }));
          setGeraete(erweitertGeraete);
        }
      }
      
      // Lade Communication Matrix
      if (standortId) {
        const commResponse = await fetch(`/api/standorte/${standortId}/communication-matrix`);
        if (commResponse.ok) {
          const commData = await commResponse.json();
          setCommunicationMatrix(commData.success ? commData.data : []);
        } else {
          // Fallback: Erstelle leere Communication Matrix
          setCommunicationMatrix([]);
        }
      }
      
      // Lade Change Requests
      if (standortId) {
        const changeResponse = await fetch(`/api/standorte/${standortId}/change-requests`);
        if (changeResponse.ok) {
          const changeData = await changeResponse.json();
          setChangeRequests(changeData.success ? changeData.data : []);
        } else {
          // Fallback: Erstelle leere Change Requests
          setChangeRequests([]);
        }
      }
      
      // Lade Compliance Requirements
      const compReqResponse = await fetch('/api/compliance-requirements');
      if (compReqResponse.ok) {
        const compReqData = await compReqResponse.json();
        setComplianceRequirements(compReqData.success ? compReqData.data : getDefaultComplianceRequirements());
      } else {
        // Fallback: Verwende Standard-Compliance-Anforderungen
        setComplianceRequirements(getDefaultComplianceRequirements());
      }
      
      // Lade Security Assessments
      if (standortId) {
        const securityResponse = await fetch(`/api/standorte/${standortId}/security-assessments`);
        if (securityResponse.ok) {
          const securityData = await securityResponse.json();
          setSecurityAssessments(securityData.success ? securityData.data : []);
        } else {
          // Fallback: Erstelle leere Security Assessments
          setSecurityAssessments([]);
        }
      }
      
      // Lade Asset Lifecycle Daten
      if (standortId) {
        const lifecycleResponse = await fetch(`/api/standorte/${standortId}/asset-lifecycle`);
        if (lifecycleResponse.ok) {
          const lifecycleData = await lifecycleResponse.json();
          setAssetLifecycles(lifecycleData.success ? lifecycleData.data : []);
        } else {
          // Fallback: Erstelle leere Asset Lifecycle Daten
          setAssetLifecycles([]);
        }
      }
      
      // Lade Compliance Assessments
      if (standortId) {
        const compAssResponse = await fetch(`/api/standorte/${standortId}/compliance-assessments`);
        if (compAssResponse.ok) {
          const compAssData = await compAssResponse.json();
          setComplianceAssessments(compAssData.success ? compAssData.data : []);
        } else {
          // Fallback: Erstelle leere Compliance Assessments
          setComplianceAssessments([]);
        }
      }
      
    } catch (error) {
      console.error('Fehler beim Laden der IT/OT-Daten:', error);
      setError('Fehler beim Laden der Daten. Fallback-Daten werden verwendet.');
      
      // Fallback-Daten setzen
      setGeraete([]);
      setCommunicationMatrix([]);
      setChangeRequests([]);
      setComplianceRequirements(getDefaultComplianceRequirements());
      setSecurityAssessments([]);
      setAssetLifecycles([]);
      setComplianceAssessments([]);
    } finally {
      setLoading(false);
    }
  }, [standortId]);

  // Load data on component mount
  useEffect(() => {
    if (standortId) {
      loadData();
    }
  }, [standortId, loadData]);

  // CRUD Functions for Security Management
  const createSecurityAssessment = async (assessment: Omit<SecurityAssessment, 'id'>) => {
    try {
      const response = await fetch(`/api/standorte/${standortId}/security-assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessment)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSecurityAssessments(prev => [...prev, data.data]);
          return data.data;
        }
      }
      throw new Error('Fehler beim Erstellen des Security Assessments');
    } catch (error) {
      console.error('Fehler beim Erstellen des Security Assessments:', error);
      throw error;
    }
  };

  const updateSecurityAssessment = async (id: string, assessment: Partial<SecurityAssessment>) => {
    try {
      const response = await fetch(`/api/standorte/${standortId}/security-assessments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessment)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSecurityAssessments(prev => prev.map(sa => sa.id === id ? data.data : sa));
          return data.data;
        }
      }
      throw new Error('Fehler beim Aktualisieren des Security Assessments');
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Security Assessments:', error);
      throw error;
    }
  };

  const deleteSecurityAssessment = async (id: string) => {
    try {
      const response = await fetch(`/api/standorte/${standortId}/security-assessments/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setSecurityAssessments(prev => prev.filter(sa => sa.id !== id));
        return true;
      }
      throw new Error('Fehler beim Löschen des Security Assessments');
    } catch (error) {
      console.error('Fehler beim Löschen des Security Assessments:', error);
      throw error;
    }
  };

  // CRUD Functions for Communication Matrix
  const createCommunicationEntry = async (entry: Omit<CommunicationMatrix, 'id'>) => {
    try {
      const response = await fetch(`/api/standorte/${standortId}/communication-matrix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCommunicationMatrix(prev => [...prev, data.data]);
          return data.data;
        }
      }
      throw new Error('Fehler beim Erstellen des Communication Matrix Eintrags');
    } catch (error) {
      console.error('Fehler beim Erstellen des Communication Matrix Eintrags:', error);
      throw error;
    }
  };

  // CRUD Functions for Change Management
  const createChangeRequest = async (change: Omit<ChangeManagement, 'id'>) => {
    try {
      const response = await fetch(`/api/standorte/${standortId}/change-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setChangeRequests(prev => [...prev, data.data]);
          return data.data;
        }
      }
      throw new Error('Fehler beim Erstellen des Change Requests');
    } catch (error) {
      console.error('Fehler beim Erstellen des Change Requests:', error);
      throw error;
    }
  };

  const updateChangeRequest = async (id: string, change: Partial<ChangeManagement>) => {
    try {
      const response = await fetch(`/api/standorte/${standortId}/change-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setChangeRequests(prev => prev.map(cr => cr.id === id ? data.data : cr));
          return data.data;
        }
      }
      throw new Error('Fehler beim Aktualisieren des Change Requests');
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Change Requests:', error);
      throw error;
    }
  };

  // CRUD Functions for Asset Lifecycle
  const createAssetLifecycle = async (lifecycle: Omit<AssetLifecycle, 'id'>) => {
    try {
      const response = await fetch(`/api/standorte/${standortId}/asset-lifecycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lifecycle)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAssetLifecycles(prev => [...prev, data.data]);
          return data.data;
        }
      }
      throw new Error('Fehler beim Erstellen des Asset Lifecycle Eintrags');
    } catch (error) {
      console.error('Fehler beim Erstellen des Asset Lifecycle Eintrags:', error);
      throw error;
    }
  };

  const updateAssetLifecycle = async (id: string, lifecycle: Partial<AssetLifecycle>) => {
    try {
      const response = await fetch(`/api/standorte/${standortId}/asset-lifecycle/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lifecycle)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAssetLifecycles(prev => prev.map(al => al.id === id ? data.data : al));
          return data.data;
        }
      }
      throw new Error('Fehler beim Aktualisieren des Asset Lifecycle Eintrags');
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Asset Lifecycle Eintrags:', error);
      throw error;
    }
  };

  // Tab change handler
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Filter handlers
  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Apply filters to devices
  const filteredGeraete = geraete.filter(geraet => {
    if (filters.purdueLevel && geraet.purdueLevel !== filters.purdueLevel) return false;
    if (filters.securityZone && geraet.securityZone !== filters.securityZone) return false;
    if (filters.geraetekategorie && geraet.geraetekategorie !== filters.geraetekategorie) return false;
    if (filters.search && !geraet.name.toLowerCase().includes(filters.search.toLowerCase()) && 
        !geraet.modell?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  // Get dashboard statistics
  const getStatistics = () => {
    const totalDevices = geraete.length;
    const itDevices = geraete.filter(g => g.geraetekategorie === 'IT').length;
    const otDevices = geraete.filter(g => g.geraetekategorie === 'OT').length;
    const hybridDevices = geraete.filter(g => g.geraetekategorie === 'Hybrid').length;
    
    const criticalDevices = geraete.filter(g => g.assetLifecycle?.kritikalitaet === 'Kritisch').length;
    const highRiskDevices = geraete.filter(g => g.assetLifecycle?.kritikalitaet === 'Hoch').length;
    
    const activeChangeRequests = changeRequests.filter(cr => 
      ['Submitted', 'Approved', 'In Progress'].includes(cr.status)
    ).length;
    
    return {
      totalDevices,
      itDevices,
      otDevices,
      hybridDevices,
      criticalDevices,
      highRiskDevices,
      activeChangeRequests,
      communicationLinks: communicationMatrix.length
    };
  };

  const stats = getStatistics();

  // Render Dashboard Tab
  const renderDashboard = () => (
    <Grid container spacing={3}>
      {/* Statistik Cards */}
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" color="primary">
                  {stats.totalDevices}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Gesamtgeräte
                </Typography>
              </Box>
              <Router color="primary" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" color="info.main">
                  {stats.itDevices}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  IT-Geräte
                </Typography>
              </Box>
              <Memory color="info" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" color="warning.main">
                  {stats.otDevices}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  OT-Geräte
                </Typography>
              </Box>
              <Build color="warning" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" color="error.main">
                  {stats.criticalDevices}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Kritische Geräte
                </Typography>
              </Box>
              <Warning color="error" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Purdue Model Verteilung */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Purdue Model Verteilung
            </Typography>
            <Box>
              {Object.values(PurdueLevel).map(level => {
                const count = geraete.filter(g => g.purdueLevel === level).length;
                const percentage = stats.totalDevices > 0 ? (count / stats.totalDevices) * 100 : 0;
                
                return (
                  <Box key={level} mb={2}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">{level}</Typography>
                      <Typography variant="body2">{count} ({percentage.toFixed(1)}%)</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={percentage} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Security Zones Verteilung */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Security Zones Verteilung
            </Typography>
            <Box>
              {Object.values(SecurityZone).map(zone => {
                const count = geraete.filter(g => g.securityZone === zone).length;
                const percentage = stats.totalDevices > 0 ? (count / stats.totalDevices) * 100 : 0;
                
                return (
                  <Box key={zone} mb={2}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">{zone}</Typography>
                      <Typography variant="body2">{count} ({percentage.toFixed(1)}%)</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={percentage} 
                      sx={{ height: 8, borderRadius: 4 }}
                      color={
                        zone.includes('Manufacturing') ? 'warning' :
                        zone.includes('DMZ') ? 'error' :
                        zone.includes('Corporate') ? 'info' :
                        'primary'
                      }
                    />
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Kritikalität und Change Requests */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Aktuelle Aktivitäten
            </Typography>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="body2">Aktive Change Requests</Typography>
              <Badge badgeContent={stats.activeChangeRequests} color="primary">
                <Assignment />
              </Badge>
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="body2">Communication Links</Typography>
              <Badge badgeContent={stats.communicationLinks} color="info">
                <NetworkCheck />
              </Badge>
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">Compliance Requirements</Typography>
              <Badge badgeContent={complianceRequirements.length} color="secondary">
                <PlaylistAddCheck />
              </Badge>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Quick Actions */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Schnellaktionen
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Security />}
                  onClick={() => setActiveTab(1)}
                >
                  Security Assessment
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<NetworkCheck />}
                  onClick={() => setActiveTab(2)}
                >
                  Communication Matrix
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Assignment />}
                  onClick={() => setActiveTab(3)}
                >
                  Change Management
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<PlaylistAddCheck />}
                  onClick={() => setActiveTab(4)}
                >
                  Compliance
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Render Device Overview with Filters
  const renderDeviceOverview = () => (
    <Box>
      {/* Filter Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filter
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Purdue Level</InputLabel>
              <Select
                value={filters.purdueLevel}
                label="Purdue Level"
                onChange={(e) => handleFilterChange('purdueLevel', e.target.value)}
              >
                <MenuItem value="">Alle</MenuItem>
                {Object.values(PurdueLevel).map(level => (
                  <MenuItem key={level} value={level}>{level}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Security Zone</InputLabel>
              <Select
                value={filters.securityZone}
                label="Security Zone"
                onChange={(e) => handleFilterChange('securityZone', e.target.value)}
              >
                <MenuItem value="">Alle</MenuItem>
                {Object.values(SecurityZone).map(zone => (
                  <MenuItem key={zone} value={zone}>{zone}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Kategorie</InputLabel>
              <Select
                value={filters.geraetekategorie}
                label="Kategorie"
                onChange={(e) => handleFilterChange('geraetekategorie', e.target.value)}
              >
                <MenuItem value="">Alle</MenuItem>
                <MenuItem value="IT">IT</MenuItem>
                <MenuItem value="OT">OT</MenuItem>
                <MenuItem value="Hybrid">Hybrid</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Suche"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Name oder Modell..."
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setFilters({ purdueLevel: '', securityZone: '', kritikalitaet: '', geraetekategorie: '', search: '' })}
            >
              Zurücksetzen
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Device Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Gerät</TableCell>
              <TableCell>Typ</TableCell>
              <TableCell>Kategorie</TableCell>
              <TableCell>Purdue Level</TableCell>
              <TableCell>Security Zone</TableCell>
              <TableCell>Kritikalität</TableCell>
              <TableCell>Nächste Wartung</TableCell>
              <TableCell>Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredGeraete.map((geraet) => (
              <TableRow key={geraet.id}>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {geraet.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {geraet.modell}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{geraet.geraetetyp}</TableCell>
                <TableCell>
                  <Chip
                    label={geraet.geraetekategorie}
                    color={
                      geraet.geraetekategorie === 'IT' ? 'primary' :
                      geraet.geraetekategorie === 'OT' ? 'warning' :
                      'secondary'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {geraet.purdueLevel}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {geraet.securityZone}
                  </Typography>
                </TableCell>
                                 <TableCell>
                   <Chip
                     label={geraet.assetLifecycle?.kritikalitaet || 'Niedrig'}
                     color={
                       geraet.assetLifecycle?.kritikalitaet === 'Kritisch' ? 'error' :
                       geraet.assetLifecycle?.kritikalitaet === 'Hoch' ? 'warning' :
                       geraet.assetLifecycle?.kritikalitaet === 'Mittel' ? 'info' :
                       'default'
                     }
                     size="small"
                   />
                 </TableCell>
                 <TableCell>
                   <Typography variant="caption">
                     {geraet.assetLifecycle?.naechsteWartung 
                       ? new Date(geraet.assetLifecycle.naechsteWartung).toLocaleDateString('de-DE')
                       : 'Nicht geplant'}
                   </Typography>
                 </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <Tooltip title="Security Assessment">
                      <IconButton 
                        size="small"
                        onClick={() => {
                          setSelectedGeraet(geraet);
                          setDialogType('security');
                          setDialogOpen(true);
                        }}
                      >
                        <Security fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Asset Lifecycle">
                      <IconButton 
                        size="small"
                        onClick={() => {
                          setSelectedGeraet(geraet);
                          setDialogType('lifecycle');
                          setDialogOpen(true);
                        }}
                      >
                        <Timeline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Details ansehen">
                      <IconButton 
                        size="small"
                        onClick={() => navigate(`/standorte/${standortId}/geraete/${geraet.id}`)}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // Security Management Tab
  const renderSecurityManagement = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Security Management
      </Typography>
      
      <Grid container spacing={3}>
        {/* Security Statistics */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error">
                {securityAssessments.filter(sa => sa.iec62443Level === IEC62443SecurityLevel.SL1).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Kritische Sicherheitsrisiken
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {securityAssessments.filter(sa => sa.iec62443Level === IEC62443SecurityLevel.SL2).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Mittlere Sicherheitsrisiken
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {securityAssessments.filter(sa => sa.iec62443Level === IEC62443SecurityLevel.SL3 || sa.iec62443Level === IEC62443SecurityLevel.SL4).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Hohe Sicherheitsstufe
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                {geraete.filter(g => g.securityZone === SecurityZone.DMZ).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Geräte in DMZ
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Security Assessments Table */}
        <Grid item xs={12}>
          <Paper>
            <Box p={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Security Assessments</Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => {
                    setDialogType('security');
                    setDialogOpen(true);
                  }}
                >
                  Neues Assessment
                </Button>
              </Box>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Gerät</TableCell>
                      <TableCell>IEC 62443 Level</TableCell>
                      <TableCell>Risikoeinstufung</TableCell>
                      <TableCell>Verantwortlicher</TableCell>
                      <TableCell>Letzte Bewertung</TableCell>
                      <TableCell>Nächste Bewertung</TableCell>
                      <TableCell>Aktionen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {securityAssessments.map((assessment) => (
                      <TableRow key={assessment.id}>
                        <TableCell>
                          {geraete.find(g => g.id === assessment.geraetId)?.name || 'Unbekannt'}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={assessment.iec62443Level}
                            color={
                              assessment.iec62443Level === IEC62443SecurityLevel.SL1 ? 'error' :
                              assessment.iec62443Level === IEC62443SecurityLevel.SL2 ? 'warning' :
                              'success'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={assessment.risikoEinstufung}
                            color={
                              assessment.risikoEinstufung === 'Kritisch' ? 'error' :
                              assessment.risikoEinstufung === 'Hoch' ? 'warning' :
                              assessment.risikoEinstufung === 'Mittel' ? 'info' :
                              'success'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{assessment.verantwortlicher}</TableCell>
                        <TableCell>
                          {new Date(assessment.letzteBewertung).toLocaleDateString('de-DE')}
                        </TableCell>
                        <TableCell>
                          {new Date(assessment.naechsteBewertung).toLocaleDateString('de-DE')}
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <Visibility fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  // Communication Matrix Tab
  const renderCommunicationMatrix = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Communication Matrix
      </Typography>
      
      <Grid container spacing={3}>
        {/* Protocol Statistics */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {communicationMatrix.filter(cm => cm.protokoll === 'PROFINET').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Profinet Verbindungen
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="secondary">
                {communicationMatrix.filter(cm => cm.protokoll === IndustrialProtocol.MODBUS_TCP).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Modbus TCP Verbindungen
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                {communicationMatrix.filter(cm => cm.prioritaet === 'Critical').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Kritische Verbindungen
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {communicationMatrix.filter(cm => cm.realTimeRequirement === true).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Echtzeitverbindungen
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Communication Matrix Table */}
        <Grid item xs={12}>
          <Paper>
            <Box p={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Kommunikationsmatrix</Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => {
                    setDialogType('communication');
                    setDialogOpen(true);
                  }}
                >
                  Neue Verbindung
                </Button>
              </Box>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Quelle</TableCell>
                      <TableCell>Ziel</TableCell>
                      <TableCell>Protokoll</TableCell>
                      <TableCell>Datentyp</TableCell>
                      <TableCell>Priorität</TableCell>
                      <TableCell>Max. Latenz (ms)</TableCell>
                      <TableCell>Echtzeit</TableCell>
                      <TableCell>Aktionen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {communicationMatrix.map((communication) => (
                      <TableRow key={communication.id}>
                        <TableCell>
                          {geraete.find(g => g.id === communication.quellGeraetId)?.name || 'Unbekannt'}
                        </TableCell>
                        <TableCell>
                          {geraete.find(g => g.id === communication.zielGeraetId)?.name || 'Unbekannt'}
                        </TableCell>
                        <TableCell>
                          <Chip label={communication.protokoll} size="small" />
                        </TableCell>
                        <TableCell>{communication.datentyp}</TableCell>
                        <TableCell>
                          <Chip 
                            label={communication.prioritaet}
                            color={
                              communication.prioritaet === 'Critical' ? 'error' :
                              communication.prioritaet === 'High' ? 'warning' :
                              'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{communication.maxLatenz || 'Nicht definiert'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={communication.realTimeRequirement ? 'Ja' : 'Nein'}
                            color={communication.realTimeRequirement ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <Visibility fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  // Change Management Tab
  const renderChangeManagement = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Change Management
      </Typography>
      
      <Grid container spacing={3}>
        {/* Change Request Statistics */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {changeRequests.filter(cr => cr.status === 'Draft').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Entwürfe
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                {changeRequests.filter(cr => cr.status === 'Submitted').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Eingereicht
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {changeRequests.filter(cr => cr.status === 'In Progress').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                In Bearbeitung
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {changeRequests.filter(cr => cr.status === 'Completed').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Abgeschlossen
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Change Requests Table */}
        <Grid item xs={12}>
          <Paper>
            <Box p={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Change Requests</Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => {
                    setDialogType('change');
                    setDialogOpen(true);
                  }}
                >
                  Neuen Change Request erstellen
                </Button>
              </Box>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Change Nr.</TableCell>
                      <TableCell>Titel</TableCell>
                      <TableCell>Typ</TableCell>
                      <TableCell>Priorität</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Antragsteller</TableCell>
                      <TableCell>Geplanter Start</TableCell>
                      <TableCell>Aktionen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {changeRequests.map((change) => (
                      <TableRow key={change.id}>
                        <TableCell>{change.changeNummer}</TableCell>
                        <TableCell>{change.titel}</TableCell>
                        <TableCell>
                          <Chip 
                            label={change.changeTyp}
                            color={
                              change.changeTyp === 'Emergency' ? 'error' :
                              change.changeTyp === 'Normal' ? 'warning' :
                              'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={change.prioritaet}
                            color={
                              change.prioritaet === 'Critical' ? 'error' :
                              change.prioritaet === 'High' ? 'warning' :
                              'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={change.status}
                            color={
                              change.status === 'Completed' ? 'success' :
                              change.status === 'In Progress' ? 'primary' :
                              change.status === 'Rejected' ? 'error' :
                              'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{change.antragsteller}</TableCell>
                        <TableCell>
                          {change.geplantesStartDatum 
                            ? new Date(change.geplantesStartDatum).toLocaleDateString('de-DE')
                            : 'Nicht geplant'}
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <Visibility fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  // Compliance Management Tab
  const renderComplianceManagement = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Compliance Management
      </Typography>
      
      <Grid container spacing={3}>
        {/* Compliance Statistics */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {complianceAssessments.filter(ca => ca.konformitaetsStatus === 'Compliant').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Konform
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {complianceAssessments.filter(ca => ca.konformitaetsStatus === 'Partially Compliant').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Teilweise konform
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error">
                {complianceAssessments.filter(ca => ca.konformitaetsStatus === 'Non-Compliant').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Nicht konform
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                {complianceRequirements.filter(cr => cr.aktiv).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Aktive Anforderungen
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Compliance Requirements Table */}
        <Grid item xs={12}>
          <Paper>
            <Box p={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Compliance Requirements</Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => {
                    setDialogType('compliance');
                    setDialogOpen(true);
                  }}
                >
                  Neue Anforderung
                </Button>
              </Box>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Standard</TableCell>
                      <TableCell>Anforderung</TableCell>
                      <TableCell>Kategorie</TableCell>
                      <TableCell>Anwendbar auf</TableCell>
                      <TableCell>Prüfintervall</TableCell>
                      <TableCell>Verantwortlicher</TableCell>
                      <TableCell>Aktionen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {complianceRequirements.map((requirement) => (
                      <TableRow key={requirement.id}>
                        <TableCell>{requirement.standard}</TableCell>
                        <TableCell>{requirement.anforderung}</TableCell>
                        <TableCell>
                          <Chip 
                            label={requirement.kategorie}
                            color={
                              requirement.kategorie === 'Security' ? 'error' :
                              requirement.kategorie === 'Safety' ? 'warning' :
                              'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {requirement.anwendbarAuf.join(', ')}
                        </TableCell>
                        <TableCell>{requirement.pruefintervall} Monate</TableCell>
                        <TableCell>{requirement.verantwortlicher || 'Nicht zugewiesen'}</TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <Visibility fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  // Asset Lifecycle Management Tab
  const renderAssetLifecycleManagement = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Asset Lifecycle Management
      </Typography>
      
      <Grid container spacing={3}>
        {/* Asset Lifecycle Statistics */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error">
                {assetLifecycles.filter(al => al.kritikalitaet === 'Kritisch').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Kritische Assets
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {assetLifecycles.filter(al => al.ersatzteilVerfuegbarkeit === 'EOL').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                EOL Assets
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                {assetLifecycles.filter(al => al.naechsteWartung && new Date(al.naechsteWartung) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Wartung fällig (30 Tage)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {assetLifecycles.filter(al => al.supportStatus === 'Vollständig').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Vollständiger Support
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Asset Lifecycle Table */}
        <Grid item xs={12}>
          <Paper>
            <Box p={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Asset Lifecycle Übersicht</Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => {
                    setDialogType('lifecycle');
                    setDialogOpen(true);
                  }}
                >
                  Neues Asset erfassen
                </Button>
              </Box>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Gerät</TableCell>
                      <TableCell>Kritikalität</TableCell>
                      <TableCell>Installation</TableCell>
                      <TableCell>Geplantes EOL</TableCell>
                      <TableCell>Ersatzteil-Verfügbarkeit</TableCell>
                      <TableCell>Support Status</TableCell>
                      <TableCell>Nächste Wartung</TableCell>
                      <TableCell>Aktionen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assetLifecycles.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          {geraete.find(g => g.id === asset.geraetId)?.name || 'Unbekannt'}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={asset.kritikalitaet}
                            color={
                              asset.kritikalitaet === 'Kritisch' ? 'error' :
                              asset.kritikalitaet === 'Hoch' ? 'warning' :
                              asset.kritikalitaet === 'Mittel' ? 'info' :
                              'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(asset.installationsDatum).toLocaleDateString('de-DE')}
                        </TableCell>
                        <TableCell>
                          {asset.geplantesEOL 
                            ? new Date(asset.geplantesEOL).toLocaleDateString('de-DE')
                            : 'Nicht geplant'}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={asset.ersatzteilVerfuegbarkeit}
                            color={
                              asset.ersatzteilVerfuegbarkeit === 'EOL' ? 'error' :
                              asset.ersatzteilVerfuegbarkeit === 'Begrenzt' ? 'warning' :
                              'success'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={asset.supportStatus}
                            color={
                              asset.supportStatus === 'EOL' ? 'error' :
                              asset.supportStatus === 'Eingeschränkt' ? 'warning' :
                              'success'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {asset.naechsteWartung 
                            ? new Date(asset.naechsteWartung).toLocaleDateString('de-DE')
                            : 'Nicht geplant'}
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <Visibility fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <LinearProgress sx={{ width: '100%' }} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          IT/OT-Verwaltung
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ width: '100%' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<BarChart />} label="Dashboard" />
            <Tab icon={<AccountTree />} label="Geräte-Übersicht" />
            <Tab icon={<Security />} label="Security" />
            <Tab icon={<NetworkCheck />} label="Communication Matrix" />
            <Tab icon={<Assignment />} label="Change Management" />
            <Tab icon={<PlaylistAddCheck />} label="Compliance" />
            <Tab icon={<Timeline />} label="Asset Lifecycle" />
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            {renderDashboard()}
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            {renderDeviceOverview()}
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            {renderSecurityManagement()}
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            {renderCommunicationMatrix()}
          </TabPanel>

          <TabPanel value={activeTab} index={4}>
            {renderChangeManagement()}
          </TabPanel>

          <TabPanel value={activeTab} index={5}>
            {renderComplianceManagement()}
          </TabPanel>

          <TabPanel value={activeTab} index={6}>
            {renderAssetLifecycleManagement()}
          </TabPanel>
        </Paper>

        {/* Security Assessment Dialog */}
        {dialogType === 'security' && (
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Security Assessment</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Gerät auswählen</InputLabel>
                      <Select
                        value={selectedGeraet?.id || ''}
                        onChange={(e) => setSelectedGeraet(geraete.find(g => g.id === e.target.value) || null)}
                      >
                        {geraete.map(geraet => (
                          <MenuItem key={geraet.id} value={geraet.id}>
                            {geraet.name} ({geraet.geraetetyp})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>IEC 62443 Level</InputLabel>
                      <Select defaultValue={IEC62443SecurityLevel.SL2}>
                        <MenuItem value={IEC62443SecurityLevel.SL1}>SL-1 (Niedrig)</MenuItem>
                        <MenuItem value={IEC62443SecurityLevel.SL2}>SL-2 (Mittel)</MenuItem>
                        <MenuItem value={IEC62443SecurityLevel.SL3}>SL-3 (Hoch)</MenuItem>
                        <MenuItem value={IEC62443SecurityLevel.SL4}>SL-4 (Sehr Hoch)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Risikoeinstufung</InputLabel>
                      <Select defaultValue="Mittel">
                        <MenuItem value="Niedrig">Niedrig</MenuItem>
                        <MenuItem value="Mittel">Mittel</MenuItem>
                        <MenuItem value="Hoch">Hoch</MenuItem>
                        <MenuItem value="Kritisch">Kritisch</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Bedrohungsanalyse"
                      multiline
                      rows={3}
                      placeholder="Beschreiben Sie die identifizierten Bedrohungen..."
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Verantwortlicher"
                      placeholder="Name des Verantwortlichen"
                    />
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
              <Button variant="contained" onClick={() => setDialogOpen(false)}>
                Speichern
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Communication Matrix Dialog */}
        {dialogType === 'communication' && (
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Neue Kommunikationsverbindung</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Quell-Gerät</InputLabel>
                      <Select>
                        {geraete.map(geraet => (
                          <MenuItem key={geraet.id} value={geraet.id}>
                            {geraet.name} ({geraet.geraetetyp})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Ziel-Gerät</InputLabel>
                      <Select>
                        {geraete.map(geraet => (
                          <MenuItem key={geraet.id} value={geraet.id}>
                            {geraet.name} ({geraet.geraetetyp})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Protokoll</InputLabel>
                      <Select defaultValue={IndustrialProtocol.PROFINET}>
                        <MenuItem value={IndustrialProtocol.PROFINET}>PROFINET</MenuItem>
                        <MenuItem value={IndustrialProtocol.MODBUS_TCP}>Modbus TCP</MenuItem>
                        <MenuItem value={IndustrialProtocol.ETHERNET_IP}>EtherNet/IP</MenuItem>
                        <MenuItem value={IndustrialProtocol.OPC_UA}>OPC UA</MenuItem>
                        <MenuItem value={IndustrialProtocol.SONSTIGES}>Sonstiges</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Priorität</InputLabel>
                      <Select defaultValue="Medium">
                        <MenuItem value="Low">Niedrig</MenuItem>
                        <MenuItem value="Medium">Mittel</MenuItem>
                        <MenuItem value="High">Hoch</MenuItem>
                        <MenuItem value="Critical">Kritisch</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Datentyp"
                      placeholder="z.B. Process Data, Alarms, Diagnostics"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Max. Latenz (ms)"
                      type="number"
                      placeholder="100"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Zykluszeit (ms)"
                      type="number"
                      placeholder="10"
                    />
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
              <Button variant="contained" onClick={() => setDialogOpen(false)}>
                Speichern
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Asset Lifecycle Dialog */}
        {dialogType === 'lifecycle' && (
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Asset Lifecycle Management</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Gerät auswählen</InputLabel>
                      <Select
                        value={selectedGeraet?.id || ''}
                        onChange={(e) => setSelectedGeraet(geraete.find(g => g.id === e.target.value) || null)}
                      >
                        {geraete.map(geraet => (
                          <MenuItem key={geraet.id} value={geraet.id}>
                            {geraet.name} ({geraet.geraetetyp})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Installationsdatum"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Erwartete Lebensdauer (Jahre)"
                      type="number"
                      placeholder="10"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Kritikalität</InputLabel>
                      <Select defaultValue="Mittel">
                        <MenuItem value="Niedrig">Niedrig</MenuItem>
                        <MenuItem value="Mittel">Mittel</MenuItem>
                        <MenuItem value="Hoch">Hoch</MenuItem>
                        <MenuItem value="Kritisch">Kritisch</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Wartungsintervall (Tage)"
                      type="number"
                      placeholder="365"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Wartungsverantwortlicher"
                      placeholder="Name des Verantwortlichen"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Aktuelle Firmware Version"
                      placeholder="v1.2.3"
                    />
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
              <Button variant="contained" onClick={() => setDialogOpen(false)}>
                Speichern
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Change Management Dialog */}
        {dialogType === 'change' && (
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Neuer Change Request</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Change Nummer"
                      placeholder="CHG-2024-001"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Change Typ</InputLabel>
                      <Select defaultValue="Normal">
                        <MenuItem value="Standard">Standard</MenuItem>
                        <MenuItem value="Normal">Normal</MenuItem>
                        <MenuItem value="Emergency">Emergency</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Titel"
                      placeholder="Kurze Beschreibung der Änderung"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Beschreibung"
                      multiline
                      rows={3}
                      placeholder="Detaillierte Beschreibung der geplanten Änderung..."
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Antragsteller"
                      placeholder="Name des Antragstellers"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Priorität</InputLabel>
                      <Select defaultValue="Medium">
                        <MenuItem value="Low">Niedrig</MenuItem>
                        <MenuItem value="Medium">Mittel</MenuItem>
                        <MenuItem value="High">Hoch</MenuItem>
                        <MenuItem value="Critical">Kritisch</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Risiko-Analyse"
                      multiline
                      rows={2}
                      placeholder="Bewertung der Risiken und Auswirkungen..."
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Rollback-Plan"
                      multiline
                      rows={2}
                      placeholder="Plan für Rückgängigmachung bei Problemen..."
                    />
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
              <Button variant="contained" onClick={() => setDialogOpen(false)}>
                Speichern
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Compliance Assessment Dialog */}
        {dialogType === 'compliance' && (
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Compliance Assessment</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Gerät auswählen</InputLabel>
                      <Select
                        value={selectedGeraet?.id || ''}
                        onChange={(e) => setSelectedGeraet(geraete.find(g => g.id === e.target.value) || null)}
                      >
                        {geraete.map(geraet => (
                          <MenuItem key={geraet.id} value={geraet.id}>
                            {geraet.name} ({geraet.geraetetyp})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Compliance Anforderung</InputLabel>
                      <Select>
                        {complianceRequirements.map(req => (
                          <MenuItem key={req.id} value={req.id}>
                            {req.standard} - {req.anforderung}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Konformitätsstatus</InputLabel>
                      <Select defaultValue="Not Assessed">
                        <MenuItem value="Compliant">Konform</MenuItem>
                        <MenuItem value="Non-Compliant">Nicht konform</MenuItem>
                        <MenuItem value="Partially Compliant">Teilweise konform</MenuItem>
                        <MenuItem value="Not Assessed">Nicht bewertet</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Bewerter"
                      placeholder="Name des Bewerters"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Abweichungen"
                      multiline
                      rows={3}
                      placeholder="Beschreibung der Abweichungen von den Anforderungen..."
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Maßnahmen"
                      multiline
                      rows={3}
                      placeholder="Geplante Maßnahmen zur Behebung..."
                    />
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
              <Button variant="contained" onClick={() => setDialogOpen(false)}>
                Speichern
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </Box>
    </Container>
  );
};

export default ITOTVerwaltung; 