import { PacketEvent } from "../types/types";

export function parsePacket(
  line: string,
): PacketEvent | null {
  const parts = line.split(",");

  if (parts.length < 5) {
    return null;
  }

  return {
    timestamp:
      Number(parts[0]) * 1000,

    srcIp: parts[1] || "unknown",

    dstIp: parts[2] || "unknown",

    protocol: parts[3] || "unknown",

    length: Number(parts[4]) || 0,

    srcPort: Number(parts[5]) || 0,

    dstPort: Number(parts[6]) || 0,
  };
}
