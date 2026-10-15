import { TestBed } from '@angular/core/testing';
import { StateService } from './state.service';

describe('StateService', () => {
  let service: StateService;

  beforeEach(() => {
    service = TestBed.inject(StateService);
  });

  it('shows the latest info when nothing is running', () => {
    service.info('first');
    service.info('second');
    expect(service.currentMessage()).toBe('second');
    expect(service.currentAction()).toBe('info');
  });

  it('prefers running processes over infos', () => {
    service.start('audit');
    service.info('loaded');
    expect(service.currentMessage()).toBe('audit');
    expect(service.currentAction()).toBe('start');
  });

  it('removes a process when it ends', () => {
    service.info('loaded');
    service.start('audit');
    service.end('audit');
    expect(service.currentMessage()).toBe('loaded');
  });

  it('clears all messages', () => {
    service.start('audit');
    service.clear();
    expect(service.current()).toBeUndefined();
  });
});
