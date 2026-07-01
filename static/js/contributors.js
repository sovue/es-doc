(function () {
    var box = document.getElementById('contributors');
    var status = document.getElementById('contributors-status');
    if (!box || !status) return;

    status.textContent = 'Загружаем список с GitHub…';

    fetch('/api/contributors')
        .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
        .then(function (html) {
            box.innerHTML = html;
            box.dataset.state = 'ready';
            status.textContent = '';
        })
        .catch(function () {
            box.dataset.state = 'error';
            var link = document.createElement('a');
            link.href = 'https://github.com/sovue/es-doc/graphs/contributors';
            link.textContent = 'открыть список на GitHub';
            status.textContent = 'Не удалось загрузить список. Можно ';
            status.appendChild(link);
            status.appendChild(document.createTextNode('.'));
        });
})();
