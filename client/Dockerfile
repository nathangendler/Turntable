FROM node:18-alpine AS builder

# Declare build-time arguments
ARG VITE_API_URL
ARG VITE_ENABLE_SEARCH

# Set environment variables for Vite to use during build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ENABLE_SEARCH=$VITE_ENABLE_SEARCH

WORKDIR /app


COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
#COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
