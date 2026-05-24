export interface PacketEvent {
    timestamp: number;
    srcIp: string;
    dstIp: string;
    protocol: string;
    length: number;
    srcPort?: number;
    dstPort?: number;
}
