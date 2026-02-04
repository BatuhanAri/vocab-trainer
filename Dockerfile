FROM node:22-alpine

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
