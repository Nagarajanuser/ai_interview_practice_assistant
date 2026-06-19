import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterviewEnd } from './interview-end';

describe('InterviewEnd', () => {
  let component: InterviewEnd;
  let fixture: ComponentFixture<InterviewEnd>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewEnd]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterviewEnd);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
