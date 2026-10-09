import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../static/js/warpers.js', import.meta.url), 'utf8');
const writeBody = source.match(/const write = \(\) => \{([\s\S]*?)\r?\n    \};\r?\n\r?\n    const validate/)?.[1];

function output(custom = true, seconds = 1.5, valid = true, property = 'xalign') {
    const node = () => ({
        textContent: '', hidden: false, disabled: false,
        setAttribute() {}, closest() { return this; }, classList: { toggle() {} },
        append(...parts) { this.textContent += parts.join(''); },
    });
    const snippet = node();
    const context = {
        snippet, codeOutput: node(), codeEmpty: node(), codeFile: node(),
        nameInput: node(), nameNote: node(), seconds: node(), timeNote: node(),
        playButton: node(), playButtons: [node(), node()], scrub: node(),
        valid, property: {value: property}, warperName: () => custom ? 'test_curve' : 'easeout_cubic',
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

test('one code block includes custom registration and the selected ATL effect', () => {
    const result = output();
    assert.match(result.snippet.textContent, /def test_curve\(t\):/);
    assert.match(result.snippet.textContent, /test_curve 1\.5 xalign 1\.0/);
    assert.match(output(true, 1.5, true, 'zoom').snippet.textContent, /zoom 0\.5/);
    assert.match(output(true, 1.5, true, 'alpha').snippet.textContent, /alpha 0\.0/);
});

test('invalid duration blocks ATL but does not block a valid custom definition', () => {
    const result = output(true, NaN);
    assert.equal(result.codeOutput.hidden, false);
    assert.match(result.snippet.textContent, /return t \*\* 2/);
    assert.doesNotMatch(result.snippet.textContent, /transform warper_/);
    assert.ok(result.playButtons.every(button => button.disabled));
});

test('built-in selection generates ATL without registration', () => {
    const result = output(false);
    assert.equal(result.codeOutput.hidden, false);
    assert.match(result.snippet.textContent, /easeout_cubic 1\.5/);
    assert.doesNotMatch(result.snippet.textContent, /python early/);
});
