import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdvParent } from './rdv-parent';

describe('RdvParent', () => {
  let component: RdvParent;
  let fixture: ComponentFixture<RdvParent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdvParent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdvParent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
