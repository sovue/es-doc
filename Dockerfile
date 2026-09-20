FROM python:3.14

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    git \
    && rm -rf /var/lib/apt/lists/*

# Установка PDM
RUN pip install --no-cache-dir pdm

# Копирование файлов зависимостей
COPY pyproject.toml pdm.lock ./

# Установка зависимостей
RUN pdm install

# Активация виртуального окружения в PATH
ENV PATH="/app/.venv/bin:$PATH"

# Копирование остального проекта
COPY . .

# Создание директории для кэша и ассетов
RUN mkdir -p /app/temp /app/content

# Клонирование ассетов по умолчанию (если не переопределено через volume в docker-compose)
RUN git clone --depth 1 https://github.com/sovue/es-doc-assets.git /app/content-default && \
    cp -r /app/content-default/* /app/content/ && \
    rm -rf /app/content-default

# Открываем порт 8000
EXPOSE 8000

# Запуск приложения
CMD ["python", "main.py"]
