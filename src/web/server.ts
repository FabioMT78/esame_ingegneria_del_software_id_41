import app from "./app";

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new RangeError("PORT deve essere un numero compreso tra 1 e 65535");
}

app.listen(port, () => {
  console.log(`Gestionale Affitti listening on port ${port}`);
});