import React, { useState, useRef } from 'react';
import { Box, Button, Typography, Alert, CircularProgress, Paper } from '@mui/material';
import { useFileContext } from '../../context/FileContext';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const FileUploader: React.FC = () => {
  const { uploadFile, isLoading, error } = useFileContext();
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && 
        file.type !== 'application/vnd.ms-excel') {
      alert('Please upload an Excel file (.xlsx or .xls)');
      return;
    }
    
    uploadFile(file);
  };

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        m: 2, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center' 
      }}
    >
      <Typography variant="h5" gutterBottom>
        Upload Excel File
      </Typography>
      
      <Box
        sx={{
          border: dragActive ? '2px dashed #2196f3' : '2px dashed #cccccc',
          borderRadius: 2,
          p: 3,
          width: '100%',
          height: 200,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          backgroundColor: dragActive ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
          transition: 'all 0.3s ease'
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        {isLoading ? (
          <CircularProgress />
        ) : (
          <>
            <CloudUploadIcon sx={{ fontSize: 48, mb: 2, color: '#666' }} />
            <Typography variant="body1" align="center">
              Drag and drop an Excel file here, or click to select
            </Typography>
            <Typography variant="body2" align="center" color="textSecondary" sx={{ mt: 1 }}>
              Supported formats: .xlsx, .xls
            </Typography>
          </>
        )}
        
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".xlsx,.xls"
          onChange={handleFileInput}
        />
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
          {error}
        </Alert>
      )}
      
      <Button 
        variant="contained" 
        onClick={openFileDialog} 
        startIcon={<CloudUploadIcon />}
        disabled={isLoading}
        sx={{ mt: 2 }}
      >
        Select File
      </Button>
    </Paper>
  );
};

export default FileUploader; 