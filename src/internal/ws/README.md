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
| `prism:latency` | Sent by default in 5s~ intervals and includes the calculated round-trip time of the message.                                         | The calculated round-trip message time in milliseconds. |
| `prism:ping`    | A ping request. These are automatically replied to by `WebSocketTokenClient` -- there's no need to reply to this message explicitly. | No payload.                                             |

