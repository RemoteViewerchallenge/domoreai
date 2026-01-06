FROM python:3.10-slim

WORKDIR /app

# Copy only the requirements files first to leverage Docker cache
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-dev.txt

# Copy the rest of the application
COPY . .

# Expose the port the server runs on (default 8000)
EXPOSE 8000

# Command to run the server
CMD ["python", "-m", "server"]