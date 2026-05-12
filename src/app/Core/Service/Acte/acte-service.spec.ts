import { TestBed } from '@angular/core/testing';

import { ActeService } from './acte-service';

describe('ActeService', () => {
  let service: ActeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ActeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
