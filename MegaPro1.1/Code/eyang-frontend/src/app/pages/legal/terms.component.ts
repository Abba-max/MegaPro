import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, FileText, CheckCircle, AlertTriangle, Scale } from 'lucide-angular';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  template: `
    <div class="legal-page">
      <div class="legal-header">
        <div class="container">
          <div class="legal-badge">
            <lucide-icon [img]="ScaleIcon" class="icon-sm"></lucide-icon>
            {{ 'terms.title' | translate }}
          </div>
          <h1>{{ 'terms.title' | translate }}</h1>
          <p class="last-updated">{{ 'terms.last_updated' | translate }}</p>
        </div>
      </div>

      <div class="container legal-container">
        <div class="legal-grid">
          <aside class="legal-nav">
            <div class="nav-card">
              <h3>{{ 'terms.summary_title' | translate }}</h3>
              <ul>
                <li><a (click)="scrollTo('acceptance')">{{ 'terms.nav.acceptance' | translate }}</a></li>
                <li><a (click)="scrollTo('use')">{{ 'terms.nav.use' | translate }}</a></li>
                <li><a (click)="scrollTo('liability')">{{ 'terms.nav.liability' | translate }}</a></li>
                <li><a (click)="scrollTo('termination')">{{ 'terms.nav.termination' | translate }}</a></li>
              </ul>
            </div>
          </aside>

          <div class="legal-content">
            <section id="acceptance">
              <h2>{{ 'terms.sections.acceptance.title' | translate }}</h2>
              <p>{{ 'terms.sections.acceptance.text' | translate }}</p>
              <div class="alert-box">
                <lucide-icon [img]="AlertIcon" class="alert-ico"></lucide-icon>
                <p>{{ 'terms.sections.acceptance.alert' | translate }}</p>
              </div>
            </section>

            <section id="use">
              <h2>{{ 'terms.sections.use.title' | translate }}</h2>
              <p>{{ 'terms.sections.use.text' | translate }}</p>
              <ul class="check-list">
                <li>
                  <lucide-icon [img]="CheckIcon" class="check-ico"></lucide-icon>
                  {{ 'terms.sections.use.item1' | translate }}
                </li>
                <li>
                  <lucide-icon [img]="CheckIcon" class="check-ico"></lucide-icon>
                  {{ 'terms.sections.use.item2' | translate }}
                </li>
                <li>
                  <lucide-icon [img]="CheckIcon" class="check-ico"></lucide-icon>
                  {{ 'terms.sections.use.item3' | translate }}
                </li>
              </ul>
            </section>

            <section id="liability">
              <h2>{{ 'terms.sections.liability.title' | translate }}</h2>
              <p>{{ 'terms.sections.liability.text' | translate }}</p>
            </section>

            <section id="termination">
              <h2>{{ 'terms.sections.termination.title' | translate }}</h2>
              <p>{{ 'terms.sections.termination.text' | translate }}</p>
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
      background: linear-gradient(135deg, var(--accent) 0%, #d97706 100%);
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
      color: var(--accent);
    }
    section p {
      color: var(--text-muted);
      line-height: 1.7;
      margin-bottom: 1rem;
    }
    .alert-box {
      display: flex;
      gap: 1rem;
      padding: 1.25rem;
      background: #FFFBEB;
      border-left: 4px solid var(--accent);
      border-radius: 8px;
      margin-top: 1rem;
    }
    .alert-ico {
      color: var(--accent);
      flex-shrink: 0;
      width: 20px;
      height: 20px;
    }
    .alert-box p {
      margin-bottom: 0;
      font-size: 0.95rem;
      color: #92400E;
    }
    .check-list {
      list-style: none;
      padding: 0;
    }
    .check-list li {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
    }
    .check-ico {
      color: #10B981;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }
  `]
})
export class TermsComponent {
  readonly ScaleIcon = Scale;
  readonly AlertIcon = AlertTriangle;
  readonly CheckIcon = CheckCircle;

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
