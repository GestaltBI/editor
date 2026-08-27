import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';

/**
 * Zone-based change detection, deliberately.
 *
 * `rete-angular-plugin` renders nodes through Angular elements driven by the
 * area plugin's own lifecycle, and its peer range asks for zone.js. Zoneless
 * would leave node bodies rendering only when something else happened to
 * trigger a check.
 */
export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideZoneChangeDetection()],
};
