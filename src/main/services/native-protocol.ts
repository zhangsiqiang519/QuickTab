import { NativeMessage, PROTOCOL_VERSION, QuickTabError } from "../shared.js";

export function validateMessage(message: unknown): NativeMessage {
  if (!message || typeof message !== "object") {
    throw protocolError("PROTO_INVALID_JSON", "Native message must be an object");
  }
  const candidate = message as Partial<NativeMessage>;
  if (!candidate.messageId || typeof candidate.messageId !== "string") {
    throw protocolError("PROTO_MISSING_MESSAGE_ID", "Native message is missing messageId");
  }
  if (!candidate.type || typeof candidate.type !== "string") {
    throw protocolError("PROTO_MISSING_TYPE", "Native message is missing type");
  }
  if (!candidate.protocolVersion || String(candidate.protocolVersion).split(".")[0] !== PROTOCOL_VERSION.split(".")[0]) {
    throw protocolError("PROTO_VERSION_UNSUPPORTED", "QuickTab extension and desktop app protocol versions are incompatible");
  }
  if (!candidate.timestamp || typeof candidate.timestamp !== "number") {
    throw protocolError("PROTO_MISSING_TIMESTAMP", "Native message is missing timestamp");
  }
  return candidate as NativeMessage;
}

export function createMessage<TPayload>(type: string, payload: TPayload, correlationId?: string): NativeMessage<TPayload> {
  return {
    messageId: crypto.randomUUID(),
    protocolVersion: PROTOCOL_VERSION,
    type,
    timestamp: Date.now(),
    payload,
    correlationId
  };
}

export function createErrorResponse(error: QuickTabError, correlationId?: string): NativeMessage {
  return {
    messageId: crypto.randomUUID(),
    protocolVersion: PROTOCOL_VERSION,
    type: "command_result",
    timestamp: Date.now(),
    correlationId,
    error
  };
}

export function protocolError(errorCode: string, humanMessage: string, technicalMessage = humanMessage): QuickTabError {
  return {
    errorCode,
    humanMessage,
    technicalMessage,
    retryable: errorCode !== "PROTO_VERSION_UNSUPPORTED",
    suggestedAction: "Check extension and desktop app versions, then reconnect."
  };
}
