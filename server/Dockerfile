FROM node:18-alpine

# Install Python and pip
RUN apk add --no-cache python3 py3-pip

# Install Chromium and ChromeDriver for Selenium, plus curl for health checks
RUN apk add --no-cache \
    chromium \
    chromium-chromedriver \
    curl

# Install Python dependencies for Selenium
RUN pip3 install --break-system-packages selenium

WORKDIR /app

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm ci

# Copy source code (including scrape.py)
COPY . .

# Set environment variables for Chrome
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/lib/chromium/
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

EXPOSE 3001

CMD ["npx", "ts-node", "server.ts"]