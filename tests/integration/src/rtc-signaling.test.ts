import { describe, it, expect, afterEach } from "vitest";
import { StarfishTestClient } from "./helpers/client.js";
import { rtcOfferFrame, rtcAnswerFrame, rtcIceFrame } from "./helpers/frames.js";
import { uniqueSession } from "./helpers/setup.js";

describe("WebRTC signaling relay", () => {
  const clients: StarfishTestClient[] = [];
  const track = async () => {
    const c = await StarfishTestClient.connect();
    clients.push(c);
    return c;
  };

  afterEach(async () => {
    await Promise.all(clients.map((c) => c.close()));
    clients.length = 0;
  });

  it("rtc.offer is relayed to target client", async () => {
    const session = uniqueSession();

    const initiator = await track();
    await initiator.hello({ name: "initiator" });
    await initiator.join(session);

    const responder = await track();
    await responder.hello({ name: "responder" });
    await responder.join(session);

    const offer = rtcOfferFrame(session, responder.clientId!, "sdp-offer-data");
    await initiator.send(offer);

    const received = await responder.waitForType("rtc.offer");
    expect(received.session).toBe(session);
    expect(received.from).toBe(initiator.clientId);
    expect(received.payload.sdp).toBe("sdp-offer-data");
  });

  it("rtc.answer is relayed back to initiator", async () => {
    const session = uniqueSession();

    const initiator = await track();
    await initiator.hello({ name: "initiator" });
    await initiator.join(session);

    const responder = await track();
    await responder.hello({ name: "responder" });
    await responder.join(session);

    const answer = rtcAnswerFrame(session, initiator.clientId!, "sdp-answer-data");
    await responder.send(answer);

    const received = await initiator.waitForType("rtc.answer");
    expect(received.session).toBe(session);
    expect(received.from).toBe(responder.clientId);
    expect(received.payload.sdp).toBe("sdp-answer-data");
  });

  it("rtc.ice candidate is relayed to target", async () => {
    const session = uniqueSession();

    const client1 = await track();
    await client1.hello({ name: "peer1" });
    await client1.join(session);

    const client2 = await track();
    await client2.hello({ name: "peer2" });
    await client2.join(session);

    const candidate = { candidate: "candidate:123", sdpMid: "0" };
    const ice = rtcIceFrame(session, client2.clientId!, candidate);
    await client1.send(ice);

    const received = await client2.waitForType("rtc.ice");
    expect(received.session).toBe(session);
    expect(received.from).toBe(client1.clientId);
    expect(received.payload.candidate).toEqual(candidate);
  });
});
