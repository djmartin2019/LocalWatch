export function safeNumber(value: unknown): number {
    const num = Number(value);

    return Number.isFinite(num)
        ? num
        : 0;
}

export function safeString(value: unknown): string {
    if (typeof value !== "string") {
        return "unknown";
    }

    return value;
}
