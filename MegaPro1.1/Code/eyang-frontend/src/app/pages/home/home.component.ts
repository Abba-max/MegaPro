/* ===== IMPORTS ===== */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

* {
    font-family: 'Plus Jakarta Sans', sans-serif;
}

.home-container {
    min-height: 100vh;
    padding-bottom: 5rem;
    background: #F8FAFC;
}

/* ===== HERO SECTION WITH BG IMAGE ===== */
.hero-section {
    min-height: 560px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 5rem 1rem 6rem;
    overflow: hidden;
}

.hero-bg-image {
    position: absolute;
    inset: 0;
    background-image: url('/assets/images/home.jpg');
    background-size: cover;
    background-position: center 30%;
    background-repeat: no-repeat;
    filter: blur(3px) brightness(0.55) saturate(0.9);
    transform: scale(1.05);
    z-index: 0;
}

.hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
        160deg,
        rgba(15, 23, 42, 0.65) 0%,
        rgba(30, 58, 138, 0.45) 50%,
        rgba(15, 23, 42, 0.70) 100%
    );
    z-index: 1;
}

.hero-content {
    position: relative;
    z-index: 2;
    max-width: 820px;
}

.hero-eyebrow {
    display: inline-block;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: rgba(255, 255, 255, 0.95);
    padding: 6px 18px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.03em;
    margin-bottom: 1.25rem;
}

.hero-title {
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    font-weight: 900;
    color: #FFFFFF;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin-bottom: 1.25rem;
    text-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
}

.hero-subtitle {
    font-size: clamp(1rem, 2vw, 1.2rem);
    color: rgba(255, 255, 255, 0.88);
    max-width: 640px;
    margin: 0 auto;
    line-height: 1.7;
    font-weight: 400;
}

.hero-tags {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 2rem;
    flex-wrap: wrap;
}

.hero-tag {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    padding: 0.625rem 1.25rem;
    border-radius: 50px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #FFFFFF;
    transition: all 0.25s ease;
}

.hero-tag:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateY(-2px);
}

.tag-icon {
    width: 16px;
    height: 16px;
    color: #93C5FD;
}

/* ===== HERO SEARCH BAR ===== */
.hero-search-wrapper {
    display: flex;
    justify-content: center;
    padding: 0 1rem;
}

.hero-search-bar {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.97);
    border-radius: 16px;
    padding: 6px 6px 6px 20px;
    width: 100%;
    max-width: 580px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);
    gap: 10px;
}

.hero-search-icon {
    width: 20px;
    height: 20px;
    color: #9CA3AF;
    flex-shrink: 0;
}

.hero-search-bar input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 15px;
    color: #111827;
    background: transparent;
    font-weight: 500;
    min-width: 0;
}

.hero-search-bar input::placeholder {
    color: #9CA3AF;
    font-weight: 400;
}

.hero-search-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #1D4ED8;
    color: white;
    border: none;
    padding: 12px 22px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.25s ease;
    white-space: nowrap;
    flex-shrink: 0;
}

.hero-search-btn:hover {
    background: #1E40AF;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(29, 78, 216, 0.4);
}

.btn-search-icon {
    width: 16px;
    height: 16px;
}

@media (max-width: 480px) {
    .hero-search-bar {
        padding: 6px;
        border-radius: 14px;
    }
    .hero-search-icon {
        display: none;
    }
    .hero-search-bar input {
        padding-left: 10px;
        font-size: 14px;
    }
    .hero-search-btn span {
        display: none;
    }
    .hero-search-btn {
        padding: 12px 14px;
    }
}

/* Scroll indicator */
.scroll-indicator {
    position: absolute;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
}

.scroll-dot {
    width: 6px;
    height: 40px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 3px;
    animation: scrollPulse 2s ease-in-out infinite;
}

@keyframes scrollPulse {
    0%, 100% { opacity: 0.4; transform: scaleY(0.6); }
    50% { opacity: 1; transform: scaleY(1); }
}

/* ===== FILTER BAR ===== */
.filter-bar-container {
    display: flex;
    justify-content: center;
    margin-top: -28px;
    position: relative;
    z-index: 10;
    padding: 0 1rem;
}

.filter-bar {
    background: #FFFFFF;
    padding: 10px 14px;
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
    border: 1px solid #E5E7EB;
}

.filter-items {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.filter-item {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 14px;
    border-radius: 10px;
    background: transparent;
    border: 1px solid transparent;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
}

.filter-item.border {
    border-color: #D1D5DB;
    background: #F9FAFB;
}

.filter-item.active-filter {
    background: #EFF6FF;
    border-color: #BFDBFE;
    color: #1D4ED8;
}

.filter-item:hover {
    background: #F3F4F6;
    border-color: #E5E7EB;
}

.filter-icon { width: 16px; height: 16px; }
.orange { color: #F97316; }
.gray { color: #9CA3AF; }
.yellow { color: #F59E0B; }
.blue { color: #3B82F6; }

/* ===== LISTINGS SECTION ===== */
.listings-section {
    max-width: 1200px;
    margin: 3rem auto 0;
    padding: 0 2rem;
}
.section-title h2{
    align-items: center;
    display: flex;
}
.section-desc{
    align-items: center;
}
.section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
}

.section-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: #0F172A;
}

.section-desc {
    font-size: 14px;
    color: #6B7280;
    margin-top: 4px;
}

.listing-count-badge {
    background: #EFF6FF;
    color: #1D4ED8;
    font-size: 13px;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 20px;
    border: 1px solid #BFDBFE;
}

.listings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
}

/* ===== HOUSING CARDS ===== */
.housing-card {
    border-radius: 18px;
    background: #FFFFFF;
    border: 1px solid #E5E7EB;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    animation: slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    opacity: 0;
    cursor: pointer;
}

.housing-card:hover {
    transform: translateY(-5px);
        box-shadow: 0 20px 48px rgba(0, 0, 0, 0.13);
        border-color: #BFDBFE;
}

.housing-card:nth-child(1) {
    animation-delay: 0.05s;
}

.housing-card:nth-child(2) {
    animation-delay: 0.12s;
}

.housing-card:nth-child(3) {
    animation-delay: 0.19s;
}

.housing-card:nth-child(4) {
    animation-delay: 0.26s;
}

.housing-card:nth-child(5) {
    animation-delay: 0.33s;
}

.housing-card:nth-child(6) {
    animation-delay: 0.40s;
}

/* ── Image area ─────────────────────────── */
.card-image-area {
    height: 210px;
    position: relative;
    overflow: hidden;
}

.image-wrapper {
    width: 100%;
    height: 100%;
    transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
}

.housing-card:hover .image-wrapper {
    transform: scale(1.07);
}

.image-wrapper img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.image-wrapper.no-image {
    background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
    display: flex;
    align-items: center;
    justify-content: center;
}

.icon-building {
    width: 72px;
        height: 72px;
    color: #93C5FD;
    opacity: 0.45;
}

/* Gradient overlay on image bottom */
.card-image-area::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 40%, rgba(10, 18, 40, 0.55) 100%);
    pointer-events: none;
}

/* ── Badges overlay (top) ───────────────── */
.badges-overlay {
    position: absolute;
    top: 0.875rem;
        left: 0.875rem;
        right: 0.875rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
        z-index: 6;
}

.badge-places {
    background: #10B981;
    color: white;
    padding: 4px 11px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 11.5px;
        letter-spacing: 0.02em;
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.35);
}

.badge-rating {
    background: rgba(255, 255, 255, 0.96);
        padding: 4px 9px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 800;
    font-size: 12px;
    color: #111827;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
}

.icon-star {
    width: 12px;
    height: 12px;
    color: #F59E0B;
}

/* ── Cite type badge (bottom-left of image) */
.card-type-badge {
    position: absolute;
    bottom: 0.875rem;
        left: 0.875rem;
        z-index: 6;
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 3px 11px;
    border-radius: 20px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

/* ── Card body ──────────────────────────── */
.card-body {
    padding: 1.1rem 1.25rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0;
}

.housing-title {
    font-size: 1rem;
    font-weight: 800;
    color: #0F172A;
    line-height: 1.35;
        margin-bottom: 0.45rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
}

/* ── Meta rows (distance, published) ───── */
.card-meta-row {
    display: flex;
    align-items: center;
    gap: 5px;
        font-size: 12.5px;
    font-weight: 500;
    color: #64748B;
        margin-bottom: 3px;
    }
    
    .meta-icon {
        width: 13px;
        height: 13px;
        flex-shrink: 0;
    }
    
    .meta-icon.red {
        color: #EF4444;
    }
    
    .meta-icon.green {
        color: #10B981;
    }
    
    .published-row {
        color: #10B981;
        font-weight: 700;
        font-size: 11.5px;
}

/* ── Divider ────────────────────────────── */
.card-divider {
    height: 1px;
    background: #F1F5F9;
    margin: 0.65rem 0;
}

/* ── Feature icons (icon-only chips) ───── */
.features-icons-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    min-height: 32px;
        margin-bottom: 0.75rem;
}

/* Features icon+text tags */
.features-tags-row {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
}

.feat-tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
}

.feat-tag.wifi  { background: #FFF7ED; color: #EA580C; border: 1px solid #FED7AA; }
.feat-tag.water { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
.feat-tag.gen   { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }
.feat-tag.resto { background: #F0FDF4; color: #16A34A; border: 1px solid #BBF7D0; }

.feat-icon {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
}

.feat-icon.gray { color: #94A3B8; }

/* Capacity chip */
.capacity-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #F1F5F9;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 4px 9px;
    font-size: 11px;
    font-weight: 700;
    color: #475569;
}

/* ── Price row ──────────────────────────── */
.price-row {
    display: flex;
    align-items: baseline;
    gap: 3px;
        padding-top: 0.65rem;
    border-top: 1px solid #F1F5F9;
}

.price-amount {
    font-size: 1.2rem;
        font-weight: 900;
    color: #1D4ED8;
    letter-spacing: -0.02em;
    }
    
    .price-currency {
        font-size: 12px;
        font-weight: 700;
        color: #1D4ED8;
        opacity: 0.75;
}

.price-period {
    font-size: 11.5px;
    font-weight: 600;
    color: #94A3B8;
    margin-left: 2px;
}

.icon-xs {
    width: 13px;
    height: 13px;
}

/* ════ TOAST NOTIFICATIONS ════ */
.toast-container {
    position: fixed;
    top: 1.25rem;
    right: 1.25rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
}

.toast {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 16px;
    border-radius: 12px;
    min-width: 280px;
    max-width: 380px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 8px 24px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08);
    pointer-events: all;
    cursor: pointer;
    animation: toastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes toastIn {
    from { opacity: 0; transform: translateX(100%); }
    to   { opacity: 1; transform: translateX(0); }
}

.toast-success { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
.toast-error   { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }
.toast-warning { background: #FFFBEB; color: #92400E; border: 1px solid #FDE68A; }
.toast-info    { background: #EFF6FF; color: #1E40AF; border: 1px solid #BFDBFE; }

.toast-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
}

.toast-msg {
    flex: 1;
    line-height: 1.4;
}

.toast-close {
    font-size: 16px;
    opacity: 0.5;
    flex-shrink: 0;
}

.stat-loading {
    opacity: 0.4;
    animation: pulse 1.2s ease infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 0.8; }
}

/* ===== WHY CHOOSE US ===== */
.why-section {
    background: #FFFFFF;
    padding: 5rem 2rem;
    margin-top: 4rem;
}

.why-container {
    max-width: 1200px;
    margin: 0 auto;
    text-align: center;
}

.section-badge {
    display: inline-block;
    background: #EFF6FF;
    color: #1D4ED8;
    padding: 6px 18px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
    margin-bottom: 1rem;
    border: 1px solid #BFDBFE;
}

.section-badge.dark {
    background: #0F172A;
    color: #F8FAFC;
    border-color: #1E293B;
}

.why-title {
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    font-weight: 900;
    color: #0F172A;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin-bottom: 1rem;
}

.why-subtitle {
    font-size: 1rem;
    color: #64748B;
    max-width: 600px;
    margin: 0 auto 3rem;
    line-height: 1.7;
}

.why-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    text-align: left;
}

.why-card {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 16px;
    padding: 1.75rem;
    transition: all 0.3s ease;
}

.why-card:hover {
    background: #FFFFFF;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    transform: translateY(-4px);
    border-color: #CBD5E1;
}

.why-icon-wrap {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.25rem;
}

.blue-grad { background: linear-gradient(135deg, #EFF6FF, #DBEAFE); color: #1D4ED8; }
.green-grad { background: linear-gradient(135deg, #ECFDF5, #D1FAE5); color: #059669; }
.orange-grad { background: linear-gradient(135deg, #FFF7ED, #FED7AA); color: #EA580C; }
.purple-grad { background: linear-gradient(135deg, #F5F3FF, #EDE9FE); color: #7C3AED; }
.teal-grad { background: linear-gradient(135deg, #F0FDFA, #CCFBF1); color: #0D9488; }
.pink-grad { background: linear-gradient(135deg, #FFF1F2, #FFE4E6); color: #E11D48; }

.why-icon { width: 26px; height: 26px; }

.why-card-title {
    font-size: 1rem;
    font-weight: 800;
    color: #0F172A;
    margin-bottom: 0.5rem;
}

.why-card-text {
    font-size: 14px;
    color: #64748B;
    line-height: 1.6;
}

/* ===== STATS BANNER ===== */
.stats-banner {
    background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%);
    padding: 3rem 2rem;
    position: relative;
    overflow: hidden;
}

.stats-banner::before {
    content: '';
    position: absolute;
    inset: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.stats-container {
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2rem;
    position: relative;
    flex-wrap: wrap;
}

.stat-item {
    text-align: center;
    padding: 0 2rem;
}

.stat-number {
    display: block;
    font-size: 2.5rem;
    font-weight: 900;
    color: #FFFFFF;
    letter-spacing: -0.03em;
    line-height: 1;
}

.stat-label {
    display: block;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 6px;
    font-weight: 500;
}

.stat-divider {
    width: 1px;
    height: 50px;
    background: rgba(255, 255, 255, 0.15);
}

/* ===== TESTIMONIALS ===== */
.testimonials-section {
    background: #F8FAFC;
    padding: 5rem 2rem;
}

.testimonials-container {
    max-width: 1200px;
    margin: 0 auto;
    text-align: center;
}

.testimonials-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    text-align: left;
    margin-top: 3rem;
}

.testimonial-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 16px;
    padding: 1.75rem;
    transition: all 0.3s ease;
}

.testimonial-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    transform: translateY(-4px);
}

.testimonial-card.featured {
    background: linear-gradient(135deg, #0F172A, #1E3A8A);
    border-color: transparent;
}

.testimonial-card.featured .testimonial-text {
    color: rgba(255, 255, 255, 0.85);
}

.testimonial-card.featured .author-name {
    color: #FFFFFF;
}

.testimonial-card.featured .author-role {
    color: rgba(255, 255, 255, 0.55);
}

.testimonial-stars {
    font-size: 14px;
    margin-bottom: 1rem;
    letter-spacing: 2px;
}

.testimonial-text {
    font-size: 14px;
    color: #475569;
    line-height: 1.7;
    margin-bottom: 1.5rem;
    font-style: italic;
}

.testimonial-author {
    display: flex;
    align-items: center;
    gap: 12px;
}

.author-avatar {
    width: 42px;
    height: 42px;
    background: linear-gradient(135deg, #1D4ED8, #3B82F6);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 13px;
    flex-shrink: 0;
}

.author-avatar.green-av {
    background: linear-gradient(135deg, #059669, #10B981);
}

.author-avatar.orange-av {
    background: linear-gradient(135deg, #EA580C, #F97316);
}

.author-name {
    font-weight: 800;
    color: #0F172A;
    font-size: 14px;
}

.author-role {
    font-size: 12px;
    color: #94A3B8;
    margin-top: 2px;
}

/* ===== FAQ CARDS ===== */
.faq-section {
    background: #FFFFFF;
    padding: 5rem 2rem;
}

.faq-container {
    max-width: 1100px;
    margin: 0 auto;
    text-align: center;
}

.faq-cards-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-top: 2.5rem;
    text-align: left;
}

.faq-card {
    background: #F8FAFC;
    border: 1.5px solid #E2E8F0;
    border-radius: 16px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.25s ease;
}

.faq-card:hover {
    border-color: #93C5FD;
    background: #F0F9FF;
    box-shadow: 0 4px 16px rgba(29, 78, 216, 0.08);
    transform: translateY(-2px);
}

.faq-card.open {
    background: #FFFFFF;
    border-color: #1D4ED8;
    box-shadow: 0 8px 24px rgba(29, 78, 216, 0.12);
}

.faq-card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 1.125rem 1.25rem;
}

.faq-card-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: linear-gradient(135deg, #EFF6FF, #DBEAFE);
    color: #1D4ED8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 14px;
    flex-shrink: 0;
    transition: all 0.25s ease;
}

.faq-card.open .faq-card-icon {
    background: linear-gradient(135deg, #1D4ED8, #2563EB);
    color: white;
}

.faq-card-question {
    flex: 1;
    font-weight: 700;
    color: #0F172A;
    font-size: 14px;
    line-height: 1.5;
}

.faq-toggle-icon {
    font-size: 1.5rem;
    font-weight: 300;
    color: #94A3B8;
    transition: transform 0.3s ease, color 0.2s ease;
    flex-shrink: 0;
    line-height: 1;
}

.faq-toggle-icon.open {
    transform: rotate(45deg);
    color: #1D4ED8;
}

.faq-card-answer {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.faq-card-answer.visible {
    max-height: 300px;
}

.faq-card-answer p {
    padding: 0 1.25rem 1.125rem;
    color: #475569;
    font-size: 13.5px;
    line-height: 1.7;
    border-top: 1px solid #E2E8F0;
    padding-top: 1rem;
    margin: 0;
}

@media (max-width: 768px) {
    .faq-cards-grid {
        grid-template-columns: 1fr;
    }
}



/* ===== CTA SECTION ===== */
.cta-section {
    position: relative;
    padding: 5rem 2rem;
    text-align: center;
    overflow: hidden;
}

.cta-bg {
    position: absolute;
    inset: 0;
    background-image: url('/assets/images/home.jpg');
    background-size: cover;
    background-position: center;
    filter: blur(4px) brightness(0.4);
    transform: scale(1.05);
}

.cta-content {
    position: relative;
    z-index: 1;
    max-width: 700px;
    margin: 0 auto;
}

.cta-title {
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    font-weight: 900;
    color: #FFFFFF;
    letter-spacing: -0.02em;
    margin-bottom: 1rem;
}

.cta-subtitle {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1rem;
    line-height: 1.7;
    margin-bottom: 2rem;
}

.cta-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
}

.cta-btn-primary {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #FFFFFF;
    color: #0F172A;
    padding: 14px 28px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 15px;
    text-decoration: none;
    transition: all 0.25s ease;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
}

.cta-btn-primary:hover {
    background: #F8FAFC;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.cta-btn-outline {
    display: flex;
    align-items: center;
    background: transparent;
    color: #FFFFFF;
    border: 2px solid rgba(255, 255, 255, 0.5);
    padding: 14px 28px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 15px;
    text-decoration: none;
    transition: all 0.25s ease;
    backdrop-filter: blur(6px);
}

.cta-btn-outline:hover {
    border-color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
}

.btn-icon { width: 18px; height: 18px; }

/* ===== ANIMATIONS ===== */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
}

.fade-in {
    animation: fadeIn 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* ===== UTILITIES ===== */
.mt-1 { margin-top: 0.25rem; }
.mt-3 { margin-top: 0.75rem; }
.mt-4 { margin-top: 1rem; }
.mt-6 { margin-top: 1.5rem; }

/* ===== RESPONSIVE ===== */
@media (max-width: 1024px) {
    .why-grid, .testimonials-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    .listings-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    .stats-container {
        gap: 1rem;
    }
    .stat-item {
        padding: 0 1.25rem;
    }
    .stat-divider {
        display: none;
    }
}

@media (max-width: 768px) {
    .hero-section { min-height: 460px; padding: 3rem 1rem 5rem; }
    .hero-title { font-size: 1.875rem; }
    .hero-tags { gap: 0.5rem; }
    .why-grid, .testimonials-grid { grid-template-columns: 1fr; }
    .listings-grid { grid-template-columns: 1fr; }
    .stats-container { flex-direction: column; gap: 1.5rem; }
    .stat-number { font-size: 2rem; }
    .listings-section { padding: 0 1rem; }
    .why-section, .faq-section, .testimonials-section { padding: 3rem 1rem; }
    .cta-section { padding: 3rem 1rem; }
    .section-header { flex-direction: column; gap: 0.75rem; }
    .filter-bar { width: 100%; }
    .filter-items { flex-wrap: wrap; }
}

@media (max-width: 480px) {
    .hero-section { min-height: 380px; }
    .hero-title { font-size: 1.5rem; }
    .hero-eyebrow { font-size: 12px; }
    .why-title { font-size: 1.5rem; }
    .cta-buttons { flex-direction: column; align-items: center; }
    .cta-btn-primary, .cta-btn-outline { width: 100%; justify-content: center; }
}