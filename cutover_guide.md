# Final Cutover & Verification Guide

This guide outlines the last steps to finalize the transition and ensure the system is ready for the frontend team.

## 1. Final API Verification
To ensure everything is working as expected, you can perform these manual checks:

### Verify Estate Listing
Run the server: `python manage.py runserver`
Open your browser or Postman and visit: `http://127.0.0.1:8000/apps.estate_app/api/estates/`
*   **Success**: You should see a JSON list of estates (even if it's an empty list `[]`).

### Verify Token Endpoint
In Postman, send a `POST` request to `http://127.0.0.1:8000/api/token/` with a valid JSON body:
```json
{
    "username": "your_username",
    "password": "your_password"
}
```
*   **Success**: You should receive an `access` and `refresh` token.

---

## 2. Cutover Steps (Decommissioning Monolith)

As the Angular app takes over, follow these steps to remove the legacy monolithic parts:

1.  **Backup Legacy Templates**: Ensure you have a backup of the `backend/template/` directory.
2.  **Redirect Root URL**: Once the Angular app is deployed to a proxy (like Nginx or a cloud provider), you can change the root URL in `backend/project/urls.py` to point solely to a "Frontend Redirect" or just the API.
3.  **Clean up Settings**: 
    *   Remove `whitenoise` from `MIDDLEWARE` if you are hosting the Angular app separately (e.g., on S3 or Vercel).
    *   Set `DEBUG = False` and update `ALLOWED_HOSTS`.

---

## 3. Deployment Checklist
- [ ] Environment variables (`.env`) updated in production.
- [ ] `CORS_ALLOWED_ORIGINS` includes the production frontend domain.
- [ ] Database migrations applied on the server.
- [ ] Media files storage (S3 or similar) configured for images.

---

> [!NOTE]
> Your backend is now a standard DRF API. It can serve the new Angular web app, a mobile app, or any other third-party services in the future.
