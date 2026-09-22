import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../static/js/player-state.js', import.meta.url), 'utf8');
const context = { window: {} };
vm.runInNewContext(source, context);
const {
    PLAYER_STATE_KEY,
    readPlayerState,
    shouldClearOnPageHide,
    writePlayerState,
} = context.window.ESDocPlayerState;

function storage() {
    const values = new Map();
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: key => values.delete(key),
    };
}

test('stores and restores the active track state for a page transition', () => {
    const session = storage();
    const state = {
        src: '/resource/community/music/progress.ogg',
        name: '140 kilograms of sex — Progress',
        time: 18.42,
        playing: true,
        repeat: false,
    };

    writePlayerState(session, state);

    assert.deepEqual(JSON.parse(JSON.stringify(readPlayerState(session))), state);
    assert.match(session.getItem(PLAYER_STATE_KEY), /progress\.ogg/);
});

test('does not restore malformed or unusable state', () => {
    const session = storage();
    session.setItem(PLAYER_STATE_KEY, JSON.stringify({ src: '', time: -1 }));

    assert.equal(readPlayerState(session), null);
});

test('preserves repeat as an explicit boolean', () => {
    const session = storage();

    writePlayerState(session, {
        src: '/track.ogg',
        name: 'Track',
        time: 0,
        playing: false,
        repeat: true,
    });

    assert.equal(readPlayerState(session).repeat, true);
});

test('clears playback state on reload but keeps it for bfcache restores', () => {
    assert.equal(shouldClearOnPageHide({ persisted: false }), true);
    assert.equal(shouldClearOnPageHide({ persisted: true }), false);
});
