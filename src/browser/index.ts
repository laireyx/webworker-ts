import {
  EventMap,
  EventMapWithArgs,
  WorkerRequest,
  WorkerResponse,
} from "../types";

type PendingTask<M extends EventMap, E extends keyof M> = {
  resolve: (value: Awaited<ReturnType<M[E]>>) => void;
  reject: (reason?: any) => void;
};

export class BrowserBridge<M extends EventMap = EventMapWithArgs> {
  worker: Worker;

  private eventSeq = 0;
  private pendingTasks = new Map<number, PendingTask<M, any>>();

  constructor(
    scriptURL: string | URL,
    options: WorkerOptions = { type: "module" }
  ) {
    this.worker = new Worker(scriptURL, options);
    this.worker.addEventListener(
      "message",
      (ev: MessageEvent<WorkerResponse<M, any>>) => this.handleResponse(ev)
    );
  }

  task<E extends keyof M>(
    eventType: E,
    ...args: Parameters<M[E]>
  ): Promise<Awaited<ReturnType<M[E]>>> {
    const eventSeq = this.eventSeq++;

    const taskItem: PendingTask<M, E> = {
      resolve: () => {
        throw new Error("Placeholder not replaced");
      },
      reject: () => {
        throw new Error("Placeholder not replaced");
      },
    };

    const taskPromise = new Promise<Awaited<ReturnType<M[E]>>>(
      (resolve, reject) => {
        Object.assign(taskItem, { resolve, reject });
      }
    );

    this.pendingTasks.set(eventSeq, taskItem);

    const request: WorkerRequest<M, E> = {
      eventType,
      eventSeq,
      args,
    };

    this.worker.postMessage(request);

    return taskPromise;
  }

  private handleResponse(ev: MessageEvent<WorkerResponse<M, any>>) {
    const { data } = ev;

    const pendingTask = this.pendingTasks.get(data.eventSeq);
    if (!pendingTask)
      throw new Error(
        `Invalid worker response: pending task with seq #${data.eventSeq} not found`
      );

    if (data.result.success) {
      pendingTask.resolve(data.result.response);
    } else {
      pendingTask.reject(data.result.reason);
    }
  }
}
