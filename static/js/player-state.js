/* Small storage adapter shared by the classic browser player and its tests.
   It intentionally avoids ES modules: the player must also start in Firefox
   configurations that disable or delay module scripts. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.ESDocPlayerState = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    const PLAYER_STATE_KEY = 'es-doc-player-v2';

    function normalizePlayerState(value) {
        if (!value || typeof value.src !== 'string' || !value.src.trim()) return null;

        const time = Number(value.time);
        if (!Number.isFinite(time) || time < 0) return null;

        return {
            src: value.src,
            name: typeof value.name === 'string' ? value.name : '',
            time,
            playing: Boolean(value.playing),
            repeat: Boolean(value.repeat),
        };
    }

    function readPlayerState(storage) {
        try {
            const raw = storage && storage.getItem(PLAYER_STATE_KEY);
            return raw ? normalizePlayerState(JSON.parse(raw)) : null;
        } catch (error) {
            return null;
        }
    }

    function writePlayerState(storage, value) {
        const state = normalizePlayerState(value);
        if (!state) return null;

        try {
            if (storage) storage.setItem(PLAYER_STATE_KEY, JSON.stringify(state));
        } catch (error) {
            return null;
        }

        return state;
    }

    function clearPlayerState(storage) {
        try {
            if (storage) storage.removeItem(PLAYER_STATE_KEY);
        } catch (error) {
            // Storage can be unavailable in a privacy-restricted context.
        }
    }

    function shouldClearOnPageHide(event) {
        return !(event && event.persisted);
    }

    return {
        PLAYER_STATE_KEY,
        normalizePlayerState,
        readPlayerState,
        writePlayerState,
        clearPlayerState,
        shouldClearOnPageHide,
    };
});
