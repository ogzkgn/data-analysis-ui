export interface ExcelData {
  headers: string[];
  data: (string | number)[][];
  sheetNames: string[];
  activeSheet: string;
}

export interface AnalysisResult {
  type: 'sensitivity' | 'correlation' | 'alternative';
  data: any; // This will be more specific based on the analysis type
  timestamp: Date;
}

export interface AppSettings {
  darkMode: boolean;
  decimalPlaces: number;
  language: 'en' | 'tr';
}

export type AnalysisType = 'sensitivity' | 'correlation' | 'alternative'; 