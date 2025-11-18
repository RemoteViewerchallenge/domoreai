import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { appRouter } from "./routers/index.js";
import cors from "cors";

const server = createHTTPServer({
  router: appRouter,
  middleware: cors(),
});

server.listen(4000);

console.log("Server listening on port 4000");
