import React from 'react';
import { Box, Typography, Paper, Button, Grid } from '@mui/material';
import { Link } from 'react-router-dom';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TableViewIcon from '@mui/icons-material/TableView';
import FileUploader from './FileUploader';
import { useFileContext } from '../../context/FileContext';
import { useTranslation } from 'react-i18next';

const Home: React.FC = () => {
  const { excelData } = useFileContext();
  const { t } = useTranslation();

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, textAlign: 'center', maxWidth: 800, mx: 'auto', mb: 5 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('home.welcome')}
        </Typography>
        
        <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', my: 4 }}>
          {t('home.description')}
        </Typography>
        
        <Grid container spacing={2} justifyContent="center" sx={{ mt: 2 }}>
          <Grid item>
            <Button 
              component={Link} 
              to="/data-viewer" 
              variant="contained" 
              color="primary" 
              size="large"
            >
              {t('home.getStarted')}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {!excelData ? (
        <>
          <Paper elevation={3} sx={{ p: 4, mb: 5, borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom>
              {t('home.getStarted')}
            </Typography>
            <Typography variant="body1" paragraph>
              {t('home.uploadDescription')}
            </Typography>
            
            <FileUploader />
          </Paper>
          
          <Grid container spacing={4} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, height: '100%', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <FileUploadIcon fontSize="large" color="primary" sx={{ mb: 2 }} />
                  <Typography variant="h6" align="center" gutterBottom>
                    {t('home.uploadEdit')}
                  </Typography>
                  <Typography variant="body2" align="center" paragraph sx={{ flexGrow: 1 }}>
                    {t('home.uploadEditDescription')}
                  </Typography>
                  <Button 
                    component={Link} 
                    to="/data-viewer" 
                    variant="outlined" 
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    {t('home.dataViewer')}
                  </Button>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, height: '100%', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <AnalyticsIcon fontSize="large" color="primary" sx={{ mb: 2 }} />
                  <Typography variant="h6" align="center" gutterBottom>
                    {t('home.analyze')}
                  </Typography>
                  <Typography variant="body2" align="center" paragraph sx={{ flexGrow: 1 }}>
                    {t('home.analyzeDescription')}
                  </Typography>
                  <Button 
                    component={Link} 
                    to="/sensitivity" 
                    variant="outlined" 
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    {t('home.sensitivityAnalysis')}
                  </Button>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, height: '100%', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <TableViewIcon fontSize="large" color="primary" sx={{ mb: 2 }} />
                  <Typography variant="h6" align="center" gutterBottom>
                    {t('home.correlate')}
                  </Typography>
                  <Typography variant="body2" align="center" paragraph sx={{ flexGrow: 1 }}>
                    {t('home.correlateDescription')}
                  </Typography>
                  <Button 
                    component={Link} 
                    to="/correlation" 
                    variant="outlined" 
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    {t('home.correlationAnalysis')}
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      ) : (
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom>
            {t('home.fileLoadedSuccessfully')}
          </Typography>
          <Typography variant="body1" paragraph>
            {t('home.fileLoadedDescription')}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button component={Link} to="/data-viewer" variant="contained">
              {t('home.viewData')}
            </Button>
            <Button component={Link} to="/sensitivity" variant="outlined">
              {t('home.sensitivityAnalysis')}
            </Button>
            <Button component={Link} to="/correlation" variant="outlined">
              {t('home.correlationAnalysis')}
            </Button>
            <Button component={Link} to="/alternative" variant="outlined">
              {t('home.alternativeMethods')}
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default Home; 