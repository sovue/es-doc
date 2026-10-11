/* Optional native-browser regressions. Start ES Doc and set NODE_PATH to
   Playwright; APP_TEST_URL defaults to http://127.0.0.1:8012. */
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const origin = process.env.APP_TEST_URL || 'http://127.0.0.1:8012';

const softNavigate = async (page, path) => {
    await page.evaluate(href => {
        const link = document.createElement('a');
        link.href = href;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }, path);
    await page.waitForURL(origin + path);
    await page.waitForFunction(href => window.__lastRegressionNavigation === href, origin + path);
};

(async () => {
    const browser = await chromium.launch({headless: true});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => {
            window.__regressionDocument = 'original';
            window.__regressionListeners = new Set();
            window.__regressionObservers = new Set();
            const originalAdd = window.addEventListener;
            window.addEventListener = function (type, callback, options) {
                if (options?.signal && ['scroll', 'resize', 'hashchange', 'load'].includes(type)) {
                    const record = {type};
                    window.__regressionListeners.add(record);
                    options.signal.addEventListener('abort', () => window.__regressionListeners.delete(record), {once: true});
                }
                return originalAdd.call(this, type, callback, options);
            };
            const OriginalObserver = window.ResizeObserver;
            window.ResizeObserver = class extends OriginalObserver {
                constructor(callback) { super(callback); window.__regressionObservers.add(this); }
                observe(target, options) { this.target = target; super.observe(target, options); }
                disconnect() { window.__regressionObservers.delete(this); super.disconnect(); }
            };
            originalAdd.call(window, 'esdoc:navigation', event => {
                window.__lastRegressionNavigation = event.detail.url;
            });
        });
        await page.goto(origin + '/docs/variables');
        await page.waitForFunction(() => typeof window.__esdocDocsCleanup === 'function');
        await page.evaluate(() => window.__regressionDocument = 'retained');
        for (const slug of ['screens', 'videos', 'variables', 'screens', 'videos']) {
            await softNavigate(page, '/docs/' + slug);
            const live = await page.evaluate(() => ({
                document: window.__regressionDocument,
                listeners: window.__regressionListeners.size,
                observers: [...window.__regressionObservers].filter(observer => observer.target?.closest('#sidebar-contents')).length,
            }));
            assert.deepEqual(live, {document: 'retained', listeners: 4, observers: 1});
        }

        // Two real Back actions while the first HTTP request is held open.
        let heldRoute, announceRequest;
        const started = new Promise(resolve => { announceRequest = resolve; });
        await page.route('**/docs/screens', route => { heldRoute = route; announceRequest(); });
        await page.evaluate(() => history.back());
        await started;
        await page.evaluate(() => history.back());
        await page.waitForURL(origin + '/docs/variables');
        await page.waitForFunction(() => document.querySelector('#sidebar-all a[aria-current="page"]')
            ?.getAttribute('href') === '/docs/variables');
        await heldRoute.abort().catch(() => {});
        await page.unroute('**/docs/screens');
        assert.equal(new URL(page.url()).pathname, '/docs/variables');
        assert.equal(await page.evaluate(() => window.__regressionDocument), 'retained');

        await softNavigate(page, '/materials');
        assert.deepEqual(await page.evaluate(() => ({
            listeners: window.__regressionListeners.size,
            observers: [...window.__regressionObservers].filter(observer => observer.target?.closest('#sidebar-contents')).length,
        })), {listeners: 0, observers: 0});

        // Pending search results must remain hidden after clearing the field.
        let searchRoute, announceSearch;
        const searchStarted = new Promise(resolve => { announceSearch = resolve; });
        await page.route('**/api/search?**', route => { searchRoute = route; announceSearch(); });
        await page.locator('#site-search-input').fill('Луна');
        await searchStarted;
        await page.locator('#site-search-input').fill('');
        await searchRoute.fulfill({json: [{label: 'Луна', url: '/stale'}]});
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.equal(await page.locator('#site-search-results').isHidden(), true);
        assert.equal(await page.locator('#site-search-input').getAttribute('aria-expanded'), 'false');
        assert.deepEqual(errors, []);
        await page.close();
        console.log('Native browser checks passed: article cleanup, overlapping Back actions and dismissed search.');

        // A small valid WAV exercises real Audio playback with both stores denied.
        const samples = 8000 * 8, wav = Buffer.alloc(44 + samples * 2);
        wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
        wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
        wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32);
        wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
        for (const failure of ['getter', 'methods']) {
            const playerPage = await browser.newPage();
            const playerErrors = [];
            playerPage.on('pageerror', error => playerErrors.push(error.message));
            await playerPage.addInitScript(failure => {
                for (const name of ['localStorage', 'sessionStorage']) Object.defineProperty(window, name, {
                    configurable: true,
                    get() {
                        if (failure === 'getter') throw new DOMException('Storage denied', 'SecurityError');
                        return {getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); },
                            removeItem() { throw new Error('denied'); }};
                    },
                });
            }, failure);
            await playerPage.route('**/regression.wav', route => route.fulfill({body: wav, contentType: 'audio/wav'}));
            await playerPage.goto(origin + '/');
            await playerPage.evaluate(() => {
                const button = document.createElement('button');
                button.id = 'regression-play'; button.hidden = true;
                button.dataset.playSrc = '/regression.wav'; button.dataset.playName = 'Regression audio';
                button.textContent = 'Play'; document.body.appendChild(button);
                window.dispatchEvent(new CustomEvent('esdoc:navigation'));
            });
            await playerPage.locator('#regression-play').click();
            await playerPage.waitForFunction(() => document.querySelector('#regression-play').getAttribute('aria-pressed') === 'true');
            assert.equal(await playerPage.locator('.res-nowplaying').isVisible(), true);
            await playerPage.locator('.res-volume input').evaluate(input => {
                input.value = '0.35'; input.dispatchEvent(new Event('input', {bubbles: true}));
            });
            assert.equal(await playerPage.locator('.res-volume input').inputValue(), '0.35');
            await playerPage.locator('.res-nowplaying-pause').click();
            await playerPage.waitForFunction(() => document.querySelector('#regression-play').getAttribute('aria-pressed') === 'false');
            assert.equal(await playerPage.locator('#regression-play').getAttribute('aria-pressed'), 'false');
            assert.deepEqual(playerErrors, []);
            await playerPage.close();
        }
        console.log('Native audio checks passed with storage getters and methods denied.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
