const { chromium } = require('@playwright/test');

async function testClipGoExtension() {
  console.log('🧪 Starting ClipGo Extension Test...\n');

  // Launch Chrome with extension loaded
  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--load-extension=${process.cwd()}`,
      '--disable-extensions-except=./',
      '--enable-automation'
    ]
  });

  try {
    // Test 1: Extension popup functionality
    console.log('📋 Test 1: Extension popup functionality');

    // Create a new page with our test file
    const page = await browser.newPage();
    await page.goto(`file://${process.cwd()}/test-real-website.html`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if content script is loaded
    const contentScriptLoaded = await page.evaluate(() => {
      return typeof window.textSelectionHandler !== 'undefined' &&
             typeof window.PopupManager !== 'undefined';
    });

    console.log(`Content script loaded: ${contentScriptLoaded ? '✅' : '❌'}`);

    if (!contentScriptLoaded) {
      console.log('❌ Content script not found. Extension might not be loaded properly.');
      return;
    }

    // Test 2: Text selection and popup
    console.log('\n🎯 Test 2: Text selection and popup');

    // Select text in the test box
    await page.click('.test-text');
    await page.keyboard.down('Meta');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Meta');

    // Wait a moment for selection to register
    await page.waitForTimeout(1000);

    // Check if popup was created
    const popupExists = await page.evaluate(() => {
      return document.querySelector('.clipgo-popup') !== null;
    });

    console.log(`Popup appeared after text selection: ${popupExists ? '✅' : '❌'}`);

    // Test 3: Extension icon click
    console.log('\n🔧 Test 3: Extension popup via icon');

    // Get extension popup page
    const [popupPage] = await Promise.all([
      browser.waitForEvent('page'),
      // This would normally click the extension icon, but we'll simulate it
      page.evaluate(() => {
        chrome.runtime.sendMessage({ action: 'openPopup' });
      })
    ]);

    if (popupPage) {
      console.log('✅ Extension popup opened successfully');

      // Wait for popup to load
      await popupPage.waitForLoadState('networkidle');

      // Check if popup content loaded
      const popupContentLoaded = await popupPage.evaluate(() => {
        return document.querySelector('.category-select') !== null;
      });

      console.log(`Popup content loaded: ${popupContentLoaded ? '✅' : '❌'}`);

      await popupPage.close();
    } else {
      console.log('❌ Extension popup failed to open');
    }

    // Test 4: Background script communication
    console.log('\n🔄 Test 4: Background script communication');

    const backgroundResponse = await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'test' }, (response) => {
          resolve(response);
        });
      });
    });

    console.log(`Background script response: ${backgroundResponse ? '✅' : '❌'}`);

    // Test 5: Storage functionality
    console.log('\n💾 Test 5: Storage functionality');

    const storageTest = await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.local.set({ test: 'value' }, () => {
          chrome.storage.local.get(['test'], (result) => {
            resolve(result.test === 'value');
          });
        });
      });
    });

    console.log(`Storage functionality: ${storageTest ? '✅' : '❌'}`);

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testClipGoExtension().catch(console.error);