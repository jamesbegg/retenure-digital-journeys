import {
  afterRenderEffect,
  Component,
  ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { ModalPlacement, ModalTone } from '../../interfaces/modal';
import { Button } from '../../primitives/button/button';
import { nextId } from '../../utils/id';

@Component({
  selector: 'ret-modal',
  imports: [Button],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal {
  readonly heading = input.required<string>();
  readonly primaryLabel = input.required<string>();
  readonly secondaryLabel = input<string>();
  readonly tone = input<ModalTone>('default');
  readonly placement = input<ModalPlacement>('centre');
  readonly closeLabel = input.required<string>();
  readonly open = model(false);
  readonly primaryPressed = output<void>();
  readonly secondaryPressed = output<void>();

  protected readonly headingId = nextId('ret-modal-heading');
  protected readonly bodyId = nextId('ret-modal-body');
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private opener: HTMLElement | null = null;

  constructor() {
    afterRenderEffect(() => {
      const dialog = this.dialog().nativeElement;
      const open = this.open();
      if (open === dialog.open) return;
      if (!open) {
        dialog.close();
        return;
      }
      this.opener = document.activeElement as HTMLElement | null;
      dialog.showModal();
      // On the heading, so an Enter pressed on opening fires no action and the body is read out.
      dialog.querySelector<HTMLElement>('.heading')?.focus();
    });
  }

  protected closed() {
    this.open.set(false);
    this.opener?.focus();
    this.opener = null;
  }
}
