PYTHON ?= python3
VENV ?= .venv
VENV_PYTHON = $(VENV)/bin/python

.PHONY: setup dev check

setup:
	$(PYTHON) -m venv "$(VENV)"
	"$(VENV_PYTHON)" -m pip install -r requirements.txt

dev:
	"$(VENV_PYTHON)" server.py

check:
	$(PYTHON) scripts/check.py
	git diff --check
