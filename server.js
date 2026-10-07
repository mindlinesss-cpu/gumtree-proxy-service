const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/scrape', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send('Missing "url" parameter');
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 1. Navigate to URL
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 2. If it's a Gumtree listing, click "Show phone number"
    if (targetUrl.includes('gumtree.com/p/')) {
      try {
        const btnSelector = 'button[data-q="phone-number-button"], button:has-text("Show phone number")';
        await page.waitForSelector(btnSelector, { timeout: 4000 });
        await page.click(btnSelector);
        await page.waitForTimeout(1500); // Wait for phone number request to complete
      } catch (e) {
        // Continue if button is not present
      }
    }

    // 3. Return full rendered HTML back to Google Apps Script
    const content = await page.content();
    await browser.close();

    res.set('Content-Type', 'text/html');
    return res.status(200).send(content);

  } catch (err) {
    if (browser) await browser.close();
    return res.status(500).send('Scraping Error: ' + err.message);
  }
});

app.listen(PORT, () => console.log(`Server active on port ${PORT}`));
