import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../static/js/warpers.js', import.meta.url), 'utf8');
const writeBody = source.match(/const write = \(\) => \{([\s\S]*?)\r?\n    \};\r?\n\r?\n    const validate/)?.[1];

function output(custom = true, seconds = 1.5, valid = true) {
    const node = () => ({
        textContent: '', hidden: false, disabled: false,
        setAttribute() {}, closest() { return this; }, classList: { toggle() {} },
        append(...parts) { this.textContent += parts.join(''); },
    });
    const snippet = node();
    const exampleSnippets = Object.fromEntries(['move', 'scale', 'fade'].map(key => [key, node()]));
    const context = {
        snippet, exampleSnippets, codeOutput: node(), codeEmpty: node(), codeFile: node(),
        examplesOutput: node(), examplesEmpty: node(),
        nameInput: node(), nameNote: node(), seconds: node(), timeNote: node(),
        playButton: node(), playButtons: [node(), node()], scrub: node(),
        valid, warperName: () => custom ? 'test_curve' : 'easeout_cubic',
        isCustom: () => custom, duration: () => seconds,
        formulaInput: { value: 't ** 2' }, keywords: new Set(), Warpers: {},
        FORMULA_FUNCS: {}, FORMULA_CONSTS: {},
        token: (_className, text) => text, indent: (times = 1) => '    '.repeat(times),
        formulaTokens: text => [text],
    };
    assert.ok(writeBody, 'output generator exists');
    vm.runInNewContext(`(() => {${writeBody}\n})()`, context);
    return context;
}

test('custom registration can be copied without demonstration transforms', () => {
    const result = output();
    assert.match(result.snippet.textContent, /def test_curve\(t\):/);
    assert.doesNotMatch(result.snippet.textContent, /transform warper_/);
    assert.match(result.exampleSnippets.move.textContent, /test_curve 1\.5 xalign 1\.0/);
    assert.match(result.exampleSnippets.scale.textContent, /zoom 0\.5/);
    assert.match(result.exampleSnippets.fade.textContent, /alpha 0\.0/);
});

test('invalid duration blocks ATL examples but does not block a valid definition', () => {
    const result = output(true, NaN);
    assert.equal(result.codeOutput.hidden, false);
    assert.match(result.snippet.textContent, /return t \*\* 2/);
    assert.equal(result.examplesOutput.hidden, true);
    assert.ok(result.playButtons.every(button => button.disabled));
});

test('built-in selection needs no registration but still generates examples', () => {
    const result = output(false);
    assert.equal(result.codeOutput.hidden, true);
    assert.equal(result.examplesOutput.hidden, false);
    assert.match(result.exampleSnippets.move.textContent, /easeout_cubic 1\.5/);
});
