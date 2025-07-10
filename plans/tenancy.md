# 🎯 Tenant-Aware Invites Plan

## 📜 Overview

The application uses Auth0 to assign each user to a **single tenant**, ensuring strict tenant data isolation. Users interact only with their own tenant’s stories, comparisons, and metrics. However, some privileged users (those with the `invite:any_tenant` permission) may create **invite links for any tenant** and retrieve the list of all tenants — but they cannot perform any other cross-tenant operations.

Core principles:
✅ TenantId is **never specified by normal users** in requests.  
✅ TenantId is **inferred on the backend** from the Auth0 token for all operations.  
✅ Users with `invite:any_tenant` can create invites for other tenants, and retrieve the tenant list.  
✅ All other features (stories, comparisons) remain strictly tenant-scoped.

---

## ✅ What needs to be updated

- [ ] **Update frontend to remove tenantId**
  - Remove all hardcoded `tenantId` values from React components (`CreateStoriesPage`, `SliderPage`, etc.).
  - For normal users, the frontend must never include tenantId in any API requests.
  - For privileged users creating invites, tenantId can be included **only in the invite creation request**.

- [ ] **Update backend to infer tenantId from Auth0**
  - For all requests (except invite creation by privileged users), ignore any tenantId in the request body.
  - Enforce tenant scoping based on the tenantId in the user’s token claim.

- [ ] **Create invite creation page**
  - Accessible to users with permission to invite (`invite:any_tenant` or standard invite permissions).
  - For privileged users, provide a tenant selection dropdown (populated from `/api/tenants`).
  - For other users, hide tenant selection entirely.

---

## ✅ Endpoint: GET /api/tenants

### 🎯 Purpose
Retrieve the list of available tenants to display in the invite creation UI for privileged users.

### ✅ Checklist
- [ ] Create tenants dynamo table
- [ ] Create `getTenants.ts` Lambda handler in `sam/src/`.
- [ ] Add new `AWS::Serverless::Function` in `sam/template.yaml` for the `getTenants` endpoint.
- [ ] Grant the function read access to the `TenantsTable` (or wherever tenants are stored).
- [ ] Add `Events` to connect the function to a `GET /api/tenants` API Gateway endpoint.
- [ ] Enforce permission check:
  - Only allow if authenticated user has the `invite:any_tenant` permission in their token.
  - Otherwise, return `403 Forbidden`.

### 📥 Example Request
---
GET /api/tenants
Authorization: Bearer eyJhbGciOi...
---

### 📤 Example Response
---
[
  { "tenantId": "tenant-abc", "name": "Tenant ABC" },
  { "tenantId": "tenant-xyz", "name": "Tenant XYZ" }
]
---

### 🔥 Errors
- 403 Forbidden: if the user lacks `invite:any_tenant`.

---

## ✅ Endpoint: POST /api/invites

### 🎯 Purpose
Create an invite link for a new user.

### ✅ Checklist
- [x] Create `createInvite.ts` Lambda handler in `sam/src/`.
- [x] Add new `AWS::Serverless::Function` in `sam/template.yaml` for the create invite endpoint.
- [x] Grant the function write access to the `InvitesTable`.
- [x] Add `Events` to connect the function to a `POST /api/invites` API Gateway endpoint.
- [x] Validate input:
  - email: string — required.
  - role: string — required.
  - tenantId: string — optional:
    - Allowed only if user has `invite:any_tenant`.
    - Reject with 403 Forbidden if a non-privileged user includes tenantId.
  - If tenantId not included → backend assigns the invite to the tenantId from the token.
- [x] Generate a secure invite token and store invite details (inviteToken, targetTenantId, role, email, expiration) in InvitesTable.
- [x] Return the invite link to the frontend for emailing or further processing.
- [ ] update const inviteLink = `https://your-app.com/signup?invite=${inviteToken}`; to actually point to my app

### 📥 Example Request (privileged user)
---
POST /api/invites
Authorization: Bearer eyJhbGciOi...

{
  "email": "newuser@example.com",
  "tenantId": "tenant-abc",
  "role": "user"
}
---

### 📥 Example Request (normal user)
---
POST /api/invites
Authorization: Bearer eyJhbGciOi...

{
  "email": "newuser@example.com",
  "role": "user"
}
// Note: tenantId must NOT be included for normal users.
---

### 📤 Example Response
---
{
  "inviteLink": "https://your-app.com/signup?invite=abcdef123456"
}
---

### 🔥 Errors
- 403 Forbidden: if a user without `invite:any_tenant` includes tenantId.
- 400 Bad Request: if required fields are missing.

---

## ✅ Set up invite link functionality

- [x] **Token storage**
  - Store invite tokens in InvitesTable with:
    - inviteToken, targetTenantId, role, email, expiration.
- [ ] **Signup flow**
  - During signup with an invite link:
    - Backend validates invite token.
    - Assigns tenantId and role from invite details.
    - Marks invite as used or expired.
- [ ] **Emailing invites**
  - After creating the invite, send an email containing:
    - A unique signup link with the invite token:
      https://your-app.com/signup?invite=<token>.
- [ ] **Frontend signup page**
  - Add page that:
    - Reads the invite token from the query string.
    - Guides user through Auth0 signup.
    - Completes invite flow by confirming the token on the backend.

---

## 🚦 Additional considerations

- **Backend rejection of invalid tenantId**
  - For users without `invite:any_tenant`, backend immediately rejects any request including tenantId in the body with 403 Forbidden.

- **Logging & Auditing**
  - Consider logging who creates invites, for which tenants, and when.

---

## 📖 Concise summary of the plan

- All users operate strictly within their assigned tenant for stories and comparisons.
- TenantId is always inferred by the backend from the Auth0 token; it’s never trusted from frontend requests.
- Users with `invite:any_tenant` permission can:
  - Fetch the list of all tenants.
  - Create invites for any tenant by specifying tenantId.
- Invite links assign new users to the correct tenant and role, based on server-stored invite details.

This setup ensures **strong tenant isolation**, minimal attack surface, and fine-grained permission control over who can create users across tenants.

---
