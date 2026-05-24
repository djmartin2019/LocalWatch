import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 4000 });

export function broadcast(data: unknown) {
    const message = JSON.stringify(data);

    wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(message);
        }
    });
}

console.log("WebSocket server on :4000");
