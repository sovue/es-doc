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
            // Список общий для обоих репозиториев, поэтому и в запасном варианте
            // ведём на оба — иначе половина людей просто пропадёт.
            var repos = ['es-doc', 'es-doc-assets'];
            status.textContent = 'Не удалось загрузить список. Можно открыть его на GitHub: ';
            repos.forEach(function (repo, i) {
                var link = document.createElement('a');
                link.href = 'https://github.com/sovue/' + repo + '/graphs/contributors';
                link.textContent = repo;
                if (i) status.appendChild(document.createTextNode(', '));
                status.appendChild(link);
            });
            status.appendChild(document.createTextNode('.'));
        });
})();
