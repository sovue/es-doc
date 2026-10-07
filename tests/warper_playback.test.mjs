import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../static/js/warpers.js', import.meta.url), 'utf8');
const body = source.match(/class WarperPlayback \{[\s\S]*?\r?\n\}\r?\n/)?.[0];
const create = () => {
    assert.ok(body, 'Playback clock exists');
    return new (vm.runInNewContext(`${body}; WarperPlayback`))();
};
test('pause and resume retain elapsed progress', () => {
    const clock = create();
    clock.resume(100);
    assert.equal(clock.tick(600, 1000, false), .5);
    clock.pause();
    clock.resume(5000);
    assert.equal(clock.tick(5250, 1000, false), .75);
});
test('repeat holds the endpoint and starts forward again', () => {
    const clock = create();
    clock.resume(0);
    assert.equal(clock.tick(1200, 1000, true), 1);
    assert.equal(clock.tick(1500, 1000, true), .05);
    assert.equal(clock.running, true);
});
test('seek and completion stop playback', () => {
    const clock = create();
    clock.seek(.4, 1000);
    clock.resume(100);
    assert.equal(clock.tick(700, 1000, false), 1);
    assert.equal(clock.running, false);
    clock.seek(0, 1000);
    assert.equal(clock.progress, 0);
});
test('turning repeat off completes the current cycle without a jump', () => {
    const clock = create();
    clock.resume(0);
    assert.equal(clock.tick(1600, 1000, true), .15);
    clock.rebase(1600, 1000);
    assert.equal(clock.tick(1616, 1000, false), .166);
    assert.equal(clock.running, true);
});
