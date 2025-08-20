const { chromium } = require('playwright');
const path = require('path');

(async () => {
  // Launch browser
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set viewport to exact OG image dimensions
  await page.setViewportSize({ width: 1200, height: 630 });
  
  // Capture blog article og-image
  const blogPath = 'file://' + path.resolve(__dirname, 'og-image-blog.html');
  await page.goto(blogPath);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ 
    path: 'og-image-blog.png',
    type: 'png'
  });
  console.log('✓ Blog og-image captured: og-image-blog.png');
  
  // Capture main website og-image
  const mainPath = 'file://' + path.resolve(__dirname, 'og-image-main.html');
  await page.goto(mainPath);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ 
    path: 'og-image-main.png',
    type: 'png'
  });
  console.log('✓ Main site og-image captured: og-image-main.png');
  
  // Capture game og-image
  const gamePath = 'file://' + path.resolve(__dirname, 'og-image-game.html');
  await page.goto(gamePath);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ 
    path: 'og-image-game.png',
    type: 'png'
  });
  console.log('✓ Game og-image captured: og-image-game.png');
  
  // Close browser
  await browser.close();
  
  console.log('\n🎉 All og-images captured successfully!');
  console.log('\nUsage:');
  console.log('- og-image-blog.png → for blog/arguing-software-into-existence.html');
  console.log('- og-image-main.png → for index.html');
  console.log('- og-image-game.png → for play/index.html');
})();