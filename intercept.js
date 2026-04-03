const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    console.log("Launching interceptor...");
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    let capturedQuery = null;
    let capturedResponse = null;

    page.on('request', request => {
        if (request.url().includes('graphql') && request.method() === 'POST') {
            capturedQuery = request.postData();
            console.log("Captured GraphQL Request Payload!");
        }
    });

    page.on('response', async response => {
        if (response.url().includes('graphql') && response.request().method() === 'POST') {
            try {
                capturedResponse = await response.json();
                console.log("Captured GraphQL Response Data!");
            } catch (e) {
                console.log("Failed to parse graphql response");
            }
        }
    });

    try {
        await page.goto('https://signage-us.indy.systems/directional/262?margin-horizontal=0&margin-vertical=0&highlight-r-rated=true&disable-official-symbol=false&screen-ids=1560%2C1669&dark-mode=true&screens-per-page=8&interval=5000&show-title=true&title=Auditoriums&display-time=true&show-poster=true&show-logo=true&show-rating-reason=true', { waitUntil: 'networkidle2', timeout: 30000 });
    } catch(e) {
        console.log("Goto finished or timed out.");
    }

    fs.writeFileSync('indy_graphql_intercept.json', JSON.stringify({
        queryPayload: capturedQuery,
        responseData: capturedResponse
    }, null, 2));

    await browser.close();
    console.log("Done.");
})();
