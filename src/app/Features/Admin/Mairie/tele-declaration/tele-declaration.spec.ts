import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeleDeclaration } from './tele-declaration';

describe('TeleDeclaration', () => {
  let component: TeleDeclaration;
  let fixture: ComponentFixture<TeleDeclaration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeleDeclaration]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeleDeclaration);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
