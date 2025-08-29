import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';

// Components
import Navbar from './components/NavBar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AlertsPage from './pages/AlertPage.jsx';
import PopsPage from './pages/PopsPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';

// Context
import { WebSocketProvider } from './hooks/useWebSockets.jsx';

// Theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00d4ff',
      light: '#66e3ff',
      dark: '#0094cc'
    },
    secondary: {
      main: '#ff6b35',
      light: '#ff9566',
      dark: '#c53d06'
    },
    background: {
      default: '#0a0e1a',
      paper: '#1a1f2e'
    },
    success: {
      main: '#4caf50'
    },
    warning: {
      main: '#ff9800'
    },
    error: {
      main: '#f44336'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 500
    }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8
        }
      }
    }
  }
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <WebSocketProvider>
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            
            <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/alerts" element={<AlertsPage />} />
                  <Route path="/pops" element={<PopsPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                </Routes>
              </motion.div>
            </Box>
          </Box>
          
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1a1f2e',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }
            }}
          />
        </Router>
      </WebSocketProvider>
    </ThemeProvider>
  );
}

export default App;