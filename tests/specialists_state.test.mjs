import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const script = readFileSync(new URL('../static/js/specialists.js', import.meta.url), 'utf8');

test('an empty category preserves view and filters for the return to a populated category', () => {
    const replacements = [];
    const root = {
        dataset: { category: 'composers' },
        querySelector: () => null,
        querySelectorAll: () => [],
    };
    vm.runInNewContext(script, {
        document: { querySelector: () => root },
        location: { pathname: '/specialists', search: '?category=composers&view=table&status=open' },
        history: { replaceState: (...args) => replacements.push(args[2]) },
        URLSearchParams,
        Intl,
    });
    assert.deepEqual(replacements, [], 'empty categories must keep the incoming URL state');
});

function directory(query = '', hash = '') {
    const replacements = [];
    const items = [
        { dataset: { name: 'Alpha closed', status: 'closed' } },
        { dataset: { name: 'Zebra open', status: 'open' } },
        { dataset: { name: 'Alpha unknown', status: 'unknown' } },
        { dataset: { name: 'Alpha open', status: 'open' } },
    ];
    const container = {
        querySelectorAll: () => items.slice(),
        appendChild: el => { items.splice(items.indexOf(el), 1); items.push(el); },
    };
    const gallery = { querySelector: () => container, querySelectorAll: () => items };
    let sortValue = 'open';
    const sort = {
        get value() { return sortValue; },
        set value(v) { sortValue = ['open', 'az', 'za'].includes(v) ? v : ''; },
        addEventListener: () => {},
    };
    let previewRemoved = false;
    let monogramVisible = false;
    let previewLinkRemoved = false;
    let skeletonCleared = false;
    const link = { remove: () => { previewLinkRemoved = true; } };
    const surface = {
        classList: {
            add: value => { monogramVisible = value === 'artist-preview--none'; },
            remove: value => { skeletonCleared = value === 'media-skeleton'; },
        },
        querySelector: () => link,
        remove: () => { previewRemoved = true; },
    };
    const img = { complete: true, naturalWidth: 0, closest: selector => selector === '.artist-preview' ? surface : link, remove: () => {}, addEventListener: () => {} };
    let brokenAvatarRemoved = false;
    let avatarSkeletonCleared = false;
    const avatarFrame = { classList: { remove: value => { avatarSkeletonCleared = value === 'media-skeleton'; } } };
    const avatarImg = {
        complete: true, naturalWidth: 0,
        closest: () => avatarFrame,
        remove: () => { brokenAvatarRemoved = true; },
        addEventListener: () => {},
    };
    const root = {
        dataset: { category: '' }, isConnected: true,
        querySelector: key => ({ '.artists-controls': {}, '#artist-sort': sort, '#view-gallery': gallery })[key] || null,
        querySelectorAll: key => key === '[data-artist]' ? items : key === '.artist-preview-img' ? [img] : key === '.artist-avatar-img' ? [avatarImg] : [],
    };
    vm.runInNewContext(script, {
        document: { querySelector: () => root },
        location: { pathname: '/specialists', search: query, hash },
        history: { replaceState: (...args) => replacements.push(args[2]) },
        URLSearchParams, Intl,
    });
    return { names: items.map(item => item.dataset.name), replacements, previewRemoved, monogramVisible, previewLinkRemoved, skeletonCleared, brokenAvatarRemoved, avatarSkeletonCleared };
}

test('directory initialization preserves a search result profile anchor', () => {
    const result = directory('?category=coders', '#specialist-luna');
    assert.ok(result.replacements.every(url => url.endsWith('#specialist-luna')));
});

test('default sort puts open commissions first and sorts names within each status', () => {
    const result = directory();
    assert.deepEqual(result.names, ['Alpha open', 'Zebra open', 'Alpha unknown', 'Alpha closed']);
    assert.equal(result.replacements.at(-1), '/specialists');
});

test('an explicit alphabetic sort survives URL synchronization', () => {
    const result = directory('?sort=az');
    assert.deepEqual(result.names, ['Alpha closed', 'Alpha open', 'Alpha unknown', 'Zebra open']);
    assert.equal(result.replacements.at(-1), '/specialists?sort=az');
});

test('an invalid sort falls back to open commissions', () => {
    const result = directory('?sort=invalid');
    assert.equal(result.names[0], 'Alpha open');
    assert.equal(result.replacements.at(-1), '/specialists');
});

test('a failed preview retains its frame, reveals the initial and removes the broken lightbox link', () => {
    const result = directory();
    assert.equal(result.previewRemoved, false);
    assert.equal(result.monogramVisible, true);
    assert.equal(result.previewLinkRemoved, true);
    assert.equal(result.skeletonCleared, true);
});

test('a failed avatar reveals the existing initial and clears the loading skeleton', () => {
    const result = directory();
    assert.equal(result.brokenAvatarRemoved, true);
    assert.equal(result.avatarSkeletonCleared, true);
});
