import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const window = {};
for (const file of ['characters-catalog.js', 'characters-core.js']) {
    const path = new URL('../static/js/' + file, import.meta.url);
    if (existsSync(path)) vm.runInNewContext(readFileSync(path, 'utf8'), {window});
}
const core = () => { assert.ok(window.ESDocCharacters); return window.ESDocCharacters; };
const state = () => ({variable: 'e', name: 'Семён', nameMode: 'text', sample: 'Привет!', values: {}});

test('simple creator exports empty names as narration and restricts restored properties', () => {
    const s = state(); s.name = '';
    assert.match(core().compile(s).code, /Character\(None\)/);
    s.values = {who_color:{mode:'text',value:'#abc'}, what_size:{mode:'number',value:'42'}};
    const restored = core().simpleState(s);
    assert.equal(restored.values.who_color.value, '#abc');
    assert.equal(restored.values.what_size, undefined);
    assert.equal(restored.nameMode, 'text');
    assert.equal(restored.values.dynamic.value, 'False', 'Normal names must not inherit DynamicCharacter evaluation');
});

test('simple properties cover both name and dialogue without engine settings', () => {
    const keys = core().fields.map(field => field.key);
    for (const prefix of ['who','what']) for (const property of ['color','prefix','suffix','font','bold','italic','strikethrough','underline']) {
        assert(keys.includes(prefix + '_' + property));
    }
    assert.equal(keys.length, 18);
});

test('unset properties inherit; explicit False, zero and None survive export', () => {
    const s = state();
    s.values = {what_bold: {mode: 'boolean', value: 'False'}, what_kerning: {mode: 'number', value: '0'}, callback: {mode: 'expression', value: 'None'}};
    const result = core().compile(s);
    assert.deepEqual(Array.from(result.errors), []);
    assert.match(result.code, /what_bold=False/);
    assert.match(result.code, /what_kerning=0/);
    assert.match(result.code, /callback=None/);
    assert.doesNotMatch(result.code, /who_color/);
});

test('strings escape quotes, backslashes and newlines and keep RenPy tags', () => {
    const s = state(); s.name = '"Имя"\\\n{b}[player]';
    assert.ok(core().compile(s).code.includes('"\\"Имя\\"\\\\\\n{b}[player]"'));
});

test('narration, inherited name and callable name are distinct', () => {
    const s = state(); s.nameMode = 'none';
    assert.match(core().compile(s).code, /Character\(None\)/);
    s.nameMode = 'inherit';
    assert.match(core().compile(s).code, /Character\(\)/);
    s.nameMode = 'expression'; s.name = 'get_name';
    assert.match(core().compile(s).code, /Character\(get_name\)/);
});

test('Python values preserve tuples, calls and numeric int/float distinction without execution', () => {
    const c = core();
    assert.equal(c.serialize({mode:'expression',value:'[(2, "#0008", 0, 1)]'}), '[(2, "#0008", 0, 1)]');
    assert.equal(c.serialize({mode:'expression',value:'my_callback'}), 'my_callback');
    assert.equal(c.serialize({mode:'number',value:'1.0'}), '1.0');
    assert.throws(() => c.serialize({mode:'number',value:'NaN'}));
    assert.throws(() => c.serialize({mode:'expression',value:'Frame("x.png"'}));
    assert.throws(() => c.serialize({mode:'expression',value:'True); hacked() #'}));
});

test('invalid identifiers and keyword injections block the entire export', () => {
    const s = state(); s.variable = 'class';
    assert.ok(core().compile(s).errors.length);
    assert.equal(core().compile(s).code, '');
    s.variable = 'семён';
    assert.equal(core().compile(s).errors.length, 0);
    s.values['what_color); bad()'] = {mode:'text',value:'#fff'};
    assert.equal(core().compile(s).code, '');
    s.values = {name: {mode:'text',value:'Duplicate'}};
    assert.equal(core().compile(s).code, '');
});

test('project import rejects corrupt or executable structure and preserves exact configured values', () => {
    const s = state(); s.values.what_color = {mode:'text', value:'#abc8'};
    const c = core();
    const encoded = c.project(s);
    assert.equal(c.compile(c.importProject(encoded)).code, c.compile(s).code);
    for (const bad of ['{}', '{"version":99}', '{"version":1,"state":{"values":{"__proto__":{}}}}']) {
        assert.throws(() => c.importProject(bad));
    }
    assert.throws(() => c.importProject('null'), /Неподдерживаемый формат проекта/);
});

test('preview parser handles outline tuples and rejects Python calls without executing them', () => {
    const c = core();
    assert.equal(c.literal('[(2, "#0008", 0, 1)]').ok, true);
    assert.equal(c.literal('True').value, true);
    assert.equal(c.literal('None').value, null);
    assert.equal(c.literal('callback()').ok, false);
    assert.equal(c.literal('1 + 2').ok, false);
    assert.equal(c.literal('['.repeat(40) + ']'.repeat(40)).ok, false);
});
