import React, { useState, useEffect, useContext } from 'react';
import {
  Paper,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { Geraet } from '../types';
import { StandortContext } from '../App';
import RackVisualisierung from './RackVisualisierung';

const RackAnsicht: React.FC = () => {
  const { selectedStandort, selectedStandortData } = useContext(StandortContext);
  
  const [geraete, setGeraete] = useState<Geraet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Geräte des ausgewählten Standorts laden
  const ladeGeraete = async (standortId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/standorte/${standortId}/geraete`);
      const data = await response.json();
      
      if (data.success) {
        setGeraete(data.data || []);
      } else {
        setError(data.error || 'Fehler beim Laden der Geräte');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Laden der Geräte für Rack-Ansicht:', err);
    } finally {
      setLoading(false);
    }
  };

  // Geräte laden wenn sich der Standort ändert
  useEffect(() => {
    if (selectedStandort) {
      ladeGeraete(selectedStandort);
    } else {
      setGeraete([]);
    }
  }, [selectedStandort]);

  // Kein Standort ausgewählt
  if (!selectedStandort) {
    return (
      <Box>
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <LocationIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" component="h1" gutterBottom>
            Kein Standort ausgewählt
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Bitte wählen Sie einen Standort in der oberen Navigationsleiste aus, um die Rack-Ansicht zu sehen.
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Fehler-Anzeige
  if (error) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Rack-Ansicht - {selectedStandortData?.name}
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      </Box>
    );
  }

  // Lade-Indikator
  if (loading) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Rack-Ansicht - {selectedStandortData?.name}
        </Typography>
        <Box display="flex" justifyContent="center" alignItems="center" p={4}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Lade Geräte...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Rack-Ansicht - {selectedStandortData?.name}
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Interaktive Darstellung aller Geräte in Serverschränken mit Verbindungsdetails und Port-Informationen.
      </Typography>

      <RackVisualisierung 
        geraete={geraete} 
        standortId={selectedStandort} 
      />
    </Box>
  );
};

export default RackAnsicht; 