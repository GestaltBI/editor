import { ChangeDetectorRef, Component, HostBinding, HostListener, Input, OnChanges, inject } from '@angular/core';
import type { NodeKind } from '@gestaltbi/editor';
import { ClassicPreset } from 'rete';
import { ImpureKeyvaluePipe, RefDirective } from 'rete-angular-plugin/21';

import { GraphService } from '../graph.service';

/** A process, as Rete holds it. The kind is what the canvas colours by. */
export class StageNode extends ClassicPreset.Node {
  width = 210;
  height = 92;

  constructor(
    label: string,
    public kind: NodeKind,
    public op: string | undefined,
    public leaf: boolean,
  ) {
    super(label);
  }
}

type Entry = { key: string; value: any };

/**
 * The node body.
 *
 * Deliberately close to the preset's own component in everything mechanical —
 * the detached change detector, the `rendered` callback on the next frame, the
 * seed that forces sockets to re-render — because those are what keep
 * connections attached to the right place while a node moves. What differs is
 * only what it shows: the kind, which is the thing being taught.
 */
@Component({
  selector: 'app-stage-node',
  standalone: true,
  imports: [ImpureKeyvaluePipe, RefDirective],
  // The preset's own node carries this; keeping it means Rete's tooling and
  // anything written against a stock canvas still finds our nodes.
  host: { 'data-testid': 'node' },
  template: `
    <div class="stage" [class]="'stage--' + data.kind" [class.is-leaf]="data.leaf">
      <span class="stage__kind">{{ data.kind }}</span>
      <span class="stage__name" [title]="data.label">{{ data.label }}</span>
      <span class="stage__op">{{ data.op || '—' }}</span>
    </div>

    <div class="ports ports--in">
      @for (input of data.inputs | keyvalueimpure; track input.key) {
        <div class="port" [attr.data-testid]="'input-' + input.key">
          <div
            refComponent
            class="port__socket"
            [data]="{ type: 'socket', side: 'input', key: input.key, nodeId: data.id, payload: input.value?.socket, seed: seed }"
            [emit]="emit"
          ></div>
        </div>
      }
    </div>

    <div class="ports ports--out">
      @for (output of data.outputs | keyvalueimpure; track output.key) {
        <div class="port" [attr.data-testid]="'output-' + output.key">
          <div
            refComponent
            class="port__socket"
            [data]="{ type: 'socket', side: 'output', key: output.key, nodeId: data.id, payload: output.value?.socket, seed: seed }"
            [emit]="emit"
          ></div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./node.component.scss'],
})
export class StageNodeComponent implements OnChanges {
  @Input() data!: StageNode;
  @Input() emit!: (data: any) => void;
  @Input() rendered!: () => void;

  seed = 0;

  @HostBinding('style.width.px') get w() {
    return this.data?.width;
  }
  @HostBinding('style.height.px') get h() {
    return this.data?.height;
  }
  @HostBinding('class.selected') get isSelected() {
    return this.data?.selected;
  }

  private readonly graphs = inject(GraphService);

  constructor(private cdr: ChangeDetectorRef) {
    // The area plugin drives rendering; Angular must not also decide when.
    this.cdr.detach();
  }

  /**
   * Selecting is a property of the node, not of the canvas.
   *
   * Rete emits its own pick events, but they are consumed by the selection
   * extension before a pipe sees them reliably. The node knows when it was
   * clicked; that is enough.
   */
  @HostListener('pointerdown')
  pick(): void {
    if (this.data) this.graphs.selected.set(this.data.label);
  }

  ngOnChanges(): void {
    this.cdr.detectChanges();
    requestAnimationFrame(() => this.rendered?.());
    this.seed++;
  }

  track(_: number, entry: Entry) {
    return entry.key;
  }
}
