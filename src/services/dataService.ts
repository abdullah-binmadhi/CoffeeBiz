import { DataProcessor } from '../utils/dataProcessor';
import { ProcessedTransaction } from '../types';

export class DataService {
  private dataProcessor: DataProcessor;
  private isLoaded: boolean = false;

  constructor() {
    this.dataProcessor = new DataProcessor();
  }

  async loadDatasets(): Promise<void> {
    try {
      // Load both CSV files
      const [dataset1Response, dataset2Response] = await Promise.all([
        fetch('/index_1.csv'),
        fetch('/index_2.csv')
      ]);

      if (!dataset1Response.ok || !dataset2Response.ok) {
        throw new Error('Failed to load datasets');
      }

      const [csv1Content, csv2Content] = await Promise.all([
        dataset1Response.text(),
        dataset2Response.text()
      ]);

      // Process both datasets
      const [transactions1, transactions2] = await Promise.all([
        this.dataProcessor.loadCSVData(csv1Content),
        this.dataProcessor.loadCSVData(csv2Content)
      ]);

      // Combine the datasets
      const allTransactions = [...transactions1, ...transactions2];
      
      // Sort by datetime
      allTransactions.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

      // Store in the processor
      await this.dataProcessor.loadCSVData(this.combineCSVContent(csv1Content, csv2Content));
      
      this.isLoaded = true;
      console.log(`Loaded ${allTransactions.length} transactions from datasets`);
    } catch (error) {
      console.error('Error loading datasets:', error);
      throw error;
    }
  }

  private combineCSVContent(csv1: string, csv2: string): string {
    const lines1 = csv1.trim().split('\n');
    const lines2 = csv2.trim().split('\n');
    
    // Get header from first file
    const header = lines1[0];
    
    // Get data lines from both files (skip headers)
    const dataLines1 = lines1.slice(1);
    const dataLines2 = lines2.slice(1);
    
    // Combine all lines
    return [header, ...dataLines1, ...dataLines2].join('\n');
  }

  getDataProcessor(): DataProcessor {
    if (!this.isLoaded) {
      throw new Error('Data not loaded. Call loadDatasets() first.');
    }
    return this.dataProcessor;
  }

  isDataLoaded(): boolean {
    return this.isLoaded;
  }

  async exportToCSV(data: any[], filename: string): Promise<void> {
    if (data.length === 0) return;

    // Convert data to CSV format
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle values that might contain commas
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  validateData(transactions: ProcessedTransaction[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (transactions.length === 0) {
      errors.push('No transactions found in dataset');
      return { isValid: false, errors };
    }

    // Check for required fields
    transactions.forEach((transaction, index) => {
      if (!transaction.datetime || isNaN(transaction.datetime.getTime())) {
        errors.push(`Invalid datetime at transaction ${index + 1}`);
      }
      
      if (!transaction.amount || transaction.amount <= 0) {
        errors.push(`Invalid amount at transaction ${index + 1}`);
      }
      
      if (!transaction.productName || transaction.productName.trim() === '') {
        errors.push(`Missing product name at transaction ${index + 1}`);
      }
      
      if (!['cash', 'card'].includes(transaction.paymentMethod)) {
        errors.push(`Invalid payment method at transaction ${index + 1}`);
      }
    });

    // Check date range
    const dates = transactions.map(t => t.datetime).sort((a, b) => a.getTime() - b.getTime());
    const dateRange = {
      start: dates[0],
      end: dates[dates.length - 1]
    };

    console.log(`Data validation: ${transactions.length} transactions from ${dateRange.start.toDateString()} to ${dateRange.end.toDateString()}`);

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}