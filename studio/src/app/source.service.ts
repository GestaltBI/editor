import { Injectable } from '@angular/core';
import type { ProcessLike } from '@gestaltbi/editor';

import type { ColumnHint } from './graph.service';

/** jsDelivr serves any GitHub repo's files, which is how the product loads configs. */
const CDN = 'https://cdn.jsdelivr.net/gh';

export interface Loaded {
  config: ProcessLike;
  columns: ColumnHint[];
  origin: string;
}

/**
 * Where a config comes from.
 *
 * The same two places the product reads them: a GitHub repo, or a file in your
 * hands. `structure.json` is fetched alongside because the column codes are
 * what make the option fields answerable rather than free text.
 */
@Injectable({ providedIn: 'root' })
export class SourceService {
  async fromGithub(ref: string): Promise<Loaded> {
    const slug = ref.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '');
    if (!/^[\w.-]+\/[\w.-]+(@[\w.-]+)?$/.test(slug)) {
      throw new Error(`"${ref}" is not an org/repo — try sirmmo/kickstarter-intelligence`);
    }

    const base = `${CDN}/${slug}`;
    const config = await this.json(`${base}/processing.json`);
    if (!config?.process) throw new Error(`${slug} has no processing.json with a "process" block`);

    // A missing structure.json is not fatal: the graph is still editable, the
    // column hints simply are not there.
    const structure = await this.json(`${base}/structure.json`).catch(() => null);
    return { config, columns: this.columns(structure), origin: slug };
  }

  fromText(text: string, origin = 'pasted JSON'): Loaded {
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (e: any) {
      throw new Error(`That is not valid JSON: ${e.message}`);
    }
    if (!parsed?.process) throw new Error('A processing config needs a top-level "process" block');
    return { config: parsed, columns: [], origin };
  }

  private columns(structure: any): ColumnHint[] {
    return (structure?.columns ?? [])
      .filter((c: any) => c?.column)
      .map((c: any) => ({ column: c.column, tags: c.tags ?? [] }));
  }

  private async json(url: string): Promise<any> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} fetching ${url.split('/').slice(-1)[0]}`);
    return res.json();
  }
}
