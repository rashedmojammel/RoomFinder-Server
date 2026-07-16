# RoomFinder Server

The backend API for [RoomFinder](#) — a room/apartment rental marketplace. Built with Node.js, Express, and TypeScript, using the native MongoDB driver (no Mongoose/ORM).

This is a standalone repository, separate from the Next.js frontend. The two communicate only over HTTP/JSON, secured with JWTs issued by the frontend's better-auth instance.

---

## 🧰 Tech Stack

- Node.js + Express
- TypeScript
- MongoDB (native `mongodb` driver)
- `jose` (JWT verification against a remote JWKS endpoint)
- Multer + imgbb (image upload — optional path, most uploads happen client-side directly to imgbb)

---

## 📁 Project Structure

```
src/
├── lib/
│   ├── mongo.ts               # MongoClient, connect/close
│   ├── db.ts                   # getDb() accessor
│   └── notifications.ts        # createNotification() helper, called from other controllers
├── types/
│   ├── listing.ts
│   ├── booking.ts
│   ├── savedRoom.ts
│   ├── review.ts
│   └── notification.ts
├── controllers/
│   ├── listing.controller.ts
│   ├── booking.controller.ts
│   ├── savedRoom.controller.ts
│   ├── review.controller.ts
│   └── notification.controller.ts
├── routes/
│   └── *.routes.ts             # one per resource
├── middleware/
│   ├── asyncHandler.ts         # wraps async route handlers so rejections reach the error middleware
│   └── auth.ts                 # attachUser / requireAuth / requireRole — JWT verification
├── app.ts
└── server.ts
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- A MongoDB connection string
- The frontend (`Roomfinder`) running and reachable, since JWT verification depends on its JWKS endpoint

### Install
```bash
npm install
```

### Environment variables
Create `.env`:
```bash
PORT=5000
MONGODB_URI=
FRONTEND_URL=http://localhost:3000
AUTH_SERVER_URL=http://localhost:3000
```
`FRONTEND_URL` is used for CORS; `AUTH_SERVER_URL` is used to fetch the JWKS public keys for JWT verification. In most setups these are the same value.

### Run
```bash
npm run dev
```
API runs at `http://localhost:5000`.

### Build
```bash
npm run build
npm start
```

---

## 🔐 Authentication & Authorization

Every request that mutates data (and several reads) requires a valid JWT, issued by the frontend's better-auth instance and verified here against its public JWKS — **no shared secret between the two repos.**

```typescript
// middleware/auth.ts
attachUser   // parses the token if present, blocks nothing (applied globally in app.ts)
requireAuth  // blocks the request entirely without a valid token
requireRole(...roles)  // blocks unless req.user.userRole is in the allowed list
```

Identity for writes (`tenantId`, `ownerId`, `actorId`) is always derived from `req.user.id` (the verified token), **never** trusted from the request body — this closes an early gap where any client could act as any user by just typing a different ID into a request.

### Important dependency note
`jose` must stay pinned to **v4** (`jose@^4`). Version 5+ dropped CommonJS support and will crash on deploy with `ERR_REQUIRE_ESM`, since this project compiles to CommonJS. Do not upgrade without also migrating the whole `tsconfig.json` to `NodeNext` modules.

---

## 📡 API Reference

Base path: `/api`

### Listings — `/rooms`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | Public | Only returns `isAvailable: true` + `approvalStatus: "approved"` |
| GET | `/:id` | Public for approved; owner/admin only otherwise | 404s (not 403) to hide existence from strangers |
| GET | `/owner/:ownerId` | Owner or admin | |
| GET | `/admin/pending` | Admin | |
| GET | `/admin/all?status=` | Admin | |
| POST | `/` | Auth required | `ownerId` from token; always created as `pending` |
| PATCH | `/:id` | Owner or admin | Editing an approved listing resets it to `pending` unless it's a pure `isAvailable` toggle |
| PATCH | `/:id/approval` | Admin | Fires a notification to the owner |
| DELETE | `/:id` | Owner or admin | |

### Bookings — `/bookings`
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/` | Auth required | `tenantId` from token; blocks self-booking, duplicate pending requests, unavailable/unapproved rooms; fires a notification to the owner |
| GET | `/tenant/:tenantId` | That tenant or admin | |
| GET | `/owner/:ownerId` | That owner or admin | |
| GET | `/admin/all` | Admin | |
| PATCH | `/:id/status` | Owner (approve/reject) or tenant (cancel) | `actorId` from token; fires a notification to the other party |

### Saved Rooms — `/saved-rooms`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/:tenantId` | Auth required | |
| POST | `/` | Auth required | Idempotent — returns `"Already saved"` instead of erroring |
| DELETE | `/:tenantId/:listingId` | Auth required | |

### Reviews — `/reviews`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/listing/:listingId` | Public | Returns reviews + cached average/count |
| POST | `/` | Auth required | Only tenants with an **approved** booking on that listing; one review per tenant per listing (upserts); fires a notification to the owner on new reviews |
| DELETE | `/:id` | Review's own tenant, or admin | |

### Notifications — `/notifications`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | Auth required | Most recent 30, for the authenticated user |
| GET | `/unread-count` | Auth required | |
| PATCH | `/:id/read` | Auth required | Scoped to the caller's own notifications |
| PATCH | `/read-all` | Auth required | |

Full request/response examples: see `docs/postman-api-guide.md` and `docs/postman-jwt-guide.md` in the frontend repo.

---

## 🛡️ Error Handling

Every route is wrapped in `asyncHandler` so rejected promises reach the global error middleware instead of hanging silently:

```typescript
router.post("/", requireAuth, asyncHandler(createListing));
```

Error responses are always shaped `{ error: { message, code } }`; success responses vary by endpoint but are never wrapped in a generic envelope class.

---

## 📄 Known Limitations

- No rate limiting on any endpoint yet
- No pagination — `getAllListingsAdmin`, `getAllBookings`, etc. return everything, fine at current data scale
- `attachUser` populates `req.user` from the token but does not check whether the underlying better-auth session was revoked/signed-out — a token remains valid until its 15-minute expiry regardless of server-side session state
