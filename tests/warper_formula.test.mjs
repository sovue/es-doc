import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../static/js/warpers.js', import.meta.url), 'utf8');
const parser = source.slice(source.indexOf('const FORMULA_FUNCS'), source.indexOf('/* ── Preview canvas'));
const parse = vm.runInNewContext(`${parser}\nparseFormula`, { Math, isFinite });

test('evaluates Python powers, conditional expressions and chained comparisons', () => {
    assert.equal(parse('-t ** 2')(.5), -.25);
    assert.equal(parse('t if 0.2 < t < 0.8 else 1')(.5), .5);
    assert.equal(parse('t if 0.2 < t < 0.8 else 1')(.9), 1);
    assert.equal(parse('sin(t * pi / 2)')(1), 1);
    assert.equal(parse('t < 0.5')(.2), 1);
    assert.equal(parse('not t')(0), 1);
    assert.equal(parse('.5e-2 * t')(1), .005);
});

test('rejects undefined values between the old twenty validation points', () => {
    assert.throws(() => parse('1 / (t - 0.125)'), /не определено/);
});

test('never accepts pasted code or browser globals', () => {
    for (const value of ['window', 'alert(t)', 't.constructor', 't; 1', 'sqrt(-1)', 'log(t)', 'log(1+t, 0)']) {
        assert.throws(() => parse(value), value);
    }
});

test('matches Python rounding at halfway values', () => {
    const round = parse('round(t * 5)');
    assert.equal(round(.1), 0);
    assert.equal(round(.3), 2);
    assert.equal(round(.5), 2);
    assert.equal(parse('round(-t * 5)')(.1), 0);
    assert.equal(parse('log(1 + t, 2)')(1), 1);
});

test('rejects unsupported call signatures instead of silently changing Python meaning', () => {
    for (const value of ['sin(t, 2)', 'round(t, 2)', 'pow(t, 2, 3)', 'min(t)', 'sqrt()']) {
        assert.throws(() => parse(value), value);
    }
});
