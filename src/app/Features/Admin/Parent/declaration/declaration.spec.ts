import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Declaration } from './declaration';

describe('Declaration', () => {
  let component: Declaration;
  let fixture: ComponentFixture<Declaration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Declaration]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Declaration);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
