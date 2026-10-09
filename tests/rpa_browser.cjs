/* Run with ES Doc on port 8012 and Playwright in NODE_PATH.
   RPA_TEST_URL and PLAYWRIGHT_CHANNEL can override the defaults. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const fixtures = path.join(root, 'temp/rpa-browser/game');
const target = process.env.RPA_TEST_URL || 'http://127.0.0.1:8012/tools/unpack?mode=pack';
const resources = {
    'mods/my_mod/images/bg.png': Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==', 'base64'),
    'mods/my_mod/audio/тема.ogg': Buffer.from([0, 255, 128, 65]),
    'mods/my_mod/empty.txt': Buffer.alloc(0),
    'mods/my_mod/script.rpy': Buffer.from('label my_mod_start:\n    return\n'),
};
for (const [name, data] of Object.entries(resources)) {
    const file = path.join(fixtures, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
}

(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
    try {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
        const page = await context.newPage();
        const errors = [], requests = [];
        page.on('pageerror', error => errors.push(error.message));
        context.on('request', request => requests.push([request.method(), request.url()]));
        await page.goto(target);
        await page.locator('#tools-pack-settings').waitFor({ state: 'visible' });
        assert(await page.locator('#tools-mode-pack').isChecked());
        await page.locator('#tools-folder').setInputFiles(fixtures);
        await page.locator('#tools-download-all').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#tools-pack-strip').inputValue(), 'game/');
        assert.match(await page.locator('#tools-file-list').textContent(), /mods\/my_mod\/images\/bg.png/);
        const verifiedPaths = await page.locator('.tools-pack-path').allTextContents();
        await page.locator('#tools-pack-prefix').fill('../outside');
        assert(await page.locator('#tools-download-all').isDisabled());
        assert(await page.locator('#tools-pack-error').isVisible());
        assert.match(await page.locator('#tools-pack-error').textContent(), /относительный путь.*mods\/my_mod/);
        assert(await page.locator('#tools-pack-preview-note').isVisible());
        assert.deepEqual(await page.locator('.tools-pack-path').allTextContents(), verifiedPaths);
        await page.locator('#tools-pack-prefix').fill('');
        await page.locator('#tools-pack-name').fill('my_mod');
        await page.locator('#tools-mode-unpack').check();
        assert(!await page.locator('#tools-queue').isVisible());
        await page.locator('#tools-mode-pack').check();
        assert.deepEqual(await page.locator('.tools-pack-path').allTextContents(), verifiedPaths);
        assert.equal(await page.locator('#tools-pack-name').inputValue(), 'my_mod');
        await page.locator('#tools-queue-search').fill('bg.png');
        assert.equal(await page.locator('.tools-pack-path').count(), 1);

        // Cancel lazy startup and retry from the same File objects.
        await page.locator('#tools-download-all').click();
        await page.locator('#tools-cancel').click();
        assert.match(await page.locator('#tools-status').textContent(), /отменена/);
        assert(await page.locator('#tools-queue').isVisible());
        const download = page.waitForEvent('download', { timeout: 90000 });
        await page.locator('#tools-download-all').click();
        const saved = await download;
        assert.equal(saved.suggestedFilename(), 'my_mod.rpa');
        const archive = path.join(root, 'temp/rpa-browser/my_mod.rpa');
        await saved.saveAs(archive);
        assert.match(await page.locator('#tools-result-description').textContent(), /Файлов в RPA: 4/);
        assert.equal(await page.locator('#tools-queue').isVisible(), true);
        await page.locator('#tools-queue-search').fill('');
        assert.deepEqual(await page.locator('.tools-pack-path').allTextContents(), verifiedPaths);
        await page.locator('#tools-pack-prefix').fill('alternate');
        assert.equal(await page.locator('.tools-pack-path').first().textContent(), 'alternate/' + verifiedPaths[0]);
        assert(await page.locator('#tools-download-all').isEnabled());
        await page.locator('#tools-pack-prefix').fill('');
        const python = path.join(root, '.venv/Scripts/python.exe');
        execFileSync(python, ['-c', [
            'import pathlib, pickle, zlib, sys',
            'data = pathlib.Path(sys.argv[1]).read_bytes()',
            'assert data.startswith(b"RPA-3.0 ")',
            'offset, key = int(data[8:24], 16), int(data[25:33], 16)',
            'index = pickle.loads(zlib.decompress(data[offset:]))',
            'for name, records in index.items():',
            '    content = b"".join(data[start ^ key:(start ^ key) + (length ^ key)] for start, length in records)',
            '    assert content == (pathlib.Path(sys.argv[2]) / name).read_bytes(), name',
            'assert len(index) == 4',
        ].join('\n'), archive, fixtures]);
        assert(requests.every(([method]) => method === 'GET'), JSON.stringify(requests));
        assert(!requests.some(([, url]) => /vendor\.zip|bytecode\.zip/.test(url)), 'Packing must not load decompilers');

        // Open our output in the existing unpacker, including Unicode names.
        await page.locator('#tools-mode-unpack').check();
        await page.locator('#tools-files').setInputFiles(archive);
        await page.locator('#tools-browser-list button').first().waitFor({ state: 'visible', timeout: 90000 });
        await page.locator('#tools-mode-pack').check();
        assert.deepEqual(await page.locator('.tools-pack-path').allTextContents(), verifiedPaths);
        await page.locator('#tools-mode-unpack').check();
        await page.locator('#tools-browser-list button').first().waitFor({ state: 'visible', timeout: 90000 });
        await page.locator('#tools-browser-search').fill('тема');
        assert.match(await page.locator('#tools-browser-list').textContent(), /тема.ogg/);
        const extracted = page.waitForEvent('download', { timeout: 90000 });
        await page.locator('#tools-download-all').click();
        const zip = await extracted;
        assert.equal(zip.suggestedFilename(), 'my_mod.zip');
        const zipPath = path.join(root, 'temp/rpa-browser/my_mod.zip');
        await zip.saveAs(zipPath);
        execFileSync(python, ['-c', [
            'import pathlib, zipfile, sys',
            'with zipfile.ZipFile(sys.argv[1]) as archive:',
            '    for name in archive.namelist():',
            '        assert archive.read(name) == (pathlib.Path(sys.argv[2]) / name).read_bytes(), name',
            '    assert len(archive.namelist()) == 4',
        ].join('\n'), zipPath, fixtures]);
        assert.deepEqual(errors, []);

        // Reach a file beyond the former 200-row limit, then remove it by keyboard.
        await page.locator('#tools-mode-pack').check();
        await page.locator('#tools-clear').click();
        await page.locator('#tools-files').setInputFiles(Array.from({ length: 251 }, (_, i) => ({
            name: `item-${String(i).padStart(3, '0')}.bin`, mimeType: 'application/octet-stream', buffer: Buffer.from([i % 256]),
        })));
        assert.equal(await page.locator('.tools-pack-path').count(), 100);
        await page.locator('#tools-queue-next').click();
        await page.locator('#tools-queue-next').click();
        assert.equal(await page.locator('.tools-pack-path').count(), 51);
        assert.match(await page.locator('#tools-queue-range').textContent(), /201–251 из 251/);
        await page.locator('#tools-queue-search').fill('item-250');
        await page.locator('.tools-remove').focus();
        await page.keyboard.press('Enter');
        assert(await page.locator('#tools-add').evaluate(el => el === document.activeElement));
        await page.locator('#tools-queue-search').fill('');
        await page.locator('.tools-remove').first().focus();
        await page.keyboard.press('Enter');
        assert(await page.locator('.tools-remove').first().evaluate(el => el === document.activeElement));
        await page.locator('#tools-clear').click();
        await page.locator('#tools-files').setInputFiles({ name: 'last.txt', mimeType: 'text/plain', buffer: Buffer.from('last') });
        await page.locator('.tools-remove').focus();
        await page.keyboard.press('Enter');
        assert(await page.locator('#tools-add').evaluate(el => el === document.activeElement));

        // One visual inspection round, desktop and mobile / light and dark.
        const review = path.join(root, '.impeccable/review');
        fs.mkdirSync(review, { recursive: true });
        for (const [name, width, theme] of [['desktop', 1440, 'light'], ['mobile', 390, 'light'],
            ['desktop-dark', 1440, 'dark'], ['mobile-dark', 390, 'dark']]) {
            await page.setViewportSize({ width, height: 1000 });
            await page.goto(target);
            await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
            await page.locator('#tools-folder').setInputFiles(fixtures);
            await page.locator('#tools-download-all').waitFor({ state: 'visible' });
            await page.evaluate(() => document.fonts.ready);
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + ' overflow');
            const contrasts = await page.locator('#tools-pack-settings input, #tools-pack-settings select, #tools-queue-search').evaluateAll(fields => {
                const rgb = color => color.match(/[\d.]+/g).slice(0, 3).map(Number);
                const luminance = color => rgb(color).map(v => {
                    v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
                }).reduce((total, v, i) => total + v * [.2126, .7152, .0722][i], 0);
                return fields.map(field => {
                    const style = getComputedStyle(field);
                    const a = luminance(style.borderTopColor), b = luminance(style.backgroundColor);
                    return { id: field.id, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
                });
            });
            assert(contrasts.every(({ ratio }) => ratio >= 3), JSON.stringify({ name, contrasts }));
            await page.screenshot({ path: path.join(review, name + '.png'), fullPage: true });
        }
        console.log('Browser RPA creation, cancellation, extraction, byte comparison, local GET-only processing and responsive checks passed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
