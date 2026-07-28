FROM node:18-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

# Logs are written here inside the container. In deployment, bind-mount this
# to a host path (e.g. -v /var/log/app:/usr/src/app/logs) so the CloudWatch
# agent running on the EC2 host can tail these files directly. See
# infrastructure/cloudwatch-agent-config.json.
ENV LOG_DIR=/usr/src/app/logs
RUN mkdir -p /usr/src/app/logs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
