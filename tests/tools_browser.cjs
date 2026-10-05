/* Optional integration test: run create_tools_fixtures first, start ES Doc,
   set NODE_PATH to your installed Playwright, then node tests/tools_browser.cjs.
   TOOLS_TEST_URL defaults to http://127.0.0.1:8012/tools. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const fixtures = path.join(root, 'temp/tools-fixtures');
const target = process.env.TOOLS_TEST_URL || 'http://127.0.0.1:8012/tools';
const origin = new URL(target).origin;

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, colorScheme: 'light' });
        const errors = [], requests = [];
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
            await page.waitForFunction(() => /Готово|Нет готовых|Обработка прервана|Не удалось/.test(document.getElementById('tools-status').textContent), { timeout: 90000 });
            assert.match(await page.locator('#tools-status').textContent(), /^Готово/);
        };
        const save = async name => {
            const promise = page.waitForEvent('download');
            await page.locator('#tools-download').click();
            await (await promise).saveAs(path.join(root, 'temp/' + name));
        };

        // Cancellation tears down the loading worker; retry must succeed.
        await pick('files', path.join(fixtures, 'game/scenario/script.rpyc'));
        await page.locator('#tools-start').click();
        await page.locator('#tools-cancel').click();
        assert.match(await page.locator('#tools-status').textContent(), /отменена/);
        await page.locator('#tools-start').click();
        await finish();
        await save('tools-browser-rpyc.zip');
        assert.match(await page.locator('#tools-report-text').textContent(), /Errors: 0/);

        // A warm worker processes a recursive directory and restores paths.
        await page.locator('#tools-clear').click();
        await page.locator('input[value="unrpyc"]').check();
        await pick('folder', path.join(fixtures, 'game'));
        assert.match(await page.locator('#tools-file-list').textContent(), /game\/scenario\/script.rpyc/);
        await page.locator('#tools-start').click();
        await finish();
        await save('tools-browser-folder.zip');
        assert.match(await page.locator('#tools-report-text').textContent(), /Errors: 0/);

        await page.locator('#tools-clear').click();
        await page.locator('input[value="unrpa"]').check();
        await pick('files', path.join(fixtures, 'game/data.rpa'));
        await page.locator('#tools-start').click();
        await finish();
        await save('tools-browser-extracted.zip');
        assert.match(await page.locator('#tools-report-text').textContent(), /Output files: 3/);

        // Drop through a real DataTransfer, alongside a corrupt input.
        await page.locator('#tools-clear').click();
        await page.locator('input[value="unrpyc"]').check();
        const script = [...fs.readFileSync(path.join(fixtures, 'game/scenario/script.rpyc'))];
        await page.evaluate(bytes => {
            const transfer = new DataTransfer();
            transfer.items.add(new File([new Uint8Array(bytes)], 'dropped.rpyc'));
            transfer.items.add(new File(['invalid'], 'bad.rpyc'));
            document.getElementById('tools-drop').dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
        }, script);
        await page.locator('#tools-start').click();
        await finish();
        assert.match(await page.locator('#tools-status').textContent(), /с ошибками/);
        await save('tools-browser-partial.zip');

        // Soft navigation must clean up the worker and initialize exactly once.
        await page.locator('.site-header a[href="/materials"]').click();
        await page.waitForURL('**/materials');
        assert.equal(await page.evaluate(() => window.__esdocToolsCleanup), null);
        await page.locator('.site-header a[href="/tools"]').click();
        await page.waitForURL('**/tools');
        await page.locator('#tools-controls').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#tools-file-list li').count(), 0);

        if (process.env.UNRPYC_FIXTURE) {
            await page.locator('#tools-files').setInputFiles(process.env.UNRPYC_FIXTURE);
            await page.locator('#tools-start').click();
            await finish();
            await save('tools-browser-upstream.zip');
        }

        assert.deepEqual(errors, []);
        assert.deepEqual(requests.filter(([method, url]) => method !== 'GET' || !url.startsWith(origin + '/')), []);
        console.log('Browser processing passed: picker menu, cancellation/retry, RPYC, recursive folder, RPA with automatic decompilation, drop, partial failure, soft navigation. All requests were local GETs.');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
