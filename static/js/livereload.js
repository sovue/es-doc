/* Dev-server only (see DEBUG in head.html): reloads the page when
   /dev/livereload says a watched file changed, and also when the connection
   itself drops and comes back — which is what happens when a Python file
   edit makes uvicorn's --reload restart the whole server process. */
(function () {
    var connectedBefore = false;

    var source = new EventSource('/dev/livereload');

    source.onopen = function () {
        if (connectedBefore) location.reload();
        connectedBefore = true;
    };

    source.onmessage = function (event) {
        if (event.data === 'reload') location.reload();
    };
})();
