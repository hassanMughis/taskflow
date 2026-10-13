# Kanvero Backend

Standalone Express 5 and PostgreSQL API for the Kanvero board application. The frontend is intentionally not connected yet.

## Setup

1. Create a PostgreSQL database named `taskflow`.
2. Copy `.env.example` to `.env` and set the database credentials and JWT secret.
3. Install packages with `npm install`.
4. Apply schema changes with `npm run db:migrate`.
5. Start the API with `npm run dev`.

The default API address is `http://localhost:3000`. Check it with `GET /api/health`.

## Architecture

- `config/`: database configuration
- `migrations/`: ordered SQL schema changes, tracked in `schema_migrations`
- `models/`: Sequelize table definitions and relationships
- `middleware/`: authentication, resource authorization, 404s, and errors
- `controllers/`: HTTP validation and use-case logic
- `services/`: reusable domain behavior such as notifications
- `routes/`: endpoint definitions
- `test/`: Node test runner tests

The migration is explicit. The server does not call `sequelize.sync()`, so starting the application cannot silently modify production tables.

## Authentication

Register and log in first:

```http
POST /api/auth/register
Content-Type: application/json

{"name":"Hassan Mughis","email":"hassan@example.com","password":"password123"}
```

```http
POST /api/auth/login
Content-Type: application/json

{"email":"hassan@example.com","password":"password123"}
```

Send the returned token on protected routes:

```http
Authorization: Bearer <token>
```

## Endpoint Map

### Auth

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create a user |
| POST | `/api/auth/login` | Receive a JWT |
| GET | `/api/auth/me` | Read the signed-in user |

### Workspaces

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/workspaces` | List the personal workspace and invited workspaces |
| GET, PATCH, DELETE | `/api/workspaces/:id` | Read, edit, or delete a workspace |
| POST | `/api/workspaces/:id/members` | Add a registered user by email |
| DELETE | `/api/workspaces/:id/members/:userId` | Remove a member and their assignments |

Registration automatically creates a private personal workspace and its owner membership. Users can also see workspaces they have been invited to. The owner cannot be removed.

### Boards and Lists

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/boards?workspaceId=:id` | List active boards in a workspace |
| POST | `/api/boards` | Create a board and its default labels |
| GET | `/api/boards/:idOrSlug` | Read a complete nested board |
| PATCH, DELETE | `/api/boards/:idOrSlug` | Edit or delete a board |
| POST, DELETE | `/api/boards/:boardId/members[/:userId]` | Add or remove board members |
| POST | `/api/boards/:boardId/lists` | Create a list |
| PUT | `/api/boards/:boardId/lists/order` | Reorder all active lists |
| PATCH, DELETE | `/api/lists/:listId` | Rename/archive or delete a list |

Reorder request example:

```json
{"listIds":[8,3,12]}
```

The array must contain every active list exactly once.

Workspace membership does not grant access to its boards. A user must be added to each board separately, and only existing workspace members can be added to a board. The workspace owner can see and administer every board in that workspace.

### Cards

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/lists/:listId/cards` | Create a card |
| PATCH, DELETE | `/api/cards/:cardId` | Edit or delete a card |
| PUT | `/api/cards/:cardId/move` | Move/reorder a card transactionally |
| PUT, DELETE | `/api/cards/:cardId/labels/:labelId` | Assign or remove a label |
| PUT, DELETE | `/api/cards/:cardId/members/:userId` | Assign or remove a member |

New cards are automatically assigned to their creator. The creator cannot be unassigned. A move body is `{"listId": 4, "position": 0}`.

Card updates accept `title`, `description`, `completed`, cover fields, start/due dates, recurrence, reminders, and `archived`.

### Card Content

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/cards/:cardId/comments` | Add a comment |
| PATCH, DELETE | `/api/comments/:commentId` | Edit or delete a comment |
| POST | `/api/cards/:cardId/attachments` | Store attachment metadata |
| DELETE | `/api/attachments/:attachmentId` | Remove attachment metadata |
| POST | `/api/cards/:cardId/custom-fields` | Add a custom field |
| PATCH, DELETE | `/api/custom-fields/:fieldId` | Edit or delete a custom field |

Attachments currently accept `{name, url, mimeType, size}`. Uploading bytes to local/object storage is intentionally a separate step; the database stores the resulting URL.

### Labels and Notifications

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/boards/:boardId/labels` | Create a label |
| PATCH, DELETE | `/api/labels/:labelId` | Edit or delete a label |
| GET | `/api/notifications` | List notifications |
| PATCH | `/api/notifications/:id/read` | Mark one read |
| PATCH | `/api/notifications/read-all` | Mark all read |

Notification filters include `?unread=true`, `?type=card_comment`, and `?limit=30`. Invites, assignments, and comments create notifications.

## Suggested Learning Order

1. Follow registration through `auth.js`, `authController.js`, `userModel.js`, and PostgreSQL.
2. Follow workspace creation and see the owner membership transaction.
3. Create a board, list, and card, then inspect their foreign keys.
4. Move a card and study why all position updates share one transaction.
5. Add labels and members to understand many-to-many join tables.
6. Add a comment and trace the notification service.
7. Only after the API behavior is clear, replace frontend local storage one feature at a time.

## Verification

Run `npm run check` for syntax and unit tests. The database-backed API should also be exercised after migrations because relationship queries cannot be fully verified without PostgreSQL.
