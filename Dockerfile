FROM python:3.14-slim

ARG ASSETS_REPO=https://github.com/sovue/es-doc-assets.git
ARG ASSETS_REF=main

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends adduser ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir pdm

COPY pyproject.toml pdm.lock ./
RUN pdm install --prod --no-editable

RUN addgroup --system app \
    && adduser --system --ingroup app app

COPY --chown=app:app . .

RUN mkdir -p /app/temp \
    && chown -R app:app /app

ENV PATH="/app/.venv/bin:$PATH"

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=3)"

CMD ["python", "main.py"]
