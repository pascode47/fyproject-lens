import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimilarityResultsComponent } from './similarity-results.component';

describe('SimilarityResultsComponent', () => {
  let component: SimilarityResultsComponent;
  let fixture: ComponentFixture<SimilarityResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimilarityResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SimilarityResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
