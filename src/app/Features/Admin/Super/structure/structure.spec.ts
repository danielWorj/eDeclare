import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StructureC } from './structure';

describe('StructureC', () => {
  let component: StructureC;
  let fixture: ComponentFixture<StructureC>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StructureC]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StructureC);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
