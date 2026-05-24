import { startTshark } from "./capture/tshark";
import { parsePacket } from "./capture/parser";

import {
    processPacket,
    buildSnapshot,
    resetMetrics,
} from "./aggregation/metricsEngine";

import { broadcast } from "./websocket/server";

startTshark((line) => {
    const packet = parsePacket(line);

    if (!packet) return;

    processPacket(packet);
});

setInterval(() => {
    const snapshot = buildSnapshot();

    broadcast(snapshot);

    console.log(snapshot);

    resetMetrics();
}, 1000);
