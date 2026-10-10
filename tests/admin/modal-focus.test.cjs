const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');

// Execute the actual component's effects across parent renders, with a DOM
// focus model. A new inline close callback must never reset input focus.
function harness() {
  let index = 0, slots = [], pending = [], frameId = 0, frames = new Map();
  let focusMoves = 0, listenerAdds = 0, listenerRemoves = 0;
  const listeners = new Map();
  class Element {
    constructor(name) { this.name = name; this.isConnected = true; }
    focus() { doc.activeElement = this; focusMoves++; }
    hasAttribute() { return false; }
  }
  const opener = new Element('opener'), first = new Element('close');
  const fields = ['name', 'postcode', 'address', 'notes'].map(name => new Element(name));
  const dialog = new Element('dialog');
  dialog.contains = el => [dialog, first, ...fields].includes(el);
  dialog.querySelector = () => first;
  dialog.querySelectorAll = () => [first, ...fields];
  const doc = { documentElement: { style: { overflow: 'auto' }, clientWidth: 1200 }, body: { style: { overflow: '', paddingRight: '' } }, activeElement: opener };
  const win = { innerWidth: 1215, requestAnimationFrame: fn => { frames.set(++frameId, fn); return frameId; }, cancelAnimationFrame: id => frames.delete(id), addEventListener: (name, fn) => { listeners.set(name, fn); listenerAdds++; }, removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name); listenerRemoves++; } };
  const hooks = { ...React,
    useId: () => { index++; return 'id'; },
    useRef: value => { const i = index++; return slots[i] ??= { current: value }; },
    useEffect: (fn, deps) => { const i = index++, old = slots[i]; if (!old || deps.some((v,j) => !Object.is(v, old.deps[j]))) pending.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../../src/components/common/EnterpriseModal.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require','module','exports','window','document','HTMLElement', code)(name => name === 'react' ? hooks : name === 'lucide-react' ? { X: () => null } : require(name), module, module.exports, win, doc, Element);
  function render(props = {}) {
    index = 0;
    const tree = module.exports.EnterpriseModal({ title: 'Add Venue', onClose: () => {}, ...props });
    slots[2].current = dialog;
    const effects = pending; pending = []; effects.forEach(fn => fn());
    return tree;
  }
  return { render, doc, win, fields, first, opener, frames, listeners,
    flush: () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); },
    unmount: () => slots.forEach(slot => slot?.cleanup?.()),
    counts: () => ({ focusMoves, listenerAdds, listenerRemoves }),
  };
}

test('typing in every venue field retains focus across parent callback changes', () => {
  const h = harness(); h.render(); h.flush();
  for (const field of h.fields) {
    field.focus(); const before = h.counts().focusMoves;
    for (const character of 'Birchmere Park SE28 8GB') { field.value = (field.value || '') + character; h.render({ onClose: () => {} }); h.flush(); assert.equal(h.doc.activeElement, field); }
    assert.equal(h.counts().focusMoves, before);
  }
  assert.equal(h.counts().listenerAdds, 1);
  assert.equal(h.doc.body.style.overflow, 'hidden');
  h.unmount(); assert.equal(h.doc.activeElement, h.opener);
  assert.equal(h.doc.body.style.overflow, '');
  assert.equal(h.doc.documentElement.style.overflow, 'auto');
  assert.equal(h.doc.body.style.paddingRight, '');
  assert.equal(h.counts().listenerRemoves, 1);
});

test('initial autofocus or an early mobile tap is preserved', () => {
  const h = harness(); h.render(); h.fields[0].focus(); h.flush();
  assert.equal(h.doc.activeElement, h.fields[0]); h.unmount();
});

test('Escape uses latest callback and saving state without resetting focus', () => {
  const h = harness(); let oldCalls = 0, calls = 0;
  h.render({ onClose: () => oldCalls++ }); h.flush(); h.fields[2].focus();
  const event = { key: 'Escape', preventDefault() {} };
  h.render({ closeDisabled: true, onClose: () => calls++ }); h.flush();
  h.listeners.get('keydown')(event); assert.equal(calls, 0);
  assert.equal(h.doc.activeElement, h.fields[2]);
  h.render({ closeDisabled: false, onClose: () => calls++ });
  h.listeners.get('keydown')(event); assert.equal(calls, 1); assert.equal(oldCalls, 0);
  h.unmount();
});

test('Tab remains trapped and pending focus is cancelled on close', () => {
  const h = harness(); h.render(); h.flush();
  const key = { key: 'Tab', shiftKey: true, preventDefault() {} };
  h.first.focus(); h.listeners.get('keydown')(key); assert.equal(h.doc.activeElement, h.fields.at(-1));
  key.shiftKey = false; h.listeners.get('keydown')(key); assert.equal(h.doc.activeElement, h.first);
  h.unmount();
  const early = harness(); early.render(); assert.equal(early.frames.size, 1); early.unmount(); assert.equal(early.frames.size, 0); early.flush(); assert.equal(early.doc.activeElement, early.opener);
});


test('close button and backdrop respect current saving state and backdrop setting', () => {
  const h = harness(); let calls = 0;
  let tree = h.render({ onClose: () => calls++ }); h.flush();
  const backdrop = tree.props;
  const target = {};
  backdrop.onMouseDown({ target, currentTarget: target }); assert.equal(calls, 1);
  backdrop.onMouseDown({ target: {}, currentTarget: target }); assert.equal(calls, 1);
  const dialog = tree.props.children;
  const header = dialog.props.children[0];
  const closeButton = header.props.children[1];
  closeButton.props.onClick(); assert.equal(calls, 2);
  tree = h.render({ closeDisabled: true, onClose: () => calls++ });
  tree.props.onMouseDown({ target, currentTarget: target }); assert.equal(calls, 2);
  assert.equal(tree.props.children.props.children[0].props.children[1].props.disabled, true);
  tree = h.render({ closeOnBackdrop: false, onClose: () => calls++ });
  tree.props.onMouseDown({ target, currentTarget: target }); assert.equal(calls, 2);
  h.unmount();
});

test('reopening has one fresh lifecycle and restores scrolling after each close', () => {
  for (let i = 0; i < 3; i++) {
    const h = harness(); h.render(); h.flush(); h.fields[1].focus();
    h.render({ onClose: () => {} }); h.flush();
    assert.equal(h.doc.activeElement, h.fields[1]);
    assert.equal(h.counts().listenerAdds, 1);
    h.unmount(); assert.equal(h.listeners.size, 0);
    assert.equal(h.doc.body.style.overflow, '');
    assert.equal(h.doc.documentElement.style.overflow, 'auto');
  }
});
