(function (root) {
    const safePath = value => {
        const path = value.replaceAll('\\', '/');
        if (!path || path.startsWith('/') || /[:\x00-\x1f]/.test(path)
            || path.split('/').some(part => !part || part === '.' || part === '..') || path.length > 4096) {
            throw new Error('Недопустимый путь файла.');
        }
        return path;
    };
    const accepts = (path, mode) => (mode !== 'unrpa' && /\.rpym?c$/i.test(path))
        || (mode !== 'unrpyc' && /\.rpa$/i.test(path));
    const walkEntry = async (entry, parent, add) => {
        const path = safePath(parent + entry.name);
        if (entry.isFile) {
            const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
            add({ file, path });
        } else if (entry.isDirectory) {
            const reader = entry.createReader();
            while (true) {
                const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
                if (!batch.length) break;
                for (const child of batch) await walkEntry(child, path + '/', add);
            }
        }
    };
    const size = bytes => {
        if (bytes < 1024) return `${bytes} Б`;
        const unit = bytes < 1024 ** 2 ? 1 : bytes < 1024 ** 3 ? 2 : 3;
        return `${(bytes / 1024 ** unit).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ${['', 'КиБ', 'МиБ', 'ГиБ'][unit]}`;
    };
    root.ESDocTools = { safePath, accepts, walkEntry, size };
})(globalThis);
