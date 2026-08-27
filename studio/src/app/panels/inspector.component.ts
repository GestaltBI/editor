import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BUILTIN_OPS } from '@gestaltbi/editor';

import { GraphService } from '../graph.service';

@Component({
  selector: 'app-inspector',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (node(); as n) {
      <div class="inspector">
        <header>
          <span class="kind kind--{{ n.kind }}">{{ n.kind }}</span>
          <code>{{ n.op || 'no op' }}</code>
        </header>

        <label class="field">
          <span>Name</span>
          <input
            type="text"
            [ngModel]="name()"
            (ngModelChange)="name.set($event)"
            (blur)="commitName()"
            (keydown.enter)="commitName()"
            spellcheck="false"
          />
        </label>
        @if (nameError()) { <p class="error">{{ nameError() }}</p> }

        <p class="what">{{ summary(n.op) }}</p>

        <dl class="facts">
          <dt>Reads</dt>
          <dd>
            @if (n.requires.length) {
              @for (r of n.requires; track r) { <code>{{ r }}</code> }
            } @else { the file as loaded }
          </dd>
          <dt>Inputs</dt>
          <dd>{{ n.inputs }}</dd>
          @if (n.leaf) { <dt>Ends here</dt><dd>a view reads this stage</dd> }
        </dl>

        <label class="field field--grow">
          <span>Options</span>
          <textarea
            [ngModel]="optionsText()"
            (ngModelChange)="optionsText.set($event)"
            (blur)="commitOptions()"
            spellcheck="false"
            rows="12"
          ></textarea>
        </label>
        @if (optionsError()) { <p class="error">{{ optionsError() }}</p> }

        @if (columns().length) {
          <details class="columns">
            <summary>{{ columns().length }} columns in this dataset</summary>
            <div>
              @for (c of columns(); track c.column) {
                <button type="button" (click)="copy(c.column)" [title]="c.tags.join(', ')">{{ c.column }}</button>
              }
            </div>
          </details>
        }

        <button type="button" class="danger" (click)="remove(n.id)">Delete this stage</button>
      </div>
    } @else {
      <p class="hint">Select a stage to edit it, or add one from the palette.</p>
    }
  `,
  styleUrls: ['./inspector.component.scss'],
})
export class InspectorComponent {
  private readonly graphs = inject(GraphService);

  readonly node = computed(() => this.graphs.node(this.graphs.selected()));
  readonly columns = this.graphs.columns;

  readonly name = signal('');
  readonly nameError = signal('');
  readonly optionsText = signal('');
  readonly optionsError = signal('');

  constructor() {
    // Reload the fields whenever the selection changes underneath them.
    effect(() => {
      const n = this.node();
      this.name.set(n?.id ?? '');
      this.optionsText.set(n?.options === undefined ? '' : JSON.stringify(n.options, null, 2));
      this.nameError.set('');
      this.optionsError.set('');
    });
  }

  summary(op?: string): string {
    return (op && BUILTIN_OPS[op]?.summary) || 'This host does not describe that op.';
  }

  commitName(): void {
    const n = this.node();
    if (!n) return;
    const wanted = this.name().trim();
    if (wanted === n.id) return;
    if (!wanted) return this.nameError.set('A stage needs a name.');
    if (!this.graphs.rename(n.id, wanted)) {
      this.nameError.set(`"${wanted}" is already the name of another stage.`);
      this.name.set(n.id);
      return;
    }
    this.nameError.set('');
  }

  commitOptions(): void {
    const n = this.node();
    if (!n) return;
    const text = this.optionsText().trim();
    if (!text) {
      this.graphs.setOptions(n.id, undefined);
      this.optionsError.set('');
      return;
    }
    try {
      this.graphs.setOptions(n.id, JSON.parse(text));
      this.optionsError.set('');
    } catch (e: any) {
      // Keep what was typed: losing it on a typo is worse than showing an error.
      this.optionsError.set(e.message);
    }
  }

  copy(column: string): void {
    void navigator.clipboard?.writeText(column);
  }

  remove(id: string): void {
    this.graphs.remove(id);
  }
}
