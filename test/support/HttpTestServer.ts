import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Express } from "express";

class HttpTestServer {
  private constructor(
    private readonly server: Server,
    readonly baseUrl: string,
  ) {}

  static async avvia(app: Express): Promise<HttpTestServer> {
    const server = createServer(app);

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject);
        resolve();
      });
    });

    const indirizzo = server.address();

    if (indirizzo === null || typeof indirizzo === "string") {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      throw new Error("Indirizzo del server HTTP di test non disponibile");
    }

    const porta = (indirizzo as AddressInfo).port;
    return new HttpTestServer(server, `http://127.0.0.1:${porta}`);
  }

  async chiudi(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server.close((errore) => {
        if (errore === undefined) {
          resolve();
        } else {
          reject(errore);
        }
      });
    });
  }
}

export = HttpTestServer;
