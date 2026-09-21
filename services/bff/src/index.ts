import Fastify from "fastify";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const app = Fastify({ logger: true });

const health = { status: "ok" as const };

app.get("/health/live", async () => health);
app.get("/health/ready", async () => health);

const start = async () => {
  try {
    await app.listen({ port, host });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
