import { PacketEvents } from "../types/types";
import { metricsState } from "./state";

function topEntries<T>(map: Map<T, number>, limit = 10) {
    return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([key, value]) => ({
            key,
            value,
        }));
}

export function buildSnapshot() {
    return {
        timestamp: Date.now(),

        packetsPerSecond: metricsState.packetsThisSecond,
        bytesPerSecond: metricsState.bytesThisSecond,

        topProtocols: topEntries(metricsState.protocolTraffic),
        topIps: topEntries(metricsState.ipTraffic),
        topPorts: topEntries(metricsState.ipTraffic),
    };
}

export function processPacket(packet: PacketEvent) {
    metricsState.packetsThisSecond += 1;
    metricsState.bytesThisSecond += packet.length;

    // Protocols
    const protocolCount = metricsState.protocolTraffic.get(packet.protocol) ?? 0;

    metricsState.protocolTraffic.set(
        packet.protocol,
        protocolCount + packet.length,
    );

    // Source IPs
    const ipCount = metricsState.ipTraffic.get(packet.srcIp) ?? 0;

    metricsState.ipTraffic.set(
        packet.srcIp,
        ipCount + packet.length,
    );

    // Ports
    if (packet.dst) {
        const portCount = metricsState.portTraffic.get(packet.dstPort) ?? 0;

        metricsState.portTraffic.set(
            packet.dstPort,
            portCount + 1,
        );
    }
}

export function resetMetrics() {
    metricsState.packetsThisSecond = 0;
    metricsState.bytesThisSecond = 0;

    metricsState.protocolTraffic.clear();
    metricsState.ipTraffic.clear();
    metricsState.portTraffic.clear();
}
