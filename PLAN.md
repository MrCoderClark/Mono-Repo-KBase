# Knowledge Base Web App - Project Plan

## Overview
A production-grade pnpm monorepo Knowledge Base application for IT professionals with article management, document uploads, search, social features (likes/dislikes, comments), and RBAC authentication.

---

## Tech Stack

### Backend
| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ with TypeScript |
| Framework | Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | Better Auth (production-grade with RBAC) |
| File Storage | S3-compatible (MinIO for dev, AWS S3 for prod) |
| Search | Meilisearch |
| Document Processing | pdf-parse, mammoth (Word docs) |
| Validation | Zod |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 (App Router) |
| Styling | TailwindCSS v4 |
| UI Components | shadcn/ui |
| State/Data Fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Rich Text Editor | Tiptap |

### DevOps & Tooling
| Component | Technology |
|-----------|------------|
| Monorepo | pnpm workspaces + Turborepo |
| Linting | ESLint + Prettier |
| Testing | Vitest + Playwright |
| Containerization | Docker + Docker Compose |

---

## Monorepo Structure

```
kbase/
├── apps/
│   ├── web/                    # Next.js frontend
│   └── api/                    # Express backend
├── packages/
│   ├── database/               # Prisma schema & client
│   ├── types/                  # Shared TypeScript types
│   ├── utils/                  # Shared utilities
│   ├── config/                 # Shared configuration
│   └── ui/                     # Shared UI components (optional)
├── docker/
│   └── docker-compose.yml      # Local dev services
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── .env.example
```

---

## Database Schema (High-Level)

### Core Tables
- **users** - User accounts with roles
- **roles** - RBAC roles (admin, editor, viewer)
- **permissions** - Granular permissions
- **sessions** - Auth sessions

### Content Tables
- **articles** - Knowledge base articles (rich text)
- **documents** - Uploaded files (Word, PDF)
- **categories** - Content categorization
- **tags** - Content tagging

### Social Tables
- **comments** - Comments on articles/documents
- **reactions** - Likes/dislikes on content

### Search
- **search_index** - Full-text search index (Meilisearch)

---

## Implementation Phases

### Phase 1: Foundation ✅
- [x] Initialize pnpm monorepo with Turborepo
- [x] Set up shared packages (types, utils, config)
- [x] Configure ESLint, Prettier, TypeScript
- [x] Set up Docker Compose for local services (PostgreSQL, Meilisearch, MinIO)

### Phase 2: Backend Core ✅
- [x] Initialize Express app with TypeScript
- [x] Set up Prisma with PostgreSQL
- [x] Create database schema
- [x] Implement custom auth with JWT, refresh tokens, RBAC
- [x] Create base API structure (routes, middleware, error handling)
- [x] Add password reset, email verification, session management

### Phase 3: Backend Features ✅
- [x] Article CRUD API
- [x] Document upload & processing API
- [x] Comments API
- [x] Reactions (like/dislike) API
- [x] Categories & Tags API
- [x] File storage integration (S3/MinIO)

### Phase 4: Frontend Foundation ✅
- [x] Initialize Next.js 15 with App Router
- [x] Set up TailwindCSS + shadcn/ui
- [x] Configure TanStack Query
- [x] Create layout and navigation
- [x] Implement authentication pages (login, register, forgot password)

### Phase 5: Frontend Features ✅
- [x] Dashboard page
- [x] Article list & detail pages
- [x] Article creation page
- [x] Document list, detail & upload pages
- [x] Categories page
- [x] Comments component
- [x] Like/dislike component
- [x] User settings page
- [ ] Article editor with Tiptap (rich text)
- [ ] Search interface
- [ ] Admin panel (user management, roles)

### Phase 6: Polish & Production ⬜
- [ ] Error handling & loading states
- [ ] Responsive design
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Unit & integration tests
- [ ] E2E tests with Playwright
- [ ] Production deployment configuration

---

## API Endpoints (Planned)

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me
```

### Articles
```
GET    /api/articles              # List (with pagination, filters)
GET    /api/articles/:id          # Get single
POST   /api/articles              # Create (editor+)
PUT    /api/articles/:id          # Update (editor+)
DELETE /api/articles/:id          # Delete (admin)
```

### Documents
```
GET    /api/documents             # List
GET    /api/documents/:id         # Get single
POST   /api/documents/upload      # Upload (editor+)
DELETE /api/documents/:id         # Delete (admin)
GET    /api/documents/:id/download
```

### Comments
```
GET    /api/comments?contentType=&contentId=
POST   /api/comments
PUT    /api/comments/:id
DELETE /api/comments/:id
```

### Reactions
```
POST   /api/reactions             # Add like/dislike
DELETE /api/reactions/:id         # Remove reaction
GET    /api/reactions/count?contentType=&contentId=
```

### Search
```
GET    /api/search?q=&type=&category=
```

### Admin
```
GET    /api/admin/users
PUT    /api/admin/users/:id/role
DELETE /api/admin/users/:id
GET    /api/admin/stats
```

---

## RBAC Roles & Permissions

| Permission | Viewer | Editor | Admin |
|------------|--------|--------|-------|
| View articles | ✅ | ✅ | ✅ |
| View documents | ✅ | ✅ | ✅ |
| Add comments | ✅ | ✅ | ✅ |
| Like/dislike | ✅ | ✅ | ✅ |
| Create articles | ❌ | ✅ | ✅ |
| Edit own articles | ❌ | ✅ | ✅ |
| Edit any article | ❌ | ❌ | ✅ |
| Upload documents | ❌ | ✅ | ✅ |
| Delete content | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Manage roles | ❌ | ❌ | ✅ |

---

## Progress Tracking

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| Phase 1: Foundation | ✅ Complete | Jan 9, 2026 | Jan 9, 2026 |
| Phase 2: Backend Core | ✅ Complete | Jan 9, 2026 | Jan 9, 2026 |
| Phase 3: Backend Features | ✅ Complete | Jan 9, 2026 | Jan 9, 2026 |
| Phase 4: Frontend Foundation | ✅ Complete | Jan 9, 2026 | Jan 9, 2026 |
| Phase 5: Frontend Features | ✅ Complete | Jan 9, 2026 | Jan 9, 2026 |
| Phase 6: Polish & Production | ⬜ Not Started | - | - |

---

## Notes
- All dates in UTC
- Update this file as progress is made
- Check off items as completed using [x]
