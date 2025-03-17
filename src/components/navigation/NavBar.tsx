import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Button, Typography, Box, IconButton, useMediaQuery, Menu, MenuItem, useTheme } from '@mui/material';
import { useSettingsContext } from '../../context/SettingsContext';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import { useTranslation } from 'react-i18next';

const NavBar: React.FC = () => {
  const location = useLocation();
  const { settings, updateSettings } = useSettingsContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const { t } = useTranslation();

  const navItems = [
    { path: '/', label: t('nav.home'), icon: <HomeIcon fontSize="small" sx={{ mr: 0.5 }} /> },
    { path: '/sensitivity', label: t('nav.sensitivityAnalysis') },
    { path: '/correlation', label: t('nav.correlationAnalysis') },
    { path: '/alternative', label: t('nav.alternativeMethods') },
    { path: '/early-detection', label: t('nav.earlyDetection') },
    { path: '/data-viewer', label: t('nav.dataViewer') },
    { path: '/settings', label: t('nav.settings') }
  ];

  const toggleDarkMode = () => {
    updateSettings({ darkMode: !settings.darkMode });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component={Link} to="/" sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}>
          {t('common.appName')}
        </Typography>
        
        {isMobile ? (
          <>
            <IconButton
              color="inherit"
              onClick={toggleDarkMode}
              sx={{ mr: 1 }}
            >
              {settings.darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
            <IconButton
              color="inherit"
              onClick={handleMenuOpen}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleMenuClose}
            >
              {navItems.map((item) => (
                <MenuItem 
                  key={item.path} 
                  component={Link} 
                  to={item.path}
                  onClick={handleMenuClose}
                  selected={location.pathname === item.path}
                >
                  {item.icon} {item.label}
                </MenuItem>
              ))}
            </Menu>
          </>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {navItems.map((item) => (
              <Button
                key={item.path}
                component={Link}
                to={item.path}
                color={location.pathname === item.path ? 'secondary' : 'inherit'}
                variant={location.pathname === item.path ? 'contained' : 'text'}
                startIcon={item.icon}
                size="small"
              >
                {item.label}
              </Button>
            ))}
            
            <IconButton onClick={toggleDarkMode} color="inherit">
              {settings.darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default NavBar; 