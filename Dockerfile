FROM python:3.14-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Установка PDM
RUN pip install --no-cache-dir pdm

# Копирование файлов зависимостей
COPY pyproject.toml pdm.lock ./

# Установка зависимостей
RUN pdm install --check --prod

# Копирование остального проекта
COPY . .

# Создание директории для кэша
RUN mkdir -p /app/temp

# Открываем порт 443
EXPOSE 443

# Запуск приложения
CMD ["python", "main.py"]
