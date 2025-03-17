import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  IconButton, 
  TextField, 
  Button, 
  Box, 
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  InputAdornment
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import { useFileContext } from '../../context/FileContext';
import { useSettingsContext } from '../../context/SettingsContext';

const DataGrid: React.FC = () => {
  const { 
    excelData, 
    updateCell, 
    addRow, 
    addColumn, 
    removeRow, 
    removeColumn, 
    saveFile 
  } = useFileContext();
  
  const { settings } = useSettingsContext();
  
  const [editCell, setEditCell] = useState<{ row: number; col: number } | null>(null);
  const [cellValue, setCellValue] = useState<string>('');
  const [newColumnName, setNewColumnName] = useState<string>('');
  const [showAddColumnDialog, setShowAddColumnDialog] = useState<boolean>(false);

  if (!excelData) {
    return null;
  }

  const handleCellClick = (rowIndex: number, colIndex: number, value: string | number) => {
    setEditCell({ row: rowIndex, col: colIndex });
    setCellValue(String(value));
  };

  const handleCellChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCellValue(e.target.value);
  };

  const handleCellBlur = () => {
    if (editCell) {
      updateCell(editCell.row, editCell.col, cellValue);
      setEditCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    }
  };

  const handleAddRow = () => {
    addRow();
  };

  const handleOpenAddColumnDialog = () => {
    setNewColumnName('');
    setShowAddColumnDialog(true);
  };

  const handleAddColumn = () => {
    addColumn(newColumnName);
    setShowAddColumnDialog(false);
  };

  const handleSave = () => {
    saveFile();
  };

  return (
    <>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button 
          variant="outlined" 
          startIcon={<AddIcon />} 
          onClick={handleAddRow}
        >
          Add Row
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<AddIcon />} 
          onClick={handleOpenAddColumnDialog}
        >
          Add Column
        </Button>
        <Button 
          variant="contained" 
          startIcon={<SaveIcon />} 
          onClick={handleSave}
          color="primary"
        >
          Save File
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              {excelData.headers.map((header, index) => (
                <TableCell key={index}>
                  {header}
                  <IconButton 
                    size="small" 
                    onClick={() => removeColumn(index)}
                    sx={{ ml: 1 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {excelData.data.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell>
                  {rowIndex + 1}
                  <IconButton 
                    size="small" 
                    onClick={() => removeRow(rowIndex)}
                    sx={{ ml: 1 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
                {row.map((cell, colIndex) => (
                  <TableCell 
                    key={colIndex} 
                    onClick={() => handleCellClick(rowIndex, colIndex, cell)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {editCell && editCell.row === rowIndex && editCell.col === colIndex ? (
                      <TextField
                        value={cellValue}
                        onChange={handleCellChange}
                        onBlur={handleCellBlur}
                        onKeyDown={handleKeyDown}
                        variant="standard"
                        autoFocus
                        fullWidth
                        size="small"
                        InputProps={{
                          endAdornment: typeof cell === 'number' ? (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                edge="end"
                                onClick={() => {
                                  setCellValue(Number(cellValue).toFixed(settings.decimalPlaces));
                                }}
                              >
                                #
                              </IconButton>
                            </InputAdornment>
                          ) : null
                        }}
                      />
                    ) : (
                      typeof cell === 'number' 
                        ? Number(cell).toFixed(settings.decimalPlaces) 
                        : cell
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={showAddColumnDialog} onClose={() => setShowAddColumnDialog(false)}>
        <DialogTitle>Add New Column</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter a name for the new column:
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Column Name"
            fullWidth
            variant="outlined"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddColumnDialog(false)}>Cancel</Button>
          <Button onClick={handleAddColumn} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DataGrid; 