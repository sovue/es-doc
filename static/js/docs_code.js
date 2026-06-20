let whitespace = '∙';

document.querySelectorAll('span.w').forEach(el => {
    el.textContent = whitespace.repeat(el.textContent.length);
});

document.addEventListener('copy', e => {
    const sel = window.getSelection();

    if (!sel.rangeCount) return;

    const node = sel.getRangeAt(0).commonAncestorContainer;

    const pre = node.nodeType === 1
        ? node.closest('pre')
        : node.parentElement?.closest('pre');

    if (!pre) return;

    e.preventDefault();

    const text = sel.toString().replace(new RegExp(whitespace, 'g'), ' ');

    e.clipboardData.setData('text/plain', text);
});