import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Hopital } from './hopital';

describe('Hopital', () => {
  let component: Hopital;
  let fixture: ComponentFixture<Hopital>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Hopital]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Hopital);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
