import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Chip
} from '@mui/material';
import { useFileContext } from '../../context/FileContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useTranslation } from 'react-i18next';

// Common lambda values for Box-Cox transformations with their interpretations
interface PowerTransformation {
  lambda: number;
  name: string;
  description: string;
  transform: (value: number) => number;
}

const powerTransformations: PowerTransformation[] = [
  {
    lambda: -2,
    name: "Inverse square",
    description: "Inverse of squared values",
    transform: (value) => value <= 0 ? 0 : 1 / (value * value)
  },
  {
    lambda: -1,
    name: "Inverse",
    description: "Inverse/reciprocal transformation",
    transform: (value) => value <= 0 ? 0 : 1 / value
  },
  {
    lambda: -0.5,
    name: "Inverse square root",
    description: "Inverse of square root",
    transform: (value) => value <= 0 ? 0 : 1 / Math.sqrt(value)
  },
  {
    lambda: 0,
    name: "Logarithmic",
    description: "Natural logarithm transformation",
    transform: (value) => value <= 0 ? 0 : Math.log(value)
  },
  {
    lambda: 0.5,
    name: "Square root",
    description: "Square root transformation",
    transform: (value) => value < 0 ? 0 : Math.sqrt(value)
  },
  {
    lambda: 1,
    name: "None",
    description: "No transformation (original values)",
    transform: (value) => value
  },
  {
    lambda: 2,
    name: "Square",
    description: "Squared values",
    transform: (value) => value * value
  },
  {
    lambda: 3,
    name: "Cube",
    description: "Cubed values",
    transform: (value) => value * value * value
  }
];

interface VariableStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  skewness: number; // Measure of asymmetry
  kurtosis: number; // Measure of tailedness
  isNormalDistributed: boolean;
  optimalLambda: number; // Box-Cox power transformation parameter
  roundedLambda: number; // Rounded lambda for interpretability
}

interface CorrelationResult {
  coefficient: number;
  pValue: number;
  isSignificant: boolean;
}

const CorrelationAnalysis: React.FC = () => {
  const { excelData } = useFileContext();
  const { settings } = useSettingsContext();
  const { t } = useTranslation();
  
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [correlationMatrix, setCorrelationMatrix] = useState<CorrelationResult[][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [variableStats, setVariableStats] = useState<Record<string, VariableStats>>({});
  const [numericData, setNumericData] = useState<{ [key: string]: number[] }>({});
  const [processing, setProcessing] = useState<boolean>(false);
  
  // Fixed significance level at 0.05 (95% confidence)
  const significanceLevel = 0.05;

  useEffect(() => {
    // Reset selections when data changes
    setSelectedVariables([]);
    setCorrelationMatrix([]);
    setVariableStats({});
    setNumericData({});
    setError(null);
  }, [excelData]);

  // Calculate Box-Cox log-likelihood for a given lambda
  const calculateBoxCoxLogLikelihood = (values: number[], lambda: number): number => {
    const n = values.length;
    if (n === 0 || values.some(v => v <= 0)) return -Infinity;
    
    let transformedValues: number[];
    
    if (Math.abs(lambda) < 1e-10) { // Lambda approximately 0
      transformedValues = values.map(v => Math.log(v));
    } else {
      transformedValues = values.map(v => (Math.pow(v, lambda) - 1) / lambda);
    }
    
    // Calculate mean and variance of transformed values
    const mean = transformedValues.reduce((sum, v) => sum + v, 0) / n;
    const variance = transformedValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    
    if (variance <= 0) return -Infinity;
    
    // Calculate log-likelihood
    const logLikelihood = -n * Math.log(Math.sqrt(variance)) + (lambda - 1) * values.reduce((sum, v) => sum + Math.log(v), 0);
    
    return logLikelihood;
  };
  
  // Find the optimal lambda for Box-Cox transformation
  const findOptimalLambda = (values: number[]): number => {
    // If data has zeros or negative values, can't use Box-Cox
    if (values.some(v => v <= 0)) return 1;
    
    // Search space for lambda
    const lambdaRange = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
    let bestLambda = 1;
    let bestLogLikelihood = -Infinity;
    
    // Find lambda with maximum log-likelihood
    for (const lambda of lambdaRange) {
      const logLikelihood = calculateBoxCoxLogLikelihood(values, lambda);
      if (logLikelihood > bestLogLikelihood) {
        bestLogLikelihood = logLikelihood;
        bestLambda = lambda;
      }
    }
    
    return bestLambda;
  };
  
  // Round lambda to nearest common interpretable value
  const roundLambda = (lambda: number): number => {
    // Common interpretable lambda values
    const commonLambdas = [-2, -1, -0.5, 0, 0.5, 1, 2, 3];
    
    // Find closest common lambda
    let closestLambda = 1;
    let minDiff = Math.abs(lambda - 1);
    
    for (const l of commonLambdas) {
      const diff = Math.abs(lambda - l);
      if (diff < minDiff) {
        minDiff = diff;
        closestLambda = l;
      }
    }
    
    return closestLambda;
  };

  // Apply Box-Cox power transformation with given lambda
  const applyPowerTransformation = (values: number[], lambda: number): number[] => {
    // Find the transformation function for this lambda
    const transformation = powerTransformations.find(t => t.lambda === lambda);
    
    if (transformation) {
      return values.map(transformation.transform);
    }
    
    // If lambda is not a standard value, apply the general formula
    return values.map(value => {
      if (value <= 0) return 0;
      
      if (Math.abs(lambda) < 1e-10) { // Lambda approximately 0
        return Math.log(value);
      } else {
        return (Math.pow(value, lambda) - 1) / lambda;
      }
    });
  };

  // Calculate descriptive statistics for a variable
  const calculateBasicStats = (values: number[]): VariableStats => {
    const n = values.length;
    if (n === 0) {
      return {
        mean: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        skewness: 0,
        kurtosis: 0,
        isNormalDistributed: false,
        optimalLambda: 1,
        roundedLambda: 1
      };
    }

    // Calculate mean
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    
    // Calculate standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    // Calculate min and max
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Calculate skewness (measure of asymmetry)
    let skewness = 0;
    if (stdDev > 0) {
      const sumCubed = values.reduce((sum, val) => sum + Math.pow(val - mean, 3), 0);
      skewness = (sumCubed / n) / Math.pow(stdDev, 3);
    }
    
    // Calculate kurtosis (measure of tailedness)
    let kurtosis = 0;
    if (stdDev > 0) {
      const sumFourth = values.reduce((sum, val) => sum + Math.pow(val - mean, 4), 0);
      kurtosis = (sumFourth / n) / Math.pow(stdDev, 4) - 3; // Excess kurtosis (normal = 0)
    }
    
    // Simplified check for normality based on skewness and kurtosis
    const isNormalDistributed = Math.abs(skewness) < 1 && Math.abs(kurtosis) < 1;
    
    // Calculate optimal lambda if needed
    let optimalLambda = 1; // Default = no transformation
    let roundedLambda = 1;
    
    if (!isNormalDistributed && !values.some(v => v <= 0)) {
      optimalLambda = findOptimalLambda(values);
      roundedLambda = roundLambda(optimalLambda);
    }
    
    return {
      mean,
      stdDev,
      min,
      max,
      skewness,
      kurtosis,
      isNormalDistributed,
      optimalLambda,
      roundedLambda
    };
  };

  /**
   * Calculate Pearson correlation coefficient between two arrays
   * Pearson correlation measures the linear relationship between two variables
   * Formula: r = Σ[(x_i - x̄)(y_i - ȳ)] / √[Σ(x_i - x̄)² * Σ(y_i - ȳ)²]
   */
  const calculatePearsonCorrelation = (x: number[], y: number[]): number => {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    // Calculate means
    const xMean = x.reduce((sum, val) => sum + val, 0) / n;
    const yMean = y.reduce((sum, val) => sum + val, 0) / n;

    // Calculate sum of products of differences
    let numerator = 0;
    // Calculate sum of squared differences
    let xSumSquaredDiff = 0;
    let ySumSquaredDiff = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - xMean;
      const yDiff = y[i] - yMean;
      numerator += xDiff * yDiff;
      xSumSquaredDiff += xDiff * xDiff;
      ySumSquaredDiff += yDiff * yDiff;
    }

    // Handle division by zero
    if (xSumSquaredDiff === 0 || ySumSquaredDiff === 0) return 0;
    
    // Calculate correlation coefficient
    return numerator / Math.sqrt(xSumSquaredDiff * ySumSquaredDiff);
  };

  // Calculate p-value for Pearson correlation coefficient
  const calculatePValue = (r: number, n: number): number => {
    const degreesOfFreedom = n - 2;
    if (degreesOfFreedom < 1) return 1;
    
    // Calculate t-statistic
    const t = r * Math.sqrt(degreesOfFreedom) / Math.sqrt(1 - r * r);
    
    // Simplified approximation of the p-value for t-distribution (two-tailed)
    // A more accurate approach would use a proper t-distribution function
    const tAbs = Math.abs(t);
    // This is a rough approximation, a proper implementation would use a t-distribution table or function
    if (tAbs < 1) return 0.5;
    if (tAbs < 2) return 0.2;
    if (tAbs < 2.5) return 0.05;
    if (tAbs < 3) return 0.01;
    if (tAbs < 4) return 0.001;
    return 0.0001;
  };

  const extractVariableData = () => {
    if (!excelData) return;

    try {
      // Extract numeric data for selected variables
      const newNumericData: { [key: string]: number[] } = {};
      const newStats: Record<string, VariableStats> = {};
      
      for (const variable of selectedVariables) {
        const columnIndex = excelData.headers.indexOf(variable);
        if (columnIndex === -1) {
          setError(`Variable '${variable}' not found in data.`);
          return;
        }
        
        const values = excelData.data
          .map(row => parseFloat(row[columnIndex]?.toString() || '0'))
          .filter(val => !isNaN(val));
        
        if (values.length === 0) {
          setError(`Variable '${variable}' contains no numeric data.`);
          return;
        }
        
        // Calculate statistics and optimal lambda
        const stats = calculateBasicStats(values);
        
        newNumericData[variable] = values;
        newStats[variable] = stats;
      }
      
      setNumericData(newNumericData);
      setVariableStats(newStats);
      
      return { newNumericData, newStats };
    } catch (err) {
      setError(`Error extracting data: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  };

  const handleRun = async () => {
    if (!excelData || selectedVariables.length < 2) {
      setError('Please select at least two variables for correlation analysis.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Extract variable data and determine optimal power transformations
      const result = extractVariableData();
      if (!result) {
        setProcessing(false);
        return;
      }
      
      const { newNumericData, newStats } = result;
      
      // Apply power transformations to the data
      const transformedData: { [key: string]: number[] } = {};
      
      for (const variable of selectedVariables) {
        const roundedLambda = newStats[variable].roundedLambda;
        transformedData[variable] = applyPowerTransformation(newNumericData[variable] || [], roundedLambda);
      }
      
      // Calculate correlation matrix using Pearson correlation
      const matrix: CorrelationResult[][] = [];
      
      for (const var1 of selectedVariables) {
        const row: CorrelationResult[] = [];
        for (const var2 of selectedVariables) {
          if (var1 === var2) {
            // Perfect correlation with self
            row.push({ 
              coefficient: 1, 
              pValue: 0, 
              isSignificant: true 
            });
          } else {
            const coefficient = calculatePearsonCorrelation(
              transformedData[var1], 
              transformedData[var2]
            );
            const n = Math.min(
              (transformedData[var1] || []).length, 
              (transformedData[var2] || []).length
            );
            const pValue = calculatePValue(coefficient, n);
            
            row.push({ 
              coefficient, 
              pValue, 
              isSignificant: pValue <= significanceLevel 
            });
          }
        }
        matrix.push(row);
      }
      
      setCorrelationMatrix(matrix);
    } catch (err) {
      setError(`Error calculating correlations: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleVariableToggle = (variable: string) => {
    setSelectedVariables(prev => {
      if (prev.includes(variable)) {
        return prev.filter(v => v !== variable);
      } else {
        return [...prev, variable];
      }
    });
  };

  const getColorForCorrelation = (value: number): string => {
    // Perfect positive correlation: dark blue
    if (value === 1) {
      return 'rgba(0, 0, 139, 0.9)';
    }
    // Perfect negative correlation: dark red
    if (value === -1) {
      return 'rgba(139, 0, 0, 0.9)';
    }
    
    // Positive correlations: blue gradient
    if (value > 0) {
      const intensity = Math.min(Math.abs(value), 1);
      return `rgba(0, 0, 255, ${intensity * 0.7})`;
    }
    // Negative correlations: red gradient
    else {
      const intensity = Math.min(Math.abs(value), 1);
      return `rgba(255, 0, 0, ${intensity * 0.7})`;
    }
  };

  // Get correlation strength description
  const getCorrelationDescription = (value: number): string => {
    const absValue = Math.abs(value);
    if (absValue >= 0.9) return 'Very strong';
    if (absValue >= 0.7) return 'Strong';
    if (absValue >= 0.5) return 'Moderate';
    if (absValue >= 0.3) return 'Weak';
    if (absValue >= 0.1) return 'Very weak';
    return 'Negligible';
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
        {t('correlationAnalysis.title')}
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('correlationAnalysis.selectVariables')}
        </Typography>
        
        <FormGroup sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
          <Grid container spacing={2}>
            {excelData.headers.map((header, index) => (
              <Grid item xs={6} sm={4} md={3} key={index}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedVariables.includes(header)}
                      onChange={() => handleVariableToggle(header)}
                    />
                  }
                  label={header}
                />
              </Grid>
            ))}
          </Grid>
        </FormGroup>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <Button 
            variant="contained" 
            onClick={handleRun}
            disabled={selectedVariables.length < 2 || processing}
          >
            {processing ? t('common.processing') : t('correlationAnalysis.calculateCorrelations')}
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>
      
      {correlationMatrix.length > 0 && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('correlationAnalysis.correlationMatrix')}
          </Typography>
          
          <TableContainer sx={{ maxWidth: '100%', overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}></TableCell>
                  {selectedVariables.map((variable, i) => (
                    <TableCell key={i} sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: '100px' }}>
                      {variable}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {correlationMatrix.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', position: 'sticky', left: 0 }}>
                      {selectedVariables[rowIndex]}
                    </TableCell>
                    {row.map((result, colIndex) => (
                      <Tooltip 
                        key={colIndex}
                        title={
                          <>
                            <Typography variant="body2">r = {result.coefficient.toFixed(4)}</Typography>
                            <Typography variant="body2">p-value = {result.pValue.toFixed(4)}</Typography>
                            <Typography variant="body2">{getCorrelationDescription(result.coefficient)} {result.coefficient >= 0 ? 'positive' : 'negative'} correlation</Typography>
                            <Typography variant="body2">{result.isSignificant ? 'Statistically significant' : 'Not statistically significant'}</Typography>
                          </>
                        }
                        arrow
                      >
                        <TableCell 
                          sx={{ 
                            textAlign: 'center',
                            backgroundColor: getColorForCorrelation(result.coefficient),
                            color: Math.abs(result.coefficient) > 0.5 ? 'white' : 'black',
                            opacity: result.isSignificant ? 1 : 0.5,
                            position: 'relative'
                          }}
                        >
                          {result.coefficient.toFixed(settings.decimalPlaces)}
                          {result.isSignificant && (
                            <span style={{ 
                              position: 'absolute', 
                              top: 2, 
                              right: 2, 
                              fontSize: '10px',
                              fontWeight: 'bold' 
                            }}>*</span>
                          )}
                        </TableCell>
                      </Tooltip>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Typography variant="body2" sx={{ mt: 1 }}>
            {t('correlationAnalysis.statisticallySignificant')}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default CorrelationAnalysis; 