import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Panel,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Toolbar,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  useTheme,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  Download as DownloadIcon,
  AutorenewOutlined as AutoRefreshIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { Geraet, Verbindung, GeraeteTyp } from '../types';
import { ThemeContext, StandortContext } from '../App';

// Gerätetype zu Farbe Mapping
const getNodeColor = (geraetetyp: GeraeteTyp): string => {
  const colorMap: Record<string, string> = {
    // IT-Geräte
    'Router': '#f44336',
    'Switch': '#2196f3',
    'SD-WAN Gateway': '#ff9800',
    'Firewall': '#e91e63',
    'Access Point': '#9c27b0',
    'Kamera': '#4caf50',
    'VOIP-Phone': '#00bcd4',
    'Drucker': '#ff5722',
    'AI-Port': '#795548',
    'NVR': '#607d8b',
    'Zugangskontrolle': '#ffeb3b',
    'Serial Server': '#cddc39',
    'HMI': '#8bc34a',
    'Server': '#3f51b5',
    'Sensor': '#009688',
    'Sonstiges': '#9e9e9e',
    // OT-Geräte
    'Verdichter': '#ff6b35',
    'SPS': '#1976d2',
    'Industrial Switch': '#388e3c',
    'H2-Versorger': '#2e7d32',
    'IT/OT-Router': '#f57c00',
    'Gasanalysator': '#7b1fa2',
    'Drucksensor': '#5d4037',
    'Temperatursensor': '#d32f2f',
    'Durchflussmesser': '#0288d1',
    'Ventilstation': '#689f38',
    'Notabschaltung': '#c62828',
    'Frequenzumrichter': '#455a64',
    'Transformator': '#424242',
    'USV': '#558b2f',
  };
  return colorMap[geraetetyp] || '#9e9e9e';
};

// Farbnamen zu Hex-Werten konvertieren
const convertFarbeToHex = (farbe: string): string => {
  if (!farbe) return '#607d8b';
  
  const farbeNormalized = farbe.toLowerCase().trim();
  const farbMap: Record<string, string> = {
    'rot': '#f44336',
    'blau': '#2196f3',
    'grün': '#4caf50',
    'gelb': '#ffeb3b',
    'orange': '#ff9800',
    'lila': '#9c27b0',
    'violett': '#9c27b0',
    'schwarz': '#424242',
    'weiß': '#fafafa',
    'weiss': '#fafafa',
    'grau': '#9e9e9e',
    'braun': '#795548',
    'pink': '#e91e63',
    'türkis': '#00bcd4',
    'lime': '#cddc39',
    'cyan': '#00bcd4',
    'magenta': '#e91e63',
    'dunkelblau': '#1976d2',
    'hellblau': '#03a9f4',
    'dunkelgrün': '#388e3c',
    'hellgrün': '#8bc34a',
    'dunkelrot': '#c62828',
    'hellrot': '#ef5350',
    'dunkelgrau': '#616161',
    'hellgrau': '#bdbdbd',
    'navy': '#1565c0',
    'beige': '#f5f5dc',
    'silber': '#c0c0c0',
    'gold': '#ffd700',
  };
  
  return farbMap[farbeNormalized] || '#607d8b';
};

// Custom Node Komponente
const GeraetNode = ({ data }: { data: any }) => {
  const [showDetails, setShowDetails] = useState(false);
  const theme = useTheme();
  const { darkMode } = useContext(ThemeContext);
  
  const getGeraetIcon = (geraetetyp: GeraeteTyp) => {
    switch (geraetetyp) {
      // IT-Geräte
      case 'Router': return '🌐';
      case 'Switch': return '🔀';
      case 'SD-WAN Gateway': return '🛡️';
      case 'Firewall': return '🔥';
      case 'Access Point': return '📶';
      case 'Kamera': return '📹';
      case 'VOIP-Phone': return '📞';
      case 'Drucker': return '🖨️';
      case 'Server': return '🖥️';
      case 'NVR': return '💾';
      case 'Sensor': return '🔍';
      case 'AI-Port': return '🔌';
      case 'Zugangskontrolle': return '🔐';
      case 'Serial Server': return '📡';
      case 'HMI': return '🖥️';
      // OT-Geräte  
      case 'Verdichter': return '⚙️';
      case 'SPS': return '🔧';
      case 'Industrial Switch': return '🏭';
      case 'H2-Versorger': return '💨';
      case 'IT/OT-Router': return '🔄';
      case 'Gasanalysator': return '🧪';
      case 'Drucksensor': return '📊';
      case 'Temperatursensor': return '🌡️';
      case 'Durchflussmesser': return '💧';
      case 'Ventilstation': return '⚡';
      case 'Notabschaltung': return '🚨';
      case 'Frequenzumrichter': return '⚙️';
      case 'Transformator': return '🔌';
      case 'USV': return '🔋';
      default: return '📦';
    }
  };

  const belegtePortsCount = data.belegteports?.filter((p: any) => p.belegt).length || 0;
  const freiePortsCount = data.anzahlNetzwerkports - belegtePortsCount;

  return (
    <>
      {/* Verbindungs-Handles - alle können sowohl source als auch target sein */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={{
          background: darkMode ? '#64748b' : '#374151',
          border: '2px solid white',
          width: 12,
          height: 12,
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        style={{
          background: darkMode ? '#64748b' : '#374151',
          border: '2px solid white',
          width: 12,
          height: 12,
          left: 2, // Leicht versetzt
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          background: darkMode ? '#64748b' : '#374151',
          border: '2px solid white',
          width: 12,
          height: 12,
        }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        style={{
          background: darkMode ? '#64748b' : '#374151',
          border: '2px solid white',
          width: 12,
          height: 12,
          left: 2, // Leicht versetzt
        }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{
          background: darkMode ? '#64748b' : '#374151',
          border: '2px solid white',
          width: 12,
          height: 12,
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        style={{
          background: darkMode ? '#64748b' : '#374151',
          border: '2px solid white',
          width: 12,
          height: 12,
          top: 2, // Leicht versetzt
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          background: darkMode ? '#64748b' : '#374151',
          border: '2px solid white',
          width: 12,
          height: 12,
        }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        style={{
          background: darkMode ? '#64748b' : '#374151',
          border: '2px solid white',
          width: 12,
          height: 12,
          top: 2, // Leicht versetzt
        }}
      />
      
      <Tooltip
        title={
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {data.name}
            </Typography>
            <Typography variant="caption" display="block">
              Typ: {data.geraetetyp}
            </Typography>
            {data.ipAdresse && (
              <Typography variant="caption" display="block">
                LAN IP: {data.ipAdresse}
              </Typography>
            )}
            {/* Router-spezifische öffentliche IP-Informationen */}
            {data.geraetetyp === 'Router' && data.hatOeffentlicheIp && (
              <Typography variant="caption" display="block" sx={{ color: '#1976d2' }}>
                {data.oeffentlicheIpTyp === 'statisch' && data.statischeOeffentlicheIp ? 
                  `WAN IP: ${data.statischeOeffentlicheIp} (statisch)` :
                data.oeffentlicheIpTyp === 'dynamisch' && data.dyndnsAktiv && data.dyndnsAdresse ? 
                  `WAN: ${data.dyndnsAdresse} (DynDNS)` :
                data.oeffentlicheIpTyp === 'dynamisch' ? 
                  'WAN: Dynamische IP' : 
                  'WAN: Öffentliche IP verfügbar'
                }
              </Typography>
            )}
            {data.macAdresse && (
              <Typography variant="caption" display="block">
                MAC: {data.macAdresse}
              </Typography>
            )}
            <Typography variant="caption" display="block">
              Ports: {belegtePortsCount}/{data.anzahlNetzwerkports} belegt
            </Typography>
            {data.modell && (
              <Typography variant="caption" display="block">
                Modell: {data.modell}
              </Typography>
            )}
            {data.standortDetails && (
              <Typography variant="caption" display="block">
                Standort: {data.standortDetails}
              </Typography>
            )}
          </Box>
        }
        arrow
        placement="top"
      >
    <Box
      sx={{
        padding: 2,
            border: `3px solid ${getNodeColor(data.geraetetyp)}`,
            borderRadius: 3,
            backgroundColor: darkMode ? theme.palette.background.paper : 'white',
            minWidth: 180,
            maxWidth: 220,
        textAlign: 'center',
            boxShadow: darkMode ? '0px 4px 12px rgba(0,0,0,0.5)' : 3,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            color: theme.palette.text.primary,
        '&:hover': {
              boxShadow: darkMode ? '0px 8px 16px rgba(0,0,0,0.6)' : 6,
              transform: 'scale(1.05)',
              backgroundColor: darkMode ? theme.palette.action.hover : '#f8f9fa',
            },
          }}
          onClick={() => setShowDetails(!showDetails)}
        >
          {/* Geräte-Icon und Name */}
          <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
            <Typography variant="h6" component="span">
              {getGeraetIcon(data.geraetetyp)}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
        {data.name}
      </Typography>
          </Box>

          {/* Gerätetyp Chip */}
      <Chip
        label={data.geraetetyp}
        size="small"
        sx={{
          backgroundColor: getNodeColor(data.geraetetyp),
          color: 'white',
          mb: 1,
              fontSize: '0.75rem',
              height: 24,
        }}
      />

          {/* IP-Adresse */}
      {data.ipAdresse && (
            <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mb: 0.5 }}>
              📍 LAN: {data.ipAdresse}
            </Typography>
          )}
          
          {/* Router öffentliche IP */}
          {data.geraetetyp === 'Router' && data.hatOeffentlicheIp && (
            <Typography variant="caption" display="block" sx={{ color: '#1976d2', mb: 0.5, fontWeight: 'medium' }}>
              🌐 {data.oeffentlicheIpTyp === 'statisch' && data.statischeOeffentlicheIp ? 
                data.statischeOeffentlicheIp :
              data.oeffentlicheIpTyp === 'dynamisch' && data.dyndnsAktiv && data.dyndnsAdresse ? 
                data.dyndnsAdresse :
              data.oeffentlicheIpTyp === 'dynamisch' ? 
                'Dynamic WAN' : 
                'Public IP'
              }
            </Typography>
          )}

          {/* Port-Informationen */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                🔌
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
                {data.anzahlNetzwerkports}
              </Typography>
            </Box>
            
            {/* Port-Status Anzeige */}
            <Box display="flex" gap={0.5}>
              {data.anzahlNetzwerkports > 0 && (
                <Chip
                  label={`${belegtePortsCount}/${data.anzahlNetzwerkports} belegt`}
                  size="small"
                  color={belegtePortsCount > 0 ? "error" : "default"}
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          </Box>

          {/* Verbindungsstatus */}
          {data.anzahlVerbindungen !== undefined && (
            <Box mt={1}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                🔗 {data.anzahlVerbindungen} Verbindung(en)
              </Typography>
            </Box>
          )}

          {/* Erweiterte Details (ausklappbar) */}
          {showDetails && (
            <Box mt={2} pt={1} sx={{ borderTop: `1px solid ${darkMode ? theme.palette.divider : '#e0e0e0'}` }}>
              {data.modell && (
        <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                  📋 {data.modell}
        </Typography>
      )}
              {data.seriennummer && (
      <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                  🏷️ SN: {data.seriennummer}
      </Typography>
              )}
              {data.standortDetails && (
                <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                  📍 {data.standortDetails}
                </Typography>
              )}
    </Box>
          )}
        </Box>
      </Tooltip>
    </>
  );
};

const nodeTypes = {
  geraet: GeraetNode,
};

interface NetzwerkDiagrammProps {}

const NetzwerkDiagramm: React.FC<NetzwerkDiagrammProps> = () => {
  const { standortName } = useParams<{ standortName?: string }>();
  const { selectedStandort, selectedStandortData, standorte } = useContext(StandortContext);
  
  const [geraete, setGeraete] = useState<Geraet[]>([]);
  const [verbindungen, setVerbindungen] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Filter-States
  const [geraetetypFilter, setGeraetetypFilter] = useState<string>('alle');
  const [netzbereichFilter, setNetzbereichFilter] = useState<string>('alle');
  const [kategorieFilter, setKategorieFilter] = useState<string>('alle');
  
  const theme = useTheme();
  const { darkMode } = useContext(ThemeContext);

  // Diagramm neu generieren wenn Filter sich ändern
  React.useEffect(() => {
    if (geraete.length > 0 && verbindungen.length > 0) {
      generiereNetzwerkDiagramm(geraete, verbindungen);
    }
  }, [geraetetypFilter, netzbereichFilter, kategorieFilter, geraete, verbindungen]);

  // Diagrammdaten laden (verwendet vollständige Geräte-API)
  const ladeDiagrammDaten = async (standortId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Lade vollständige Gerätedaten und Verbindungen parallel
      const [geraeteResponse, verbindungenResponse] = await Promise.all([
        fetch(`/api/standorte/${standortId}/geraete`),
        fetch(`/api/standorte/${standortId}/verbindungen`)
      ]);
      
      const geraeteData = await geraeteResponse.json();
      const verbindungenData = await verbindungenResponse.json();
      
      if (geraeteData.success && verbindungenData.success) {
        console.log('Diagrammdaten geladen:', { 
          geraete: geraeteData.data?.length || 0, 
          verbindungen: verbindungenData.data?.length || 0 
        });
        
        setGeraete(geraeteData.data || []);
        setVerbindungen(verbindungenData.data || []);
        generiereNetzwerkDiagramm(geraeteData.data || [], verbindungenData.data || []);
      } else {
        setError(geraeteData.error || verbindungenData.error || 'Fehler beim Laden der Diagrammdaten');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Laden der Diagrammdaten:', err);
    } finally {
      setLoading(false);
    }
  };

  // Port-Belegung basierend auf Verbindungen berechnen (wie in RackVisualisierung)
  const berechnePortBelegung = (geraet: Geraet, verbindungenData: any[]) => {
    const geraetVerbindungen = verbindungenData.filter(
      v => v.quell_geraet_id === geraet.id || v.ziel_geraet_id === geraet.id
    );

    const belegteports: any[] = [];
    
    // Erstelle Ports basierend auf anzahlNetzwerkports
    for (let i = 1; i <= geraet.anzahlNetzwerkports; i++) {
      const existierenderPort = geraet.belegteports?.find(p => p.portNummer === i);
      const verbindung = geraetVerbindungen.find(
        v => (v.quell_geraet_id === geraet.id && v.quell_port === i) ||
             (v.ziel_geraet_id === geraet.id && v.ziel_port === i)
      );

      belegteports.push({
        portNummer: i,
        verbindungId: verbindung?.id,
        beschreibung: existierenderPort?.beschreibung || '',
        belegt: !!verbindung,
        portTyp: existierenderPort?.portTyp || 'RJ45',
        geschwindigkeit: existierenderPort?.geschwindigkeit || '1G',
        label: existierenderPort?.label || '',
      });
    }

    return belegteports;
  };

  // Netzwerkdiagramm aus Daten generieren
  // Hilfsfunktion für Auto-Layout
  const applyAutoLayoutToNodes = (inputNodes: Node[]): Node[] => {
    // Definiere die gewünschte Reihenfolge der Gerätetypen
    const geraeteReihenfolge = [
      // IT-Geräte
      'Router', // Modem-Kategorie
      'SD-WAN Gateway',
      'Firewall', 
      'Switch',
      'Access Point',
      'Server',
      'NVR',
      'Kamera',
      'VOIP-Phone',
      'Drucker',
      'AI-Port',
      'Zugangskontrolle',
      'Serial Server',
      'HMI',
      'Sensor',
      // OT-Geräte
      'IT/OT-Router',
      'SPS',
      'Industrial Switch',
      'Verdichter',
      'H2-Versorger',
      'Gasanalysator',
      'Drucksensor',
      'Temperatursensor',
      'Durchflussmesser',
      'Ventilstation',
      'Frequenzumrichter',
      'Transformator',
      'USV',
      'Notabschaltung',
      'Sonstiges'
    ];

    // Gruppiere Nodes nach Gerätetyp
    const geraeteGruppen: { [key: string]: Node[] } = {};
    inputNodes.forEach(node => {
      const typ = node.data.geraetetyp;
      if (!geraeteGruppen[typ]) {
        geraeteGruppen[typ] = [];
      }
      geraeteGruppen[typ].push(node);
    });

    const layoutedNodes: Node[] = [];
    let currentX = 100; // Startposition von links
    const baseY = 300; // Grundhöhe
    const gruppenAbstand = 300; // Horizontaler Abstand zwischen Gruppen
    const geraeteAbstand = 200; // Vertikaler Abstand zwischen Geräten derselben Gruppe

    // Durchlaufe Gerätetypen in der gewünschten Reihenfolge
    geraeteReihenfolge.forEach(geraetetyp => {
      if (geraeteGruppen[geraetetyp] && geraeteGruppen[geraetetyp].length > 0) {
        const gruppe = geraeteGruppen[geraetetyp];
        
        // Sortiere Geräte innerhalb der Gruppe nach Anzahl Verbindungen (absteigend)
        gruppe.sort((a, b) => (b.data.anzahlVerbindungen || 0) - (a.data.anzahlVerbindungen || 0));
        
        // Positioniere Geräte dieser Gruppe
        gruppe.forEach((node, index) => {
          // Zentriere die Gruppe vertikal
          const gruppeCenterOffset = (gruppe.length - 1) * geraeteAbstand / 2;
          const y = baseY - gruppeCenterOffset + (index * geraeteAbstand);
          
          layoutedNodes.push({
            ...node,
            position: { x: currentX, y }
          });
        });
        
        // Bewege X-Position für die nächste Gruppe
        currentX += gruppenAbstand;
      }
    });

    console.log('📐 Auto-Layout angewendet beim Generieren:', {
      totalNodes: layoutedNodes.length,
      groupsFound: Object.keys(geraeteGruppen),
      groupSizes: Object.entries(geraeteGruppen).map(([typ, nodes]) => `${typ}: ${nodes.length}`)
    });

    return layoutedNodes;
  };

  const generiereNetzwerkDiagramm = (geraeteData: Geraet[], verbindungenData: any[]) => {
    
    // Filter anwenden
    const gefilterteGeraete = geraeteData.filter(geraet => {
      // Gerätetyp-Filter
      if (geraetetypFilter !== 'alle' && geraet.geraetetyp !== geraetetypFilter) {
        return false;
      }
      
      // Kategorie-Filter (IT/OT/Hybrid)
      if (kategorieFilter !== 'alle' && geraet.geraetekategorie !== kategorieFilter) {
        return false;
      }
      
      // Netzbereich-Filter
      if (netzbereichFilter !== 'alle') {
        const hatNetzbereich = geraet.ipKonfigurationen?.some(ip => 
          ip.netzbereichTyp === netzbereichFilter
        );
        if (!hatNetzbereich) {
          return false;
        }
      }
      
      return true;
    });
    
    // Verbindungen basierend auf gefilterten Geräten filtern
    const gefilterteVerbindungen = verbindungenData.filter(verbindung => {
      const quellGeraetVorhanden = gefilterteGeraete.some(g => g.id === verbindung.quell_geraet_id);
      const zielGeraetVorhanden = gefilterteGeraete.some(g => g.id === verbindung.ziel_geraet_id);
      return quellGeraetVorhanden && zielGeraetVorhanden;
    });
    
    // Nodes erstellen mit erweiterten Daten und berechneten Port-Belegungen
    const tempNodes: Node[] = gefilterteGeraete.map((geraet, index) => {
      // Zähle Verbindungen für dieses Gerät
      const anzahlVerbindungen = gefilterteVerbindungen.filter(
        v => v.quell_geraet_id === geraet.id || v.ziel_geraet_id === geraet.id
      ).length;

      // Berechne Port-Belegungen (wie in RackVisualisierung)
      const belegteports = berechnePortBelegung(geraet, verbindungenData);

      return {
        id: String(geraet.id),
      type: 'geraet',
      position: {
          x: geraet.position?.x || (index % 4) * 280 + 100,
          y: geraet.position?.y || Math.floor(index / 4) * 180 + 100,
      },
      data: {
        name: geraet.name,
        geraetetyp: geraet.geraetetyp,
        ipAdresse: geraet.ipKonfiguration?.ipAdresse,
          macAdresse: geraet.macAdresse,
          modell: geraet.modell,
          seriennummer: geraet.seriennummer,
          standortDetails: geraet.standortDetails,
        anzahlNetzwerkports: geraet.anzahlNetzwerkports,
          belegteports: belegteports,
          anzahlVerbindungen: anzahlVerbindungen,
          ipKonfigurationstyp: geraet.ipKonfiguration?.typ,
          netzwerkbereich: geraet.ipKonfiguration?.netzwerkbereich,
        },
      };
    });

    // Auto-Layout nur anwenden wenn keine Positionen gespeichert sind
    const hasStoredPositions = tempNodes.some(node => {
      const geraet = geraeteData.find(g => String(g.id) === node.id);
      return geraet?.position?.x !== undefined && geraet?.position?.y !== undefined;
    });
    
    const newNodes = hasStoredPositions ? tempNodes : applyAutoLayoutToNodes(tempNodes);
    
    console.log('📐 Position-Strategie:', {
      hasStoredPositions,
      appliedAutoLayout: !hasStoredPositions,
      totalNodes: newNodes.length
    });

        // Edges erstellen mit verbesserter Logik und Validierung
    console.log('🔗 DEBUG - Verbindungen verarbeiten:', {
      totalVerbindungen: verbindungenData.length,
      verfuegbareGeraete: geraeteData.map(g => `${g.id}:${g.name}`),
      verbindungsDetails: verbindungenData.map(v => ({
        id: v.id,
        source: v.quell_geraet_id,
        target: v.ziel_geraet_id,
        ports: `${v.quell_port} → ${v.ziel_port}`
      }))
    });

    // Bereits gefilterte Verbindungen verwenden
    const filteredVerbindungen = gefilterteVerbindungen.filter(verbindung => {
      // Prüfe ob Quell- und Zielgerät in den Nodes existieren
      const hasSource = gefilterteGeraete.some(g => g.id === verbindung.quell_geraet_id);
      const hasTarget = gefilterteGeraete.some(g => g.id === verbindung.ziel_geraet_id);
      
      if (!hasSource) {
        console.warn('❌ Verbindung übersprungen - Quellgerät nicht gefunden:', {
          verbindungId: verbindung.id,
          quellGeraetId: verbindung.quell_geraet_id,
          verfuegbareIds: gefilterteGeraete.map(g => g.id)
        });
      }
      if (!hasTarget) {
        console.warn('❌ Verbindung übersprungen - Zielgerät nicht gefunden:', {
          verbindungId: verbindung.id, 
          zielGeraetId: verbindung.ziel_geraet_id,
          verfuegbareIds: gefilterteGeraete.map(g => g.id)
        });
      }
      
      if (!hasSource || !hasTarget) {
        return false;
      }
      return true;
    });

    const newEdges: Edge[] = [];
    
    // Gruppiere Stack-Verbindungen zusammen
    const stackConnections: { [key: string]: any[] } = {};
    const nonStackConnections: any[] = [];
    
    filteredVerbindungen.forEach(verbindung => {
      const quellGeraet = gefilterteGeraete.find(g => g.id === verbindung.quell_geraet_id);
      const zielGeraet = gefilterteGeraete.find(g => g.id === verbindung.ziel_geraet_id);
      const isStackConnection = quellGeraet?.geraetetyp === 'Switch' && zielGeraet?.geraetetyp === 'Switch';
      
      if (isStackConnection) {
        const devicePairKey = `${Math.min(verbindung.quell_geraet_id, verbindung.ziel_geraet_id)}-${Math.max(verbindung.quell_geraet_id, verbindung.ziel_geraet_id)}`;
        if (!stackConnections[devicePairKey]) {
          stackConnections[devicePairKey] = [];
        }
        stackConnections[devicePairKey].push(verbindung);
      } else {
        nonStackConnections.push(verbindung);
      }
    });

    const connectionTracker: { [key: string]: number } = {}; // Zählt Verbindungen zwischen Gerätepaaren

    // Verarbeite normale Verbindungen
    nonStackConnections.forEach((verbindung, index) => {
        
      // Verwende die Kabelfarbe aus der Datenbank oder Fallback basierend auf Kabeltyp
        const kabelFarbe = verbindung.kabel_farbe 
          ? convertFarbeToHex(verbindung.kabel_farbe)
          : getKabelFarbe(verbindung.kabeltyp || 'Sonstiges');

        // Erstelle aussagekräftiges Label
        const quellGeraet = gefilterteGeraete.find(g => g.id === verbindung.quell_geraet_id);
        const zielGeraet = gefilterteGeraete.find(g => g.id === verbindung.ziel_geraet_id);
        
        const labelText = `${quellGeraet?.name || 'Unbekannt'}:${verbindung.quell_port} ⟷ ${zielGeraet?.name || 'Unbekannt'}:${verbindung.ziel_port}`;
        
        // Bestimme Strichstärke basierend auf Kabeltyp
        const getStrokeWidth = (kabeltyp: string): number => {
          if (kabeltyp.includes('Fibre') || kabeltyp.includes('SFP')) return 4;
          if (kabeltyp.includes('Cat6a')) return 3;
          if (kabeltyp.includes('Cat6')) return 2.5;
          // Profinet-Kabel haben unterschiedliche Bandbreiten
          if (kabeltyp.includes('Profinet')) return 3; // Industrial Ethernet, oft Gigabit
          if (kabeltyp.includes('M12 8-polig')) return 3; // 8-polig für höhere Geschwindigkeiten
          if (kabeltyp.includes('M12 4-polig') || kabeltyp.includes('M8')) return 2; // Standard Industrial
          return 2;
        };

        // Verbesserte Handle-Logik basierend auf Position und Verbindungstyp
        const quellNode = newNodes.find(n => n.id === String(verbindung.quell_geraet_id));
        const zielNode = newNodes.find(n => n.id === String(verbindung.ziel_geraet_id));
        
        const getOptimalHandles = (sourceNode: any, targetNode: any, connectionType: string, connectionIndex: number) => {
          if (!sourceNode || !targetNode) return { source: 'right', target: 'left-target' };
          
          const deltaX = targetNode.position.x - sourceNode.position.x;
          const deltaY = targetNode.position.y - sourceNode.position.y;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          
          // Spezielle Logik für HA-Verbindungen zwischen Firewalls
          if (connectionType === 'HA') {
            // Prüfe ob die Firewalls vertikal übereinander stehen
            if (Math.abs(deltaX) < 50) { // Sehr geringe horizontale Distanz
              if (deltaY > 0) {
                // Target ist unter Source
                return { source: 'bottom', target: 'top-target' };
              } else {
                // Target ist über Source  
                return { source: 'top', target: 'bottom-target' };
              }
            }
            // Für horizontal nebeneinander: normal verhalten
          }
          
          // Für sehr nah beieinander liegende Nodes: bevorzuge vertikale Verbindungen
          if (distance < 150) {
            const handles = [
              { source: 'bottom', target: 'top-target' },
              { source: 'top', target: 'bottom-target' },
              { source: 'right', target: 'left-target' },
              { source: 'left', target: 'right-target' }
            ];
            return handles[connectionIndex % handles.length];
          }
          
          // Standardlogik basierend auf der Richtung
          const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
          
          if (angle >= -45 && angle < 45) {
            // Rechts (0°)
            return { source: 'right', target: 'left-target' };
          } else if (angle >= 45 && angle < 135) {
            // Unten (90°)
            return { source: 'bottom', target: 'top-target' };
          } else if (angle >= 135 || angle < -135) {
            // Links (180°)
            return { source: 'left', target: 'right-target' };
          } else {
            // Oben (-90°)
            return { source: 'top', target: 'bottom-target' };
          }
        };
        
        // Erkenne Verbindungstyp für spezielle Markierungen (nur HA für normale Verbindungen)
        const quellGeraetTyp = quellGeraet?.geraetetyp || '';
        const zielGeraetTyp = zielGeraet?.geraetetyp || '';
        
        let verbindungstyp = '';
        let labelPrefix = '';
        let edgeColor = kabelFarbe;
        
        // HA-Verbindungen zwischen Firewalls
        if (quellGeraetTyp === 'Firewall' && zielGeraetTyp === 'Firewall') {
          verbindungstyp = 'HA';
          labelPrefix = '[HA] ';
          edgeColor = '#e91e63'; // Pink für HA
        }

        // Für mehrere Verbindungen zwischen denselben Geräten: Verwende Tracker
        const connectionKey = `${Math.min(verbindung.quell_geraet_id, verbindung.ziel_geraet_id)}-${Math.max(verbindung.quell_geraet_id, verbindung.ziel_geraet_id)}`;
        const connectionIndex = connectionTracker[connectionKey] || 0;
        connectionTracker[connectionKey] = connectionIndex + 1;
        
        const handles = getOptimalHandles(quellNode, zielNode, verbindungstyp, connectionIndex);
        let sourceHandle = handles.source;
        let targetHandle = handles.target;



        // Bestimme die korrekten Ports basierend auf der visuellen Position der Geräte
        let sourceGeraetId, targetGeraetId, sourcePort, targetPort;
        
        // Bestimme welches Gerät visuell links/oben steht für konsistente Label-Darstellung
        if (quellNode && zielNode) {
          const deltaX = zielNode.position.x - quellNode.position.x;
          const deltaY = zielNode.position.y - quellNode.position.y;
          
          // Bevorzuge horizontale Anordnung für Label-Reihenfolge
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontale Anordnung: links → rechts
            if (deltaX > 0) {
              // Quelle ist links, Ziel ist rechts
              sourceGeraetId = String(verbindung.quell_geraet_id);
              targetGeraetId = String(verbindung.ziel_geraet_id);
              sourcePort = verbindung.quell_port;
              targetPort = verbindung.ziel_port;
            } else {
              // Quelle ist rechts, Ziel ist links → tausche für konsistente Darstellung
              sourceGeraetId = String(verbindung.ziel_geraet_id);
              targetGeraetId = String(verbindung.quell_geraet_id);
              sourcePort = verbindung.ziel_port;
              targetPort = verbindung.quell_port;
            }
          } else {
            // Vertikale Anordnung: oben → unten
            if (deltaY > 0) {
              // Quelle ist oben, Ziel ist unten
              sourceGeraetId = String(verbindung.quell_geraet_id);
              targetGeraetId = String(verbindung.ziel_geraet_id);
              sourcePort = verbindung.quell_port;
              targetPort = verbindung.ziel_port;
            } else {
              // Quelle ist unten, Ziel ist oben → tausche für konsistente Darstellung
              sourceGeraetId = String(verbindung.ziel_geraet_id);
              targetGeraetId = String(verbindung.quell_geraet_id);
              sourcePort = verbindung.ziel_port;
              targetPort = verbindung.quell_port;
            }
          }
        } else {
          // Fallback: verwende ursprüngliche Datenbank-Richtung
          sourceGeraetId = String(verbindung.quell_geraet_id);
          targetGeraetId = String(verbindung.ziel_geraet_id);
          sourcePort = verbindung.quell_port;
          targetPort = verbindung.ziel_port;
        }

        const edge = {
          id: `edge-${verbindung.id || `${verbindung.quell_geraet_id}-${verbindung.ziel_geraet_id}-${index}`}`,
          source: sourceGeraetId,
          target: targetGeraetId,
          sourceHandle,
          targetHandle,
          type: 'default',
          label: `${labelPrefix}${sourcePort} ⟷ ${targetPort}`,
        style: {
            stroke: edgeColor, // Verwende die neue Farbe (HA/Stack/Normal)
            strokeWidth: getStrokeWidth(verbindung.kabeltyp || 'Sonstiges') + (verbindungstyp ? 1 : 0), // HA/Stack etwas dicker
            strokeDasharray: verbindung.kabeltyp === 'Sonstiges' ? '5,5' : 
                           verbindungstyp === 'HA' ? '10,5' : // HA gestrichelt
                           verbindungstyp === 'Stack' ? '15,10,5,10' : // Stack gepunktet
                           undefined,
        },
        labelStyle: {
            fontSize: 11,
            fontWeight: verbindungstyp ? 'bold' : 'normal',
            backgroundColor: verbindungstyp ? 
              (verbindungstyp === 'HA' ? 
                (darkMode ? 'rgba(233, 30, 99, 0.2)' : 'rgba(233, 30, 99, 0.1)') : 
                (darkMode ? 'rgba(156, 39, 176, 0.2)' : 'rgba(156, 39, 176, 0.1)')) :
              (darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)'),
            padding: '3px 8px',
            borderRadius: '6px',
            border: `2px solid ${edgeColor}`,
            color: verbindungstyp ? (darkMode ? '#e2e8f0' : edgeColor) : (darkMode ? '#e2e8f0' : '#333'),
        },
        labelBgStyle: {
            fill: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            strokeWidth: 0,
        },
        data: {
            quellPort: verbindung.quell_port,
            zielPort: verbindung.ziel_port,
            kabeltyp: verbindung.kabeltyp || 'Unbekannt',
          bemerkungen: verbindung.bemerkungen,
            quellName: quellGeraet?.name || 'Unbekannt',
            zielName: zielGeraet?.name || 'Unbekannt',
            fullLabel: labelText,
            kabellaenge: verbindung.kabel_laenge,
            kabelfarbe: verbindung.kabel_farbe,
            kabelkategorie: verbindung.kabel_kategorie,
          },
        };
        
        console.log(`🔗 Verbindung ${quellGeraet?.name} → ${zielGeraet?.name}:`, {
          verbindungId: verbindung.id,
          verbindungstyp,
          connectionIndex,
          deltaX: quellNode && zielNode ? zielNode.position.x - quellNode.position.x : 0,
          deltaY: quellNode && zielNode ? zielNode.position.y - quellNode.position.y : 0,
          sourcePos: quellNode?.position,
          targetPos: zielNode?.position,
          sourceHandle, targetHandle,
          ports: `${verbindung.quell_port} → ${verbindung.ziel_port}`,
          edgeColor
        });
        
        newEdges.push(edge);
      });

    // Verarbeite Stack-Verbindungen (zusammengefasst)
    Object.entries(stackConnections).forEach(([devicePairKey, connections]) => {
      if (connections.length === 0) return;
      
      const firstConnection = connections[0];
      const quellGeraet = geraeteData.find(g => g.id === firstConnection.quell_geraet_id);
      const zielGeraet = geraeteData.find(g => g.id === firstConnection.ziel_geraet_id);
      
      if (!quellGeraet || !zielGeraet) return;
      
      // Sammle alle Port-Informationen mit konsistenter Darstellung
      const portPairs = connections.map(c => {
        // Bestimme die korrekte Reihenfolge basierend auf visueller Position
        const cQuellNode = newNodes.find(n => n.id === String(c.quell_geraet_id));
        const cZielNode = newNodes.find(n => n.id === String(c.ziel_geraet_id));
        
        if (cQuellNode && cZielNode) {
          const deltaX = cZielNode.position.x - cQuellNode.position.x;
          const deltaY = cZielNode.position.y - cQuellNode.position.y;
          
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal: links → rechts
            return deltaX > 0 ? `${c.quell_port}⟷${c.ziel_port}` : `${c.ziel_port}⟷${c.quell_port}`;
          } else {
            // Vertikal: oben → unten
            return deltaY > 0 ? `${c.quell_port}⟷${c.ziel_port}` : `${c.ziel_port}⟷${c.quell_port}`;
          }
        }
        
        // Fallback
        return `${c.quell_port}⟷${c.ziel_port}`;
      });
      const uniquePortPairs = Array.from(new Set(portPairs));
      
      // Verwende die erste Verbindung für Grundeigenschaften
      const kabelFarbe = firstConnection.kabel_farbe 
        ? convertFarbeToHex(firstConnection.kabel_farbe)
        : getKabelFarbe(firstConnection.kabeltyp || 'Sonstiges');
      
      // Bestimme Handle-Positionen für Stack-Verbindungen
      const quellNode = newNodes.find(n => n.id === String(firstConnection.quell_geraet_id));
      const zielNode = newNodes.find(n => n.id === String(firstConnection.ziel_geraet_id));
      
      const stackConnectionIndex = connectionTracker[devicePairKey] || 0;
      connectionTracker[devicePairKey] = stackConnectionIndex + 1;
      
      const getOptimalHandles = (sourceNode: any, targetNode: any, connectionIndex: number) => {
        if (!sourceNode || !targetNode) return { source: 'right', target: 'left-target' };
        
        const deltaX = targetNode.position.x - sourceNode.position.x;
        const deltaY = targetNode.position.y - sourceNode.position.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Für Stack-Verbindungen: bevorzuge starke visuelle Verbindungen
        if (distance < 150) {
          // Sehr nah: verwende top/bottom für bessere Sichtbarkeit
          return connectionIndex % 2 === 0 
            ? { source: 'bottom', target: 'top-target' }
            : { source: 'top', target: 'bottom-target' };
        }
        
        // Normale Distanz: verwende Richtungsbasierte Handles
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        
        if (angle >= -45 && angle < 45) {
          return { source: 'right', target: 'left-target' };
        } else if (angle >= 45 && angle < 135) {
          return { source: 'bottom', target: 'top-target' };
        } else if (angle >= 135 || angle < -135) {
          return { source: 'left', target: 'right-target' };
        } else {
          return { source: 'top', target: 'bottom-target' };
        }
      };
      
      const handles = getOptimalHandles(quellNode, zielNode, stackConnectionIndex);
      
      // Erstelle zusammengefasste Stack-Verbindung
      const stackLabel = connections.length > 1 
        ? `[STACK ${connections.length}x] ${uniquePortPairs.join(', ')}`
        : `[STACK] ${uniquePortPairs[0]}`;
      
      const stackEdge = {
        id: `stack-edge-${devicePairKey}`,
        source: String(firstConnection.quell_geraet_id),
        target: String(firstConnection.ziel_geraet_id),
        sourceHandle: handles.source,
        targetHandle: handles.target,
        type: 'default',
        label: stackLabel,
        style: {
          stroke: '#9c27b0', // Lila für Stack
          strokeWidth: Math.min(5 + connections.length, 8), // Dicker je mehr Verbindungen
          strokeDasharray: '15,10,5,10', // Stack gepunktet
        },
        labelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
          backgroundColor: darkMode ? 'rgba(156, 39, 176, 0.2)' : 'rgba(156, 39, 176, 0.1)',
          padding: '4px 10px',
          borderRadius: '8px',
          border: '2px solid #9c27b0',
          color: darkMode ? '#e2e8f0' : '#9c27b0',
        },
        labelBgStyle: {
          fill: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          strokeWidth: 0,
        },
        data: {
          verbindungstyp: 'Stack',
          connectionCount: connections.length,
          portPairs: uniquePortPairs,
          quellName: quellGeraet.name,
          zielName: zielGeraet.name,
          connections: connections.map(c => ({
            quellPort: c.quell_port,
            zielPort: c.ziel_port,
            kabeltyp: c.kabeltyp,
            bemerkungen: c.bemerkungen
          }))
        },
      };
      
      console.log(`🔗 Stack-Verbindung ${quellGeraet.name} ⟷ ${zielGeraet.name}:`, {
        connectionCount: connections.length,
        portPairs: uniquePortPairs,
        stackConnectionIndex,
        sourceHandle: handles.source,
        targetHandle: handles.target,
        sourcePos: quellNode?.position,
        targetPos: zielNode?.position
      });
      
      newEdges.push(stackEdge);
    });

    // Analysiere Verbindungstypen
    const verbindungsStats = {
      total: newEdges.length,
      ha: newEdges.filter(e => typeof e.label === 'string' && e.label.includes('[HA]')).length,
      stack: newEdges.filter(e => typeof e.label === 'string' && e.label.includes('[STACK]')).length,
      normal: newEdges.filter(e => typeof e.label === 'string' && !e.label.includes('[HA]') && !e.label.includes('[STACK]')).length
    };
    
    console.log('🔍 DEBUG - Diagramm generiert:', { 
      nodes: newNodes.length, 
      edges: newEdges.length,
      verbindungsStats,
      nodeIds: newNodes.map(n => n.id),
      edgeConnections: newEdges.map(e => `${e.source}:${e.sourceHandle} → ${e.target}:${e.targetHandle} (${e.label})`),
      verbindungenInput: verbindungenData.length,
      allEdgeIds: newEdges.map(e => e.id),
      duplicateCheck: verbindungenData.length - newEdges.length === 0 ? 'OK' : `${verbindungenData.length - newEdges.length} Verbindungen gefiltert`
    });
    
    // Prüfe ID-Übereinstimmungen
    const nodeIdSet = new Set(newNodes.map(n => n.id));
    const orphanEdges = newEdges.filter(e => !nodeIdSet.has(e.source) || !nodeIdSet.has(e.target));
    if (orphanEdges.length > 0) {
      console.error('❌ Edges mit unbekannten Node-IDs:', orphanEdges);
    }
    
    // Test-Edge hinzufügen wenn keine Edges aber Nodes vorhanden
    if (newEdges.length === 0 && newNodes.length >= 2) {
      console.log('🧪 Füge Test-Edge hinzu für Debugging');
      newEdges.push({
        id: 'test-edge-debug',
        source: newNodes[0].id,
        target: newNodes[1].id,
        sourceHandle: 'right',
        targetHandle: 'left',
        type: 'default',
        label: 'TEST CONNECTION',
        style: { stroke: '#ff0000', strokeWidth: 3 }
      });
    }
    
    // Nodes und Edges setzen (Auto-Layout bereits angewendet)
    setNodes(newNodes);
    setEdges(newEdges);
  };

  // Kabeltyp zu Farbe (Fallback wenn keine spezifische Farbe gesetzt)
  const getKabelFarbe = (kabeltyp: string): string => {
    const farbMap: Record<string, string> = {
      'RJ45 Cat5e': '#2196f3',
      'RJ45 Cat6': '#4caf50',
      'RJ45 Cat6a': '#8bc34a',
      'Fibre Singlemode': '#ff9800',
      'Fibre Multimode': '#f44336',
      'SFP/SFP+': '#9c27b0',
      'QSFP': '#e91e63',
      'Coax': '#9c27b0',
      // Profinet-Kabel (grüne Töne für Industrial Ethernet)
      'Profinet Standard': '#2e7d32',
      'Profinet Fast Connect': '#388e3c',
      'Profinet Robust': '#43a047',
      'Profinet Marine': '#4caf50',
      // M12/M8 Industriesteckverbindungen (blaue Töne)
      'M12 4-polig': '#1976d2',
      'M12 8-polig': '#1565c0',
      'M8 3-polig': '#0d47a1',
      'M8 4-polig': '#0277bd',
      'Sonstiges': '#607d8b',
    };
    return farbMap[kabeltyp] || '#607d8b';
  };

  // Positionen speichern
  const speicherePositionen = async () => {
    try {
      for (const node of nodes) {
        await fetch(`/api/geraete/${node.id}/position`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            x: node.position.x,
            y: node.position.y,
          }),
        });
      }
      // Erfolgs-Feedback
      setError(null);
    } catch (err) {
      console.error('Fehler beim Speichern der Positionen:', err);
      setError('Fehler beim Speichern der Positionen');
    }
  };

  // Diagramm als PNG exportieren
  const exportiereDiagrammAlsPNG = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const reactFlowWrapper = document.querySelector('.react-flow');
      
      if (reactFlowWrapper) {
        const canvas = await html2canvas(reactFlowWrapper as HTMLElement, {
          backgroundColor: '#ffffff',
          scale: 2, // Höhere Auflösung
          useCORS: true,
          allowTaint: true,
        });
        
        // Download auslösen
        const link = document.createElement('a');
        link.download = `netzwerkdiagramm-${selectedStandort}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    } catch (err) {
      console.error('Fehler beim Exportieren des Diagramms:', err);
      setError('Fehler beim Exportieren des Diagramms');
    }
  };

  // Diagramm als PDF exportieren
  const exportiereDiagrammAlsPDF = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).jsPDF;
      const reactFlowWrapper = document.querySelector('.react-flow');
      
      if (reactFlowWrapper) {
        const canvas = await html2canvas(reactFlowWrapper as HTMLElement, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          allowTaint: true,
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`netzwerkdiagramm-${selectedStandort}-${new Date().toISOString().split('T')[0]}.pdf`);
      }
    } catch (err) {
      console.error('Fehler beim PDF-Export:', err);
      setError('Fehler beim PDF-Export');
    }
  };

  // Auto-Layout mit horizontaler Anordnung: IT-Geräte > OT-Geräte > Sonstiges
  const autoLayout = () => {
    // Definiere die gewünschte Reihenfolge der Gerätetypen
    const geraeteReihenfolge = [
      // IT-Geräte
      'Router', // Modem-Kategorie
      'SD-WAN Gateway',
      'Firewall', 
      'Switch',
      'Access Point',
      'Server',
      'NVR',
      'Kamera',
      'VOIP-Phone',
      'Drucker',
      'AI-Port',
      'Zugangskontrolle',
      'Serial Server',
      'HMI',
      'Sensor',
      // OT-Geräte
      'IT/OT-Router',
      'SPS',
      'Industrial Switch',
      'Verdichter',
      'H2-Versorger',
      'Gasanalysator',
      'Drucksensor',
      'Temperatursensor',
      'Durchflussmesser',
      'Ventilstation',
      'Frequenzumrichter',
      'Transformator',
      'USV',
      'Notabschaltung',
      'Sonstiges'
    ];

    // Gruppiere Nodes nach Gerätetyp
    const geraeteGruppen: { [key: string]: typeof nodes } = {};
    nodes.forEach(node => {
      const typ = node.data.geraetetyp;
      if (!geraeteGruppen[typ]) {
        geraeteGruppen[typ] = [];
      }
      geraeteGruppen[typ].push(node);
    });

         const layoutedNodes: Node[] = [];
     let currentX = 100; // Startposition von links
     const baseY = 300; // Grundhöhe
     const gruppenAbstand = 300; // Horizontaler Abstand zwischen Gruppen
     const geraeteAbstand = 200; // Vertikaler Abstand zwischen Geräten derselben Gruppe

     // Durchlaufe Gerätetypen in der gewünschten Reihenfolge
    geraeteReihenfolge.forEach(geraetetyp => {
      if (geraeteGruppen[geraetetyp] && geraeteGruppen[geraetetyp].length > 0) {
        const gruppe = geraeteGruppen[geraetetyp];
        
        // Sortiere Geräte innerhalb der Gruppe nach Anzahl Verbindungen (absteigend)
        gruppe.sort((a, b) => (b.data.anzahlVerbindungen || 0) - (a.data.anzahlVerbindungen || 0));
        
        // Positioniere Geräte dieser Gruppe
        gruppe.forEach((node, index) => {
          // Zentriere die Gruppe vertikal
          const gruppeCenterOffset = (gruppe.length - 1) * geraeteAbstand / 2;
          const y = baseY - gruppeCenterOffset + (index * geraeteAbstand);
          
          layoutedNodes.push({
        ...node,
            position: { x: currentX, y }
          });
        });
        
        // Bewege X-Position für die nächste Gruppe
        currentX += gruppenAbstand;
      }
    });

    console.log('🔄 Auto-Layout angewendet:', {
      totalNodes: layoutedNodes.length,
      groupsFound: Object.keys(geraeteGruppen),
      groupSizes: Object.entries(geraeteGruppen).map(([typ, nodes]) => `${typ}: ${nodes.length}`)
    });

    setNodes(layoutedNodes);
  };

  // Auto-Refresh Logik
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefresh && selectedStandort) {
      interval = setInterval(() => {
        ladeDiagrammDaten(selectedStandort);
      }, 10000); // Alle 10 Sekunden aktualisieren
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedStandort]);

  useEffect(() => {
    if (selectedStandort) {
      ladeDiagrammDaten(selectedStandort);
    }
  }, [selectedStandort]);

  // Keine manuellen Verbindungen erlaubt - nur aus Datenbank
  const onConnect = useCallback(
    (params: Connection) => {
      console.log('❌ Manuelle Verbindungen nicht erlaubt:', params);
      // Keine Aktion - Verbindungen kommen nur aus der Datenbank
    },
    []
  );

  if (!selectedStandort) {
    return (
      <Box sx={{ height: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <LocationIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" component="h1" gutterBottom>
            Kein Standort ausgewählt
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Bitte wählen Sie einen Standort in der oberen Navigationsleiste aus, um das Netzwerkdiagramm anzuzeigen.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', width: '100%' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">
            Netzwerkdiagramm: {selectedStandortData?.name}
          </Typography>
          
          <Box display="flex" alignItems="center" gap={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
              }
              label="Auto-Refresh"
            />

            <Tooltip title="Positionen speichern">
              <IconButton onClick={speicherePositionen} color="primary">
                <SaveIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Auto-Layout">
              <IconButton onClick={autoLayout} color="primary">
                <CenterIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Aktualisieren">
              <IconButton 
                onClick={() => ladeDiagrammDaten(selectedStandort)}
                color="primary"
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Als PNG exportieren">
              <IconButton 
                onClick={exportiereDiagrammAlsPNG}
                color="primary"
                disabled={nodes.length === 0}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>

            <Button
              variant="outlined"
              size="small"
              onClick={exportiereDiagrammAlsPDF}
              disabled={nodes.length === 0}
              sx={{ ml: 1 }}
            >
              PDF Export
            </Button>
          </Box>
        </Box>
        
        {/* Filter-Bereich */}
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="subtitle2">Filter:</Typography>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Gerätetyp</InputLabel>
            <Select
              value={geraetetypFilter}
              onChange={(e) => setGeraetetypFilter(e.target.value)}
              label="Gerätetyp"
            >
              <MenuItem value="alle">Alle Gerätetypen</MenuItem>
              {Array.from(new Set(geraete.map(g => g.geraetetyp))).sort().map(typ => (
                <MenuItem key={typ} value={typ}>{typ}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Kategorie</InputLabel>
            <Select
              value={kategorieFilter}
              onChange={(e) => setKategorieFilter(e.target.value)}
              label="Kategorie"
            >
              <MenuItem value="alle">Alle Kategorien</MenuItem>
              <MenuItem value="IT">IT-Geräte</MenuItem>
              <MenuItem value="OT">OT-Geräte</MenuItem>
              <MenuItem value="Hybrid">Hybrid-Geräte</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Netzbereich</InputLabel>
            <Select
              value={netzbereichFilter}
              onChange={(e) => setNetzbereichFilter(e.target.value)}
              label="Netzbereich"
            >
              <MenuItem value="alle">Alle Netzbereiche</MenuItem>
              <MenuItem value="IT">IT-Netz</MenuItem>
              <MenuItem value="OT">OT-Netz</MenuItem>
              <MenuItem value="SPS">SPS-Netz</MenuItem>
              <MenuItem value="DMZ">DMZ</MenuItem>
              <MenuItem value="Management">Management</MenuItem>
              <MenuItem value="Sonstiges">Sonstiges</MenuItem>
            </Select>
          </FormControl>
          
          {(geraetetypFilter !== 'alle' || kategorieFilter !== 'alle' || netzbereichFilter !== 'alle') && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setGeraetetypFilter('alle');
                setKategorieFilter('alle');
                setNetzbereichFilter('alle');
              }}
            >
              Filter zurücksetzen
            </Button>
          )}
        </Box>
      </Paper>

      {/* Fehler-Anzeige */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Lade-Indikator */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" p={4}>
          <CircularProgress />
        </Box>
      )}

      {/* ReactFlow Diagramm */}
      {!loading && (
        <Box sx={{ 
          height: 'calc(100vh - 200px)', 
          border: `1px solid ${darkMode ? theme.palette.divider : '#ddd'}`, 
          borderRadius: 1,
          backgroundColor: darkMode ? theme.palette.background.default : '#ffffff',
        }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            connectOnClick={false}
            elementsSelectable={true}
            nodesConnectable={false}
            nodesDraggable={true}
            panOnDrag={true}
            zoomOnScroll={true}
          >
            <Controls />
            <MiniMap 
              nodeColor={(node) => getNodeColor(node.data.geraetetyp)}
              maskColor="rgba(0, 0, 0, 0.2)"
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            
            <Panel position="top-left">
              <Box sx={{ 
                bgcolor: darkMode ? theme.palette.background.paper : 'white', 
                p: 2, 
                borderRadius: 1, 
                boxShadow: darkMode ? '0px 4px 12px rgba(0,0,0,0.5)' : 2,
                border: darkMode ? `1px solid ${theme.palette.divider}` : 'none',
              }}>
                <Typography variant="subtitle2" gutterBottom>
                  Legende - Gerätetypen
                </Typography>
                <Box display="flex" flexDirection="column" gap={0.5}>
                  {Array.from(new Set(geraete.map(g => g.geraetetyp))).map(typ => (
                    <Box key={typ} display="flex" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          backgroundColor: getNodeColor(typ as GeraeteTyp),
                          borderRadius: '50%',
                        }}
                      />
                      <Typography variant="caption">{typ}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Panel>



            <Panel position="bottom-center">
              <Box sx={{ 
                bgcolor: darkMode ? theme.palette.background.paper : 'white', 
                p: 2, 
                borderRadius: 1, 
                boxShadow: darkMode ? '0px 4px 12px rgba(0,0,0,0.5)' : 2,
                border: darkMode ? `1px solid ${theme.palette.divider}` : 'none',
                mb: 1,
              }}>
                <Typography variant="subtitle2" gutterBottom>
                  Statistiken
                </Typography>
                <Typography variant="caption" display="block">
                  Geräte: {geraete.length}
                </Typography>
                <Typography variant="caption" display="block">
                  Verbindungen: {verbindungen.length}
                </Typography>
                {autoRefresh && (
                  <Typography variant="caption" display="block" sx={{ color: 'primary.main' }}>
                    Auto-Refresh: ON
                  </Typography>
                )}
              </Box>
            </Panel>
          </ReactFlow>
        </Box>
      )}

      {/* Leerer Zustand */}
      {!selectedStandort && !loading && (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Wählen Sie einen Standort aus
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Wählen Sie oben einen Standort aus, um das Netzwerkdiagramm anzuzeigen.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default NetzwerkDiagramm; 