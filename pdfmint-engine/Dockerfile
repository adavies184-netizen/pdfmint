FROM python:3.11-slim-bookworm AS libredwg-builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    xz-utils \
    pkg-config \
    libxml2-dev \
    libpcre2-dev \
    && curl -fsSL --retry 3 https://ftp.gnu.org/pub/gnu/libredwg/libredwg-0.13.3.tar.xz -o /tmp/libredwg.tar.xz \
    && mkdir /tmp/libredwg \
    && tar -xJf /tmp/libredwg.tar.xz -C /tmp/libredwg --strip-components=1 \
    && cd /tmp/libredwg \
    && ./configure --prefix=/opt/libredwg --disable-shared \
    && make -j2 \
    && make install

FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PDFMINT_ENGINE_RELEASE=1.9.3

RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    libreoffice-core \
    poppler-utils \
    ghostscript \
    qpdf \
    tesseract-ocr \
    tesseract-ocr-eng \
    unpaper \
    pngquant \
    librsvg2-bin \
    libheif1 \
    imagemagick \
    pstoedit \
    calibre \
    ffmpeg \
    p7zip-full \
    libxml2 \
    libpcre2-8-0 \
    fonts-noto-core \
    fonts-dejavu \
    fonts-liberation \
    fontconfig \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=libredwg-builder /opt/libredwg/ /usr/local/

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

RUN useradd --create-home --uid 10001 pdfmint
USER pdfmint

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD sh -c 'curl --fail "http://localhost:${PORT:-8080}/v1/health" || exit 1'

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers ${WEB_CONCURRENCY:-1}"]
