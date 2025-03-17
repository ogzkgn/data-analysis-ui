import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { FileProvider } from './context/FileContext';
import { SettingsProvider } from './context/SettingsContext';
import { useSettingsContext } from './context/SettingsContext';
import { useTranslation } from 'react-i18next';

import NavBar from './components/navigation/NavBar';
import SensitivityAnalysis from './components/analysis/SensitivityAnalysis';
import CorrelationAnalysis from './components/analysis/CorrelationAnalysis';
import AlternativeMethods from './components/analysis/AlternativeMethods';
import EarlyDetection from './components/analysis/EarlyDetection';
import DataViewer from './components/fileHandling/DataViewer';
import Settings from './components/analysis/Settings';
import Home from './components/fileHandling/Home';

// Create a theme provider wrapper that uses settings
const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettingsContext();
  const { i18n } = useTranslation();
  
  // Update i18n language when settings language changes
  useEffect(() => {
    i18n.changeLanguage(settings.language);
  }, [settings.language, i18n]);
  
  const theme = createTheme({
    palette: {
      mode: settings.darkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#f50057',
      },
    },
  });
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <FileProvider>
          <ThemeWrapper>
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              <NavBar />
              <Box component="main" sx={{ flexGrow: 1 }}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/correlation" element={<CorrelationAnalysis />} />
                  <Route path="/alternative" element={<AlternativeMethods />} />
                  <Route path="/sensitivity" element={<SensitivityAnalysis />} />
                  <Route path="/early-detection" element={<EarlyDetection />} />
                  <Route path="/data-viewer" element={<DataViewer />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Box>
            </Box>
          </ThemeWrapper>
        </FileProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}

export default App;
