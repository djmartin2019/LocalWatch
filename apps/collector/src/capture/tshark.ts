import { spawn } from "node:child_process";

export function startTshark(
    onLine: (line: string) => void,
) {
    const tshark = spawn("tshark", [
      "-i",
      "en0",

      "-T",
      "fields",

      "-e",
      "frame.time_epoch",

      "-e",
      "ip.src",

      "-e",
      "ip.dst",

      "-e",
      "_ws.col.Protocol",

      "-e",
      "frame.len",

      "-e",
      "tcp.srcport",

      "-e",
      "tcp.dstport",

      "-E",
      "separator=,",

      "-l",
    ]);

    let buffer = "";

    tshark.stdout.on("data", (data) => {
        buffer += data.toString();

        const lines = buffer.split("\n");

        // keep incomplete line
        buffer = lines.pop() ?? "";

        for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed) continue;

            onLine(trimmed);
        }
    });

    tshark.stderr.on("data", (data) => {
        console.error("[tshark stderr]", data.toString());
    });

    tshark.on("close", (code) => {
        console.log(`tshark exited: ${code}`);
    });
}
