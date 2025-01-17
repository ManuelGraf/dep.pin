import { Injectable } from '@angular/core';

export interface State {
  message: string;
  action: StateAction;
}

export type StateAction = 'start' | 'info';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  private processStack: State[] = [];

  /**
   * Adds a new process to the stack.
   */
  start(message: string): void {
    this.processStack.push({ message, action: 'start' });
  }

  /**
   * Ends the most recent process with the specified message.
   */
  end(message: string): void {
    const index = this.processStack.findIndex(
      (state) => state.action === 'start' && state.message === message
    );
    if (index !== -1) {
      this.processStack.splice(index, 1);
    }
  }

  /**
   * Stores an informational message in the stack.
   */
  info(message: string): void {
    this.processStack.push({ message, action: 'info' });
  }

  /**
   * Clears the process stack completely.
   */
  clear(): void {
    this.processStack = [];
  }

  /**
   * returns the first ongoing process or the latest submitted info
   */
  getCurrentProcess(){
    for (let i = this.processStack.length-1; i >= 0; i--) {
      const process = this.processStack[i];
      if (process.action === 'start') {
        return process
      }
    }
    return this.processStack[this.processStack.length - 1] || undefined;
  }

  /**
   * returns the first ongoing process or the latest info
   */
  getCurrentMessage(): string | undefined {
    return this.getCurrentProcess()?.message;
  }
  
  /**
   * Gets the current action from the stack.
  */
 getCurrentAction(): StateAction | undefined {
  return this.getCurrentProcess()?.action;
}
}
