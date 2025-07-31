import React, { useState, useEffect, useContext } from 'react';
import {
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Box,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Settings as SettingsIcon,
  Image as ImageIcon,
  RestartAlt as ResetIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Web as FaviconIcon,
  Preview as PreviewIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { ThemeContext } from '../App';

interface AppSettings {
  id: number;
  logo_light: string;
  logo_dark: string;
  favicon: string;
  app_name: string;
  company_name: string;
}

const Einstellungen: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Form-State
  const [appName, setAppName] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Einstellungen laden
  const ladeEinstellungen = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
        setAppName(data.data.app_name);
        setCompanyName(data.data.company_name);
      } else {
        setError(data.error || 'Fehler beim Laden der Einstellungen');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Laden der Einstellungen:', err);
    } finally {
      setLoading(false);
    }
  };

  // Logo hochladen
  const handleLogoUpload = async (file: File, theme: 'light' | 'dark') => {
    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('logo', file);
      formData.append('theme', theme);

      const response = await fetch('/api/settings/upload-logo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`${theme === 'light' ? 'Helles' : 'Dunkles'} Logo erfolgreich hochgeladen!`);
        await ladeEinstellungen();
      } else {
        setError(data.error || 'Fehler beim Hochladen des Logos');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Logo-Upload:', err);
    } finally {
      setUploading(false);
    }
  };

  // Favicon hochladen
  const handleFaviconUpload = async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('favicon', file);

      const response = await fetch('/api/settings/upload-favicon', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Favicon erfolgreich hochgeladen! Die Seite wird automatisch aktualisiert.');
        await ladeEinstellungen();
        // Favicon im Browser aktualisieren
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setError(data.error || 'Fehler beim Hochladen des Favicons');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Favicon-Upload:', err);
    } finally {
      setUploading(false);
    }
  };

  // App-Einstellungen speichern
  const speichereAppEinstellungen = async () => {
    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_name: appName,
          company_name: companyName,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('App-Einstellungen erfolgreich gespeichert!');
        await ladeEinstellungen();
      } else {
        setError(data.error || 'Fehler beim Speichern der Einstellungen');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Speichern der Einstellungen:', err);
    } finally {
      setUploading(false);
    }
  };

  // Zurücksetzen
  const handleReset = async (type: 'logo' | 'favicon' | 'all') => {
    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/settings/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Einstellungen erfolgreich zurückgesetzt!');
        await ladeEinstellungen();
        if (type === 'favicon' || type === 'all') {
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else {
        setError(data.error || 'Fehler beim Zurücksetzen');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Server');
      console.error('Fehler beim Zurücksetzen:', err);
    } finally {
      setUploading(false);
    }
  };

  // Datei-Input Handler
  const handleFileInput = (callback: (file: File) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          setError('Datei ist zu groß. Maximum: 10MB');
          return;
        }
        callback(file);
      }
    };
    input.click();
  };

  // Vorschau öffnen
  const showPreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setPreviewDialog(true);
  };

  useEffect(() => {
    ladeEinstellungen();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Lade Einstellungen...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <SettingsIcon sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Einstellungen
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Passen Sie das Erscheinungsbild Ihrer Anwendung an
        </Typography>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Logo-Einstellungen */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <ImageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Logo-Einstellungen
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Laden Sie benutzerdefinierte Logos für helle und dunkle Themes hoch
              </Typography>

              {/* Aktuelles Logo - Hell */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  <LightModeIcon sx={{ mr: 1, fontSize: 18 }} />
                  Helles Theme
                </Typography>
                <Box 
                  sx={{ 
                    p: 2, 
                    border: '2px dashed #ccc', 
                    borderRadius: 2, 
                    textAlign: 'center',
                    backgroundColor: '#f5f5f5',
                    mb: 2
                  }}
                >
                  {settings?.logo_light && (
                    <Box sx={{ mb: 2 }}>
                      <img 
                        src={settings.logo_light} 
                        alt="Logo Hell" 
                        style={{ maxHeight: '60px', maxWidth: '200px' }}
                      />
                      <Box sx={{ mt: 1 }}>
                        <IconButton size="small" onClick={() => showPreview(settings.logo_light)}>
                          <PreviewIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  )}
                  <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    onClick={() => handleFileInput((file) => handleLogoUpload(file, 'light'))}
                    disabled={uploading}
                  >
                    Logo für helles Theme hochladen
                  </Button>
                </Box>
              </Box>

              {/* Aktuelles Logo - Dunkel */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  <DarkModeIcon sx={{ mr: 1, fontSize: 18 }} />
                  Dunkles Theme
                </Typography>
                <Box 
                  sx={{ 
                    p: 2, 
                    border: '2px dashed #ccc', 
                    borderRadius: 2, 
                    textAlign: 'center',
                    backgroundColor: '#1a1a1a',
                    mb: 2
                  }}
                >
                  {settings?.logo_dark && (
                    <Box sx={{ mb: 2 }}>
                      <img 
                        src={settings.logo_dark} 
                        alt="Logo Dunkel" 
                        style={{ maxHeight: '60px', maxWidth: '200px' }}
                      />
                      <Box sx={{ mt: 1 }}>
                        <IconButton size="small" onClick={() => showPreview(settings.logo_dark)} sx={{ color: 'white' }}>
                          <PreviewIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  )}
                  <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    onClick={() => handleFileInput((file) => handleLogoUpload(file, 'dark'))}
                    disabled={uploading}
                    sx={{ color: 'white', borderColor: 'white' }}
                  >
                    Logo für dunkles Theme hochladen
                  </Button>
                </Box>
              </Box>

              <Button
                variant="outlined"
                color="warning"
                startIcon={<ResetIcon />}
                onClick={() => handleReset('logo')}
                disabled={uploading}
                size="small"
              >
                Logos zurücksetzen
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Favicon-Einstellungen */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <FaviconIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Favicon-Einstellungen
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Laden Sie ein benutzerdefiniertes Favicon hoch (wird automatisch in verschiedenen Größen generiert)
              </Typography>

              <Box 
                sx={{ 
                  p: 2, 
                  border: '2px dashed #ccc', 
                  borderRadius: 2, 
                  textAlign: 'center',
                  mb: 3
                }}
              >
                {settings?.favicon && (
                  <Box sx={{ mb: 2 }}>
                    <Avatar 
                      src={settings.favicon} 
                      sx={{ width: 48, height: 48, mx: 'auto', mb: 1 }}
                    />
                    <Typography variant="caption" display="block">
                      Aktuelles Favicon
                    </Typography>
                  </Box>
                )}
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={() => handleFileInput(handleFaviconUpload)}
                  disabled={uploading}
                >
                  Favicon hochladen
                </Button>
              </Box>

              <Alert severity="info" sx={{ mb: 2 }}>
                Das Favicon wird automatisch in verschiedenen Größen generiert (16x16 bis 512x512px)
              </Alert>

              <Button
                variant="outlined"
                color="warning"
                startIcon={<ResetIcon />}
                onClick={() => handleReset('favicon')}
                disabled={uploading}
                size="small"
              >
                Favicon zurücksetzen
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* App-Einstellungen */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                App-Einstellungen
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Allgemeine Anwendungseinstellungen
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="App-Name"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    disabled={uploading}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Firmenname"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={uploading}
                  />
                </Grid>
              </Grid>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                startIcon={<CheckIcon />}
                onClick={speichereAppEinstellungen}
                disabled={uploading}
              >
                Speichern
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<ResetIcon />}
                onClick={() => handleReset('all')}
                disabled={uploading}
              >
                Alle Einstellungen zurücksetzen
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Unterstützte Dateiformate */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Unterstützte Dateiformate
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {['JPEG', 'JPG', 'PNG', 'GIF', 'SVG', 'ICO', 'WebP'].map((format) => (
                  <Chip key={format} label={format} variant="outlined" size="small" />
                ))}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Maximale Dateigröße: 10MB
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Vorschau-Dialog */}
      <Dialog open={previewDialog} onClose={() => setPreviewDialog(false)} maxWidth="md">
        <DialogTitle>Logo-Vorschau</DialogTitle>
        <DialogContent>
          {previewImage && (
            <img 
              src={previewImage} 
              alt="Logo Vorschau" 
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>

      {/* Loading Overlay */}
      {uploading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <Box sx={{ textAlign: 'center', color: 'white' }}>
            <CircularProgress sx={{ color: 'white', mb: 2 }} />
            <Typography variant="h6">
              Datei wird hochgeladen...
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Einstellungen;