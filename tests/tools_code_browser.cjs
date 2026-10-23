/* Start ES Doc on port 8012 and provide Playwright through NODE_PATH. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(process.env.TOOLS_TEST_URL || 'http://127.0.0.1:8012/tools/unpack?mode=pack');
        const text = Array.from({ length: 300 }, (_, i) => `# ${i} ${'long line '.repeat(40)}`).join('\n');
        await page.locator('#tools-files').setInputFiles({
            name: 'long-script.rpy', mimeType: 'text/plain', buffer: Buffer.from(text),
        });
        await page.locator('#tools-browser-list button[data-entry-id]').click();
        const pre = page.locator('.tools-code-frame pre');
        const toggle = page.locator('.tools-code-expand');
        const settled = () => page.waitForFunction(() => document.querySelector('.tools-code-frame').getAnimations().length === 0);
        const controlOffset = () => toggle.evaluate(el => {
            const button = el.getBoundingClientRect();
            const frame = el.closest('.tools-code-frame').getBoundingClientRect();
            return { right: frame.right - button.right, top: button.top - frame.top };
        });
        await pre.waitFor({ timeout: 90000 });
        const output = path.resolve(__dirname, '../temp/tools-code-review');
        fs.mkdirSync(output, { recursive: true });
        for (const width of [1440, 390]) {
            await page.setViewportSize({ width, height: 900 });
            for (const theme of ['light', 'dark']) {
                await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
                await pre.evaluate(el => { el.scrollTop = 0; el.scrollLeft = 0; });
                assert(await pre.evaluate(el => el.scrollWidth > el.clientWidth && el.scrollHeight > el.clientHeight));
                assert.equal(await pre.locator('.code-scroll').evaluate(el => getComputedStyle(el).overflowX), 'visible');
                await pre.focus();
                await page.keyboard.press('ArrowRight');
                assert(await pre.evaluate(el => el.scrollLeft > 0));
                assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
                const inlineOffset = await controlOffset();
                await page.locator('.tools-code-frame').evaluate(el => el.scrollIntoView({ block: 'center' }));
                await page.screenshot({ path: path.join(output, `${width}-${theme}-inline.png`) });
                await page.getByRole('button', { name: 'На весь экран', exact: true }).click();
                await settled();
                const dialog = page.locator('#tools-code-dialog');
                assert(await dialog.isVisible());
                assert.equal(await toggle.getAttribute('aria-label'), 'Свернуть');
                const expandedOffset = await controlOffset();
                assert(Math.abs(inlineOffset.right - expandedOffset.right) <= 1);
                assert(Math.abs(inlineOffset.top - expandedOffset.top) <= 1);
                assert.equal(await page.locator('.tools-code-toolbar .code-copy').count(), 1);
                assert((await dialog.locator('code').textContent()).trimEnd() === text.trimEnd(), 'Expanded code preserves source');
                assert(await dialog.evaluate(el => {
                    const rect = el.getBoundingClientRect();
                    return rect.x === 0 && rect.y === 0 && Math.abs(rect.width - innerWidth) < 1
                        && Math.abs(rect.height - innerHeight) < 1 && el.scrollWidth <= el.clientWidth;
                }));
                assert(await pre.evaluate(el => el.clientHeight > 600));
                await pre.evaluate(el => { el.scrollTop = 500; el.scrollLeft = 100; });
                await page.screenshot({ path: path.join(output, `${width}-${theme}-expanded.png`) });
                await page.keyboard.press('Escape');
                await dialog.waitFor({ state: 'hidden' });
                assert(await pre.evaluate(el => el.scrollTop === 500 && el.scrollLeft === 100));
                assert(await page.locator('.tools-code-expand').evaluate(el => el === document.activeElement));
                await toggle.click();
                await settled();
                await toggle.click();
                await dialog.waitFor({ state: 'hidden' });
                assert((await page.locator('#tools-browser-preview code').textContent()).trimEnd() === text.trimEnd(), 'Restored code preserves source');
            }
        }
        // Motion remains reversible during opening; reduced motion avoids scaling.
        await toggle.dispatchEvent('click');
        assert(await page.locator('.tools-code-frame').evaluate(el =>
            el.getAnimations().some(animation => animation.effect.getTiming().duration === 260)));
        await toggle.dispatchEvent('click');
        await page.locator('#tools-code-dialog').waitFor({ state: 'hidden' });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await toggle.click();
        assert(await page.locator('.tools-code-frame').evaluate(el =>
            el.getAnimations().every(animation => animation.effect.getKeyframes().every(frame => !frame.transform))));
        await settled();
        await page.keyboard.press('Escape');
        await page.locator('#tools-code-dialog').waitFor({ state: 'hidden' });
        assert.deepEqual(errors, []);
        console.log('Code preview: scrolling, fullscreen, Escape, focus and restoration passed at desktop/mobile widths in both themes.');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
