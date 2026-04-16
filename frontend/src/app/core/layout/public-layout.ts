import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Layout publico — wrapper minimo sin header/sidebar/auth.
 * El landing component maneja todo su propio layout (hero, features, footer).
 */
@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: [`:host { display: block; min-height: 100vh; }`],
})
export class PublicLayoutComponent {}
