import {
  Component,
  OnDestroy,
} from '@angular/core';
import {
  IonApp,
  IonRouterOutlet,
} from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';

import { AuthService } from './core/services/auth.service';
import { RealtimeService } from './core/services/realtime.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [
    IonApp,
    IonRouterOutlet,
  ],
})
export class AppComponent implements OnDestroy {
  private readonly authSubscription: Subscription;

  constructor(
    private readonly authService: AuthService,
    private readonly realtimeService: RealtimeService,
  ) {
    this.authSubscription =
      this.authService.currentUser$.subscribe(
        (user) => {
          if (user) {
            this.realtimeService.connect(
              user.id,
            );

            return;
          }

          this.realtimeService.disconnect();
        },
      );
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
    this.realtimeService.disconnect();
  }
}
