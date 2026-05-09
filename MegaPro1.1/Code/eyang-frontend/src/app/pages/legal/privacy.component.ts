import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, ShieldCheck, Lock, Eye, FileText, Globe } from 'lucide-angular';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  template: `
    <div class="legal-page">
      <div class="legal-header">
        <div class="container">
          <div class="legal-badge">
            <lucide-icon [img]="ShieldIcon" class="icon-sm"></lucide-icon>
            {{ 'privacy.title' | translate }}
          </div>
          <h1>{{ 'privacy.title' | translate }}</h1>
          <p class="last-updated">{{ 'privacy.last_updated' | translate }}</p>
        </div>
      </div>

      <div class="container legal-container">
        <div class="legal-grid">
          <aside class="legal-nav">
            <div class="nav-card">
              <h3>{{ 'privacy.summary_title' | translate }}</h3>
              <ul>
                <li><a (click)="scrollTo('collection')">{{ 'privacy.nav.collection' | translate }}</a></li>
                <li><a (click)="scrollTo('usage')">{{ 'privacy.nav.usage' | translate }}</a></li>
                <li><a (click)="scrollTo('protection')">{{ 'privacy.nav.protection' | translate }}</a></li>
                <li><a (click)="scrollTo('rights')">{{ 'privacy.nav.rights' | translate }}</a></li>
              </ul>
            </div>
          </aside>

          <div class="legal-content">
            <section id="collection">
              <h2>{{ 'privacy.sections.collection.title' | translate }}</h2>
              <p>{{ 'privacy.sections.collection.text' | translate }}</p>
              <ul>
                <li>{{ 'privacy.sections.collection.item1' | translate }}</li>
                <li>{{ 'privacy.sections.collection.item2' | translate }}</li>
                <li>{{ 'privacy.sections.collection.item3' | translate }}</li>
              </ul>
            </section>

            <section id="usage">
              <h2>{{ 'privacy.sections.usage.title' | translate }}</h2>
              <p>{{ 'privacy.sections.usage.text' | translate }}</p>
              <div class="feature-grid">
                <div class="feat-card">
                  <lucide-icon [img]="LockIcon" class="feat-ico"></lucide-icon>
                  <h4>{{ 'privacy.sections.usage.feat1_title' | translate }}</h4>
                  <p>{{ 'privacy.sections.usage.feat1_text' | translate }}</p>
                </div>
                <div class="feat-card">
                  <lucide-icon [img]="EyeIcon" class="feat-ico"></lucide-icon>
                  <h4>{{ 'privacy.sections.usage.feat2_title' | translate }}</h4>
                  <p>{{ 'privacy.sections.usage.feat2_text' | translate }}</p>
                </div>
              </div>
            </section>

            <section id="protection">
              <h2>{{ 'privacy.sections.protection.title' | translate }}</h2>
              <p>{{ 'privacy.sections.protection.text' | translate }}</p>
            </section>

            <section id="rights">
              <h2>{{ 'privacy.sections.rights.title' | translate }}</h2>
              <p>{{ 'privacy.sections.rights.text' | translate }}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .legal-page {
      background: var(--bg-main);
      min-height: 100vh;
      padding-bottom: 5rem;
    }
    .legal-header {
      background: linear-gradient(135deg, var(--primary) 0%, #1e40af 100%);
      color: white;
      padding: 5rem 0 4rem;
      text-align: center;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 0 1.5rem;
    }
    .legal-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.1);
      padding: 0.5rem 1rem;
      border-radius: 99px;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .legal-header h1 {
      font-size: 3rem;
      margin-bottom: 1rem;
      color: white;
    }
    .last-updated {
      opacity: 0.7;
      font-size: 0.9rem;
    }
    .legal-container {
      margin-top: -3rem;
    }
    .legal-grid {
      display: grid;
      grid-template-columns: 250px 1fr;
      gap: 3rem;
    }
    @media (max-width: 768px) {
      .legal-grid { grid-template-columns: 1fr; }
      .legal-nav { display: none; }
    }
    .nav-card {
      background: white;
      padding: 1.5rem;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      position: sticky;
      top: 100px;
    }
    .nav-card h3 {
      font-size: 1rem;
      margin-bottom: 1rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .nav-card ul {
      list-style: none;
      padding: 0;
    }
    .nav-card li {
      margin-bottom: 0.75rem;
    }
    .nav-card a {
      color: var(--text-main);
      font-weight: 500;
      transition: color 0.2s;
      cursor: pointer;
    }
    .nav-card a:hover { color: var(--accent); }

    .legal-content {
      background: white;
      padding: 3rem;
      border-radius: 20px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }
    @media (max-width: 480px) {
      .legal-content { padding: 1.5rem; }
    }
    section {
      margin-bottom: 3rem;
    }
    section h2 {
      font-size: 1.5rem;
      margin-bottom: 1.25rem;
      color: var(--primary);
    }
    section p {
      color: var(--text-muted);
      line-height: 1.7;
      margin-bottom: 1rem;
    }
    .feature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-top: 1.5rem;
    }
    @media (max-width: 640px) {
      .feature-grid { grid-template-columns: 1fr; }
    }
    .feat-card {
      padding: 1.5rem;
      background: var(--bg-main);
      border-radius: 12px;
      border: 1px solid var(--border);
    }
    .feat-ico {
      color: var(--accent);
      margin-bottom: 1rem;
      width: 24px;
      height: 24px;
    }
    .feat-card h4 {
      margin-bottom: 0.5rem;
      font-size: 1.1rem;
    }
    .feat-card p {
      font-size: 0.9rem;
      margin-bottom: 0;
    }
  `]
})
export class PrivacyComponent {
  readonly ShieldIcon = ShieldCheck;
  readonly LockIcon = Lock;
  readonly EyeIcon = Eye;

  scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }
}
