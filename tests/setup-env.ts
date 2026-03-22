Object.assign(process.env, {
  NODE_ENV: "test",
});

if (process.env.DIRECT_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
}
