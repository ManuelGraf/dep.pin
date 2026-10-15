import { Injectable, computed, signal } from '@angular/core';

export interface State {
  message: string;
  action: StateAction;
}

export type StateAction = 'start' | 'info';

/** Status messages shown in the header */
@Injectable({ providedIn: 'root' })
export class StateService {
  private readonly processStack = signal<State[]>([]);

  /** the most recent ongoing process, or the latest info */
  readonly current = computed<State | undefined>(() => {
    const stack = this.processStack();
    return stack.findLast((state) => state.action === 'start') ?? stack.at(-1);
  });
  readonly currentMessage = computed(() => this.current()?.message);
  readonly currentAction = computed(() => this.current()?.action);

  /** adds a new process to the stack */
  start(message: string): void {
    this.processStack.update((stack) => [...stack, { message, action: 'start' }]);
  }

  /** ends the process with the given message */
  end(message: string): void {
    this.processStack.update((stack) => {
      const index = stack.findIndex((state) => state.action === 'start' && state.message === message);
      return index === -1 ? stack : stack.toSpliced(index, 1);
    });
  }

  /** stores an informational message */
  info(message: string): void {
    this.processStack.update((stack) => [...stack, { message, action: 'info' }]);
  }

  clear(): void {
    this.processStack.set([]);
  }
}
