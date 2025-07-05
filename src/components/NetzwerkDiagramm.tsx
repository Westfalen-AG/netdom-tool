import React, { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { Geraet, Verbindung, GeraeteTyp } from '../types';

// Gerätetype zu Farbe Mapping
const getNodeColor = (geraetetyp: GeraeteTyp): string => {
  const colorMap: Record<string, string> = {
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
  };
  return colorMap[geraetetyp] || '#9e9e9e';
};

// Custom Node Komponente
const GeraetNode = ({ data }: { data: any }) => {
  return (
    <Box
      sx={{
        padding: 2,
        border: `2px solid ${getNodeColor(data.geraetetyp)}`,
        borderRadius: 2,
        backgroundColor: 'white',
        minWidth: 150,
        textAlign: 'center',
        boxShadow: 2,
        '&:hover': {
          boxShadow: 4,
        },
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
        {data.name}
      </Typography>
      <Chip
        label={data.geraetetyp}
        size="small"
        sx={{
          backgroundColor: getNodeColor(data.geraetetyp),
          color: 'white',
          mb: 1,
        }}
      />
      {data.ipAdresse && (
        <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
          {data.ipAdresse}
        </Typography>
      )}
      <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
        Ports: {data.anzahlNetzwerkports}
      </Typography>
    </Box>
  );
};

const nodeTypes = {
  geraet: GeraetNode,
};

interface NetzwerkDiagrammProps {}

const NetzwerkDiagramm: React.FC<NetzwerkDiagrammProps> = () => {
  const { standortId } = useParams<{ standortId?: string }>();
  const [selectedStandort, setSelectedStandort] = useState<string>('');
  const [standorte, setStandorte] = useState<any[]>([]);
  const [geraete, setGeraete] = useState<Geraet[]>([]);
  const [verbindungen, setVerbindungen] = useState<Verbindung[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Standorte laden
  const ladeStandorte = async () => {
    try {
      const response = await fetch('/api/standorte');
      const data = await response.json();
      if (data.success) {
        setStandorte(data.data);
        // Wenn standortId aus URL vorhanden ist, automatisch auswählen
        if (standortId && data.data.some((s: any) => s.id === standortId)) {
          setSelectedStandort(standortId);
        }
      }
    } catch (err) {
      console.error('Fehler beim Laden der Standorte:', err);
    }
  };

  // Diagrammdaten laden
  const ladeDiagrammDaten = async (standortIdParam: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/standorte/${standortIdParam}/diagramm`);
      const data = await response.json();
      
      if (data.success) {
        setGeraete(data.data.geraete);
        setVerbindungen(data.data.verbindungen);
        generiereNetzwerkDiagramm(data.data.geraete, data.data.verbindungen);
      } else {
        setError(data.error || 'Fehler beim Laden der Diagrammdaten');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Laden der Diagrammdaten:', err);
    } finally {
      setLoading(false);
    }
  };

  // Netzwerkdiagramm aus Daten generieren
  const generiereNetzwerkDiagramm = (geraeteData: Geraet[], verbindungenData: Verbindung[]) => {
    // Nodes erstellen
    const newNodes: Node[] = geraeteData.map((geraet, index) => ({
      id: geraet.id,
      type: 'geraet',
      position: {
        x: geraet.position?.x || (index % 4) * 250 + 100,
        y: geraet.position?.y || Math.floor(index / 4) * 150 + 100,
      },
      data: {
        name: geraet.name,
        geraetetyp: geraet.geraetetyp,
        ipAdresse: geraet.ipKonfiguration?.ipAdresse,
        anzahlNetzwerkports: geraet.anzahlNetzwerkports,
      },
    }));

    // Edges erstellen
    const newEdges: Edge[] = verbindungenData.map((verbindung) => ({
      id: verbindung.id,
      source: verbindung.quellGeraetId,
      target: verbindung.zielGeraetId,
      label: `${verbindung.kabeltyp}`,
      type: 'smoothstep',
      style: {
        stroke: getKabelFarbe(verbindung.kabeltyp),
        strokeWidth: 2,
      },
      labelStyle: {
        fontSize: 12,
        backgroundColor: 'white',
        padding: '2px 4px',
        borderRadius: '4px',
      },
      data: {
        quellPort: verbindung.quellPort,
        zielPort: verbindung.zielPort,
        kabeltyp: verbindung.kabeltyp,
        eigenschaften: verbindung.kabeleigenschaften,
      },
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  };

  // Kabeltyp zu Farbe
  const getKabelFarbe = (kabeltyp: string): string => {
    const farbMap: Record<string, string> = {
      'RJ45 Cat5e': '#2196f3',
      'RJ45 Cat6': '#4caf50',
      'RJ45 Cat6a': '#8bc34a',
      'Fibre Singlemode': '#ff9800',
      'Fibre Multimode': '#f44336',
      'Coax': '#9c27b0',
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
      // Erfolgs-Feedback könnte hier hinzugefügt werden
    } catch (err) {
      console.error('Fehler beim Speichern der Positionen:', err);
    }
  };

  // Auto-Layout
  const autoLayout = () => {
    const layoutedNodes = nodes.map((node, index) => ({
      ...node,
      position: {
        x: (index % 4) * 250 + 100,
        y: Math.floor(index / 4) * 150 + 100,
      },
    }));
    setNodes(layoutedNodes);
  };

  useEffect(() => {
    ladeStandorte();
  }, []);

  useEffect(() => {
    if (selectedStandort) {
      ladeDiagrammDaten(selectedStandort);
    }
  }, [selectedStandort]);

  useEffect(() => {
    if (standortId) {
      setSelectedStandort(standortId);
    }
  }, [standortId]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <Box sx={{ height: '100vh', width: '100%' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">
            Netzwerkdiagramm
          </Typography>
          
          <Box display="flex" alignItems="center" gap={2}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
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
                onClick={() => selectedStandort && ladeDiagrammDaten(selectedStandort)}
                color="primary"
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
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
      {selectedStandort && !loading && (
        <Box sx={{ height: 'calc(100vh - 200px)', border: '1px solid #ddd', borderRadius: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Controls />
            <MiniMap 
              nodeColor={(node) => getNodeColor(node.data.geraetetyp)}
              maskColor="rgba(0, 0, 0, 0.2)"
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            
            <Panel position="top-right">
              <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 1, boxShadow: 2 }}>
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

            <Panel position="bottom-right">
              <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 1, boxShadow: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Statistiken
                </Typography>
                <Typography variant="caption" display="block">
                  Geräte: {geraete.length}
                </Typography>
                <Typography variant="caption" display="block">
                  Verbindungen: {verbindungen.length}
                </Typography>
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