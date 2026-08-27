import { Component, inject } from '@angular/core';
import { BUILTIN_OPS } from '@gestaltbi/editor';

import { GraphService } from '../graph.service';

/** The ops, grouped the way the reader thinks about them. */
const GROUPS = ['prepare', 'narrow', 'derive', 'summarise', 'combine', 'relate', 'place', 'check'] as const;

@Component({
  selector: 'app-palette',
  standalone: true,
  template: `
    <div class="palette">
      @for (group of groups; track group) {
        <section>
          <h3>{{ group }}</h3>
          @for (op of opsIn(group); track op) {
            <button
              type="button"
              class="op op--{{ group }}"
              [title]="summary(op)"
              (click)="add(op)"
            >
              <span class="op__name">{{ op }}</span>
              <span class="op__what">{{ summary(op) }}</span>
            </button>
          }
        </section>
      }
    </div>
  `,
  styleUrls: ['./palette.component.scss'],
})
export class PaletteComponent {
  readonly groups = GROUPS;
  private readonly graphs = inject(GraphService);

  opsIn(group: string): string[] {
    return Object.entries(BUILTIN_OPS)
      // Reserved ops do nothing yet, so offering them would be offering a no-op.
      .filter(([, info]) => info.kind === group && !info.summary.startsWith('Reserved'))
      .map(([name]) => name);
  }

  summary(op: string): string {
    return BUILTIN_OPS[op]?.summary ?? '';
  }

  /** A new stage reads from whatever is selected, which is usually what you meant. */
  add(op: string): void {
    this.graphs.add(op, this.graphs.selected());
  }
}
