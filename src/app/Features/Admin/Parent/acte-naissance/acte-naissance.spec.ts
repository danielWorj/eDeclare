import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActeNaissance } from './acte-naissance';

describe('ActeNaissance', () => {
  let component: ActeNaissance;
  let fixture: ComponentFixture<ActeNaissance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActeNaissance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActeNaissance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
