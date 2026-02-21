# System Structure Proposal: Eyang Estate Decoupled Architecture

This document details the proposed structural changes for transitioning from a monolithic Django application to a decoupled Django (Backend) + Angular (Frontend) system.

## 1. Directory Layout

```text
/EyangEstate
  ├── /backend/                 # Django Root
  │    ├── manage.py
  │    ├── project/             # formerly project1
  │    │    ├── settings.py     # Refactored for API-first
  │    │    └── urls.py         # API routing
  │    └── apps/
  │         └── estate_app/     # formerly app1
  │              ├── models.py  # Refactored for City-wide Marketplace
  │              ├── serializers.py
  │              ├── viewsets.py
  │              └── urls.py
  ├── /frontend/                # Angular Root
  │    ├── src/
  │    │    ├── app/
  │    │    │    ├── core/      # Auth, Services, Interceptors
  │    │    │    ├── features/  # Estate, Dashboard, Booking
  │    │    │    └── shared/    # UI Components
  │    ├── angular.json
  │    └── package.json
  └── docker-compose.yml        # Orchestration (Optional)
```

## 2. Backend Design (DRF)

### Stateless Authentication (SimpleJWT)
- **JWT Provider**: `djangorestframework-simplejwt`.
- **Flow**: Frontend sends credentials to `/api/token/`, receives `access` and `refresh` tokens.
- **Security**: Stateless sessions; tokens stored in memory or HttpOnly cookies by the frontend team.

### Database Evolution
- **Estate Model**:
    - `owner`: FK to `User` (mandatory for the city-wide marketplace expansion).
    - `status`: Enum (Draft, Published, Archived).
- **QuickOrder Model**:
    - `estate`: FK to `Estate` (replacing CharField for data integrity).
    - `order_status`: Enum (Pending, Confirmed, Cancelled).

## 3. Frontend Architecture (Angular)

### Core Modules
- **AuthModule**: Handles login, logout, registration, and JWT interceptors.
- **EstateModule**: Responsible for listing, filtering (Distance, Price, Features), and detail viewing.
- **OrderModule**: Handles the reservation flow (`QuickOrder`).

### Modular Component Mapping
| Current Template | Angular Component | Responsibility |
| :--- | :--- | :--- |
| `index.html` | `HomeComponent` | Hero section, Grid layout container. |
| (Fragment) | `EstateCardComponent` | Display individual estate preview. |
| `dashboard.html` | `DashboardComponent` | User stats, pending orders, and reviews. |
| `quick_order.html` | `BookingFormComponent` | Step-by-step reservation process. |

## 4. Migration Strategy

1.  **Phase 1: API Scaffolding**: Implement DRF Serializers and Viewsets alongside existing Views.
2.  **Phase 2: Database Refactor**: Execute migrations for `owner` and `FK` relationships. Populate default owners for legacy data.
3.  **Phase 3: Auth Shift**: Enable JWT and disable SessionAuthentication for the `/api/` prefix.
4.  **Phase 4: Frontend Development**: (Collaborators) Build Angular components using the new API.
5.  **Phase 5: Cutover**: Point the domain to the Angular build and decommission old Django templates.

---

> [!IMPORTANT]
> This transition enables the future mobile application by providing a standardized JSON interface for all system functions.
