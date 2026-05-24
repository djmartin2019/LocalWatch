export const metricsState = {
    packetsThisSecond: 0,
    bytesThisSecond: 0,

    protocolTraffic: new Map<string, number>(),
    ipTraffic: new Map<string, number>(),
    portTraffic: new Map<number, number>(),
};
