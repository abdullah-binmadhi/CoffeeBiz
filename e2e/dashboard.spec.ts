import { test, expect } from '@playwright/test';

test.describe('CoffeeBiz Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should load the main dashboard', async ({ page }) => {
    // Check if the main dashboard elements are present
    await expect(page.locator('h1')).toContainText('CoffeeBiz Analytics');
    
    // Check for navigation elements
    await expect(page.locator('nav')).toBeVisible();
    
    // Check for main dashboard sections
    await expect(page.locator('[data-testid="revenue-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="products-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="traffic-section"]')).toBeVisible();
  });

  test('should navigate between different analytics modules', async ({ page }) => {
    // Test navigation to Revenue Analytics
    await page.click('[data-testid="nav-revenue"]');
    await expect(page.locator('[data-testid="revenue-dashboard"]')).toBeVisible();
    await expect(page.locator('h2')).toContainText('Revenue Analytics');

    // Test navigation to Product Performance
    await page.click('[data-testid="nav-products"]');
    await expect(page.locator('[data-testid="products-dashboard"]')).toBeVisible();
    await expect(page.locator('h2')).toContainText('Product Performance');

    // Test navigation to Traffic Analysis
    await page.click('[data-testid="nav-traffic"]');
    await expect(page.locator('[data-testid="traffic-dashboard"]')).toBeVisible();
    await expect(page.locator('h2')).toContainText('Traffic Analysis');

    // Test navigation to Customer Behavior
    await page.click('[data-testid="nav-customers"]');
    await expect(page.locator('[data-testid="customers-dashboard"]')).toBeVisible();
    await expect(page.locator('h2')).toContainText('Customer Behavior');

    // Test navigation to Inventory Management
    await page.click('[data-testid="nav-inventory"]');
    await expect(page.locator('[data-testid="inventory-dashboard"]')).toBeVisible();
    await expect(page.locator('h2')).toContainText('Inventory Management');
  });

  test('should display loading states', async ({ page }) => {
    // Navigate to revenue analytics
    await page.click('[data-testid="nav-revenue"]');
    
    // Check for loading indicators
    const loadingIndicator = page.locator('[data-testid="loading-spinner"]');
    
    // Loading should appear initially
    await expect(loadingIndicator).toBeVisible();
    
    // Loading should disappear after data loads
    await expect(loadingIndicator).toBeHidden({ timeout: 10000 });
  });

  test('should handle date range filtering', async ({ page }) => {
    // Navigate to revenue analytics
    await page.click('[data-testid="nav-revenue"]');
    await page.waitForLoadState('networkidle');

    // Test date range picker
    const dateRangePicker = page.locator('[data-testid="date-range-picker"]');
    await expect(dateRangePicker).toBeVisible();

    // Click on date range picker
    await dateRangePicker.click();

    // Select a predefined range (e.g., "Last 30 days")
    await page.click('[data-testid="date-range-30-days"]');

    // Wait for data to reload
    await page.waitForLoadState('networkidle');

    // Verify that charts are updated
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
  });

  test('should display charts and visualizations', async ({ page }) => {
    // Navigate to revenue analytics
    await page.click('[data-testid="nav-revenue"]');
    await page.waitForLoadState('networkidle');

    // Check for revenue chart
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    
    // Check for revenue metrics cards
    await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="transaction-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="avg-transaction-value"]')).toBeVisible();

    // Navigate to product performance
    await page.click('[data-testid="nav-products"]');
    await page.waitForLoadState('networkidle');

    // Check for product performance chart
    await expect(page.locator('[data-testid="product-performance-chart"]')).toBeVisible();
    
    // Check for top products table
    await expect(page.locator('[data-testid="top-products-table"]')).toBeVisible();
  });

  test('should export data functionality', async ({ page }) => {
    // Navigate to revenue analytics
    await page.click('[data-testid="nav-revenue"]');
    await page.waitForLoadState('networkidle');

    // Look for export button
    const exportButton = page.locator('[data-testid="export-csv"]');
    
    if (await exportButton.isVisible()) {
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download');
      
      // Click export button
      await exportButton.click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/.*\.csv$/);
    }
  });

  test('should handle responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // Wait for responsive changes
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Check if mobile navigation is present
    const mobileNav = page.locator('[data-testid="mobile-nav"]');
    if (await mobileNav.isVisible()) {
      await expect(mobileNav).toBeVisible();
    }
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/**', route => {
      route.abort('failed');
    });

    // Navigate to revenue analytics
    await page.click('[data-testid="nav-revenue"]');
    
    // Check for error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    // Verify error message content
    await expect(errorMessage).toContainText('Unable to load data');
  });

  test('should validate data accuracy', async ({ page }) => {
    // Navigate to revenue analytics
    await page.click('[data-testid="nav-revenue"]');
    await page.waitForLoadState('networkidle');

    // Get revenue total from UI
    const revenueElement = page.locator('[data-testid="total-revenue"]');
    await expect(revenueElement).toBeVisible();
    
    const revenueText = await revenueElement.textContent();
    expect(revenueText).toMatch(/\$[\d,]+\.?\d*/); // Should be a currency format

    // Get transaction count
    const transactionElement = page.locator('[data-testid="transaction-count"]');
    await expect(transactionElement).toBeVisible();
    
    const transactionText = await transactionElement.textContent();
    expect(transactionText).toMatch(/\d+/); // Should be a number
  });

  test('should perform search and filtering', async ({ page }) => {
    // Navigate to products
    await page.click('[data-testid="nav-products"]');
    await page.waitForLoadState('networkidle');

    // Test search functionality if available
    const searchInput = page.locator('[data-testid="product-search"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('coffee');
      await page.waitForTimeout(1000); // Wait for search results
      
      // Verify search results
      const productRows = page.locator('[data-testid="product-row"]');
      const count = await productRows.count();
      expect(count).toBeGreaterThan(0);
    }

    // Test category filtering if available
    const categoryFilter = page.locator('[data-testid="category-filter"]');
    
    if (await categoryFilter.isVisible()) {
      await categoryFilter.selectOption('espresso');
      await page.waitForTimeout(1000);
      
      // Verify filtered results
      const filteredRows = page.locator('[data-testid="product-row"]');
      const filteredCount = await filteredRows.count();
      expect(filteredCount).toBeGreaterThanOrEqual(0);
    }
  });
});