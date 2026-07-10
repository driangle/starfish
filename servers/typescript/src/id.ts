import { randomBytes } from "node:crypto";

export class IDGenerator {
  private counter = 0;

  clientId(): string {
    return "client_" + randomBytes(4).toString("hex");
  }

  resumeToken(): string {
    return "rt_" + randomBytes(8).toString("hex");
  }

  messageId(): string {
    this.counter++;
    return `srv_${this.counter}`;
  }
}
