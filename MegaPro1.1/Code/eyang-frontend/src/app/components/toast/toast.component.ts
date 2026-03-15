// src/app/components/toast/toast.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Toast } from '../../services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div
        *ngFor="let t of toasts"
        class="toast toast--{{ t.type }}"
        (click)="ns.dismiss(t.id)"
      >
        <span *ngIf="t.icon" class="toast-icon">{{ t.icon }}</span>
        <div class="toast-body">
          <strong class="toast-title">{{ t.title }}</strong>
          <p *ngIf="t.message" class="toast-message">{{ t.message }}</p>
        </div>
        <button class="toast-close" (click)="ns.dismiss(t.id)">✕</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: .75rem;
      max-width: 360px;
    }
    .toast {
      display: flex;
      align-items: flex-start;
      gap: .75rem;
      padding: .85rem 1rem;
      border-radius: 12px;
      background: #1e293b;
      color: #f1f5f9;
      box-shadow: 0 8px 32px rgba(0,0,0,.25);
      cursor: pointer;
      animation: slide-in .25s ease;
    }
    @keyframes slide-in {
      from { transform: translateX(110%); opacity: 0; }
      to   { transform: translateX(0);   opacity: 1; }
    }
    .toast--success { border-left: 4px solid #10b981; }
    .toast--error   { border-left: 4px solid #ef4444; }
    .toast--warning { border-left: 4px solid #f59e0b; }
    .toast--info    { border-left: 4px solid #3b82f6; }
    .toast--message { border-left: 4px solid #8b5cf6; }
    .toast-icon  { font-size: 1.4rem; flex-shrink: 0; }
    .toast-body  { flex: 1; min-width: 0; }
    .toast-title { display: block; font-size: .9rem; font-weight: 600; }
    .toast-message {
      margin: .2rem 0 0;
      font-size: .8rem;
      color: #94a3b8;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .toast-close {
      background: none; border: none; color: #64748b;
      cursor: pointer; font-size: .9rem; padding: 0; flex-shrink: 0;
    }
    .toast-close:hover { color: #f1f5f9; }
  `]
})
export class ToastComponent {
  // FIX: Do NOT assign `toasts$` as a class field using `this.ns`
  // because class fields are initialized before the constructor runs,
  // so `this.ns` is undefined at that point → TS2729.
  //
  // Instead use a getter so it is evaluated lazily (after construction).
  get toasts() {
    return this._toasts;
  }

  private _toasts: Toast[] = [];

  constructor(public ns: NotificationService) {
    // Safe to access this.ns here — constructor body runs after field init
    ns.toasts$.subscribe(toasts => {
      this._toasts = toasts;
    });
  }
}