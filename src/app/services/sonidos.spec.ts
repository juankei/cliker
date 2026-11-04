import { TestBed } from '@angular/core/testing';
import { Sonidos } from './sonidos';

describe('Sonidos', () => {
  let service: Sonidos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Sonidos);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
