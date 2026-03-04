import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent],
  template: `
    <div class="public-layout">
      <app-header [isPublic]="true"></app-header>
      
      <main class="public-content">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer (Canva Style) -->
      <footer class="public-footer">
        <div class="footer-content">
          <div class="footer-links">
            <a href="#">Conditions et assistance</a>
            <a href="#">Politique de confidentialité</a>
          </div>
          <div class="footer-credit">
            Créé avec Canva
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .public-layout { 
      min-height: 100vh; 
      display: flex; 
      flex-direction: column; 
      background: white; 
    }
    .public-content { 
      flex: 1; 
    }
    
    .public-footer {
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      color: rgba(255, 255, 255, 0.9);
      padding: 2rem 4rem;
      font-size: 13px;
      font-weight: 500;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .footer-links {
      display: flex;
      gap: 2.5rem;
    }
    
    .footer-links a {
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      transition: color 0.2s ease;
      font-weight: 500;
    }
    
    .footer-links a:hover {
      color: white;
      text-decoration: underline;
    }
    
    .footer-credit {
      font-style: italic;
      opacity: 0.7;
      font-size: 12px;
    }
    
    @media (max-width: 1024px) {
      .public-footer {
        padding: 1.75rem 2rem;
      }
      
      .footer-links {
        gap: 2rem;
      }
    }
    
    @media (max-width: 768px) {
      .public-footer {
        padding: 1.5rem 1.5rem;
        font-size: 12px;
      }
      
      .footer-content {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }
      
      .footer-links {
        flex-direction: column;
        gap: 0.75rem;
        width: 100%;
      }
      
      .footer-links a {
        font-size: 13px;
      }
      
      .footer-credit {
        font-size: 11px;
      }
    }
    
    @media (max-width: 480px) {
      .public-footer {
        padding: 1.25rem 1rem;
      }
      
      .footer-links a {
        font-size: 12px;
      }
    }
  `]
})
export class PublicLayoutComponent { }
