FROM python:3.14-slim

ARG ASSETS_REPO=https://github.com/sovue/es-doc-assets.git
ARG ASSETS_REF=main
ARG APP_REVISION=unknown
ARG ASSETS_REVISION=unknown

LABEL org.opencontainers.image.title="ES Doc" \
      org.opencontainers.image.description="Everlasting Summer modding Wiki" \
      org.opencontainers.image.revision="${APP_REVISION}" \
      org.opencontainers.image.source="https://github.com/sovue/es-doc" \
      org.opencontainers.image.vendor="Sovue" \
      io.es-doc.assets-revision="${ASSETS_REVISION}"

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

RUN mkdir -p /app/temp /app/content \
    && chown -R app:app /app

RUN git clone --filter=blob:none --no-checkout "${ASSETS_REPO}" /tmp/es-doc-assets \
    && git -C /tmp/es-doc-assets fetch --depth=1 origin "${ASSETS_REF}" \
    && git -C /tmp/es-doc-assets archive FETCH_HEAD | tar -x -C /app/content \
    && rm -rf /tmp/es-doc-assets \
    && chown -R app:app /app/content

ENV PATH="/app/.venv/bin:$PATH"

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=3)"

CMD ["python", "main.py"]
