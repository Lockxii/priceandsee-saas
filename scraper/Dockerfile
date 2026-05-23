FROM pyd4vinci/scrapling:latest

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    SCRAPER_API_KEY="" \
    SCRAPER_MODE="auto"

WORKDIR /app

COPY requirements.txt .
RUN if command -v uv >/dev/null 2>&1; then \
      uv pip install --no-cache -r requirements.txt; \
    else \
      pip install --no-cache-dir -r requirements.txt; \
    fi

COPY . .

EXPOSE 8000

# L'image officielle Scrapling définit ENTRYPOINT ["uv", "run", "scrapling"].
# Railway passait donc notre CMD à la CLI Scrapling, d'où: Try 'scrapling --help' for help.
ENTRYPOINT []
CMD ["sh", "-c", "if command -v uv >/dev/null 2>&1; then uv run uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}; else uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}; fi"]
