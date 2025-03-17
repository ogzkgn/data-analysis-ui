import React from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  Alert
} from '@mui/material';
import { useSettingsContext } from '../../context/SettingsContext';
import { useTranslation } from 'react-i18next';

const Settings: React.FC = () => {
  const { settings, updateSettings } = useSettingsContext();
  const { t } = useTranslation();

  const handleDecimalPlacesChange = (_: Event, value: number | number[]) => {
    updateSettings({ decimalPlaces: value as number });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {t('settings.title')}
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('settings.displaySettings')}
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.darkMode}
                  onChange={(e) => updateSettings({ darkMode: e.target.checked })}
                />
              }
              label={t('settings.darkMode')}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ width: '100%' }}>
              <Typography gutterBottom>
                {t('settings.decimalPlaces')}: {settings.decimalPlaces}
              </Typography>
              <Slider
                value={settings.decimalPlaces}
                onChange={handleDecimalPlacesChange}
                min={0}
                max={6}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>{t('settings.language')}</InputLabel>
              <Select
                value={settings.language}
                label={t('settings.language')}
                onChange={(e) => updateSettings({ language: e.target.value as 'en' | 'tr' })}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="tr">Türkçe</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('settings.about')}
        </Typography>
        
        <Typography variant="body1" paragraph>
          {t('settings.aboutDescription')}
        </Typography>
        
        <Typography variant="body1" paragraph>
          {t('settings.dataPrivacy')}
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle1" gutterBottom>
          {t('settings.howToUse')}
        </Typography>
        
        <ol>
          <li>
            <Typography variant="body2">{t('settings.howToUseSteps.step1')}</Typography>
          </li>
          <li>
            <Typography variant="body2">{t('settings.howToUseSteps.step2')}</Typography>
          </li>
          <li>
            <Typography variant="body2">{t('settings.howToUseSteps.step3')}</Typography>
          </li>
          <li>
            <Typography variant="body2">{t('settings.howToUseSteps.step4')}</Typography>
          </li>
        </ol>
        
        <Alert severity="info" sx={{ mt: 2 }}>
          {t('settings.settingsSaved')}
        </Alert>
      </Paper>
    </Box>
  );
};

export default Settings; 