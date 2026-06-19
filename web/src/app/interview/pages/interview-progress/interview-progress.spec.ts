import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterviewProgress } from './interview-progress';

describe('InterviewProgress', () => {
  let component: InterviewProgress;
  let fixture: ComponentFixture<InterviewProgress>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewProgress]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterviewProgress);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
