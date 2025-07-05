import React, { useState, createContext, useContext } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  IconButton,
  Container,
  Switch,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  LocationOn as LocationIcon,
  Router as RouterIcon,
  Cable as CableIcon,
  AccountTree as DiagramIcon,
  FileDownload as ExportIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  People as PeopleIcon,
  Dns as ModemIcon,
  History as HistoryIcon,
} from '@mui/icons-material';

// Komponenten importieren
import StandortUebersicht from './components/StandortUebersicht';
import StandortDetails from './components/StandortDetails';
import AnsprechpartnerVerwaltung from './components/AnsprechpartnerVerwaltung';
import GeraeteVerwaltung from './components/GeraeteVerwaltung';
import VerbindungsVerwaltung from './components/VerbindungsVerwaltung';
import NetzwerkDiagramm from './components/NetzwerkDiagramm';
import ExportBereich from './components/ExportBereich';
import SwitchStackVerwaltung from './components/SwitchStackVerwaltung';
import Changelog from './components/Changelog';

const DRAWER_WIDTH = 240;
const APP_VERSION = '1.2.0';

// Westfalen AG Theme-Konfiguration
const getWestfalenTheme = (darkMode: boolean) => createTheme({
  palette: {
    mode: darkMode ? 'dark' : 'light',
    primary: {
      main: darkMode ? '#4299e1' : '#1a365d', // Heller im Dark Mode für besseren Kontrast
      light: darkMode ? '#63b3ed' : '#2d3748',
      dark: darkMode ? '#2b6cb0' : '#0f1419',
    },
    secondary: {
      main: darkMode ? '#fbb034' : '#d69e2e', // Heller im Dark Mode
      light: darkMode ? '#fcd34d' : '#f6e05e',
      dark: darkMode ? '#d97706' : '#b7791f',
    },
    background: {
      default: darkMode ? '#0f172a' : '#f8fafc', // Dunklerer Hintergrund
      paper: darkMode ? '#1e293b' : '#ffffff', // Besserer Kontrast
    },
    text: {
      primary: darkMode ? '#f1f5f9' : '#1a202c', // Hellerer Text im Dark Mode
      secondary: darkMode ? '#94a3b8' : '#4a5568',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: darkMode ? '#0f172a' : '#1a365d',
          boxShadow: darkMode 
            ? '0px 2px 4px -1px rgba(0,0,0,0.6)' 
            : '0px 2px 4px -1px rgba(0,0,0,0.2)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: darkMode ? '#1e293b' : '#ffffff',
          borderRight: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: darkMode ? '#1e293b' : '#ffffff',
          borderRadius: 8,
          boxShadow: darkMode 
            ? '0px 4px 6px -1px rgba(0,0,0,0.4)' 
            : '0px 4px 6px -1px rgba(0,0,0,0.1)',
          border: darkMode ? '1px solid #334155' : 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          backgroundColor: darkMode ? '#3b82f6' : '#1a365d',
          color: '#ffffff',
          fontWeight: 500,
          '&:hover': {
            backgroundColor: darkMode ? '#2563eb' : '#2d3748',
          },
        },
        outlined: {
          borderColor: darkMode ? '#64748b' : '#cbd5e0',
          color: darkMode ? '#e2e8f0' : '#4a5568',
          '&:hover': {
            borderColor: darkMode ? '#94a3b8' : '#a0aec0',
            backgroundColor: darkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(26, 54, 93, 0.04)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: darkMode ? '#374151' : '#f1f5f9',
          color: darkMode ? '#e5e7eb' : '#374151',
        },
        outlined: {
          borderColor: darkMode ? '#6b7280' : '#cbd5e0',
          color: darkMode ? '#d1d5db' : '#4a5568',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: darkMode ? '#1e293b' : '#ffffff',
          border: darkMode ? '1px solid #334155' : 'none',
        },
      },
    },
  },
});

// Theme Context
const ThemeContext = createContext({
  darkMode: false,
  toggleDarkMode: () => {},
});

const App: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('westfalen-dark-mode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const navigate = useNavigate();
  const location = useLocation();

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('westfalen-dark-mode', JSON.stringify(newMode));
  };

  const theme = getWestfalenTheme(darkMode);

  const menuItems = [
    { text: 'Übersicht', icon: <HomeIcon />, path: '/' },
    { text: 'Standorte', icon: <LocationIcon />, path: '/standorte' },
    { text: 'Ansprechpartner', icon: <PeopleIcon />, path: '/ansprechpartner' },
    { text: 'Geräte', icon: <RouterIcon />, path: '/geraete' },
    { text: 'Verbindungen', icon: <CableIcon />, path: '/verbindungen' },
    { text: 'Switch-Stacks', icon: <ModemIcon />, path: '/stacks' },
    { text: 'Netzwerkdiagramm', icon: <DiagramIcon />, path: '/diagramm' },
    { text: 'Export', icon: <ExportIcon />, path: '/export' },
    { text: 'Changelog', icon: <HistoryIcon />, path: '/changelog' },
  ];

  const handleMenuClick = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
        <Box sx={{ display: 'flex' }}>
          {/* App Bar */}
          <AppBar
            position="fixed"
            sx={{
              zIndex: (theme) => theme.zIndex.drawer + 1,
            }}
          >
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="menu öffnen"
                edge="start"
                onClick={() => setDrawerOpen(!drawerOpen)}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              
              {/* Westfalen Logo */}
              <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                <img
                  src={darkMode ? "/logo_schrift_weiss.png" : "/logo_schrift_weiss.png"}
                  alt="Westfalen AG"
                  style={{ height: '32px', width: 'auto' }}
                />
              </Box>
              
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" noWrap component="div">
                  Network Documentation Tool
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', lineHeight: 1 }}>
                  OnSite Anlagen Management
                </Typography>
              </Box>
              
              {/* Dark Mode Toggle */}
              <Tooltip title={darkMode ? "Hell-Modus aktivieren" : "Dunkel-Modus aktivieren"}>
                <IconButton
                  color="inherit"
                  onClick={toggleDarkMode}
                  sx={{ ml: 1 }}
                >
                  {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>
            </Toolbar>
          </AppBar>

          {/* Navigation Drawer */}
          <Drawer
            variant="temporary"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            ModalProps={{
              keepMounted: true, // Bessere Performance auf mobilen Geräten
            }}
            sx={{
              width: DRAWER_WIDTH,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
                overflow: 'hidden', // Keine Scrollbar im Drawer
              },
            }}
          >
            <Toolbar />
            <Box sx={{ 
              overflow: 'hidden', 
              mt: 1, 
              height: 'calc(100vh - 64px)', // Volle Höhe minus Toolbar
              display: 'flex',
              flexDirection: 'column' 
            }}>
              <List sx={{ flex: 1, py: 1 }}>
                {menuItems.map((item) => (
                  <ListItem
                    key={item.text}
                    onClick={() => handleMenuClick(item.path)}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: location.pathname === item.path 
                        ? theme.palette.primary.main + '20' 
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: theme.palette.primary.main + '10',
                      },
                      mx: 1,
                      borderRadius: 1,
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: location.pathname === item.path 
                          ? theme.palette.primary.main 
                          : 'inherit',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      sx={{
                        color: location.pathname === item.path 
                          ? theme.palette.primary.main 
                          : 'inherit',
                        fontWeight: location.pathname === item.path ? 600 : 400,
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Drawer>

          {/* Hauptinhalt */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
              minHeight: '100vh',
              backgroundColor: theme.palette.background.default,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Toolbar />
            <Container maxWidth="xl" sx={{ mt: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Routes>
                  <Route path="/" element={<StandortUebersicht />} />
                  <Route path="/standorte" element={<StandortUebersicht />} />
                  <Route path="/standorte/:name" element={<StandortDetails />} />
                  <Route path="/ansprechpartner" element={<AnsprechpartnerVerwaltung />} />
                  <Route path="/geraete" element={<GeraeteVerwaltung />} />
                  <Route path="/verbindungen" element={<VerbindungsVerwaltung />} />
                  <Route path="/stacks" element={<SwitchStackVerwaltung />} />
                  <Route path="/diagramm" element={<NetzwerkDiagramm />} />
                  <Route path="/diagramm/:standortName" element={<NetzwerkDiagramm />} />
                  <Route path="/export" element={<ExportBereich />} />
                  <Route path="/changelog" element={<Changelog />} />
                </Routes>
              </Box>
              
              {/* Footer */}
              <Box
                component="footer"
                sx={{
                  mt: 4,
                  py: 2,
                  textAlign: 'center',
                  borderTop: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Copyright 2025 Westfalen AG. Bei Fragen, Problemen oder Anregungen bitte an{' '}
                  <a
                    href="mailto:n.terhorst@westfalen.com"
                    style={{
                      color: theme.palette.primary.main,
                      textDecoration: 'none',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    Niklas Terhorst
                  </a>
                  {' '}per E-Mail oder Teams wenden.
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, opacity: 0.8 }}>
                  Version {APP_VERSION}
                </Typography>
              </Box>
            </Container>
          </Box>
        </Box>
      </ThemeContext.Provider>
    </ThemeProvider>
  );
};

export default App;
export { ThemeContext }; 