# Capture Layer

The capture layer is responsible for reading raw network traffic from the host and delivering it to the collector as structured lines.

---

## Files

| File | Role |
|------|------|
| `tshark.ts` | Spawns and manages the `tshark` subprocess |
| `parser.ts` | Parses CSV output into `PacketEvent` objects |

---

## `tshark.ts`

Spawns Wireshark's CLI capture tool as a child process:

```bash
tshark -i en0 \
  -T fields \
  -e frame.time_epoch \
  -e ip.src \
  -e ip.dst \
  -e _ws.col.Protocol \
  -e frame.len \
  -e tcp.srcport \
  -e tcp.dstport \
  -E separator=, \
  -l
```

### Flags explained

| Flag | Purpose |
|------|---------|
| `-i en0` | Capture on network interface `en0` |
| `-T fields` | Output selected fields instead of full dissection |
| `-e <field>` | Extract specific packet fields |
| `-E separator=,` | CSV output |
| `-l` | Flush stdout after each packet (line-buffered) |

### Line buffering

`tshark` may write partial lines across multiple `data` events. `startTshark()` maintains a string buffer:

1. Append incoming stdout to the buffer
2. Split on `\n`
3. Keep the last incomplete fragment in the buffer
4. Emit complete lines via the `onLine` callback

### Error handling

- **stderr** is logged to the console with a `[tshark stderr]` prefix
- Process **exit** is logged with the exit code
- There is no automatic restart — if `tshark` dies, the collector must be restarted

---

## `parser.ts`

Converts a single CSV line from `tshark` into a `PacketEvent`.

### CSV column mapping

| Index | Field | Maps to |
|-------|-------|---------|
| 0 | `frame.time_epoch` | `timestamp` (converted to ms) |
| 1 | `ip.src` | `srcIp` |
| 2 | `ip.dst` | `dstIp` |
| 3 | `_ws.col.Protocol` | `protocol` |
| 4 | `frame.len` | `length` |
| 5 | `tcp.srcport` | `srcPort` |
| 6 | `tcp.dstport` | `dstPort` |

### Validation

- Lines with fewer than 5 columns return `null` (skipped)
- Missing string fields default to `"unknown"`
- Missing numeric fields default to `0`

---

## Data flow

```
tshark stdout
     │  (raw CSV line)
     ▼
startTshark(onLine)
     │
     ▼
parsePacket(line) → PacketEvent | null
     │
     ▼
processPacket()   (aggregation layer)
```

---

## Extending capture

Future improvements to consider:

- **Interface auto-detection** — choose the default active interface at startup
- **CLI flag** — `--interface en0` instead of hardcoding
- **UDP ports** — add `udp.srcport` / `udp.dstport` fields
- **IPv6** — add `ipv6.src` / `ipv6.dst` fallbacks when `ip.src` is empty
- **BPF filter** — pass `-f "tcp port 443"` to reduce noise
