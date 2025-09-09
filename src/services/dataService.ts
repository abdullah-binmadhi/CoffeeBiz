import { DataProcessor } from '../utils/dataProcessor';
import { ProcessedTransaction } from '../types';
import { ErrorHandler, ErrorType } from '../utils/errorHandler';

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

      if (!dataset1Response.ok) {
        throw new Error(`Failed to load dataset 1: ${dataset1Response.status} ${dataset1Response.statusText}`);
      }
      
      if (!dataset2Response.ok) {
        throw new Error(`Failed to load dataset 2: ${dataset2Response.status} ${dataset2Response.statusText}`);
      }

      const [csv1Content, csv2Content] = await Promise.all([
        dataset1Response.text(),
        dataset2Response.text()
      ]);

      // Basic content validation
      if (!csv1Content || csv1Content.trim().length === 0) {
        throw new Error('Dataset 1 is empty or corrupted');
      }
      
      if (!csv2Content || csv2Content.trim().length === 0) {
        throw new Error('Dataset 2 is empty or corrupted');
      }

      // Process both datasets
      const [transactions1, transactions2] = await Promise.all([
        this.dataProcessor.loadCSVData(csv1Content),
        this.dataProcessor.loadCSVData(csv2Content)
      ]);

      // Combine the datasets
      const allTransactions = [...transactions1, ...transactions2];
      
      if (allTransactions.length === 0) {
        throw new Error('No valid transactions found in either dataset');
      }
      
      // Sort by datetime
      allTransactions.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

      // Store in the processor
      await this.dataProcessor.loadCSVData(this.combineCSVContent(csv1Content, csv2Content));
      
      this.isLoaded = true;
      console.log(`Successfully loaded ${allTransactions.length} transactions from datasets`);
    } catch (error) {
      console.error('Error loading datasets:', error);
      
      // Create appropriate error types based on the error
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('network')) {
          throw ErrorHandler.createError(
            ErrorType.NETWORK_ERROR,
            error.message,
            'Unable to load data files. Please check your internet connection and try again.',
            error
          );
        } else if (error.message.includes('404')) {
          throw ErrorHandler.createError(
            ErrorType.IMPORT_ERROR,
            error.message,
            'Data files not found. Please ensure the CSV files are available.',
            error,
            true,
            false
          );
        } else if (error.message.includes('empty') || error.message.includes('corrupted')) {
          throw ErrorHandler.createError(
            ErrorType.DATA_VALIDATION_ERROR,
            error.message,
            'Data files appear to be empty or corrupted. Please check your data files.',
            error,
            true,
            false
          );
        }
      }
      
      // Default to import error
      throw ErrorHandler.createError(
        ErrorType.IMPORT_ERROR,
        error instanceof Error ? error.message : 'Unknown error loading datasets',
        'Failed to load data files. Please try again or contact support.',
        error
      );
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
    try {
      if (data.length === 0) {
        throw ErrorHandler.createError(
          ErrorType.EXPORT_ERROR,
          'No data to export',
          'No data is available for export.',
          undefined,
          true,
          false
        );
      }

      // Convert data to CSV format
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Handle values that might contain commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
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
      
      // Clean up
      URL.revokeObjectURL(url);
      
    } catch (error) {
      if (error instanceof Error && 'type' in error) {
        throw error; // Re-throw AppError
      }
      
      throw ErrorHandler.createError(
        ErrorType.EXPORT_ERROR,
        error instanceof Error ? error.message : 'Export failed',
        'Failed to export data. Please try again.',
        error
      );
    }
  }

  validateData(transactions: ProcessedTransaction[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (transactions.length === 0) {
      errors.push('No transactions found in dataset');
      return { isValid: false, errors };
    }

    let invalidCount = 0;
    const maxErrorsToShow = 5; // Limit error messages to avoid overwhelming users

    // Check for required fields
    transactions.forEach((transaction, index) => {
      if (invalidCount >= maxErrorsToShow) return;

      if (!transaction.datetime || isNaN(transaction.datetime.getTime())) {
        errors.push(`Invalid date/time in row ${index + 1}`);
        invalidCount++;
      }
      
      if (!transaction.amount || transaction.amount <= 0) {
        errors.push(`Invalid amount in row ${index + 1}: ${transaction.amount}`);
        invalidCount++;
      }
      
      if (!transaction.productName || transaction.productName.trim() === '') {
        errors.push(`Missing product name in row ${index + 1}`);
        invalidCount++;
      }
      
      if (!['cash', 'card'].includes(transaction.paymentMethod)) {
        errors.push(`Invalid payment method in row ${index + 1}: ${transaction.paymentMethod}`);
        invalidCount++;
      }
    });

    // Add summary if there are more errors
    const totalInvalidTransactions = transactions.filter(t => 
      !t.datetime || isNaN(t.datetime.getTime()) ||
      !t.amount || t.amount <= 0 ||
      !t.productName || t.productName.trim() === '' ||
      !['cash', 'card'].includes(t.paymentMethod)
    ).length;

    if (totalInvalidTransactions > maxErrorsToShow) {
      errors.push(`... and ${totalInvalidTransactions - maxErrorsToShow} more invalid transactions`);
    }

    // Check date range
    const validTransactions = transactions.filter(t => 
      t.datetime && !isNaN(t.datetime.getTime())
    );

    if (validTransactions.length > 0) {
      const dates = validTransactions.map(t => t.datetime).sort((a, b) => a.getTime() - b.getTime());
      const dateRange = {
        start: dates[0],
        end: dates[dates.length - 1]
      };

      console.log(`Data validation: ${validTransactions.length} valid transactions from ${dateRange.start.toDateString()} to ${dateRange.end.toDateString()}`);
      
      // Warn if data is too old or too recent
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      
      if (dateRange.end < oneYearAgo) {
        errors.push('Warning: Data appears to be more than one year old');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}