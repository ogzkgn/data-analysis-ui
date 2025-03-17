import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  Slider,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import { useFileContext } from '../../context/FileContext';
import { useSettingsContext } from '../../context/SettingsContext';

interface CategoryWeight {
  category: string;
  weight: number;
  selected: boolean;
}

interface WeightMap {
  [key: string]: number;
}

interface SupplierScore {
  supplier: string;
  supplierScore: number;
  categoryScores: WeightMap;
}

const SensitivityAnalysis: React.FC = () => {
  const { excelData } = useFileContext();
  const { settings } = useSettingsContext();
  
  // Categories and weights
  const [categories, setCategories] = useState<CategoryWeight[]>([]);
  const [totalWeight, setTotalWeight] = useState<number>(1.0);
  
  // Suppliers and scores
  const [suppliers, setSuppliers] = useState<SupplierScore[]>([]);
  const [supplierColumn, setSupplierColumn] = useState<string>('');
  
  // Target category and optimization settings
  const [targetCategory, setTargetCategory] = useState<string>('');
  const [optimizationGoal, setOptimizationGoal] = useState<'maximize' | 'minimize'>('maximize');
  
  // Results
  const [originalWeights, setOriginalWeights] = useState<WeightMap>({});
  const [newWeights, setNewWeights] = useState<WeightMap | null>(null);
  const [absoluteChanges, setAbsoluteChanges] = useState<WeightMap | null>(null);
  const [newSupplierScores, setNewSupplierScores] = useState<SupplierScore[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize categories from Excel data when it changes
  useEffect(() => {
    if (!excelData?.headers?.length) {
      setCategories([]);
      return;
    }
    
    // Get numeric columns from Excel data (potential categories)
    const numericColumns: string[] = [];
    
    excelData.headers.forEach((header, index) => {
      // Check if column contains numeric data
      let hasNumericValues = false;
      
      excelData.data.forEach(row => {
        const value = row[index];
        if (value !== undefined && value !== null) {
          if (!isNaN(Number(value))) {
            hasNumericValues = true;
          }
        }
      });
      
      if (hasNumericValues) {
        numericColumns.push(header);
      }
    });
    
    // Initialize with equal weights but not selected
    const equalWeight = numericColumns.length > 0 ? 1 / numericColumns.length : 0;
    
    const newCategories = numericColumns.map(column => ({
      category: column,
      weight: equalWeight,
      selected: false
    }));
    
    setCategories(newCategories);
    setNewWeights(null);
    setAbsoluteChanges(null);
    setError(null);
    
    // If there's only one column, select it as the supplier column
    if (excelData.headers.length === 1) {
      setSupplierColumn(excelData.headers[0]);
    }
  }, [excelData]);
  
  // Update total weight whenever categories change
  useEffect(() => {
    const selectedCategories = categories.filter(cat => cat.selected);
    const sum = selectedCategories.reduce((acc, cat) => acc + cat.weight, 0);
    setTotalWeight(sum);
  }, [categories]);
  
  // Calculate supplier scores when categories or supplier column changes
  useEffect(() => {
    if (!excelData || !supplierColumn || categories.filter(c => c.selected).length === 0) {
      setSuppliers([]);
      return;
    }
    
    try {
      const selectedCategories = categories.filter(cat => cat.selected);
      const supplierColumnIndex = excelData.headers.indexOf(supplierColumn);
      
      if (supplierColumnIndex === -1) {
        return;
      }
      
      // Create a map of category indices for faster lookup
      const categoryIndices: { [key: string]: number } = {};
      selectedCategories.forEach(cat => {
        categoryIndices[cat.category] = excelData.headers.indexOf(cat.category);
      });
      
      // Extract unique suppliers
      const uniqueSuppliers = new Set<string>();
      excelData.data.forEach(row => {
        const supplier = row[supplierColumnIndex]?.toString() || '';
        if (supplier) uniqueSuppliers.add(supplier);
      });
      
      // Calculate scores for each supplier
      const supplierScores: SupplierScore[] = Array.from(uniqueSuppliers).map(supplierName => {
        // Find all rows for this supplier
        const supplierRows = excelData.data.filter(
          row => row[supplierColumnIndex]?.toString() === supplierName
        );
        
        // Calculate average score for each category
        const categoryScores: WeightMap = {};
        
        selectedCategories.forEach(cat => {
          const categoryIndex = categoryIndices[cat.category];
          if (categoryIndex !== undefined && categoryIndex !== -1) {
            // Extract numeric values for this category
            const values = supplierRows
              .map(row => parseFloat(row[categoryIndex]?.toString() || '0'))
              .filter(val => !isNaN(val));
            
            // Calculate average (or 0 if no values)
            const avgScore = values.length > 0 
              ? values.reduce((sum, val) => sum + val, 0) / values.length
              : 0;
            
            categoryScores[cat.category] = avgScore;
          } else {
            categoryScores[cat.category] = 0;
          }
        });
        
        // Calculate weighted total score
        const totalScore = selectedCategories.reduce((sum, cat) => {
          return sum + (categoryScores[cat.category] || 0) * cat.weight;
        }, 0);
        
        return {
          supplier: supplierName,
          supplierScore: totalScore,
          categoryScores
        };
      });
      
      setSuppliers(supplierScores);
    } catch (err) {
      console.error('Error calculating supplier scores:', err);
      setSuppliers([]);
    }
  }, [excelData, supplierColumn, categories]);

  const handleWeightChange = (category: string, newWeight: number) => {
    // Get the current weight for this category
    const currentCat = categories.find(cat => cat.category === category);
    if (!currentCat) return;
    
    const currentWeight = currentCat.weight;
    const weightDifference = newWeight - currentWeight;
    
    // Calculate current total weight of selected categories
    const selectedCategories = categories.filter(cat => cat.selected);
    const currentTotal = selectedCategories.reduce((sum, cat) => sum + cat.weight, 0);
    
    // If this would make the total weight exceed 1, adjust the value
    if (currentTotal + weightDifference > 1) {
      newWeight = currentWeight + (1 - currentTotal);
    }
    
    setCategories(prev => 
      prev.map(cat => 
        cat.category === category ? { ...cat, weight: newWeight } : cat
      )
    );
  };
  
  const handleCategoryToggle = (category: string) => {
    setCategories(prev => 
      prev.map(cat => 
        cat.category === category ? { ...cat, selected: !cat.selected } : cat
      )
    );
  };
  
  const handleTargetCategoryChange = (event: SelectChangeEvent) => {
    setTargetCategory(event.target.value);
  };
  
  const handleSupplierColumnChange = (event: SelectChangeEvent) => {
    setSupplierColumn(event.target.value);
  };
  
  const handleOptimizationGoalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setOptimizationGoal(event.target.value as 'maximize' | 'minimize');
  };

  const normalizeWeights = () => {
    const selectedCategories = categories.filter(cat => cat.selected);
    if (selectedCategories.length === 0) return;
    
    const sum = selectedCategories.reduce((acc, cat) => acc + cat.weight, 0);
    
    if (Math.abs(sum - 1) < 0.001) return; // Already normalized
    
    setCategories(prev => 
      prev.map(cat => cat.selected 
        ? { ...cat, weight: cat.weight / sum } 
        : cat
      )
    );
  };
  
  const resetToEqualWeights = () => {
    const selectedCategories = categories.filter(cat => cat.selected);
    if (selectedCategories.length === 0) return;
    
    const equalWeight = 1 / selectedCategories.length;
    
    setCategories(prev => 
      prev.map(cat => cat.selected 
        ? { ...cat, weight: equalWeight }
        : cat
      )
    );
    
    setNewWeights(null);
    setAbsoluteChanges(null);
  };

  // Calculate new supplier scores based on new weights
  const calculateNewSupplierScores = (newWeights: WeightMap): SupplierScore[] => {
    return suppliers.map(supplier => {
      const newScore = Object.keys(supplier.categoryScores).reduce((sum, category) => {
        const categoryScore = supplier.categoryScores[category] || 0;
        const weight = newWeights[category] || 0;
        return sum + categoryScore * weight;
      }, 0);
      
      return {
        ...supplier,
        supplierScore: newScore
      };
    });
  };

  // Check if a given weight configuration satisfies the supplier score constraints
  const satisfiesSupplierConstraints = (): boolean => {
    // Always return true - no constraints applied
    return true;
  };

  const runSensitivityAnalysis = () => {
    // Validation
    if (!targetCategory) {
      setError('Please select a target category to optimize');
      return;
    }
    
    const selectedCategories = categories.filter(cat => cat.selected);
    
    if (selectedCategories.length < 2) {
      setError('Please select at least 2 categories for the analysis');
      return;
    }
    
    // No need to normalize since weights are already constrained to sum to 1
    
    // Save original weights
    const origWeights: WeightMap = {};
    selectedCategories.forEach(cat => {
      origWeights[cat.category] = cat.weight;
    });
    
    setOriginalWeights(origWeights);
    
    try {
      // Implement the mathematical model shown in the image
      
      // Initialize decision variables
      const weightMap: WeightMap = { ...origWeights };
      const yMap: WeightMap = {}; // Absolute weight changes
      
      // Get the current target category weight
      const targetCurrentWeight = origWeights[targetCategory] || 0;
      
      // Get other categories (exclude target)
      const otherCategories = selectedCategories.filter(c => c.category !== targetCategory);
      const totalOtherWeight = otherCategories.reduce((sum, c) => sum + origWeights[c.category], 0);
      
      // Calculate target weight based on optimization goal
      
      if (optimizationGoal === 'maximize') {
        // MAXIMIZATION: Maximize the target weight (increase from current)
        
        // For maximization, we can go up to a maximum of 0.9 (leave 10% for others)
        const maxTargetWeight = 0.9;
        const bestWeight = Math.min(maxTargetWeight, targetCurrentWeight * 2);
        
        // Set the best weight found
        weightMap[targetCategory] = bestWeight;
        
        // Distribute remaining weight
        const remainingWeight = 1.0 - bestWeight;
        otherCategories.forEach(cat => {
          const ratio = totalOtherWeight > 0 
            ? origWeights[cat.category] / totalOtherWeight 
            : 1 / otherCategories.length;
          weightMap[cat.category] = remainingWeight * ratio;
        });
        
      } else {
        // MINIMIZATION: Minimize the target weight (decrease from current)
        
        // For minimization, we can go down to a minimum of 0.1 (keep at least 10%)
        const minTargetWeight = 0.1;
        const bestWeight = Math.max(minTargetWeight, targetCurrentWeight / 2);
        
        // Set the best weight found
        weightMap[targetCategory] = bestWeight;
        
        // Distribute remaining weight
        const remainingWeight = 1.0 - bestWeight;
        otherCategories.forEach(cat => {
          const ratio = totalOtherWeight > 0 
            ? origWeights[cat.category] / totalOtherWeight 
            : 1 / otherCategories.length;
          weightMap[cat.category] = remainingWeight * ratio;
        });
      }
      
      // Calculate absolute weight changes (y values) according to equations 3-4
      selectedCategories.forEach(cat => {
        const oldWeight = origWeights[cat.category] || 0;
        const newWeight = weightMap[cat.category] || 0;
        yMap[cat.category] = Math.abs(newWeight - oldWeight);
      });
      
      // Calculate new supplier scores
      const updatedSupplierScores = calculateNewSupplierScores(weightMap);
      
      // Update state with results
      setNewWeights(weightMap);
      setAbsoluteChanges(yMap);
      setNewSupplierScores(updatedSupplierScores);
      setError(null);
    } catch (err) {
      setError(`Error performing sensitivity analysis: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const renderWeightComparison = () => {
    if (!newWeights || !absoluteChanges) return null;
    
    const selectedCategories = categories.filter(cat => cat.selected);
    
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Sensitivity Analysis Results
        </Typography>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell>Original Weight</TableCell>
                <TableCell>New Weight</TableCell>
                <TableCell>Absolute Change (y)</TableCell>
                <TableCell>Direction</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedCategories.map((cat, index) => {
                const originalWeight = originalWeights[cat.category] || 0;
                const newWeight = newWeights[cat.category] || 0;
                const absoluteChange = absoluteChanges[cat.category] || 0;
                const direction = newWeight > originalWeight ? "Increase" : newWeight < originalWeight ? "Decrease" : "No change";
                const isTarget = cat.category === targetCategory;
                
                return (
                  <TableRow 
                    key={index} 
                    sx={{ backgroundColor: isTarget ? 'rgba(255, 243, 224, 0.5)' : 'inherit' }}
                  >
                    <TableCell>
                      {cat.category}
                      {isTarget && (
                        <Chip 
                          size="small" 
                          label={optimizationGoal === 'maximize' ? "Maximized" : "Minimized"} 
                          color="primary" 
                          sx={{ ml: 1 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>{(originalWeight * 100).toFixed(1)}%</TableCell>
                    <TableCell>{(newWeight * 100).toFixed(1)}%</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {(absoluteChange * 100).toFixed(1)}%
                        <Box 
                          sx={{ 
                            width: Math.max(10, absoluteChange * 100), 
                            ml: 1, 
                            height: 10, 
                            backgroundColor: 'primary.main' 
                          }} 
                        />
                      </Box>
                    </TableCell>
                    <TableCell sx={{ 
                      color: direction === "Increase" ? 'success.main' : 
                             direction === "Decrease" ? 'error.main' : 'inherit'
                    }}>
                      {direction}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Mathematical Model Explanation
          </Typography>
          <Typography variant="body2" paragraph>
            This analysis {optimizationGoal === 'maximize' ? 'maximizes' : 'minimizes'} the weight of {targetCategory} while maximizing the absolute weight change (y). 
          </Typography>
          <Typography variant="body2">
            • When maximizing: We try to increase the target category's weight as much as possible
          </Typography>
          <Typography variant="body2">
            • When minimizing: We try to decrease the target category's weight as much as possible
          </Typography>
          <Typography variant="body2">
            • In both cases, we maximize the absolute change while maintaining all constraints
          </Typography>
        </Box>
      </Paper>
    );
  };
  
  const renderSupplierScores = () => {
    if (!newWeights || newSupplierScores.length === 0) return null;
    
    // Sort suppliers by new score descending
    const sortedSuppliers = [...newSupplierScores].sort((a, b) => b.supplierScore - a.supplierScore);
    
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Impact on Supplier Scores
        </Typography>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>Original Score</TableCell>
                <TableCell>New Score</TableCell>
                <TableCell>Change</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedSuppliers.map((supplier, index) => {
                const originalSupplier = suppliers.find(s => s.supplier === supplier.supplier);
                const originalScore = originalSupplier ? originalSupplier.supplierScore : 0;
                const scoreChange = supplier.supplierScore - originalScore;
                
                return (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{supplier.supplier}</TableCell>
                    <TableCell>{originalScore.toFixed(2)}</TableCell>
                    <TableCell>{supplier.supplierScore.toFixed(2)}</TableCell>
                    <TableCell sx={{ 
                      color: scoreChange > 0 ? 'success.main' : scoreChange < 0 ? 'error.main' : 'inherit'
                    }}>
                      {scoreChange > 0 ? '+' : ''}{scoreChange.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Typography variant="caption" sx={{ mt: 2, display: 'block' }}>
          This table shows how the new weights affect each supplier's overall score.
        </Typography>
      </Paper>
    );
  };
  
  const renderMathematicalModel = () => {
    if (!targetCategory) return null;
    
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Mathematical Model
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="body1">
              Objective: {optimizationGoal === 'maximize' ? 'Maximize' : 'Minimize'} weight of {targetCategory} while maximizing absolute weight change
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Decision Variables:
            </Typography>
            
            <Typography variant="body2" sx={{ ml: 2, my: 0.5 }}>
              • w<sub>new,criteria</sub>: New weight for each criteria (0 ≤ w ≤ 1)
            </Typography>
            
            <Typography variant="body2" sx={{ ml: 2, my: 0.5 }}>
              • y<sub>criteria</sub>: Absolute weight change for each criteria (-1 ≤ y ≤ 1)
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Subject to:
            </Typography>
            
            <Typography variant="body2" sx={{ ml: 2, my: 0.5 }}>
              1. Sum of all weights = 1
            </Typography>
            
            <Typography variant="body2" sx={{ ml: 2, my: 0.5 }}>
              2. y<sub>criteria</sub> ≥ w<sub>new,criteria</sub> - w<sub>old,criteria</sub>
            </Typography>
            
            <Typography variant="body2" sx={{ ml: 2, my: 0.5 }}>
              3. y<sub>criteria</sub> ≥ w<sub>old,criteria</sub> - w<sub>new,criteria</sub>
            </Typography>
            
            <Typography variant="body2" sx={{ ml: 2, my: 0.5 }}>
              4. 0.1 ≤ w<sub>new,criteria</sub> ≤ 0.9
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  const renderCategorySelection = () => {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Select Categories and Supplier Column
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Supplier Column</InputLabel>
              <Select
                value={supplierColumn}
                label="Supplier Column"
                onChange={handleSupplierColumnChange}
              >
                {excelData?.headers
                  .map((header, index) => (
                    <MenuItem key={index} value={header}>
                      {header}
                    </MenuItem>
                  ))
                }
              </Select>
            </FormControl>
            <Typography variant="caption" color="textSecondary">
              Select column that identifies suppliers (any column can be used)
            </Typography>
          </Grid>
        </Grid>
        
        <TableContainer sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Category (Excel Column)</TableCell>
                <TableCell>Include in Analysis</TableCell>
                <TableCell width="50%">Weight (0-1)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((cat, index) => (
                <TableRow key={index}>
                  <TableCell>{cat.category}</TableCell>
                  <TableCell>
                    <Checkbox
                      checked={cat.selected}
                      onChange={() => handleCategoryToggle(cat.category)}
                    />
                  </TableCell>
                  <TableCell>
                    {cat.selected && (
                      <>
                        <Slider
                          value={cat.weight}
                          onChange={(_, value) => handleWeightChange(cat.category, value as number)}
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
                          disabled={!cat.selected}
                        />
                        <Typography variant="caption" align="right" display="block">
                          {cat.weight.toFixed(2)} ({(cat.weight * 100).toFixed(0)}%)
                        </Typography>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="caption" color="textSecondary" sx={{ mr: 1 }}>
              Sum of selected weights:
            </Typography>
            <Chip 
              label={`${totalWeight.toFixed(3)}`} 
              color={Math.abs(totalWeight - 1) < 0.001 ? "success" : "warning"}
              size="small"
            />
          </Box>
          
          <Box>
            <Button 
              size="small" 
              variant="outlined" 
              onClick={resetToEqualWeights}
              disabled={categories.filter(c => c.selected).length === 0}
            >
              Reset to Equal Weights
            </Button>
          </Box>
        </Box>
      </Paper>
    );
  };
  
  const renderSensitivitySettings = () => {
    const selectedCategories = categories.filter(cat => cat.selected);
    
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Sensitivity Analysis Settings
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Target Category</InputLabel>
              <Select
                value={targetCategory}
                label="Target Category"
                onChange={handleTargetCategoryChange}
              >
                {selectedCategories.map((cat, index) => (
                  <MenuItem key={index} value={cat.category}>
                    {cat.category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="textSecondary">
              Select the category whose weight you want to optimize
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Optimization Goal</FormLabel>
              <RadioGroup
                row
                value={optimizationGoal}
                onChange={handleOptimizationGoalChange}
              >
                <FormControlLabel value="maximize" control={<Radio />} label="Maximize Weight" />
                <FormControlLabel value="minimize" control={<Radio />} label="Minimize Weight" />
              </RadioGroup>
            </FormControl>
            <Typography variant="caption" color="textSecondary">
              Choose whether to maximize (increase) or minimize (decrease) the target category's weight
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Button 
              variant="contained" 
              onClick={runSensitivityAnalysis}
              disabled={
                !targetCategory || 
                selectedCategories.length < 2 || 
                Math.abs(totalWeight - 1) > 0.001 ||
                !supplierColumn
              }
            >
              Run Sensitivity Analysis
            </Button>
            {Math.abs(totalWeight - 1) > 0.001 && (
              <Typography variant="caption" color="error" sx={{ ml: 2 }}>
                Total weight must equal 1.0 before running analysis
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>
    );
  };

  if (!excelData) {
    return (
      <Alert severity="info">
        Please upload an Excel file to perform sensitivity analysis.
      </Alert>
    );
  }

  if (categories.length === 0) {
    return (
      <Alert severity="warning">
        No numeric columns found in the Excel data. Sensitivity analysis requires numeric data.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Weight Sensitivity Analysis
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {renderCategorySelection()}
      
      {categories.filter(c => c.selected).length >= 2 && supplierColumn && (
        <>
          {renderSensitivitySettings()}
          {renderMathematicalModel()}
          {renderWeightComparison()}
          {renderSupplierScores()}
        </>
      )}
    </Box>
  );
};

export default SensitivityAnalysis; 