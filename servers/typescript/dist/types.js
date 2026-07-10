export function parseTo(to) {
    if (to === undefined)
        return [];
    if (typeof to === "string")
        return [to];
    return to;
}
export function includeSelf(frame) {
    return frame.options?.delivery?.includeSelf === true;
}
export function requireAck(frame) {
    return frame.options?.requireAck === true;
}
//# sourceMappingURL=types.js.map