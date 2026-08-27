import { Component, computed, inject } from '@angular/core';

import { GraphService } from '../graph.service';

@Component({
  selector: 'app-problems',
  standalone: true,
  template: `
    @if (problems().length) {
      <ul class="problems">
        @for (p of problems(); track p.node + p.code + p.message) {
          <li [class.is-error]="p.severity === 'error'" (click)="select(p.node)">
            <code>{{ p.node }}</code> {{ p.message }}
          </li>
        }
      </ul>
    } @else {
      <p class="ok">Nothing wrong with this graph.</p>
    }
  `,
  styleUrls: ['./problems.component.scss'],
})
export class ProblemsComponent {
  private readonly graphs = inject(GraphService);
  readonly problems = computed(() => this.graphs.graph().problems);

  select(node: string): void {
    this.graphs.selected.set(node);
  }
}
