# Phased Implementation Plan: Monolith to Decoupled (DRF + Angular)

This plan outlines the staged transition of the EyangEstate platform from a monolithic Django application to a modern decoupled architecture.

## Phase 1: Base Infrastructure & Security Setup
> **Goal**: Prepare the environment for an API-first communication.

### [MODIFY] [settings.py](file:///c:/Users/UsER/Documents/Django%20Tutorial/Django/EyangEstate/MegaPro/project1/settings.py)
- **CORS Configuration**: Install and configure `django-cors-headers`.
- **DRF Integration**: Add `rest_framework` and `django_filters`.
- **JWT Auth**: Configure `djangorestframework-simplejwt` for stateless authentication.
- **REST_FRAMEWORK Settings**: Define default permission and authentication classes.

---

## Phase 2: Database Evolution (City-Wide Expansion)
> **Goal**: Refactor models to support multi-owner publishing and improved data integrity.

### [MODIFY] [models.py](file:///c:/Users/UsER/Documents/Django%20Tutorial/Django/EyangEstate/MegaPro/app1/models.py)
- **Estate Model**: Add `owner` (ForeignKey to User) and any missing fields currently living in JS data (e.g., specific feature tags).
- **QuickOrder Model**: Convert `estate` CharField to a ForeignKey relationship for robust booking tracking.
- **Migrations**: Create and run schema migrations. Update existing data to link to a default system user.

---

## Phase 3: Core API Development (DRF Layer)
> **Goal**: Build the standard JSON interface for all system functions.

### [NEW] [serializers.py](file:///c:/Users/UsER/Documents/Django%20Tutorial/Django/EyangEstate/MegaPro/app1/serializers.py)
- Implement `EstateSerializer` with nested `EstateImageSerializer`.
- Implement `ReviewSerializer` with support for hierarchical replies.
- Implement `QuickOrderSerializer` for reservation submissions.

### [NEW] [api_views.py](file:///c:/Users/UsER/Documents/Django%20Tutorial/Django/EyangEstate/MegaPro/app1/api_views.py)
- **EstateViewSet**: Full CRUD with optimized querysets.
- **ReviewViewSet**: Endpoints for listing and posting reviews.
- **OrderViewSet**: Processing reservations.
- **Auth Endpoints**: Integration with JWT token views (`TokenObtainPairView`, `TokenRefreshView`).

---

## Phase 4: Frontend Scaffolding (Angular Map)
> **Goal**: Provide the structural blueprint for frontend collaborators.

### Modular Architecture
- **CoreModule**: Global services (API, Auth, Interceptors).
- **SharedModule**: Universal UI components (Cards, Navbar).
- **Features Modules**:
    - `EstateModule`: List, Detail, Search.
    - `AuthModule`: Login, Registration flows.
    - `UserModule`: Dashboard and Profile management.

---

## Phase 5: Verification & Cutover
> **Goal**: Validate the transition and decommission the legacy templates.

- **Automated API Testing**: Verify permission logic (e.g., only owners can edit estates).
- **Data Integrity Audit**: Ensure reservations are correctly linked to estates post-migration.
- **Legacy Removal**: Remove HTML templates and static JS files once the Angular app is stable.

## Verification Plan

### Automated Tests
1.  **Backend API Tests**:
    - Run `python manage.py test app1.tests.api` (newly created tests).
    - Verify JWT token generation and authentication.
    - Verify CRUD operations for `Estate` and `QuickOrder` via DRF ViewSets.
2.  **Linting**:
    - Run `flake8` for backend.

### Manual Verification
1.  **Postman/Insomnia**:
    - Test `/api/token/` for JWT login.
    - Test `/api/estates/` for list and detail views.
    - Verify CORS headers are present in responses.
2.  **Data Migration**:
    - Verify existing estate data is correctly linked to a default or migrated "owner" user.
