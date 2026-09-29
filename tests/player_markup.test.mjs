import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const player = await readFile(new URL('../static/js/player.js', import.meta.url), 'utf8');

test('now-playing track title is not marked up as inline code', () => {
    assert.ok(player.includes('<span class="res-nowplaying-name"></span>'), 'track title should use a plain text element');
    assert.ok(!player.includes('<code class="res-nowplaying-name"></code>'), 'track title must not inherit inline-code styling');
});
