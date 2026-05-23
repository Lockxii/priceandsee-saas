FROM pyd4vinci/scrapling:latest

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    SCRAPER_API_KEY="secret_key_to_change"

WORKDIR /app

COPY requirements.txt .

# Installer FastAPI et Uvicorn (scrapling est déjà dans l'image de base)
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Démarrer le serveur FastAPI
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
