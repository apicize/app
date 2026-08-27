# Runs the vendored apicize-api-samples Lambda handlers behind a small
# API Gateway emulator (api/server.mjs). See api/server.mjs for details.
FROM node:22-slim

WORKDIR /app

COPY api/package.json ./
RUN npm install --omit=dev

COPY api/ ./

EXPOSE 3000

CMD ["npm", "start"]
