import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DrawerService {
  private drawerOpenSubject = new BehaviorSubject<boolean>(false);
  
  // Observable that components can subscribe to
  public drawerOpen$: Observable<boolean> = this.drawerOpenSubject.asObservable();
  
  constructor() {}
  
  // Get the current drawer state
  public isDrawerOpen(): boolean {
    return this.drawerOpenSubject.value;
  }
  
  // Set the drawer state
  public setDrawerOpen(isOpen: boolean): void {
    this.drawerOpenSubject.next(isOpen);
  }
  
  // Toggle the drawer state
  public toggleDrawer(): void {
    this.drawerOpenSubject.next(!this.drawerOpenSubject.value);
  }
}
