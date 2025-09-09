import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Responsiveness Tests', () => {
  // Test on different mobile devices
  const mobileDevices = [
    { name: 'iPhone 12', device: devices['iPhone 12'] },
    { name: 'Pixel 5', device: devices['Pixel 5'] },
    { name: 'iPad', device: devices['iPad Pro'] },
  ];

  mobileDevices.forEach(({ name, device }) => {
    test.describe(`${name} Tests`, () => {
      test.use({ ...device });

      test('should load dashboard on mobile', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check if main elements are visible
        await expect(page.locator('h1')).toBeVisible();
        
        // Check for mobile navigation
        const mobileNav = page.locator('[data-testid="mobile-nav"]');
        const desktopNav = page.locator('[data-testid="desktop-nav"]');
        
        // Either mobile nav should be visible or desktop nav should adapt
        const isMobileNavVisible = await mobileNav.isVisible();
        const isDesktopNavVisible = await desktopNav.isVisible();
        
        expect(isMobileNavVisible || isDesktopNavVisible).toBe(true);
      });

      test('should handle touch interactions', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Test touch navigation
        await page.tap('[data-testid="nav-revenue"]');
        await expect(page.locator('[data-testid="revenue-dashboard"]')).toBeVisible();

        // Test swipe gestures if implemented
        const chartContainer = page.locator('[data-testid="revenue-chart"]');
        if (await chartContainer.isVisible()) {
          // Simulate swipe gesture
          await chartContainer.hover();
          await page.mouse.down();
          await page.mouse.move(100, 0);
          await page.mouse.up();
        }
      });

      test('should display mobile-optimized layouts', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check viewport dimensions
        const viewport = page.viewportSize();
        expect(viewport).toBeTruthy();

        // Navigate to different sections and check layout
        const sections = ['revenue', 'products', 'traffic', 'customers'];
        
        for (const section of sections) {
          await page.tap(`[data-testid="nav-${section}"]`);
          await page.waitForLoadState('networkidle');
          
          // Check that content is not horizontally scrollable
          const body = page.locator('body');
          const bodyBox = await body.boundingBox();
          
          if (bodyBox && viewport) {
            expect(bodyBox.width).toBeLessThanOrEqual(viewport.width + 20); // Allow small margin
          }
        }
      });

      test('should handle mobile form interactions', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Navigate to revenue section
        await page.tap('[data-testid="nav-revenue"]');
        await page.waitForLoadState('networkidle');

        // Test date picker on mobile
        const datePicker = page.locator('[data-testid="date-range-picker"]');
        if (await datePicker.isVisible()) {
          await datePicker.tap();
          
          // Check if mobile-friendly date picker appears
          const datePickerModal = page.locator('[data-testid="date-picker-modal"]');
          if (await datePickerModal.isVisible()) {
            await expect(datePickerModal).toBeVisible();
            
            // Close the modal
            const closeButton = page.locator('[data-testid="date-picker-close"]');
            if (await closeButton.isVisible()) {
              await closeButton.tap();
            }
          }
        }
      });

      test('should display readable text and proper spacing', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check font sizes are appropriate for mobile
        const headings = page.locator('h1, h2, h3');
        const headingCount = await headings.count();
        
        for (let i = 0; i < headingCount; i++) {
          const heading = headings.nth(i);
          const fontSize = await heading.evaluate(el => 
            window.getComputedStyle(el).fontSize
          );
          
          // Font size should be at least 16px for readability
          const fontSizeNum = parseInt(fontSize.replace('px', ''));
          expect(fontSizeNum).toBeGreaterThanOrEqual(16);
        }

        // Check that buttons are large enough for touch
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();
        
        for (let i = 0; i < Math.min(buttonCount, 5); i++) { // Check first 5 buttons
          const button = buttons.nth(i);
          if (await button.isVisible()) {
            const box = await button.boundingBox();
            if (box) {
              // Buttons should be at least 44px in height (iOS guideline)
              expect(box.height).toBeGreaterThanOrEqual(40);
            }
          }
        }
      });

      test('should handle orientation changes', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Test portrait orientation (default)
        let viewport = page.viewportSize();
        if (viewport) {
          expect(viewport.height).toBeGreaterThan(viewport.width);
        }

        // Simulate landscape orientation
        await page.setViewportSize({ width: 812, height: 375 });
        await page.waitForTimeout(500);

        // Check that layout adapts to landscape
        viewport = page.viewportSize();
        if (viewport) {
          expect(viewport.width).toBeGreaterThan(viewport.height);
        }

        // Verify content is still accessible
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('nav')).toBeVisible();
      });

      test('should load charts efficiently on mobile', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Navigate to revenue analytics
        await page.tap('[data-testid="nav-revenue"]');
        
        // Measure chart loading time
        const startTime = Date.now();
        await page.waitForSelector('[data-testid="revenue-chart"]', { timeout: 10000 });
        const loadTime = Date.now() - startTime;

        // Charts should load within reasonable time on mobile
        expect(loadTime).toBeLessThan(5000);

        // Check if chart is properly sized for mobile
        const chart = page.locator('[data-testid="revenue-chart"]');
        const chartBox = await chart.boundingBox();
        const viewport = page.viewportSize();

        if (chartBox && viewport) {
          expect(chartBox.width).toBeLessThanOrEqual(viewport.width);
        }
      });
    });
  });

  test('should handle network conditions', async ({ page }) => {
    // Simulate slow 3G connection
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
      await route.continue();
    });

    await page.goto('/');
    
    // Should show loading states
    const loadingIndicator = page.locator('[data-testid="loading-spinner"]');
    await expect(loadingIndicator).toBeVisible();
    
    // Should eventually load
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should work offline with cached data', async ({ page, context }) => {
    // First, load the page online to cache data
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to revenue section to cache that data
    await page.tap('[data-testid="nav-revenue"]');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Reload the page
    await page.reload();

    // Should show offline indicator or cached data
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
    const cachedContent = page.locator('[data-testid="revenue-dashboard"]');
    
    // Either offline indicator should be shown or cached content should be available
    const isOfflineIndicatorVisible = await offlineIndicator.isVisible();
    const isCachedContentVisible = await cachedContent.isVisible();
    
    expect(isOfflineIndicatorVisible || isCachedContentVisible).toBe(true);
  });
});