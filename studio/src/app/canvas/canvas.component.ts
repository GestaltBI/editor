import {
  AfterViewInit,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { ClassicPreset, NodeEditor, type GetSchemes } from 'rete';
import { AreaExtensions, AreaPlugin } from 'rete-area-plugin';
import { AngularPlugin, Presets, type AngularArea2D } from 'rete-angular-plugin/21';
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin';

import { GraphService } from '../graph.service';
import { StageNode, StageNodeComponent } from './node.component';

/**
 * Matches the plugins' own `ClassicScheme` exactly.
 *
 * The connection is typed against the base node rather than `StageNode`: Rete
 * types connections invariantly in their endpoints, so narrowing them here
 * makes our scheme fail the presets' constraint even though every node we
 * create is a `StageNode`.
 */
type Connection = ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node> & { isLoop?: boolean };
type Schemes = GetSchemes<StageNode, Connection>;
type AreaExtra = AngularArea2D<Schemes>;

/** One socket type: every edge carries a frame, so anything can feed anything. */
const FRAME = new ClassicPreset.Socket('frame');

const COL = 300;
const ROW = 150;

/**
 * The canvas.
 *
 * Rete owns what is on screen; `GraphService` owns what the config says. The
 * two are kept in step in one direction only — the service is the source, and
 * the canvas rebuilds from it whenever it changes. Edits made on the canvas go
 * to the service and come back as a new graph, so there is never a moment where
 * the picture and the document disagree.
 */
@Component({
  selector: 'app-canvas',
  standalone: true,
  template: `<div class="canvas" #host></div>`,
  styleUrls: ['./canvas.component.scss'],
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;

  private editor = new NodeEditor<Schemes>();
  private area: AreaPlugin<Schemes, AreaExtra> | undefined;
  private readonly injector = inject(Injector);
  private readonly graphs = inject(GraphService);

  /** True while the canvas is applying the service's state, so echoes are ignored. */
  private syncing = false;

  private byId = new Map<string, StageNode>();

  constructor() {
    effect(() => {
      const graph = this.graphs.graph();
      if (this.area) void this.render(graph);
    });
    effect(() => {
      const id = this.graphs.selected();
      if (this.area) this.highlight(id);
    });
  }

  async ngAfterViewInit(): Promise<void> {
    const area = new AreaPlugin<Schemes, AreaExtra>(this.host.nativeElement);
    const connection = new ConnectionPlugin<Schemes, AreaExtra>();
    const angular = new AngularPlugin<Schemes, AreaExtra>({ injector: this.injector });

    angular.addPreset(
      Presets.classic.setup({
        customize: {
          node: () => StageNodeComponent,
        },
      }),
    );
    // The connection preset is typed against the base classic scheme; our nodes
    // carry extra fields, which TypeScript reads as an incompatible narrowing
    // rather than the widening it is.
    connection.addPreset(ConnectionPresets.classic.setup());

    this.editor.use(area);
    area.use(connection);
    area.use(angular);

    AreaExtensions.selectableNodes(area, AreaExtensions.selector(), { accumulating: AreaExtensions.accumulateOnCtrl() });
    AreaExtensions.simpleNodesOrder(area);

    // Wiring and unwiring edit the config, which is what the canvas redraws from.
    this.editor.addPipe((context) => {
      if (this.syncing) return context;
      if (context.type === 'connectioncreated') {
        const { source, target, targetInput } = context.data;
        const from = this.editor.getNode(source)?.label;
        const to = this.editor.getNode(target)?.label;
        if (from && to) this.graphs.connect(from, to, Number(targetInput.replace('in', '')) || 0);
      }
      if (context.type === 'connectionremoved') {
        const from = this.editor.getNode(context.data.source)?.label;
        const to = this.editor.getNode(context.data.target)?.label;
        if (from && to) this.graphs.disconnect(from, to);
      }
      return context;
    });

    this.area = area;
    await this.render(this.graphs.graph(), true);
  }

  ngOnDestroy(): void {
    this.area?.destroy();
  }

  /**
   * Fit everything on screen.
   *
   * Waits a frame first: the nodes have been added, but their Angular bodies
   * have not been measured yet, so zooming immediately fits boxes of the wrong
   * size and leaves half the graph outside the viewport.
   */
  async zoomToFit(): Promise<void> {
    if (!this.area) return;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await AreaExtensions.zoomAt(this.area, this.editor.getNodes());
  }

  /**
   * Rebuild the canvas from the graph.
   *
   * Wholesale rather than diffed: a graph of a few dozen nodes rebuilds in a
   * frame, and reconciling by hand is where a canvas and its document quietly
   * stop agreeing.
   */
  private async render(graph = this.graphs.graph(), fit = false): Promise<void> {
    if (!this.area) return;
    this.syncing = true;
    try {
      await this.editor.clear();
      this.byId.clear();

      // Settings carriers are not in the dataflow, so laying them out as though
      // they were puts eleven of them in the first column and pushes the actual
      // pipeline off screen. They get their own row underneath instead.
      const stages = graph.nodes.filter((n) => !n.settings);
      const carriers = graph.nodes.filter((n) => n.settings);

      // Lanes were numbered with the carriers still in the column, so pulling
      // them out leaves gaps — and strands a stage that shared column 0 with a
      // dozen of them somewhere near the bottom. Renumber what is left, keeping
      // the order the layout chose.
      const lane = new Map<string, number>();
      const perDepth = new Map<number, number>();
      for (const spec of [...stages].sort((a, b) => a.depth - b.depth || a.lane - b.lane)) {
        const next = perDepth.get(spec.depth) ?? 0;
        lane.set(spec.id, next);
        perDepth.set(spec.depth, next + 1);
      }
      const below = (Math.max(0, ...perDepth.values()) + 1) * ROW;

      const place = (spec: (typeof graph.nodes)[number], x: number, y: number) => {
        const node = new StageNode(spec.id, spec.kind, spec.op, spec.leaf);
        for (let i = 0; i < Math.min(spec.inputs, 8); i++) {
          node.addInput(`in${i}`, new ClassicPreset.Input(FRAME, i === 0 ? 'in' : `in ${i + 1}`, false));
        }
        if (!spec.settings) node.addOutput('out', new ClassicPreset.Output(FRAME, 'out'));
        return { node, x, y };
      };

      const placed = [
        ...stages.map((spec) => place(spec, spec.depth * COL, (lane.get(spec.id) ?? 0) * ROW)),
        ...carriers.map((spec, i) => place(spec, i * (COL - 60), below)),
      ];

      for (const { node, x, y } of placed) {
        await this.editor.addNode(node);
        await this.area.translate(node.id, { x, y });
        this.byId.set(node.label, node);
      }

      for (const edge of graph.edges) {
        const from = this.byId.get(edge.from);
        const to = this.byId.get(edge.to);
        if (!from || !to) continue;
        await this.editor.addConnection(
          new ClassicPreset.Connection(from, 'out', to, `in${edge.socket}`) as Connection,
        );
      }
    } finally {
      this.syncing = false;
    }
    this.highlight(this.graphs.selected());
    if (fit) await this.zoomToFit();
  }

  private highlight(id: string | null): void {
    for (const [name, node] of this.byId) {
      const selected = name === id;
      if (node.selected !== selected) {
        node.selected = selected;
        void this.area?.update('node', node.id);
      }
    }
  }
}
