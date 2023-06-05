import { EventMap, WorkerRequest, WorkerResponse } from "../types";

export class WorkerBridge<M extends EventMap> {
  private handlers: Map<keyof M, M[keyof M]> = new Map();

  constructor() {
    self.addEventListener("message", (ev) => this.handleRequest(ev));
  }

  private async handleRequest(ev: MessageEvent<WorkerRequest<M, any>>) {
    const { eventType, eventSeq, args } = ev.data;

    const handler = this.handlers.get(eventType);
    if (!handler)
      throw new Error(
        `Invalid worker request: handler with type ${eventType} not found`
      );

    try {
      const successResponse: WorkerResponse<M, any> = {
        eventType,
        eventSeq,
        result: {
          success: true,
          response: await handler(...args),
        },
      };

      self.postMessage(successResponse);
    } catch (err) {
      const failResponse: WorkerResponse<M, any> = {
        eventType,
        eventSeq,
        result: {
          success: false,
          reason: err,
        },
      };

      self.postMessage(failResponse);
    }
  }

  on<E extends keyof M>(eventType: E, handler: M[E]) {
    this.handlers.set(eventType, handler);
  }
}
