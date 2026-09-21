# Полуавтоматический deploy ES Doc

Этот документ описывает production-деплой ES Doc через GitHub Actions, GHCR и
Docker Compose. Деплой запускается вручную из GitHub Actions, а после запуска
проходит через защищённое окружение `production` и ручное approval.

Связанные файлы:

- [Deploy workflow](../.github/workflows/deploy.yml)
- [CI workflow](../.github/workflows/ci.yml)
- [Production Compose](../compose.production.yaml)
- [Deployment script](../deploy/deploy.sh)
- [GHCR cleanup script](../deploy/prune-ghcr.sh)
- [Production environment template](../.env.production.example)

## Как проходит обновление

```text
Run workflow
    ↓
Resolve application and assets SHAs
    ↓
Build Docker image
    ↓
Push image to ghcr.io/sovue/es-doc
    ↓
Approval in production environment
    ↓
SSH to server
    ↓
docker compose pull + up --wait
    ↓
health check web and nginx
    ↓
Save successful release and prune old images
```

При ошибке запуска серверный скрипт возвращает предыдущий успешный image.
Очистка GHCR выполняется только после успешного deploy.

## Что требуется заранее

Нужны:

- GitHub-репозиторий `sovue/es-doc`;
- production-сервер с Docker Engine и Docker Compose Plugin;
- DNS-имя сайта, направленное на сервер;
- SSH-пользователь для deploy;
- доступ этого пользователя к Docker без `sudo`;
- GitHub environment с именем `production`.

Проверка Docker на сервере:

```sh
docker ps
docker compose version
```

Если `docker ps` требует `sudo`, добавьте пользователя деплоя в группу Docker
и заново войдите в SSH-сессию:

```sh
sudo usermod -aG docker esdeploy
```

## Подготовка сервера

В примерах используется пользователь `esdeploy` и каталог `/opt/es-doc`.

```sh
sudo adduser esdeploy
sudo usermod -aG docker esdeploy
sudo mkdir -p /opt/es-doc/deploy
sudo chown -R esdeploy:esdeploy /opt/es-doc
```

Создайте файл `/opt/es-doc/.env.production`:

```dotenv
ES_DOC_IMAGE=ghcr.io/sovue/es-doc
ES_DOC_TAG=sha-0000000000000000000000000000000000000000
ES_DOC_HTTP_PORT=8005
ES_DOC_SITE_URL=https://es-doc.rfld.ru
DEPLOY_PATH=/opt/es-doc
```

Пояснения:

- `ES_DOC_IMAGE` — имя image в GHCR;
- `ES_DOC_TAG` — начальное значение, оно будет переопределено deployment script;
- `ES_DOC_HTTP_PORT` — внешний порт nginx на сервере;
- `ES_DOC_SITE_URL` — публичный URL сайта;
- `DEPLOY_PATH` — абсолютный путь, одинаковый в `.env.production` и GitHub Secret.

Ограничьте доступ к файлу:

```sh
chmod 600 /opt/es-doc/.env.production
```

Файл `.env.production` не хранится в Git и не передаётся workflow. Workflow
обновляет только `compose.production.yaml`, `nginx.conf` и deployment scripts.

## SSH-доступ для GitHub Actions

На машине администратора создайте отдельный ключ:

```sh
ssh-keygen -t ed25519 -f ~/.ssh/es-doc-deploy -C "es-doc deploy"
```

Добавьте содержимое `~/.ssh/es-doc-deploy.pub` в
`/home/esdeploy/.ssh/authorized_keys` на сервере.

Проверьте подключение:

```sh
ssh -i ~/.ssh/es-doc-deploy esdeploy@es-doc.example.com docker ps
```

Получите host key:

```sh
ssh-keyscan -H es-doc.example.com
```

Перед добавлением результата в GitHub проверьте fingerprint сервера. Workflow
использует `StrictHostKeyChecking=yes` и не принимает неизвестный host key.

## Настройка GitHub environment

Откройте:

```text
Repository → Settings → Environments → New environment
```

Создайте environment:

```text
production
```

Рекомендуется добавить required reviewer. Тогда deploy остановится перед SSH-
шагом и будет ждать ручного подтверждения.

Добавьте environment secrets:

| Secret | Пример значения | Назначение |
| --- | --- | --- |
| `DEPLOY_HOST` | `es-doc.example.com` | SSH host сервера |
| `DEPLOY_USER` | `esdeploy` | SSH-пользователь |
| `DEPLOY_PATH` | `/opt/es-doc` | Каталог deploy на сервере |
| `DEPLOY_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Приватный SSH-ключ |
| `DEPLOY_KNOWN_HOSTS` | `es-doc.example.com ssh-ed25519 AAAA...` | Проверенный host key |

Если GHCR image приватный, добавьте:

| Secret | Пример значения | Назначение |
| --- | --- | --- |
| `GHCR_USERNAME` | `sovue` | Пользователь GitHub |
| `GHCR_TOKEN` | `github_pat_...` | Token с `read:packages` |

Для публичного image `GHCR_USERNAME` и `GHCR_TOKEN` не требуются.

## Запуск обновления

1. Убедитесь, что нужные изменения находятся в GitHub.
2. Откройте **Actions → Deploy → Run workflow**.
3. Заполните параметры.

Пример для текущих веток:

```text
app_ref: main
assets_ref: main
```

Для воспроизводимого релиза лучше использовать полные SHA:

```text
app_ref: f181c4c71d398907fe85c0aeec41ee0508b9d4c4
assets_ref: f0bc4bfa0c5288ea3b2d07f9fc43cedae508c88f
```

4. Нажмите **Run workflow**.
5. Дождитесь завершения job **Build and publish image**.
6. Если environment защищён, откройте **Review deployments**, выберите
   `production` и нажмите **Approve and deploy**.
7. Дождитесь job **Deploy to production** и затем **Prune old GHCR images**.

Тег образа будет создан автоматически:

```text
sha-<40 символов SHA приложения>
```

Его не нужно вводить вручную.

## Что происходит на сервере

`deploy/deploy.sh`:

1. Проверяет, что тег имеет формат `sha-...`.
2. Создаёт lock и запрещает параллельный deploy.
3. Проверяет Compose-файл.
4. Загружает новый image.
5. Запускает `docker compose up --wait --remove-orphans`.
6. Ждёт успешный `/healthz` у приложения и health check nginx.
7. Сохраняет успешный тег в `.last-successful-release`.
8. Перед заменой сохраняет предыдущий тег в
   `.previous-successful-release`.

Если новый image не скачался или контейнеры не стали healthy, скрипт пытается
вернуть предыдущий успешный тег.

## Проверка состояния и логи

На сервере:

```sh
cd /opt/es-doc

docker compose \
  --env-file .env.production \
  --file compose.production.yaml \
  ps
```

Логи приложения:

```sh
docker compose \
  --env-file .env.production \
  --file compose.production.yaml \
  logs -f web
```

Логи nginx:

```sh
docker compose \
  --env-file .env.production \
  --file compose.production.yaml \
  logs -f nginx
```

Проверка health endpoint напрямую из web-контейнера:

```sh
docker compose \
  --env-file .env.production \
  --file compose.production.yaml \
  exec web python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/healthz').read().decode())"
```

Ожидаемый ответ:

```text
ok
```

## Ручной rollback

После успешного обновления предыдущий тег находится в:

```text
/opt/es-doc/.previous-successful-release
```

Запуск rollback:

```sh
cd /opt/es-doc
./deploy/deploy.sh "$(cat .previous-successful-release)"
```

Или явно:

```sh
./deploy/deploy.sh sha-4038b3f71d398907fe85c0aeec41ee0508b9d4c4
```

## Очистка GHCR

После успешного deploy запускается `deploy/prune-ghcr.sh`.

По умолчанию сохраняются:

- текущий релиз;
- пять последних SHA-релизов;
- теги, которые не начинаются с `sha-`.

Старые SHA-версии и безымянные версии удаляются. Количество сохраняемых
релизов меняется переменной `KEEP_RELEASES` в
`.github/workflows/deploy.yml`:

```yaml
KEEP_RELEASES: 5
```

Если deploy завершился ошибкой, cleanup не запускается.

## Типовые проблемы

### Workflow не появляется в Actions

Проверьте, что `.github/workflows/deploy.yml` уже находится в GitHub на ветке,
с которой запускается workflow. Для ручного запуска workflow должен быть
доступен GitHub Actions.

### `DEPLOY_* is required`

Один из обязательных environment secrets отсутствует или создан не внутри
environment `production`.

### `Host key verification failed`

Проверьте `DEPLOY_KNOWN_HOSTS`. В нём должна быть актуальная строка для того же
hostname или IP, что указаны в `DEPLOY_HOST`.

### `docker login` или pull image завершился ошибкой

Для приватного GHCR image проверьте `GHCR_USERNAME` и `GHCR_TOKEN`. Token должен
иметь `read:packages`, а package должен быть доступен этому аккаунту.

### Контейнер не становится healthy

Посмотрите логи:

```sh
docker compose \
  --env-file .env.production \
  --file compose.production.yaml \
  logs --tail=200 web nginx
```

Чаще всего причина — неверный `ES_DOC_SITE_URL`, ошибка в содержимом ассетов,
нехватка места на сервере или проблема с nginx-конфигурацией.

### На сервере нет предыдущего релиза

Автоматический rollback возможен только после первого успешного deploy. При
первом запуске нужно исправить причину ошибки и повторить workflow вручную.

