import { KeyValuePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FactCardValue } from '../../interfaces/answer';
import { HeldFact } from '../../interfaces/question';
import { Variants } from '../../interfaces/story';
import { FactCard } from './fact-card';

@Component({
  selector: 'ret-fact-card-story',
  imports: [FactCard, KeyValuePipe, ReactiveFormsModule],
  templateUrl: './fact-card.story.html',
})
export class FactCardStory {
  protected readonly variants: Variants<FactCard> = {
    variant: {
      question: 'Question: confirm what we hold, or make a change',
      summary: 'Summary: read-only rows for Check your answers',
    },
  };

  protected readonly facts: HeldFact[] = [
    { id: 'f1', label: 'Job', value: 'Practice manager, Oakwood Surgery' },
    { id: 'f2', label: 'Salary', value: '£48,000' },
    { id: 'f3', label: 'Bonus', value: 'None' },
  ];
  protected readonly unconfirmed = new FormControl<FactCardValue>(null);
  protected readonly confirmed = new FormControl<FactCardValue>({ changed: [] });
  protected readonly changed = new FormControl<FactCardValue>({
    changed: [{ factId: 'f2', newValue: '£52,000' }],
    note: 'A pay rise in March',
  });
  protected readonly disabled = new FormControl<FactCardValue>({ value: null, disabled: true });
}
