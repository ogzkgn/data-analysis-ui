import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Grid,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Chip,
  Tabs,
  Tab,
  TextField,
} from '@mui/material';
import { useFileContext } from '../../context/FileContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import WarningIcon from '@mui/icons-material/Warning';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`detection-tabpanel-${index}`}
      aria-labelledby={`detection-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface PerformanceData {
  supplier: string;
  time: number | string;
  [category: string]: number | string;
}

interface SupplierHistory {
  [supplierId: string]: {
    [category: string]: {
      values: number[];
      times: (number | string)[];
    };
  };
}

interface PredictionResult {
  supplier: string;
  category: string;
  actualValues: number[];
  predictedValues: number[];
  nextPrediction: number;
  accuracy: number;
  trend: 'up' | 'down' | 'stable';
  letterGrade: string;
  predictedLetterGrade: string;
}

const EarlyDetection: React.FC = () => {
  const { excelData } = useFileContext();
  const { settings } = useSettingsContext();
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);
  
  // Selected columns
  const [timeColumn, setTimeColumn] = useState<string>('');
  const [supplierColumn, setSupplierColumn] = useState<string>('');
  const [categoryColumns, setCategoryColumns] = useState<string[]>([]);
  
  // Algorithm parameters
  const [alphaValue, setAlphaValue] = useState<number>(0.4);
  const [periodsAhead, setPeriodsAhead] = useState<number>(1);
  const [declineThreshold, setDeclineThreshold] = useState<number>(5);
  
  // Results
  const [supplierHistory, setSupplierHistory] = useState<SupplierHistory>({});
  const [predictionResults, setPredictionResults] = useState<PredictionResult[]>([]);
  const [overallAccuracy, setOverallAccuracy] = useState<number>(0);
  const [cdGradeAccuracy, setCDGradeAccuracy] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Reset selections when data changes
    setTimeColumn('');
    setSupplierColumn('');
    setCategoryColumns([]);
    setPredictionResults([]);
    setError(null);
  }, [excelData]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleCategoryToggle = (category: string) => {
    setCategoryColumns(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };
  
  const getLetterGrade = (score: number): string => {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 50) return 'C';
    return 'D';
  };
  
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon color="success" />;
      case 'down':
        return <TrendingDownIcon color="error" />;
      case 'stable':
        return <TrendingFlatIcon color="info" />;
    }
  };
  
  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'success';
      case 'down':
        return 'error';
      case 'stable':
        return 'info';
    }
  };
  
  // Exponential Smoothing Algorithm
  const exponentialSmoothing = (data: number[], alpha: number): number[] => {
    if (data.length === 0) return [];
    
    const result: number[] = [data[0]]; // First prediction is just the first value
    
    for (let i = 1; i < data.length; i++) {
      // S_t = α * Y_t + (1 - α) * S_(t-1)
      const smoothed = alpha * data[i - 1] + (1 - alpha) * result[i - 1];
      result.push(smoothed);
    }
    
    // Generate next period prediction
    const nextPrediction = alpha * data[data.length - 1] + (1 - alpha) * result[result.length - 1];
    result.push(nextPrediction);
    
    return result;
  };
  
  // Calculate accuracy of prediction vs actual
  const calculateAccuracy = (actual: number[], predicted: number[]): number => {
    if (actual.length === 0 || predicted.length !== actual.length) return 0;
    
    let totalError = 0;
    for (let i = 0; i < actual.length; i++) {
      totalError += Math.abs(actual[i] - predicted[i]);
    }
    
    return 100 - (totalError / actual.length);
  };
  
  const calculateTrend = (lastPredictions: number[]): 'up' | 'down' | 'stable' => {
    if (lastPredictions.length < 2) return 'stable';
    
    const lastValue = lastPredictions[lastPredictions.length - 1];
    const prevValue = lastPredictions[lastPredictions.length - 2];
    
    const percentChange = ((lastValue - prevValue) / prevValue) * 100;
    
    if (percentChange > declineThreshold) return 'up';
    if (percentChange < -declineThreshold) return 'down';
    return 'stable';
  };
  
  const extractData = () => {
    if (!excelData || !timeColumn || !supplierColumn || categoryColumns.length === 0) {
      setError('Please select required columns for analysis.');
      return false;
    }
    
    try {
      const timeColumnIndex = excelData.headers.indexOf(timeColumn);
      const supplierColumnIndex = excelData.headers.indexOf(supplierColumn);
      
      if (timeColumnIndex === -1 || supplierColumnIndex === -1) {
        setError('Selected columns not found in data.');
        return false;
      }
      
      const categoryIndices = categoryColumns.map(col => {
        const idx = excelData.headers.indexOf(col);
        if (idx === -1) {
          throw new Error(`Category column '${col}' not found in data.`);
        }
        return idx;
      });
      
      // Extract data from Excel
      const data: PerformanceData[] = [];
      
      for (const row of excelData.data) {
        if (!row[timeColumnIndex] || !row[supplierColumnIndex]) continue;
        
        const entry: PerformanceData = {
          supplier: row[supplierColumnIndex].toString(),
          time: row[timeColumnIndex],
        };
        
        let hasValidData = false;
        
        for (let i = 0; i < categoryColumns.length; i++) {
          const value = parseFloat(row[categoryIndices[i]]?.toString() || '');
          if (!isNaN(value)) {
            entry[categoryColumns[i]] = value;
            hasValidData = true;
          }
        }
        
        if (hasValidData) {
          data.push(entry);
        }
      }
      
      if (data.length === 0) {
        setError('No valid data found for analysis.');
        return false;
      }
      
      // Group by supplier and time to create time series for each supplier and category
      const history: SupplierHistory = {};
      
      for (const entry of data) {
        const supplier = entry.supplier;
        
        if (!history[supplier]) {
          history[supplier] = {};
        }
        
        for (const category of categoryColumns) {
          if (typeof entry[category] === 'number') {
            if (!history[supplier][category]) {
              history[supplier][category] = { values: [], times: [] };
            }
            
            history[supplier][category].values.push(entry[category] as number);
            history[supplier][category].times.push(entry.time);
          }
        }
      }
      
      setSupplierHistory(history);
      return true;
    } catch (err) {
      setError(`Error extracting data: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  };
  
  const runPrediction = () => {
    if (!extractData()) return;
    
    try {
      const results: PredictionResult[] = [];
      let totalGradeMatches = 0;
      let totalPredictions = 0;
      let cdGradeMatches = 0;
      let totalCDGrades = 0;
      
      // For each supplier and category, run exponential smoothing
      for (const [supplier, categories] of Object.entries(supplierHistory)) {
        for (const [category, data] of Object.entries(categories)) {
          if (data.values.length < 3) {
            // Need at least 3 data points for meaningful prediction
            continue;
          }
          
          // Run exponential smoothing
          const actualValues = data.values;
          const smoothedValues = exponentialSmoothing(data.values, alphaValue);
          
          // The last value in smoothedValues is the prediction for the next period
          const nextPrediction = smoothedValues[smoothedValues.length - 1];
          const predictedValues = smoothedValues.slice(0, -1); // Remove the next prediction
          
          // Calculate accuracy
          const accuracy = calculateAccuracy(actualValues, predictedValues);
          
          // Determine trend
          const trend = calculateTrend(smoothedValues);
          
          // Calculate letter grades
          const actualLetterGrade = getLetterGrade(actualValues[actualValues.length - 1]);
          const predictedLetterGrade = getLetterGrade(predictedValues[predictedValues.length - 1]);
          
          results.push({
            supplier,
            category,
            actualValues,
            predictedValues,
            nextPrediction,
            accuracy,
            trend,
            letterGrade: actualLetterGrade,
            predictedLetterGrade,
          });
          
          // Calculate grade prediction accuracy
          totalPredictions++;
          if (actualLetterGrade === predictedLetterGrade) {
            totalGradeMatches++;
          }
          
          // Calculate C/D grade prediction accuracy
          if (actualLetterGrade === 'C' || actualLetterGrade === 'D') {
            totalCDGrades++;
            if (actualLetterGrade === predictedLetterGrade) {
              cdGradeMatches++;
            }
          }
        }
      }
      
      // Sort results by trend (declining first) and then by supplier
      results.sort((a, b) => {
        if (a.trend === 'down' && b.trend !== 'down') return -1;
        if (a.trend !== 'down' && b.trend === 'down') return 1;
        return a.supplier.localeCompare(b.supplier);
      });
      
      setPredictionResults(results);
      
      // Calculate overall accuracy metrics
      if (totalPredictions > 0) {
        setOverallAccuracy((totalGradeMatches / totalPredictions) * 100);
      }
      
      if (totalCDGrades > 0) {
        setCDGradeAccuracy((cdGradeMatches / totalCDGrades) * 100);
      }
      
      setTabValue(1); // Switch to results tab
    } catch (err) {
      setError(`Error running prediction: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  const renderWarningSuppliers = () => {
    const decliningSuppliers = predictionResults.filter(result => result.trend === 'down');
    
    if (decliningSuppliers.length === 0) {
      return (
        <Alert severity="success" sx={{ mb: 2 }}>
          No suppliers with predicted declining performance detected
        </Alert>
      );
    }
    
    // Group by supplier
    const supplierMap: { [supplier: string]: string[] } = {};
    for (const result of decliningSuppliers) {
      if (!supplierMap[result.supplier]) {
        supplierMap[result.supplier] = [];
      }
      supplierMap[result.supplier].push(result.category);
    }
    
    return (
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="error" sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon sx={{ mr: 1 }} /> {t('earlyDetection.warningSuppliers')}
        </Typography>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('earlyDetection.supplier')}</TableCell>
                <TableCell>{t('earlyDetection.declining')} {t('earlyDetection.category')}</TableCell>
                <TableCell>{t('earlyDetection.predictedNext')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(supplierMap).map(([supplier, categories], index) => (
                <TableRow key={index} sx={{ backgroundColor: 'rgba(255, 0, 0, 0.05)' }}>
                  <TableCell>{supplier}</TableCell>
                  <TableCell>
                    {categories.map(category => {
                      const result = decliningSuppliers.find(r => r.supplier === supplier && r.category === category);
                      return (
                        <Chip
                          key={category}
                          label={category}
                          size="small"
                          color="error"
                          sx={{ m: 0.5 }}
                          title={`Current: ${result?.actualValues.slice(-1)[0].toFixed(2)}, Predicted: ${result?.nextPrediction.toFixed(2)}`}
                        />
                      );
                    })}
                  </TableCell>
                  <TableCell>
                    {categories.map(category => {
                      const result = decliningSuppliers.find(r => r.supplier === supplier && r.category === category);
                      return (
                        <Box key={category} sx={{ display: 'flex', alignItems: 'center', m: 0.5 }}>
                          <Typography variant="caption" sx={{ mr: 1 }}>{category}:</Typography>
                          <Typography variant="caption" fontWeight="bold">
                            {result?.nextPrediction.toFixed(2)} ({result?.predictedLetterGrade})
                          </Typography>
                        </Box>
                      );
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };
  
  if (!excelData) {
    return (
      <Alert severity="info">
        {t('common.noDataFound')} {t('dataViewer.uploadFile')}
      </Alert>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {t('earlyDetection.title')}
      </Typography>
      
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Settings" />
          <Tab label="Results" disabled={predictionResults.length === 0} />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <Typography variant="body1" paragraph>
            {t('earlyDetection.description')}
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>{t('earlyDetection.timeColumn')}</InputLabel>
                <Select
                  value={timeColumn}
                  onChange={(e) => setTimeColumn(e.target.value)}
                  label={t('earlyDetection.timeColumn')}
                >
                  {excelData.headers.map((header, index) => (
                    <MenuItem key={index} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="textSecondary">
                {t('earlyDetection.timeColumnDescription')}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>{t('earlyDetection.supplierColumn')}</InputLabel>
                <Select
                  value={supplierColumn}
                  onChange={(e) => setSupplierColumn(e.target.value)}
                  label={t('earlyDetection.supplierColumn')}
                >
                  {excelData.headers.map((header, index) => (
                    <MenuItem key={index} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="textSecondary">
                {t('earlyDetection.supplierDescription')}
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                {t('earlyDetection.categoryColumns')}
              </Typography>
              <Typography variant="caption" color="textSecondary" paragraph>
                {t('earlyDetection.categoryDescription')}
              </Typography>
              
              <FormGroup>
                <Grid container spacing={2}>
                  {excelData.headers.map((header, index) => (
                    <Grid item xs={6} sm={4} md={3} key={index}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={categoryColumns.includes(header)}
                            onChange={() => handleCategoryToggle(header)}
                          />
                        }
                        label={header}
                      />
                    </Grid>
                  ))}
                </Grid>
              </FormGroup>
            </Grid>
            
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('earlyDetection.detectionSettings')}
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Typography gutterBottom>
                      {t('earlyDetection.alphaValue')}: {alphaValue.toFixed(2)}
                    </Typography>
                    <Slider
                      value={alphaValue}
                      onChange={(_, value) => setAlphaValue(value as number)}
                      step={0.05}
                      min={0}
                      max={1}
                      marks={[
                        { value: 0, label: '0' },
                        { value: 0.4, label: '0.4' },
                        { value: 1, label: '1' }
                      ]}
                      valueLabelDisplay="auto"
                    />
                    <Typography variant="caption" color="textSecondary">
                      {t('earlyDetection.alphaDescription')}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      label={t('earlyDetection.periodsToPredictAhead')}
                      type="number"
                      value={periodsAhead}
                      onChange={(e) => setPeriodsAhead(parseInt(e.target.value))}
                      inputProps={{ min: 1, max: 5 }}
                      fullWidth
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      label={t('earlyDetection.declineThreshold')}
                      type="number"
                      value={declineThreshold}
                      onChange={(e) => setDeclineThreshold(parseInt(e.target.value))}
                      inputProps={{ min: 1, max: 20 }}
                      helperText="% change to detect trend"
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={runPrediction}
              disabled={!timeColumn || !supplierColumn || categoryColumns.length === 0}
            >
              {t('earlyDetection.runPrediction')}
            </Button>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          {renderWarningSuppliers()}
          
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('earlyDetection.accuracyMetrics')}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="body2">{t('earlyDetection.overallAccuracy')}</Typography>
                    <Typography variant="h4">{overallAccuracy.toFixed(1)}%</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2">{t('earlyDetection.cdGradeAccuracy')}</Typography>
                    <Typography variant="h4">{cdGradeAccuracy.toFixed(1)}%</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Model Parameters
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2">Alpha Value</Typography>
                    <Typography variant="h6">{alphaValue.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">Data Points</Typography>
                    <Typography variant="h6">{predictionResults.length}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      The alpha value of {alphaValue.toFixed(2)} means {(alphaValue * 100).toFixed(0)}% weight is given to the most recent observation and {((1 - alphaValue) * 100).toFixed(0)}% to the previous forecast.
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
          
          <Typography variant="h6" gutterBottom>
            {t('earlyDetection.predictionResults')}
          </Typography>
          
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('earlyDetection.supplier')}</TableCell>
                  <TableCell>{t('earlyDetection.category')}</TableCell>
                  <TableCell>{t('earlyDetection.trend')}</TableCell>
                  <TableCell>{t('earlyDetection.actualScore')}</TableCell>
                  <TableCell>{t('earlyDetection.predictedScore')}</TableCell>
                  <TableCell>{t('earlyDetection.predictedNext')}</TableCell>
                  <TableCell>{t('earlyDetection.actualGrade')}</TableCell>
                  <TableCell>{t('earlyDetection.predictedGrade')}</TableCell>
                  <TableCell>{t('earlyDetection.accuracy')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {predictionResults.map((result, index) => {
                  const lastActual = result.actualValues[result.actualValues.length - 1];
                  const lastPredicted = result.predictedValues[result.predictedValues.length - 1];
                  
                  return (
                    <TableRow key={index} sx={{ backgroundColor: result.trend === 'down' ? 'rgba(255, 0, 0, 0.05)' : undefined }}>
                      <TableCell>{result.supplier}</TableCell>
                      <TableCell>{result.category}</TableCell>
                      <TableCell>
                        <Tooltip title={t(`earlyDetection.${result.trend}`)}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getTrendIcon(result.trend)}
                            <Chip 
                              size="small" 
                              label={t(`earlyDetection.${result.trend}`)} 
                              color={getTrendColor(result.trend)} 
                              sx={{ ml: 1 }} 
                            />
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{lastActual.toFixed(settings.decimalPlaces)}</TableCell>
                      <TableCell>{lastPredicted.toFixed(settings.decimalPlaces)}</TableCell>
                      <TableCell>
                        <Typography 
                          fontWeight="bold" 
                          color={result.trend === 'down' ? 'error' : (result.trend === 'up' ? 'success' : undefined)}
                        >
                          {result.nextPrediction.toFixed(settings.decimalPlaces)}
                        </Typography>
                      </TableCell>
                      <TableCell>{result.letterGrade}</TableCell>
                      <TableCell>{result.predictedLetterGrade}</TableCell>
                      <TableCell>{result.accuracy.toFixed(1)}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default EarlyDetection; 