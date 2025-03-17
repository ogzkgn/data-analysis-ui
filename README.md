# Data Analysis UI

A client-side data analysis tool that allows users to upload Excel files, edit them, and perform various analyses without requiring a backend server. All processing happens directly in the browser.

## Features

- **Excel File Handling**
  - Upload Excel files
  - View and edit data
  - Add/remove rows and columns
  - Save and download modified files

- **Analysis Tools**
  - **Sensitivity Analysis**: See how changes in input variables affect outputs
  - **Correlation Analysis**: Discover relationships between variables
  - **Alternative Methods**: Various data analysis techniques including:
    - Linear Regression
    - Data Ranking
    - Normalization

- **User Interface**
  - Modern responsive design
  - Dark/light mode
  - Customizable settings

## Technology Stack

- **React.js** - Frontend framework
- **TypeScript** - Type-safe JavaScript
- **Material-UI** - UI component library
- **SheetJS** - Excel file processing
- **Chart.js** - Data visualization
- **React Router** - Navigation

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   cd data-analysis-ui
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Start the development server
   ```
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Usage Guide

### Uploading Data

1. Navigate to the Data Viewer screen
2. Use the file upload area to select an Excel file
3. The data will be loaded and displayed in a table format

### Editing Data

1. Click on any cell to edit its value
2. Use the "Add Row" and "Add Column" buttons to extend your dataset
3. Remove rows or columns using the delete icons
4. Click "Save File" to download the modified Excel file

### Performing Analysis

#### Sensitivity Analysis
1. Select input and output variables
2. Adjust the percentage range and number of steps
3. Click "Run Analysis" to see how changes in input affect the output

#### Correlation Analysis
1. Select variables to analyze
2. Click "Calculate Correlations" to see the correlation matrix
3. Interpret the results using the provided color-coded heatmap

#### Alternative Methods
1. Choose an analysis method (Regression, Ranking, or Normalization)
2. Select variables to analyze
3. Run the analysis and view the visual results

## Deployment

This application can be deployed to any static hosting service as it requires no backend:

- GitHub Pages
- Netlify
- Vercel
- Amazon S3
- Firebase Hosting

Example deployment to GitHub Pages:

```
npm run build
npm install -g gh-pages
gh-pages -d build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [SheetJS](https://sheetjs.com/) for the Excel handling capabilities
- [Chart.js](https://www.chartjs.org/) for the visualization components
- [Material-UI](https://mui.com/) for the UI components
