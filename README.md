An easily-describable backend framework with a Next.js-like, declarative filesystem-based
API structure.

# Installation

```bash
npm i @prism/server
```

# Quickstart

```typescript
// /src/index.ts
import { createAPI } from "@prism/server";

// Create an express server.
const app = express();
const server = createServer(app);

// Tell express to parse incoming requests with JSON payloads.
app.use(express.json());

// Travel the "app" folder, discovering modules and using them to create route handlers.
const prism = await createApi("app", app, server);
prism.server.listen(3000);
```

The typical folder structure looks something like this:

```bash
├── app
│   ├── errors.ts
│   ├── http
│   │   ├── _middleware.ts
│   │   ├── auth
│   │   │   └── login.ts
│   │   ├── mail
│   │   │   └── index.ts
│   │   └── user
│   │       ├── [id].ts
│   │       └── index.ts
│   ├── http_middlewares
│   ├── queues
│   │   └── mail.ts
│   ├── schedules
│   │   └── metrics.ts
│   ├── socket
│   │   └── _authorized
│   │       ├── _middleware.ts
│   │       └── jobs
│   │           └── start.ts
│   └── socket_middlewares
│       └── authorize.ts
├── index.ts
└── views
    └── 404.ejs
```

# .env

For convenience, an `.env` file placed alongside `package.json` is automatically loaded with `dotenv`.

This is a good place to set prism's logging verbosity, as well as whatever other application-specific
environment variables that your application might need at runtime.

```shell
# /.env
LOGLEVEL=4 (4=DEBUG, 3=ERROR, 2=WARN, 1=INFO)
```

# HTTP route handlers

Place your HTTP route handlers under `/src/app/http`, for example:

```typescript
// /src/app/http/user.ts OR /src/app/http/user/index.ts

export async function get(c: Context) {}   // GET /user
export async function post(c: Context) {}  // POST /user
export async function put(c: Context) {}   // PUT /user
export async function patch(c: Context) {} // PATCH /user
export async function del(c: Context) {}   // DELETE /user
```

Path parameters are supported:

```typescript
// /src/app/http/user/[id].ts -> /user/:id

export async function get(c: Context, { path: { id } }) {
  return Respond.OK(c, { id });
}
```

Wildcards are supported:

```typescript
// /src/app/http/user/[id]/[...rest].ts -> /user/:id/:rest*

export async function get(c: Context, { path: { id, rest } }) {
  // c.req.params will include whatever other path params exist
  return Respond.OK(c, { id, rest });
}
```

Handlers are wrapped in order to automatically handle Promise rejections
or thrown errors by passing them to the registered Express error middlewares.

```typescript
function throws() {
  throw new Error("Whoops!");
}

export async function get(c: Context) {
  throws();
  return Respond.OK(c, { hello: "world" });
}
```

The result of the above is that the error is caught and passed to the first middleware
defined in `/src/app/errors.ts`, if it exists.

This means that you don't need to wrap error-prone code within a try/catch and
forward errors to your error-handling middleware with `next(e)`, as this happens
automatically for you.

```typescript
const core = await createAPI("app");

// Assuming `/src/app/errors.ts` doesn't exist and this is the first error handling
// middleware that is defined, the above thrown error would be handled by this.

core.app.use((err, req, res, next) => {
  res.status(500).send("Something went horribly wrong!");
});
```

## Flattened paths

You can "flatten" parts of a route path by prefixing corresponding filesystem folders with an underscore. In other words,

```bash
/src/app/http/user/_authorized/profile.ts
```

...is mounted at `/user/profile` because the `_authorized` folder is effectively ignored (i.e., flattened).

Middlewares defined inside of flattened folders are still recognized and applied to sibling and child files.
This can be a very useful pattern.

Consider the following folder structure:

```bash
├── app
│   ├── http
│   │   └── user
│   │       ├── index.ts
│   │       └── _authorized
│   │           ├── _middleware.ts # some authorization middleware
│   │           └── profile.ts
└── index.ts
```

The result of the above is that handlers at `/user` are not behind authorization middleware whereas
handlers at `/user/profile` are.


## Reading the request body / query / path / headers

Both route handlers and middlewares are passed an object of the following shape:

```typescript
{
  path: {}, // Path params (/user/:id -> { path: { id } })
  query: {}, // Query params (/user/123?action=edit -> { query: { action: "edit" } })
  body: {}, // POST body
  headers: {}, // Request headers
  bearer: "", // Bearer token, if present in Authorization header
}

// usage:
export async function post(c: Context, { body: { email, password } }) {}
export async function get(c: Context, { query: { action }, path: { id }}) {}
export async function get(c: Context, { bearer }) {}
```

## Middleware

Let's assume we have the following endpoints:

```bash
/user/ (/src/app/http/user/index.ts)
/user/profile/ (/src/app/http/user/profile.ts)
/user/profile/edit (/src/app/http/user/profile/edit.ts)
```

To create middleware that is applied to *all* of these endpoints, create
a file named `_middleware.ts` and place it at `/src/app/http/user/_middleware.ts`.

A `_middleware.ts` file is expected to have a default export which is an array of
Express-compatible middleware handlers.

```typescript
// /src/app/http/user/_middleware.ts

export default [
   async (c: Context) => {
    console.log(c.req.method, c.req.path, c.req.ip);
    c.next();
  },
];
```

You can also export a `middleware` object from the handler file, where the object keys
are the request method that the middleware will be applied to.

```typescript
// /src/app/http/user/profile.ts

export async function get(c: Context) {}
export async function post(c: Context) {}

export const middleware = {
  // GET /user/profile will hit this middleware first.
  "get": [
    async function validUser(c: Context) {
      // validate this user, or something
      c.next();
    }
  ],

  // ...
  "post": [],
  "put": [],
  "patch": [],
  "del": [],
};
```

## Global middleware

Express expects you to register your global middlewares before you define
any other routes. To do this with prism, pass an array of your middlewares as the 
second parameter to `createAPI`:

```typescript
const globalMiddleware = [
  (req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "*");
    res.header("Access-Control-Allow-Headers", "*");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    return next();
  }
];

const core = await createAPI("src/app", globalMiddleware);
```

This effectively registers `globalMiddleware` before traversing `src/app` and
creates any routes.

# Error middleware

You can optionally place an `errors.ts` file at your application's root (e.g. `/app/errors.ts`)
which will be autodiscovered by prism and applied to Express as middleware. This file is expected
to have a default export which is an array of Express middleware handlers. These middlewares are
registered with Express *after* your filesystem-based routes are registered.

For example:

```typescript
// /src/app/errors.ts

import { NextFunction, Request, Response } from "express";

export default [
  // Handle errors by sending a 500 with the error message.
  (err: any, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }

    if (err instanceof Error) {
      return res.status(500).send({ code: 500, error: String(err.message) });
    }

    return next(err);
  },

  // 404 handler
  (req: Request, res: Response, _next: NextFunction) => {
    res.render("404", { path: req.path });
  },
];
```

# Schedules

Schedules found in `/src/app/schedules` are automatically ingested and created. These are
expected to have an async default export which is assumed to be the handler for the
scheduled task.

Here's an example of a simple schedule that would collect daily user metrics from
a database and email them via the mail queue.

```typescript
// /src/app/schedules/metrics.ts

import { Schedule } from "@prism/server/schedules";
import { queue as mailQueue } from "../queues/mail";

export default async function() {
  const metrics = "";
  mailQueue.push({ recipient: "all@us.io", body: metrics });
}

export const config: Schedule = {
  cron: "0 0 12 * *",
  scheduled: true,
  timezone: "America/Los_Angeles",
}
```

# Queues

Place your queue definitions in `/queues`. Your default export should be async
and is the handler for jobs.

```typescript
// /src/app/queues/mail.ts
import Queue from "prism/queues";

interface MailPayload {
  recipient: string;
  subject: string;
  body: string;
}

export default async function ({ recipient, subject, body }: MailPayload) {
  // send an email
}

export const queue = new Queue<MailPayload>({
  concurrency: 1,
  delay: 0,
  /**
   * If a timeout is defined, the queue emits a "taskfailed" event with the
   * uuid of the task and the payload it had received when it was created.
   *
   * mailQueue.group(recipient).on("tasktimeout", () => {});
   */
  timeout: 0,

  groups: {
    concurrency: 1,
    delay: 0,
    /** After a period of inactivity, this group will destroy itself. */
    expiration: "1 min 5s",
  },
});
```

`push` returns the uuid of the created task. Listen for task completion or failure
by listening to the `failed` and `completed` events.

```typescript
// /src/app/http/mail/index.ts
import { queue as mailQueue } from "../queues/mail";

const onNew = ({ task }) => console.log("Task created:", task.uuid);
const onFailed = ({ task }) => console.log("Task failed:", task.uuid);
const onComplete = ({ task }) => console.log("Task complete:", task.uuid);

mailQueue.on("new", onNew);
mailQueue.on("failed", onFailed);
mailQueue.on("complete", onComplete);

export async function post(c: Context, { body: { recipient, subject, body } }) {
  const uuid = mailQueue.push({ recipient, subject, body });
  return Respond.OK(c, { uuid });
}

// /src/app/queues/mail.ts
export default async function({ recipient, subject, body }) {
  // send a very important email
}
```

# Sockets

`/src/app/socket/jobs/send-email.ts` maps to a command named `/jobs/send-email` at
endpoint `ws://localhost:PORT/`. To execute a command, send a message with this shape:

```typescript
{
  command: string;
  payload: object;
}
```

For example:

```bash
wscat -c ws://localhost:3000/ -x '{"command": "/jobs/send-email", "payload": { "recipient": "somebody@gmail.com" }}'
```

The default export of a command file is the command handler and should
be async. The handler's return value will be sent to the client. A handler might
look something like this:

```typescript
// /src/app/socket/jobs/send-email.ts

import { MailQueueTask, queue as mailQueue } from "../../queues/email";

export default async function(c: Context) {
  const mail: MailQueueTask = {
    recipient: c.payload.recipient,
    subject: "Hello",
    body: "...",
  };

  // When the queued job finishes, notify the socket client that initiated the job.
  const callback = () => {
    c.connection.send({ command: "job:status", payload: { message: "Job finished." } });
  };

  const uuid = mailQueue.group(mail.recipient).push(mail, { callback });

  return { message: "Job created.", uuid };
}
```

## Socket middleware

Socket middlewares are very similar to HTTP middlewares. They are not Express middlewares though,
so they don't need to call `next` or return anything.

```typescript
// /src/app/socket/jobs/_middleware.ts
import { Context } from "@prism/server/ws";

export default [
  (c: Context) => {
    // c.connection has the connecting client details and socket object.
    if (!c.payload.token) {
      throw new Error("Missing authentication token.");
    }
  },
];
```

To fail from a middleware, throw an Error. Command execution will then end and the
command handler will not be called. The error message will be returned to the client,
looking something like:

```json
{"id":0,"command":"start-job","payload":{"error":"Missing authentication token."}}
```
