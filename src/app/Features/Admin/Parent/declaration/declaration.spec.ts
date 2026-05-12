import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeclarationC } from './declaration';

describe('DeclarationC', () => {
  let component: DeclarationC;
  let fixture: ComponentFixture<DeclarationC>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeclarationC]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeclarationC);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
