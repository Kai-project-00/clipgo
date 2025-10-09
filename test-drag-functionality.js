const { chromium } = require('playwright');

async function testDragFunctionality() {
  console.log('🧪 Starting drag functionality test...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  const context = await browser.newContext();

  try {
    // Test 1: ChatGPT
    console.log('🤖 Testing ChatGPT drag functionality...');
    const chatgptPage = await context.newPage();

    // Navigate to ChatGPT
    await chatgptPage.goto('https://chat.openai.com/');
    await chatgptPage.waitForLoadState('networkidle');

    // Wait for page to be ready (you may need to login manually)
    console.log('📝 Please login to ChatGPT manually if needed...');
    await chatgptPage.waitForTimeout(5000);

    // Look for any text content on the page
    const textContent = await chatgptPage.evaluate(() => {
      const textElements = document.querySelectorAll('p, h1, h2, h3, span, div');
      return Array.from(textElements)
        .map(el => el.textContent?.trim())
        .filter(text => text && text.length > 10)
        .slice(0, 5);
    });

    console.log('📋 Found text elements:', textContent);

    // Check if content script is loaded
    const scriptLoaded = await chatgptPage.evaluate(() => {
      return typeof window.PopupManager !== 'undefined';
    });

    console.log('🔧 Content script loaded:', scriptLoaded);

    // Test text selection if we have content
    if (textContent.length > 0) {
      // Try to select text
      await chatgptPage.evaluate((text) => {
        const selection = window.getSelection();
        const range = document.createRange();

        // Find element containing the text
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        let node;
        while (node = walker.nextNode()) {
          if (node.textContent.includes(text)) {
            range.selectNodeContents(node);
            selection.removeAllRanges();
            selection.addRange(range);
            break;
          }
        }

        // Trigger mouseup event
        const mouseupEvent = new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        document.dispatchEvent(mouseupEvent);
      }, textContent[0]);

      await chatgptPage.waitForTimeout(2000);

      // Check if popup appeared
      const popupExists = await chatgptPage.$('.clip-popup, [class*="popup"], [id*="popup"]');
      console.log('🎨 Popup appeared:', !!popupExists);

      if (popupExists) {
        console.log('✅ ChatGPT drag functionality: PASSED');
      } else {
        console.log('❌ ChatGPT drag functionality: FAILED - No popup appeared');
      }
    } else {
      console.log('⚠️ No text content found for testing');
    }

    await chatgptPage.close();

    // Test 2: Claude.ai
    console.log('🧠 Testing Claude.ai drag functionality...');
    const claudePage = await context.newPage();

    await claudePage.goto('https://claude.ai/');
    await claudePage.waitForLoadState('networkidle');

    console.log('📝 Please login to Claude.ai manually if needed...');
    await claudePage.waitForTimeout(5000);

    // Check if content script is loaded
    const claudeScriptLoaded = await claudePage.evaluate(() => {
      return typeof window.PopupManager !== 'undefined';
    });

    console.log('🔧 Claude content script loaded:', claudeScriptLoaded);

    // Look for text content
    const claudeTextContent = await claudePage.evaluate(() => {
      const textElements = document.querySelectorAll('p, h1, h2, h3, span, div');
      return Array.from(textElements)
        .map(el => el.textContent?.trim())
        .filter(text => text && text.length > 10)
        .slice(0, 5);
    });

    console.log('📋 Claude found text elements:', claudeTextContent);

    if (claudeTextContent.length > 0) {
      // Try to select text
      await claudePage.evaluate((text) => {
        const selection = window.getSelection();
        const range = document.createRange();

        // Find element containing the text
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        let node;
        while (node = walker.nextNode()) {
          if (node.textContent.includes(text)) {
            range.selectNodeContents(node);
            selection.removeAllRanges();
            selection.addRange(range);
            break;
          }
        }

        // Trigger mouseup event
        const mouseupEvent = new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        document.dispatchEvent(mouseupEvent);
      }, claudeTextContent[0]);

      await claudePage.waitForTimeout(2000);

      // Check if popup appeared
      const claudePopupExists = await claudePage.$('.clip-popup, [class*="popup"], [id*="popup"]');
      console.log('🎨 Claude popup appeared:', !!claudePopupExists);

      if (claudePopupExists) {
        console.log('✅ Claude.ai drag functionality: PASSED');
      } else {
        console.log('❌ Claude.ai drag functionality: FAILED - No popup appeared');
      }
    } else {
      console.log('⚠️ No text content found for testing');
    }

    await claudePage.close();

    console.log('🧪 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testDragFunctionality().catch(console.error);