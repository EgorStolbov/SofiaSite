FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Сначала зависимости — кэшируются между сборками
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py database.py server_jwt.py security.py models.py products_seed.py ./

# База данных создаётся при запуске. Для персистентности подключайте том:
# docker run -v sofia-db:/app/data -e DB_PATH=/app/data/database.db ...
EXPOSE 8443

CMD ["python", "main.py"]
