FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /src
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY services/bff/package.json services/bff/tsconfig.json ./services/bff/
RUN pnpm install --frozen-lockfile --filter @borrowhub/bff...
COPY services/bff/src ./services/bff/src
RUN pnpm --filter @borrowhub/bff build \
	&& pnpm --filter @borrowhub/bff deploy --prod --legacy /out \
	&& cp -R services/bff/dist /out/dist

FROM node:22-alpine
RUN addgroup -S borrowhub && adduser -S borrowhub -G borrowhub
WORKDIR /app
COPY --from=build --chown=borrowhub:borrowhub /out ./
USER borrowhub
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=5s --start-period=10s --retries=12 \
	CMD node -e "fetch('http://127.0.0.1:3000/health/live').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
