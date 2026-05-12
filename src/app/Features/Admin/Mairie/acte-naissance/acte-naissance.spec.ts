import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActeNaissanceC } from './acte-naissance';

describe('ActeNaissanceC', () => {
  let component: ActeNaissanceC;
  let fixture: ComponentFixture<ActeNaissanceC>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActeNaissanceC]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActeNaissanceC);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
