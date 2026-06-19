import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterviewStart } from './interview-start';

describe('InterviewStart', () => {
  let component: InterviewStart;
  let fixture: ComponentFixture<InterviewStart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewStart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterviewStart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
