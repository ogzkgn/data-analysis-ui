import React from 'react';
import { Box, Typography, Paper, Alert, Tabs, Tab } from '@mui/material';
import { useFileContext } from '../../context/FileContext';
import FileUploader from './FileUploader';
import DataGrid from './DataGrid';

const DataViewer: React.FC = () => {
  const { excelData, isLoading, error, changeSheet } = useFileContext();

  const handleSheetChange = (_: React.SyntheticEvent, newValue: string) => {
    changeSheet(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Data Viewer
      </Typography>

      {!excelData && (
        <FileUploader />
      )}

      {isLoading && (
        <Alert severity="info">
          Loading your Excel file...
        </Alert>
      )}

      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      {excelData && (
        <>
          {excelData.sheetNames.length > 1 && (
            <Paper sx={{ mb: 2 }}>
              <Tabs
                value={excelData.activeSheet}
                onChange={handleSheetChange}
                variant="scrollable"
                scrollButtons="auto"
              >
                {excelData.sheetNames.map(sheet => (
                  <Tab key={sheet} value={sheet} label={sheet} />
                ))}
              </Tabs>
            </Paper>
          )}

          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {excelData.activeSheet}
            </Typography>

            <Box sx={{ mt: 2 }}>
              <DataGrid />
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default DataViewer; 