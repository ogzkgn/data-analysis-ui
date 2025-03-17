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
  FormControlLabel,
  Checkbox,
  FormGroup,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Slider,
  Tooltip,
  Chip
} from '@mui/material';
import { useFileContext } from '../../context/FileContext';
import { useSettingsContext } from '../../context/SettingsContext';

// Define the analysis methods
type AnalysisMethod = 'topsis' | 'euclidean';

interface SupplierScore {
  supplier: string;
  score: number;
  distance?: number;
  criteriaScores?: {[criterion: string]: number};
  originalRank?: number;
  rankChange?: number;
}

interface AnalysisResult {
  method: AnalysisMethod;
  data: {
    rankedSuppliers: SupplierScore[];
    [key: string]: any;
  };
  evaluationColumn: string;
  weights: {[criterion: string]: number};
}

interface CriterionWeight {
  criterion: string;
  weight: number;
}

const AlternativeMethods: React.FC = () => {
  const { excelData } = useFileContext();
  const { settings } = useSettingsContext();
  
  const [selectedMethod, setSelectedMethod] = useState<AnalysisMethod>('topsis');
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [evaluationColumn, setEvaluationColumn] = useState<string>('');
  const [criteriaWeights, setCriteriaWeights] = useState<CriterionWeight[]>([]);
  const [totalWeight, setTotalWeight] = useState<number>(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [originalRankings, setOriginalRankings] = useState<{[supplier: string]: number}>({});
  
  useEffect(() => {
    // Reset selections when data changes
    setSelectedVariables([]);
    setEvaluationColumn('');
    setResult(null);
    setError(null);
  }, [excelData]);

  // Update weights when selected variables change
  useEffect(() => {
    if (selectedVariables.length === 0) {
      setCriteriaWeights([]);
      setTotalWeight(0);
      return;
    }
    
    // Initialize with equal weights that sum to 1
    const equalWeight = 1 / selectedVariables.length;
    const weights = selectedVariables.map(criterion => ({
      criterion,
      weight: equalWeight
    }));
    
    setCriteriaWeights(weights);
    setTotalWeight(1); // Sum should equal 1
  }, [selectedVariables]);

  // Calculate total weight whenever criteriaWeights changes
  useEffect(() => {
    const sum = criteriaWeights.reduce((total, cw) => total + cw.weight, 0);
    setTotalWeight(sum);
  }, [criteriaWeights]);

  const handleMethodChange = (event: SelectChangeEvent) => {
    setSelectedMethod(event.target.value as AnalysisMethod);
    setResult(null);
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

  const handleEvaluationColumnChange = (event: SelectChangeEvent) => {
    setEvaluationColumn(event.target.value);
  };

  const handleWeightChange = (criterion: string, value: number) => {
    // Get the current weight for this criterion
    const currentCriterion = criteriaWeights.find(cw => cw.criterion === criterion);
    if (!currentCriterion) return;
    
    const currentWeight = currentCriterion.weight;
    const weightDifference = value - currentWeight;
    
    // If this would make the total weight exceed 1, adjust the value
    if (totalWeight + weightDifference > 1) {
      const maxAllowedValue = currentWeight + (1 - totalWeight);
      value = maxAllowedValue;
    }
    
    // Update the weight for this criterion
    setCriteriaWeights(prev => 
      prev.map(cw => cw.criterion === criterion ? { ...cw, weight: value } : cw)
    );
  };

  // Distribute remaining weight to make sum exactly 1
  const distributeRemainingWeight = () => {
    if (criteriaWeights.length === 0) return;
    
    const sum = criteriaWeights.reduce((total, cw) => total + cw.weight, 0);
    
    if (sum === 1 || sum === 0) return; // Already perfect or all zeros
    
    const remaining = 1 - sum;
    
    // Count non-zero weights to distribute remaining
    const nonZeroWeights = criteriaWeights.filter(cw => cw.weight > 0);
    
    if (nonZeroWeights.length === 0) {
      // If all weights are zero, distribute equally
      const equalWeight = 1 / criteriaWeights.length;
      setCriteriaWeights(prev => 
        prev.map(cw => ({ ...cw, weight: equalWeight }))
      );
    } else {
      // Distribute remaining weight proportionally among non-zero weights
      const totalNonZero = nonZeroWeights.reduce((total, cw) => total + cw.weight, 0);
      
      setCriteriaWeights(prev => 
        prev.map(cw => {
          if (cw.weight === 0) return cw;
          const proportion = cw.weight / totalNonZero;
          return { ...cw, weight: cw.weight + (remaining * proportion) };
        })
      );
    }
  };

  // Reset to equal weights
  const resetToEqualWeights = () => {
    if (selectedVariables.length === 0) return;
    
    const equalWeight = 1 / selectedVariables.length;
    setCriteriaWeights(prev => 
      prev.map(cw => ({ ...cw, weight: equalWeight }))
    );
  };

  const getNormalizedWeights = (): {[criterion: string]: number} => {
    // Since we're ensuring the sum is always 1, this function
    // just converts from the array format to object format
    return criteriaWeights.reduce((obj, cw) => ({
      ...obj,
      [cw.criterion]: cw.weight
    }), {});
  };

  // Calculate original supplier rankings based on selected criteria
  const calculateOriginalRankings = (
    suppliers: string[], 
    criteriaData: { [criterion: string]: number[] }, 
    weights: {[criterion: string]: number}
  ): {[supplier: string]: number} => {
    // Calculate weighted average for each supplier based on the criteria
    const supplierScores: {name: string, score: number}[] = [];
    
    for (let i = 0; i < suppliers.length; i++) {
      let totalScore = 0;
      let validCount = 0;
      
      // Calculate weighted average across all criteria
      for (const [criterion, values] of Object.entries(criteriaData)) {
        if (i < values.length && !isNaN(values[i])) {
          totalScore += values[i] * weights[criterion];
          validCount++;
        }
      }
      
      // Only include suppliers with valid scores
      if (validCount > 0) {
        supplierScores.push({
          name: suppliers[i],
          score: totalScore / validCount
        });
      }
    }
    
    // Sort by score (higher is better) to determine rankings
    supplierScores.sort((a, b) => b.score - a.score);
    
    // Create a map of supplier name to rank
    const rankings: {[supplier: string]: number} = {};
    supplierScores.forEach((supplier, index) => {
      rankings[supplier.name] = index + 1;
    });
    
    return rankings;
  };

  const performTOPSIS = (): AnalysisResult | null => {
    if (!excelData || !evaluationColumn || selectedVariables.length === 0) {
      setError('Please select the supplier column and at least one criterion.');
      return null;
    }

    try {
      // Extract numeric data for selected variables (criteria)
      const criteriaData: { [criterion: string]: number[] } = {};
      const evaluationColumnIndex = excelData.headers.indexOf(evaluationColumn);
      
      if (evaluationColumnIndex === -1) {
        setError(`Evaluation column '${evaluationColumn}' not found.`);
        return null;
      }
      
      // Get suppliers/alternatives from the evaluation column
      const suppliers = excelData.data.map(row => row[evaluationColumnIndex]?.toString() || '');
      
      // Extract criteria values
      for (const criterion of selectedVariables) {
        const columnIndex = excelData.headers.indexOf(criterion);
        
        if (columnIndex === -1) {
          setError(`Criterion '${criterion}' not found.`);
          return null;
        }
        
        // Extract numeric values
        const values = excelData.data
          .map(row => parseFloat(row[columnIndex]?.toString() || '0'))
          .filter(val => !isNaN(val));
        
        if (values.length === 0) {
          setError(`Criterion '${criterion}' contains no numeric data.`);
          return null;
        }
        
        criteriaData[criterion] = values;
      }
      
      // Get normalized weights
      const normalizedWeights = getNormalizedWeights();
      
      // Calculate original rankings
      const originalRanks = calculateOriginalRankings(suppliers, criteriaData, normalizedWeights);
      setOriginalRankings(originalRanks);
      
      // Initialize criteria scores for each supplier
      const supplierCriteriaScores: {[supplier: string]: {[criterion: string]: number}} = {};
      suppliers.forEach((supplier, index) => {
        supplierCriteriaScores[supplier] = {};
      });
      
      // Perform TOPSIS for each criterion
      for (const criterion of selectedVariables) {
        const values = criteriaData[criterion];
        
        // Normalize values
        const sumOfSquares = Math.sqrt(values.reduce((sum, val) => sum + val * val, 0));
        const normalizedValues = sumOfSquares === 0 ? 
          values.map(() => 0) : 
          values.map(val => val / sumOfSquares);
        
        // Find ideal and anti-ideal values
        const idealValue = Math.max(...normalizedValues);
        const antiIdealValue = Math.min(...normalizedValues);
        
        // Calculate criterion scores
        for (let i = 0; i < suppliers.length; i++) {
          const normalizedValue = normalizedValues[i];
          const distanceToIdeal = Math.abs(normalizedValue - idealValue);
          const distanceToAntiIdeal = Math.abs(normalizedValue - antiIdealValue);
          const score = distanceToAntiIdeal / (distanceToIdeal + distanceToAntiIdeal || 1);
          
          supplierCriteriaScores[suppliers[i]][criterion] = score;
        }
      }
      
      // Calculate weighted overall score for each supplier
      const supplierScores: SupplierScore[] = suppliers.map((supplier, index) => {
        const criteriaScores = supplierCriteriaScores[supplier];
        
        // Calculate weighted sum of scores
        let overallScore = 0;
        for (const criterion of selectedVariables) {
          overallScore += criteriaScores[criterion] * normalizedWeights[criterion];
        }
        
        return {
          supplier,
          score: overallScore,
          criteriaScores
        };
      });
      
      // Sort by score in descending order (higher is better)
      supplierScores.sort((a, b) => b.score - a.score);
      
      // Add original ranking and rank change to each supplier score
      const rankedSuppliersWithChanges = supplierScores.map((supplier, index) => {
        const newRank = index + 1;
        const originalRank = originalRanks[supplier.supplier] || 0;
        const rankChange = originalRank - newRank; // Positive = improved rank, negative = worse rank
        
        return {
          ...supplier,
          originalRank,
          rankChange
        };
      });
      
      return {
        method: 'topsis',
        data: {
          suppliers,
          criteria: selectedVariables,
          rankedSuppliers: rankedSuppliersWithChanges
        },
        evaluationColumn,
        weights: normalizedWeights
      };
    } catch (err) {
      setError(`Error performing TOPSIS: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  };

  const performEuclideanDistance = (): AnalysisResult | null => {
    if (!excelData || !evaluationColumn || selectedVariables.length === 0) {
      setError('Please select the supplier column and at least one criterion.');
      return null;
    }

    try {
      // Extract numeric data for selected variables (criteria)
      const criteriaData: { [criterion: string]: number[] } = {};
      const evaluationColumnIndex = excelData.headers.indexOf(evaluationColumn);
      
      if (evaluationColumnIndex === -1) {
        setError(`Evaluation column '${evaluationColumn}' not found.`);
        return null;
      }
      
      // Get suppliers/alternatives from the evaluation column
      const suppliers = excelData.data.map(row => row[evaluationColumnIndex]?.toString() || '');
      
      // Extract criteria values
      for (const criterion of selectedVariables) {
        const columnIndex = excelData.headers.indexOf(criterion);
        
        if (columnIndex === -1) {
          setError(`Criterion '${criterion}' not found.`);
          return null;
        }
        
        // Extract numeric values
        const values = excelData.data
          .map(row => parseFloat(row[columnIndex]?.toString() || '0'))
          .filter(val => !isNaN(val));
        
        if (values.length === 0) {
          setError(`Criterion '${criterion}' contains no numeric data.`);
          return null;
        }
        
        criteriaData[criterion] = values;
      }
      
      // Get normalized weights
      const normalizedWeights = getNormalizedWeights();
      
      // Calculate original rankings
      const originalRanks = calculateOriginalRankings(suppliers, criteriaData, normalizedWeights);
      setOriginalRankings(originalRanks);
      
      // Initialize criteria scores for each supplier
      const supplierCriteriaScores: {[supplier: string]: {[criterion: string]: number}} = {};
      suppliers.forEach((supplier, index) => {
        supplierCriteriaScores[supplier] = {};
      });
      
      // Perform Euclidean Distance for each criterion
      for (const criterion of selectedVariables) {
        const values = criteriaData[criterion];
        
        // Normalize values (min-max normalization)
        const min = Math.min(...values);
        const max = Math.max(...values);
        const normalizedValues = max === min ? 
          values.map(() => 0.5) : 
          values.map(val => (val - min) / (max - min));
        
        // Define ideal point (assuming 1 is best)
        const idealValue = 1;
        
        // Calculate criterion scores
        for (let i = 0; i < suppliers.length; i++) {
          const normalizedValue = normalizedValues[i];
          const distance = Math.abs(normalizedValue - idealValue);
          // Convert distance to score (1 - normalized distance)
          const score = 1 - (distance / 1); // 1 is the maximum possible distance
          
          supplierCriteriaScores[suppliers[i]][criterion] = score;
        }
      }
      
      // Calculate weighted overall scores and distances
      const supplierScores: SupplierScore[] = suppliers.map((supplier, index) => {
        const criteriaScores = supplierCriteriaScores[supplier];
        
        // Calculate weighted sum for overall score
        let overallScore = 0;
        let totalWeightedDistance = 0;
        
        for (const criterion of selectedVariables) {
          overallScore += criteriaScores[criterion] * normalizedWeights[criterion];
          const distance = 1 - criteriaScores[criterion]; // Convert score back to distance
          totalWeightedDistance += distance * normalizedWeights[criterion];
        }
        
        return {
          supplier,
          score: overallScore,
          distance: totalWeightedDistance,
          criteriaScores
        };
      });
      
      // Sort by score in descending order (higher is better)
      supplierScores.sort((a, b) => b.score - a.score);
      
      // Add original ranking and rank change to each supplier score
      const rankedSuppliersWithChanges = supplierScores.map((supplier, index) => {
        const newRank = index + 1;
        const originalRank = originalRanks[supplier.supplier] || 0;
        const rankChange = originalRank - newRank; // Positive = improved rank, negative = worse rank
        
        return {
          ...supplier,
          originalRank,
          rankChange
        };
      });
      
      return {
        method: 'euclidean',
        data: {
          suppliers,
          criteria: selectedVariables,
          rankedSuppliers: rankedSuppliersWithChanges
        },
        evaluationColumn,
        weights: normalizedWeights
      };
    } catch (err) {
      setError(`Error performing Euclidean Distance: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  };

  const handleRun = () => {
    try {
      // Ensure weights sum to exactly 1 before running
      distributeRemainingWeight();
      
      let analysisResult: AnalysisResult | null = null;
      
      switch (selectedMethod) {
        case 'topsis':
          analysisResult = performTOPSIS();
          break;
        case 'euclidean':
          analysisResult = performEuclideanDistance();
          break;
      }
      
      if (analysisResult) {
        setResult(analysisResult);
        setError(null);
      }
    } catch (err) {
      setError(`Error performing analysis: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Helper function to render rank change
  const renderRankChange = (change: number | undefined) => {
    if (change === undefined || change === 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ color: 'gray' }}>0</span>
          <span style={{ marginLeft: '4px', color: 'gray' }}>-</span>
        </Box>
      );
    } else if (change > 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ color: 'green', fontWeight: 'bold' }}>+{change}</span>
          <span style={{ marginLeft: '4px', color: 'green' }}>↑</span>
        </Box>
      );
    } else {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ color: 'red', fontWeight: 'bold' }}>{change}</span>
          <span style={{ marginLeft: '4px', color: 'red' }}>↓</span>
        </Box>
      );
    }
  };

  const renderTOPSISResult = () => {
    if (!result || result.method !== 'topsis') return null;
    
    const { rankedSuppliers } = result.data;
    const criteria = selectedVariables;
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          TOPSIS Results - Weighted Supplier Ranking
        </Typography>
        
        <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Applied Criteria Weights
          </Typography>
          
          <TableContainer sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Criterion</TableCell>
                  <TableCell>Weight</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(result.weights).map(([criterion, weight], index) => (
                  <TableRow key={index}>
                    <TableCell>{criterion}</TableCell>
                    <TableCell>{(weight * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
            Supplier Ranking by TOPSIS Method
          </Typography>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Original Rank</TableCell>
                  <TableCell>Rank Change</TableCell>
                  <TableCell>Supplier ({result.evaluationColumn})</TableCell>
                  <TableCell>Overall Score</TableCell>
                  {criteria.map((criterion, idx) => (
                    <TableCell key={idx}>{criterion} Score</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rankedSuppliers.map((item: SupplierScore, index: number) => (
                  <TableRow 
                    key={index}
                    sx={item.rankChange && item.rankChange > 0 ? { backgroundColor: 'rgba(0, 255, 0, 0.05)' } : 
                        item.rankChange && item.rankChange < 0 ? { backgroundColor: 'rgba(255, 0, 0, 0.05)' } : {}}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.originalRank || 'N/A'}</TableCell>
                    <TableCell>
                      {renderRankChange(item.rankChange)}
                    </TableCell>
                    <TableCell>{item.supplier}</TableCell>
                    <TableCell>{item.score.toFixed(settings.decimalPlaces)}</TableCell>
                    {criteria.map((criterion, idx) => (
                      <TableCell key={idx}>
                        {item.criteriaScores && item.criteriaScores[criterion] !== undefined
                          ? item.criteriaScores[criterion].toFixed(settings.decimalPlaces)
                          : 'N/A'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption">
              * Rank Change: Positive numbers (green) indicate improved ranking compared to weighted average, negative numbers (red) indicate worse ranking
            </Typography>
          </Box>
        </Paper>
        
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Explanation of TOPSIS Method
          </Typography>
          <Typography variant="body2" paragraph>
            TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution) evaluates alternatives based on their similarity to an ideal solution and dissimilarity to a negative-ideal solution.
          </Typography>
          <Typography variant="body2">
            • Higher scores indicate better performance
          </Typography>
          <Typography variant="body2">
            • The ideal supplier would have a score of 1.0
          </Typography>
          <Typography variant="body2">
            • The overall score is calculated as a weighted average of all criteria scores
          </Typography>
        </Paper>
      </Box>
    );
  };

  const renderEuclideanResult = () => {
    if (!result || result.method !== 'euclidean') return null;
    
    const { rankedSuppliers } = result.data;
    const criteria = selectedVariables;
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Euclidean Distance Results - Weighted Supplier Ranking
        </Typography>
        
        <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Applied Criteria Weights
          </Typography>
          
          <TableContainer sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Criterion</TableCell>
                  <TableCell>Weight</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(result.weights).map(([criterion, weight], index) => (
                  <TableRow key={index}>
                    <TableCell>{criterion}</TableCell>
                    <TableCell>{(weight * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
            Supplier Ranking by Euclidean Distance Method
          </Typography>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Original Rank</TableCell>
                  <TableCell>Rank Change</TableCell>
                  <TableCell>Supplier ({result.evaluationColumn})</TableCell>
                  <TableCell>Overall Score</TableCell>
                  <TableCell>Weighted Distance</TableCell>
                  {criteria.map((criterion, idx) => (
                    <TableCell key={idx}>{criterion} Score</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rankedSuppliers.map((item: SupplierScore, index: number) => (
                  <TableRow 
                    key={index}
                    sx={item.rankChange && item.rankChange > 0 ? { backgroundColor: 'rgba(0, 255, 0, 0.05)' } : 
                        item.rankChange && item.rankChange < 0 ? { backgroundColor: 'rgba(255, 0, 0, 0.05)' } : {}}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.originalRank || 'N/A'}</TableCell>
                    <TableCell>
                      {renderRankChange(item.rankChange)}
                    </TableCell>
                    <TableCell>{item.supplier}</TableCell>
                    <TableCell>{item.score.toFixed(settings.decimalPlaces)}</TableCell>
                    <TableCell>{item.distance?.toFixed(settings.decimalPlaces)}</TableCell>
                    {criteria.map((criterion, idx) => (
                      <TableCell key={idx}>
                        {item.criteriaScores && item.criteriaScores[criterion] !== undefined
                          ? item.criteriaScores[criterion].toFixed(settings.decimalPlaces)
                          : 'N/A'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption">
              * Rank Change: Positive numbers (green) indicate improved ranking compared to weighted average, negative numbers (red) indicate worse ranking
            </Typography>
          </Box>
        </Paper>
        
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Explanation of Euclidean Distance Method
          </Typography>
          <Typography variant="body2" paragraph>
            Euclidean Distance measures how far each supplier is from an ideal point in a multi-dimensional space where each dimension represents a criterion.
          </Typography>
          <Typography variant="body2">
            • Lower distances indicate better performance (closer to ideal)
          </Typography>
          <Typography variant="body2">
            • Higher scores (derived from distances) indicate better performance
          </Typography>
          <Typography variant="body2">
            • The overall score is calculated as a weighted average of all criteria scores
          </Typography>
        </Paper>
      </Box>
    );
  };

  const renderMethodResult = () => {
    if (!result) return null;
    
    switch (result.method) {
      case 'topsis':
        return renderTOPSISResult();
      case 'euclidean':
        return renderEuclideanResult();
      default:
        return null;
    }
  };

  if (!excelData) {
    return (
      <Alert severity="info">
        Please upload an Excel file to perform supplier evaluation analysis.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Weighted Supplier Evaluation Methods
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Analysis Method</InputLabel>
              <Select
                value={selectedMethod}
                label="Analysis Method"
                onChange={handleMethodChange}
              >
                <MenuItem value="topsis">TOPSIS Method</MenuItem>
                <MenuItem value="euclidean">Euclidean Distance</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Supplier Column</InputLabel>
              <Select
                value={evaluationColumn}
                label="Supplier Column"
                onChange={handleEvaluationColumnChange}
              >
                {excelData.headers.map((header, index) => (
                  <MenuItem key={index} value={header}>
                    {header}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="textSecondary">
              Select the column that identifies the suppliers to be evaluated
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">
                Select Criteria and Assign Weights
              </Typography>
              
              <Box>
                <Chip 
                  label={`Total Weight: ${totalWeight.toFixed(3)}`} 
                  color={Math.abs(totalWeight - 1) < 0.001 ? "success" : "warning"}
                  sx={{ mr: 1 }}
                />
                
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={resetToEqualWeights}
                  disabled={selectedVariables.length === 0}
                  sx={{ mr: 1 }}
                >
                  Equal Weights
                </Button>
                
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={distributeRemainingWeight}
                  disabled={selectedVariables.length === 0 || Math.abs(totalWeight - 1) < 0.001}
                >
                  Normalize to 1
                </Button>
              </Box>
            </Box>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Criterion</TableCell>
                    <TableCell width="50%">Weight (0-1)</TableCell>
                    <TableCell>Include</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {excelData.headers
                    .filter(header => header !== evaluationColumn)
                    .map((header, index) => {
                      const criterionWeight = criteriaWeights.find(cw => cw.criterion === header);
                      const weight = criterionWeight ? criterionWeight.weight : 0;
                      const isSelected = selectedVariables.includes(header);
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>{header}</TableCell>
                          <TableCell>
                            <Slider
                              value={weight}
                              onChange={(_, value) => handleWeightChange(header, value as number)}
                              step={0.01}
                              marks={[
                                { value: 0, label: '0' },
                                { value: 0.25, label: '0.25' },
                                { value: 0.5, label: '0.5' },
                                { value: 0.75, label: '0.75' },
                                { value: 1, label: '1' }
                              ]}
                              min={0}
                              max={1}
                              valueLabelDisplay="auto"
                              valueLabelFormat={(value) => value.toFixed(2)}
                              disabled={!isSelected}
                            />
                            <Typography variant="caption" align="right" display="block">
                              {weight.toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleVariableToggle(header)}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="textSecondary">
              Select criteria columns and assign weights (0-1). The sum of all weights must equal 1.
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Button 
              variant="contained" 
              onClick={handleRun}
              disabled={
                selectedVariables.length === 0 || 
                !evaluationColumn
              }
            >
              Run Weighted {selectedMethod === 'topsis' ? 'TOPSIS' : 'Euclidean Distance'} Analysis
            </Button>
          </Grid>
        </Grid>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>
      
      {renderMethodResult()}
    </Box>
  );
};

export default AlternativeMethods; 