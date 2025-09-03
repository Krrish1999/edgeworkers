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

// Tooltip theme integration
import { getTooltipThemeOverrides } from './config/tooltipTheme.js';

// Create base theme first
const baseTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00d4ff',
      light: '#66e3ff',
      dark: '#0094cc',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#ff6b35',
      light: '#ff9566',
      dark: '#c53d06',
      contrastText: '#ffffff'
    },
    background: {
      default: '#0a0e1a',
      paper: '#1a1f2e'
    },
    surface: {
      main: '#2d3748'
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669'
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706'
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626'
    },
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb'
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.95)',
      secondary: 'rgba(255, 255, 255, 0.7)',
      disabled: 'rgba(255, 255, 255, 0.5)'
    },
    divider: 'rgba(255, 255, 255, 0.12)'
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    h1: {
      fontSize: '2.75rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em'
    },
    h2: {
      fontSize: '2.25rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em'
    },
    h3: {
      fontSize: '1.875rem',
      fontWeight: 600,
      lineHeight: 1.3
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.4
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.4
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4
    }
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280
    }
  },
  spacing: 8,
  shape: {
    borderRadius: 12
  }
});

// Enhanced Theme with Better Desktop Support and Tooltip Integration
const darkTheme = createTheme({
  ...baseTheme,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 8,
            height: 8
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.3)'
            }
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, rgba(26, 31, 46, 0.9) 0%, rgba(45, 55, 72, 0.8) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 16,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(0, 212, 255, 0.3)'
          }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 10,
          padding: '10px 20px',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)'
          }
        },
        contained: {
          background: 'linear-gradient(135deg, #00d4ff 0%, #0094cc 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #66e3ff 0%, #00d4ff 100%)'
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '16px'
        },
        head: {
          fontWeight: 600,
          backgroundColor: 'rgba(255, 255, 255, 0.02)'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)'
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.3)'
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00d4ff'
            }
          }
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 10
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(26, 31, 46, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }
      }
    },

    // Integrate tooltip theme overrides with proper base theme
    ...getTooltipThemeOverrides(baseTheme)
  }
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <WebSocketProvider>
        <Router>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 50%, #2d3748 100%)',
            backgroundAttachment: 'fixed'
          }}>
            <Navbar />

            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: { xs: 2, sm: 3, md: 4 },
                mt: { xs: 7, sm: 8 },
                maxWidth: '100vw',
                overflow: 'hidden'
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
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