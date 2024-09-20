import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DependencyManagerComponent } from './dependency-manager.component';

describe('DependencyManagerComponent', () => {
  let component: DependencyManagerComponent;
  let fixture: ComponentFixture<DependencyManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DependencyManagerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DependencyManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
