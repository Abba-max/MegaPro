import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule, ShieldCheck, AlertTriangle, FileText, Home } from 'lucide-angular';
import { environment } from '../../../environments/environment';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-verify-invoice',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './verify-invoice.component.html',
  styleUrl: './verify-invoice.component.css'
})
export class VerifyInvoiceComponent implements OnInit {
  readonly OkIcon      = ShieldCheck;
  readonly WarnIcon    = AlertTriangle;
  readonly InvoiceIcon = FileText;
  readonly HomeIcon    = Home;

  isLoading = signal(true);
  invoice: any = null;
  notFound  = false;
  invoiceId = '';
  year = new Date().getFullYear();


  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit(): void {
    this.invoiceId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.invoiceId) { this.notFound = true; this.isLoading.set(false); return; }
    this.http.get<any[]>(`${environment.apiUrl}/invoices/?invoice_id=${this.invoiceId}`)
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res && Array.isArray(res) && res.length > 0) {
          this.invoice = res[0];
        } else {
          this.notFound = true;
        }
        this.isLoading.set(false);
      });
  }

  fmt(iso: string): string {
    try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); }
    catch { return iso; }
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  }
}
