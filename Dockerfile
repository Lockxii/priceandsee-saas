FROM pyd4vinci/scrapling:latest

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    SCRAPER_API_KEY="" \
    SCRAPER_MODE="auto"

WORKDIR /app

COPY scraper/requirements.txt .
RUN if command -v uv >/dev/null 2>&1 && [ -x /app/.venv/bin/python ]; then \
      uv pip install --python /app/.venv/bin/python --no-cache -r requirements.txt; \
    elif command -v uv >/dev/null 2>&1; then \
      uv pip install --system --no-cache -r requirements.txt; \
    else \
      pip install --no-cache-dir -r requirements.txt; \
    fi

COPY scraper/ .

EXPOSE 8000

# L'image officielle Scrapling définit ENTRYPOINT ["uv", "run", "scrapling"].
# Railway passait donc notre CMD à la CLI Scrapling, d'où: Try 'scrapling --help' for help.
ENTRYPOINT []
CMD ["sh", "-c", "if [ -x /app/.venv/bin/python ]; then exec /app/.venv/bin/python -m uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}; else exec python -m uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}; fi"]
