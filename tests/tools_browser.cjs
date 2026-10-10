/* Optional integration test: run create_tools_fixtures first, start ES Doc,
   set NODE_PATH to your installed Playwright, then node tests/tools_browser.cjs.
   TOOLS_TEST_URL defaults to http://127.0.0.1:8012/tools/unpack. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const fixtures = path.join(root, 'temp/tools-fixtures');
const target = process.env.TOOLS_TEST_URL || 'http://127.0.0.1:8012/tools/unpack';
const origin = new URL(target).origin;

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, colorScheme: 'light' });
        const errors = [], requests = [];
        let batchDownloads = [];
        page.on('download', download => batchDownloads.push(download));
        page.on('pageerror', error => errors.push(error.message));
        page.on('request', request => requests.push([request.method(), request.url()]));
        await page.goto(target);
        await page.locator('#tools-controls').waitFor({ state: 'visible' });
        await page.locator('#tools-add').click();
        assert(await page.locator('#tools-add-menu').isVisible());
        await page.keyboard.press('Escape');

        const pick = async (kind, files) => {
            await page.locator('#tools-add').click();
            const selection = page.waitForEvent('filechooser');
            await page.locator('#tools-pick-' + kind).click();
            await (await selection).setFiles(files);
        };
        assert.equal(await page.locator('#tools-add-menu').isVisible(), false);
        await page.locator('#tools-drop').click({ button: 'right' });
        assert(await page.locator('#tools-add-menu').isVisible());
        await page.keyboard.press('Escape');

        const finish = async () => {
            batchDownloads = [];
            const download = page.waitForEvent('download', {timeout: 90000});
            await page.locator('#tools-export-start').click();
            await page.locator('#tools-result').waitFor({ state: 'visible', timeout: 90000 });
            await page.waitForFunction(() => document.querySelector('#tools-downloads a')
                && document.querySelector('#tools-browser').getAttribute('aria-busy') === 'false', undefined, { timeout: 90000 });
            await download;
        };
        const save = async name => {
            assert(batchDownloads.length, 'Export should start a download automatically');
            await batchDownloads[0].saveAs(path.join(root, 'temp/' + name));
            assert.equal(await page.locator('#tools-queue').isVisible(),
                (await page.locator('#tools-result-description').textContent()).includes('Ошибок:'));
        };
        const clear = async () => {
            if (await page.locator('#tools-export-dialog').isVisible()) await page.locator('#tools-export-close').click();
            if (await page.locator('#tools-clear').isVisible()) await page.locator('#tools-clear').click();
        };

        // Cancellation tears down the loading worker; retry must succeed.
        await pick('files', path.join(fixtures, 'game/scenario/script.rpyc'));
        assert.equal(await page.locator('#tools-downloads a').count(), 0);
        await page.locator('#tools-browser-list button').first().click();
        await page.locator('#tools-cancel').click();
        assert.match(await page.locator('#tools-status').textContent(), /отменена/);
        await page.locator('#tools-start').click();
        await page.locator('#tools-browser-list button').first().waitFor({ state: 'visible' });
        await page.locator('#tools-browser-list button').first().click();
        await page.locator('#tools-browser-preview pre').waitFor({ state: 'visible' });
        assert.match(await page.locator('#tools-browser-preview pre').textContent(), /label start:/);
        assert(await page.locator('#tools-browser-preview pre .k').count());
        await finish();
        await save('tools-browser-rpyc.zip');
        assert.equal(await page.locator('#tools-downloads a').getAttribute('download'), 'unrpyc.zip');

        // A warm worker processes a recursive directory and restores paths.
        await clear();
        await pick('folder', path.join(fixtures, 'game/scenario'));
        await page.locator('#tools-browser-search').fill('script.rpyc');
        assert.match(await page.locator('#tools-browser-list').textContent(), /scenario\/script.rpyc/);
        await finish();
        await save('tools-browser-folder.zip');

        await clear();
        await pick('files', path.join(fixtures, 'game/data.rpa'));
        await page.waitForFunction(() => document.querySelector('#tools-browser').getAttribute('aria-busy') === 'false');
        assert.equal(await page.locator('#tools-downloads a').count(), 0);
        await finish();
        await save('tools-browser-extracted.zip');
        assert.match(await page.locator('#tools-result-description').textContent(), /Файлов в результате: 3/);
        assert.equal(await page.locator('#tools-downloads a').getAttribute('download'), 'data.zip');

        await clear();
        await pick('files', [path.join(fixtures, 'game/data.rpa'), path.join(fixtures, 'images.rpa')]);
        await page.waitForFunction(() => document.querySelector('#tools-browser').getAttribute('aria-busy') === 'false');
        await finish();
        assert.deepEqual(await page.locator('#tools-downloads a').evaluateAll(links => links.map(link => link.download)), ['data.zip', 'images.zip']);
        assert.equal(await page.locator('#tools-download-all').isVisible(), false);

        // Listing remains usable after a real Pyodide preview hits its size cap.
        await clear();
        await pick('files', path.join(fixtures, 'large.rpa'));
        await page.waitForFunction(() => document.querySelector('#tools-browser').getAttribute('aria-busy') === 'false');
        await page.locator('#tools-browser-search').fill('');
        await page.locator('#tools-browser-list button[data-entry-id]').filter({hasText: 'big.bin'}).click();
        await page.waitForFunction(() => document.querySelector('#tools-browser-preview').textContent.includes('Скачайте архив'));
        await page.locator('#tools-browser-list button[data-entry-id]').filter({hasText: 'small.txt'}).click();
        await page.locator('#tools-browser-preview pre').waitFor({state: 'visible'});
        assert.equal((await page.locator('#tools-browser-preview .code-scroll').textContent()).trim(), 'ok');

        // Drop through a real DataTransfer, alongside a corrupt input.
        await clear();
        const script = [...fs.readFileSync(path.join(fixtures, 'game/scenario/script.rpyc'))];
        await page.evaluate(bytes => {
            const transfer = new DataTransfer();
            transfer.items.add(new File([new Uint8Array(bytes)], 'dropped.rpyc'));
            transfer.items.add(new File(['invalid'], 'bad.rpyc'));
            document.getElementById('tools-drop').dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
        }, script);
        assert(await page.locator('#tools-mode-unpack').isChecked());
        await finish();
        assert.match(await page.locator('#tools-result-description').textContent(), /Ошибок: 1/);
        await save('tools-browser-partial.zip');

        // Soft navigation must clean up the worker and initialize exactly once.
        await page.locator('#tools-export-close').click();
        await page.locator('.site-header a[href="/materials"]').click();
        await page.waitForURL('**/materials');
        assert.equal(await page.evaluate(() => window.__esdocToolsCleanup), null);
        await page.locator('.site-header a[href="/tools"]').click();
        await page.waitForURL('**/tools');
        await page.locator('#site-content a[href="/tools/unpack"]').click();
        await page.waitForURL('**/tools/unpack');
        await page.locator('#tools-controls').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#tools-file-list li').count(), 0);

        if (process.env.UNRPYC_FIXTURE) {
            await page.locator('#tools-files').setInputFiles(process.env.UNRPYC_FIXTURE);
            await finish();
            await save('tools-browser-upstream.zip');
        }

        assert.deepEqual(errors, []);
        assert.deepEqual(requests.filter(([method, url]) => method !== 'GET' || !url.startsWith(origin + '/')), []);
        console.log('Browser processing passed: picker menu, cancellation/retry, lazy RPYC/RPA previews, local syntax highlighting, bulk export, recursive folder, partial failure, soft navigation. All requests were local GETs.');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
