import { Component, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CanvasComponent } from './canvas/canvas.component';
import { GraphService } from './graph.service';
import { InspectorComponent } from './panels/inspector.component';
import { PaletteComponent } from './panels/palette.component';
import { ProblemsComponent } from './panels/problems.component';
import { SourceService } from './source.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CanvasComponent, InspectorComponent, PaletteComponent, ProblemsComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App {
  readonly graphs = inject(GraphService);
  private readonly sources = inject(SourceService);

  @ViewChild(CanvasComponent) canvas?: CanvasComponent;

  readonly repo = signal('sirmmo/kickstarter-intelligence');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly exported = signal('');

  async loadRepo(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const { config, columns, origin } = await this.sources.fromGithub(this.repo());
      this.graphs.load(config, origin, columns);
      // The canvas redraws from a signal effect, so let that land before fitting.
      setTimeout(() => void this.canvas?.zoomToFit(), 120);
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.busy.set(false);
    }
  }

  async openFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.error.set('');
    try {
      const { config, columns, origin } = this.sources.fromText(await file.text(), file.name);
      this.graphs.load(config, origin, columns);
      setTimeout(() => void this.canvas?.zoomToFit(), 120);
    } catch (e: any) {
      this.error.set(e.message);
    }
  }

  blank(): void {
    this.graphs.load({ type: 'processing', version: '1', process: {} }, 'a blank pipeline');
  }

  /** Show what would be written, so it can be read before it is copied. */
  showExport(): void {
    this.exported.set(JSON.stringify(this.graphs.export(), null, 2));
  }

  copyExport(): void {
    void navigator.clipboard?.writeText(this.exported());
  }

  closeExport(): void {
    this.exported.set('');
  }

  async fit(): Promise<void> {
    await this.canvas?.zoomToFit();
  }
}
