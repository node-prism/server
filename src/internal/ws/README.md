# WebSocketTokenServer

## Events

In addition to the events normally emitted by `WebSocketServer`, `WebSocketTokenServer` will emit:

| Event name  | Meaning                                                         |
|-------------|-----------------------------------------------------------------|
| `connected` | Emitted after a `connection`, this emits a `Connection` object. |

## Messages

These messages are sent from `WebSocketTokenServer` to connected clients.

| Message name    | Meaning                                                                                                                              | Payload                                                 |
|-----------------|--------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------|
| `prism:latency` | Sent by default in 5s~ intervals and includes the calculated round-trip time of the last latency request and response trip.          | The calculated round-trip message time in milliseconds. |
| `prism:ping`    | A ping request. These are automatically replied to by `WebSocketTokenClient` -- there's no need to reply to this message explicitly. | No payload.                                             |


## Commands

Define commands that a client can execute with `registerCommand`:

```typescript
type SocketMiddleware = (c: WSContext) => Promise<any>;

registerCommand(command: string, callback: SocketMiddleware, ...middlewares: SocketMiddleware[]): void;
```

```typescript
const wsts = new WebSocketTokenServer({ path: "/" });

wsts.registerCommand(
  "auth:login",
  (c: WSContext) => {
    if (c.payload.token) return { status: 200 };
    throw new Error("bad auth"); // replies with { error: "bad auth" }
  },
  (c: WSContext) => { /** middleware */ };
  (c: WSContext) => { /** middleware */ };
  (c: WSContext) => { /** middleware */ };
  (c: WSContext) => { /** middleware */ };
);
```

From the client side, use the `WebSocketTokenClient`'s `command` method to run this command and await a reply:

```typescript
const wstc = new WebSocketTokenClient("wss://localhost:3000");

const reply = await wsts.command("auth:login", { token: "abc" });
```

You can also explicitly send commands to clients, which clients can also listen for.

```typescript
// broadcast `hello` command to all connected clients
wsts.broadcast("hello", { hello: "world" });
```

If you have the client `Connection` object, you can craft a command and send it with `send`.
The `Connection` object is available on `WSContext`, which is provided to all command callbacks
and middlewares.

In this example, four separate messages are sent to the client.

```typescript
wsts.registerCommand("hello", (c: WSContext) => {
  c.connection.send({ command: "hi", payload: { ... } });
  c.connection.send({ command: "hey", payload: { ... } });
  c.connection.send({ command: "hello", payload: { ... } });
  return { howdy: "partner" };
});
```
