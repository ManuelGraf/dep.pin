import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangelogInfoComponent } from './changelog-info.component';

describe('ChangelogInfoComponent', () => {
  let component: ChangelogInfoComponent;
  let fixture: ComponentFixture<ChangelogInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangelogInfoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChangelogInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
