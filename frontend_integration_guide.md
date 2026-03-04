# Frontend Integration Guide: Eyang Estate API

This guide provides the technical specifications for the Angular frontend team to integrate with the Django REST Framework (DRF) backend.

## 1. Environment Configuration
- **Base URL**: `http://localhost:8000/`
- **API Version Path**: `api/`
- **Content Type**: `application/json`

---

## 2. Authentication (JWT Flow)
The system uses stateless JSON Web Tokens for authentication.

### Login (Obtain Tokens)
- **Endpoint**: `POST /api/token/`
- **Body**: `{ "username": "...", "password": "..." }`
- **Response**:
  ```json
  {
    "refresh": "eyJhbG...",
    "access": "eyJhbG..."
  }
  ```

### Refresh Token
- **Endpoint**: `POST /api/token/refresh/`
- **Body**: `{ "refresh": "your_refresh_token" }`

### Authenticated Requests
For all write operations (POST, PUT, DELETE), include the access token in the header:
`Authorization: Bearer <access_token>`

---

## 3. Data Interfaces (TypeScript)

```typescript
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface EstateImage {
  id: number;
  image: string; // Absolute URL
}

export interface Estate {
  id: number;
  owner: User;
  name: string;
  location: string;
  capacity: number;
  free: number;
  price: number;
  status: 'draft' | 'published' | 'archived';
  images: EstateImage[];
  description: string;
  distance: number;
  wifi: boolean;
  restaurant: boolean;
  generator: boolean;
}
```

---

## 4. Primary Endpoints

| Resource | URL | Method | Auth Required |
| :--- | :--- | :--- | :--- |
| **Estates List** | `/api/estates/` | GET | No |
| **Estate Detail** | `/api/estates/{id}/` | GET | No |
| **Create Estate** | `/api/estates/` | POST | Yes |
| **Update Estate** | `/api/estates/{id}/` | PATCH | Yes (Owner only) |
| **Post Review** | `/api/reviews/` | POST | No |
| **Quick Order** | `/api/orders/` | POST | No |

---

## 5. Implementation Patterns (Angular)

### Auth Interceptor
Collaborators should implement a `HttpInterceptor` to automatically attach the Bearer token from `localStorage` to outgoing requests.

### Service Example
```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Estate } from './models';

@Injectable({ providedIn: 'root' })
export class EstateService {
  constructor(private http: HttpClient) {}

  getEstates(): Observable<Estate[]> {
    return this.http.get<Estate[]>('http://localhost:8000/api/estates/');
  }
}
```

---

> [!TIP]
> Use the `status` field to filter estates on the dashboard. In the listing, only `published` estates should be visible by default.
