export const MAX_WS_MESSAGE_SIZE = 64 * 1024;
export const MAX_RTC_CONTROL_SIZE = 64 * 1024;
export const MAX_RTC_STREAM_SIZE = 16 * 1024;
export const MAX_PRESENCE_SIZE = 8 * 1024;
export const MAX_DATA_VALUE_SIZE = 256 * 1024;
export const MAX_TOPIC_NAME_LENGTH = 128;
export const MAX_CLIENT_META_SIZE = 16 * 1024;

export function validatePayloadSize(json: string, limit: number, label: string): void {
  const size = new TextEncoder().encode(json).byteLength;
  if (size > limit) {
    throw new Error(`${label} exceeds size limit: ${size} bytes > ${limit} bytes`);
  }
}

export function validateTopicName(topic: string): void {
  if (topic.length > MAX_TOPIC_NAME_LENGTH) {
    throw new Error(`Topic name exceeds ${MAX_TOPIC_NAME_LENGTH} characters: "${topic}"`);
  }
}
