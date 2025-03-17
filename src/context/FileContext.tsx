import React, { createContext, useContext, useState, ReactNode } from 'react';
import * as XLSX from 'xlsx';
import { ExcelData } from '../types';

interface FileContextProps {
  excelData: ExcelData | null;
  isLoading: boolean;
  error: string | null;
  uploadFile: (file: File) => Promise<void>;
  updateCell: (rowIndex: number, colIndex: number, value: string | number) => void;
  addRow: () => void;
  addColumn: (header?: string) => void;
  removeRow: (rowIndex: number) => void;
  removeColumn: (colIndex: number) => void;
  saveFile: () => void;
  changeSheet: (sheetName: string) => void;
}

const FileContext = createContext<FileContextProps | undefined>(undefined);

export const useFileContext = () => {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFileContext must be used within a FileProvider');
  }
  return context;
};

export const FileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      const sheetNames = workbook.SheetNames;
      const activeSheet = sheetNames[0];
      const worksheet = workbook.Sheets[activeSheet];
      
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        throw new Error('File is empty');
      }

      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as (string | number)[][];
      
      setExcelData({
        headers,
        data: rows,
        sheetNames,
        activeSheet
      });
    } catch (err) {
      setError(`Failed to upload file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string | number) => {
    if (!excelData) return;
    
    const newData = [...excelData.data];
    newData[rowIndex][colIndex] = value;
    
    setExcelData({
      ...excelData,
      data: newData
    });
  };

  const addRow = () => {
    if (!excelData) return;
    
    const newRow = Array(excelData.headers.length).fill('');
    
    setExcelData({
      ...excelData,
      data: [...excelData.data, newRow]
    });
  };

  const addColumn = (header: string = `Column ${excelData?.headers.length ?? 0 + 1}`) => {
    if (!excelData) return;
    
    const newHeaders = [...excelData.headers, header];
    const newData = excelData.data.map(row => [...row, '']);
    
    setExcelData({
      ...excelData,
      headers: newHeaders,
      data: newData
    });
  };

  const removeRow = (rowIndex: number) => {
    if (!excelData) return;
    
    const newData = excelData.data.filter((_, index) => index !== rowIndex);
    
    setExcelData({
      ...excelData,
      data: newData
    });
  };

  const removeColumn = (colIndex: number) => {
    if (!excelData) return;
    
    const newHeaders = excelData.headers.filter((_, index) => index !== colIndex);
    const newData = excelData.data.map(row => 
      row.filter((_, index) => index !== colIndex)
    );
    
    setExcelData({
      ...excelData,
      headers: newHeaders,
      data: newData
    });
  };

  const saveFile = () => {
    if (!excelData) return;
    
    const worksheet = XLSX.utils.aoa_to_sheet([
      excelData.headers,
      ...excelData.data
    ]);
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, excelData.activeSheet);
    
    XLSX.writeFile(workbook, 'data_analysis_export.xlsx');
  };

  const changeSheet = (sheetName: string) => {
    if (!excelData || !excelData.sheetNames.includes(sheetName)) return;
    
    try {
      // Logic for changing the active sheet would be here
      // For now, just updating the active sheet name
      setExcelData({
        ...excelData,
        activeSheet: sheetName
      });
      
      // In a real implementation, we would load the data from that sheet
    } catch (err) {
      setError(`Failed to change sheet: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const value = {
    excelData,
    isLoading,
    error,
    uploadFile,
    updateCell,
    addRow,
    addColumn,
    removeRow,
    removeColumn,
    saveFile,
    changeSheet
  };

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
}; 