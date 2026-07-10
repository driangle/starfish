import { randomBytes } from "node:crypto";
export class IDGenerator {
    counter = 0;
    clientId() {
        return "client_" + randomBytes(4).toString("hex");
    }
    resumeToken() {
        return "rt_" + randomBytes(8).toString("hex");
    }
    messageId() {
        this.counter++;
        return `srv_${this.counter}`;
    }
}
//# sourceMappingURL=id.js.map