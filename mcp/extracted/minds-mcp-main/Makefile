.PHONY: setup test unit-tests lint run docker-build docker-run clean all

# Default target when running 'make' with no arguments
all: setup test

# Setup development environment
setup:
	pip install -r requirements.txt
	pip install -r requirements-dev.txt

# Run all tests
test:
	pytest

# Run only unit tests
unit-tests:
	pytest tests/unit

# Run linting tools
lint:
	flake8 .
	black --check .

# Format code with black
format:
	black .

# Run the server locally
run:
	python -m server

# Build Docker image
docker-build:
	docker compose build

# Run Docker container with docker compose
docker-run:
	docker compose up -d

# Clean up Python cache files
clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.pyd" -delete
	find . -type f -name ".coverage" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name "*.egg" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".coverage" -exec rm -rf {} +
	find . -type d -name "htmlcov" -exec rm -rf {} +
	find . -type d -name "dist" -exec rm -rf {} +
	find . -type d -name "build" -exec rm -rf {} +