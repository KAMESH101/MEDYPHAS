FROM python:3.11-slim

WORKDIR /app

# XGBoost needs the OpenMP runtime, which the slim image doesn't include
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application (trained model files in ml/models/ are part of the repo)
COPY . .

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
