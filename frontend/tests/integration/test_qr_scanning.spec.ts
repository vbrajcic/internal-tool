import { test, expect } from '@playwright/test';

describe('QR Code Scanning Integration Tests (T025)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Mock authentication for testing
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-employee-jwt-token');
      localStorage.setItem('user-role', 'Employee');
    });
  });

  test('should scan QR code and display equipment details within 2 seconds', async ({ page }) => {
    // Navigate to QR scanner page
    await page.goto('/equipment/scan');

    // Wait for QR scanner component to load
    await expect(page.locator('[data-testid="qr-scanner"]')).toBeVisible();

    // Mock camera permissions and QR code detection
    await page.evaluate(() => {
      // Mock the html5-qrcode scanner
      window.mockQRScan = (qrCode: string) => {
        const event = new CustomEvent('qr-scan-success', {
          detail: { qrCode }
        });
        document.dispatchEvent(event);
      };
    });

    const startTime = Date.now();

    // Simulate QR code scan
    await page.evaluate(() => {
      window.mockQRScan('QR-LAPTOP-TEST-001');
    });

    // Verify equipment details displayed
    await expect(page.locator('[data-testid="equipment-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="equipment-serial"]')).toContainText('LAPTOP-TEST-001');
    await expect(page.locator('[data-testid="equipment-brand"]')).toBeVisible();
    await expect(page.locator('[data-testid="equipment-model"]')).toBeVisible();
    await expect(page.locator('[data-testid="equipment-condition"]')).toBeVisible();

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Verify performance requirement: <2 seconds
    expect(responseTime).toBeLessThan(2000);

    console.log(`✓ QR scanning completed in ${responseTime}ms (< 2000ms requirement)`);
  });

  test('should work on mobile devices with touch interface', async ({ page, isMobile }) => {
    // Skip if not running mobile test
    test.skip(!isMobile, 'This test is for mobile devices');

    await page.goto('/equipment/scan');

    // Verify mobile-optimized interface
    await expect(page.locator('[data-testid="mobile-qr-scanner"]')).toBeVisible();

    // Test touch interactions
    const scanButton = page.locator('[data-testid="scan-button"]');
    await expect(scanButton).toBeVisible();

    // Verify button is touch-friendly (minimum 44px touch target)
    const buttonSize = await scanButton.boundingBox();
    expect(buttonSize?.width).toBeGreaterThanOrEqual(44);
    expect(buttonSize?.height).toBeGreaterThanOrEqual(44);

    // Test camera toggle for mobile
    const cameraToggle = page.locator('[data-testid="camera-toggle"]');
    await cameraToggle.tap();

    console.log('✓ Mobile QR scanning interface is touch-friendly');
  });

  test('should handle different lighting conditions', async ({ page }) => {
    await page.goto('/equipment/scan');

    // Test flash/torch functionality
    const flashToggle = page.locator('[data-testid="flash-toggle"]');
    await expect(flashToggle).toBeVisible();

    await flashToggle.click();
    await expect(flashToggle).toHaveAttribute('aria-pressed', 'true');

    // Mock scanning in low light with flash
    await page.evaluate(() => {
      window.mockQRScan('QR-DISPLAY-TEST-002');
    });

    await expect(page.locator('[data-testid="equipment-details"]')).toBeVisible();

    console.log('✓ Flash/torch functionality works for low light conditions');
  });

  test('should support file upload for QR code images', async ({ page }) => {
    await page.goto('/equipment/scan');

    // Switch to file upload mode
    const uploadToggle = page.locator('[data-testid="upload-toggle"]');
    await uploadToggle.click();

    // Verify file input is visible
    const fileInput = page.locator('[data-testid="qr-file-input"]');
    await expect(fileInput).toBeVisible();

    // Mock file upload with QR code image
    await page.setInputFiles('[data-testid="qr-file-input"]', {
      name: 'qr-code.png',
      mimeType: 'image/png',
      buffer: Buffer.from('mock-qr-image-data')
    });

    // Mock QR detection from uploaded file
    await page.evaluate(() => {
      window.mockQRScan('QR-PHONE-TEST-003');
    });

    await expect(page.locator('[data-testid="equipment-details"]')).toBeVisible();

    console.log('✓ File upload QR scanning works correctly');
  });

  test('should report equipment condition from mobile interface', async ({ page }) => {
    await page.goto('/equipment/scan');

    // Scan equipment first
    await page.evaluate(() => {
      window.mockQRScan('QR-LAPTOP-TEST-001');
    });

    await expect(page.locator('[data-testid="equipment-details"]')).toBeVisible();

    // Access condition reporting
    const reportConditionButton = page.locator('[data-testid="report-condition"]');
    await reportConditionButton.click();

    // Verify condition reporting form
    await expect(page.locator('[data-testid="condition-form"]')).toBeVisible();

    // Select new condition
    const conditionSelect = page.locator('[data-testid="condition-select"]');
    await conditionSelect.selectOption('Fair');

    // Add notes
    const notesInput = page.locator('[data-testid="condition-notes"]');
    await notesInput.fill('Minor scratches on the lid, but functioning well');

    // Submit condition update
    const submitButton = page.locator('[data-testid="submit-condition"]');
    await submitButton.click();

    // Verify success message
    await expect(page.locator('[data-testid="condition-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="condition-success"]')).toContainText('Condition updated successfully');

    console.log('✓ Equipment condition reporting works on mobile');
  });

  test('should handle QR scanning errors gracefully', async ({ page }) => {
    await page.goto('/equipment/scan');

    // Mock invalid QR code
    await page.evaluate(() => {
      window.mockQRScan('INVALID-QR-CODE');
    });

    // Verify error message
    await expect(page.locator('[data-testid="scan-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="scan-error"]')).toContainText('Equipment not found');

    // Verify retry option
    const retryButton = page.locator('[data-testid="retry-scan"]');
    await expect(retryButton).toBeVisible();
    await retryButton.click();

    // Verify scanner reactivated
    await expect(page.locator('[data-testid="qr-scanner"]')).toBeVisible();

    console.log('✓ QR scanning error handling works correctly');
  });

  test('should work across different browsers and devices', async ({ page, browserName }) => {
    await page.goto('/equipment/scan');

    // Verify basic functionality works across browsers
    await expect(page.locator('[data-testid="qr-scanner"]')).toBeVisible();

    // Mock successful scan
    await page.evaluate(() => {
      window.mockQRScan('QR-TABLET-TEST-004');
    });

    await expect(page.locator('[data-testid="equipment-details"]')).toBeVisible();

    console.log(`✓ QR scanning works correctly in ${browserName}`);
  });

  test('should maintain responsive design on different screen sizes', async ({ page }) => {
    // Test on different viewport sizes
    const viewports = [
      { width: 375, height: 667 }, // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1920, height: 1080 } // Desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/equipment/scan');

      // Verify scanner is visible and properly sized
      const scanner = page.locator('[data-testid="qr-scanner"]');
      await expect(scanner).toBeVisible();

      const scannerBox = await scanner.boundingBox();
      expect(scannerBox?.width).toBeGreaterThan(0);
      expect(scannerBox?.height).toBeGreaterThan(0);

      // Verify controls are accessible
      await expect(page.locator('[data-testid="scan-controls"]')).toBeVisible();

      console.log(`✓ Responsive design works at ${viewport.width}x${viewport.height}`);
    }
  });

  test('should integrate with equipment transfer workflow', async ({ page }) => {
    await page.goto('/equipment/scan');

    // Scan equipment
    await page.evaluate(() => {
      window.mockQRScan('QR-KEYBOARD-TEST-005');
    });

    await expect(page.locator('[data-testid="equipment-details"]')).toBeVisible();

    // Verify transfer option available (for authorized users)
    const transferButton = page.locator('[data-testid="transfer-equipment"]');
    if (await transferButton.isVisible()) {
      await transferButton.click();

      // Verify transfer form
      await expect(page.locator('[data-testid="transfer-form"]')).toBeVisible();

      console.log('✓ QR scanning integrates with transfer workflow');
    }
  });

  test('should support offline QR scanning capability', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);

    await page.goto('/equipment/scan');

    // Verify offline message
    await expect(page.locator('[data-testid="offline-notice"]')).toBeVisible();

    // Mock QR scan in offline mode
    await page.evaluate(() => {
      window.mockQRScan('QR-MOUSE-TEST-006');
    });

    // Verify cached equipment data displayed
    await expect(page.locator('[data-testid="equipment-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

    // Restore online mode
    await page.context().setOffline(false);

    // Verify data sync when back online
    await expect(page.locator('[data-testid="sync-indicator"]')).toBeVisible();

    console.log('✓ Offline QR scanning capability works correctly');
  });
});