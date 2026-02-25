# JWT_SECRET vs JWT Token - Understanding the Difference

## Key Distinction

**`JWT_SECRET`** = Server-side secret key (set once, never changes)  
**JWT Token** = Per-user session token (generated fresh for each login)

## How It Works

### JWT_SECRET (Server Secret)
- **Purpose**: Cryptographic key used to **sign** and **verify** all JWT tokens
- **Lifetime**: Set once at server startup, remains constant
- **Storage**: Environment variable (`JWT_SECRET`)
- **Security**: Never sent to clients, never exposed in code
- **Why constant**: All tokens must be verifiable with the same secret

### JWT Token (Per-Session)
- **Purpose**: Authentication token for a specific user session
- **Lifetime**: Generated fresh for each login, expires after 24h (configurable)
- **Storage**: Browser `localStorage` (set by Navixy middleware)
- **Security**: Sent in `Authorization: Bearer <token>` header
- **Why per-session**: Each user gets a unique token with their user ID

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Server Startup                                           │
│    JWT_SECRET = "abc123..." (from environment)              │
│    └─> Used for ALL token signing/verification              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. User Login (Navixy middleware calls /api/auth/login)     │
│    ┌──────────────────────────────────────────────────┐    │
│    │ Server generates NEW JWT token:                  │    │
│    │ { userId: "uuid-123", email: "user@example.com" }│    │
│    │                                                   │    │
│    │ Signs with JWT_SECRET:                           │    │
│    │ token = jwt.sign(payload, JWT_SECRET)            │    │
│    └──────────────────────────────────────────────────┘    │
│    Returns: { token: "eyJhbGc..." }                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Client Stores Token                                      │
│    localStorage.setItem('auth_token', token)                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Subsequent API Requests                                  │
│    Client sends: Authorization: Bearer eyJhbGc...           │
│                                                              │
│    Server verifies:                                          │
│    jwt.verify(token, JWT_SECRET)  ← Same secret!            │
│    └─> Returns decoded user info                             │
└─────────────────────────────────────────────────────────────┘
```

## Why JWT_SECRET Must Be Constant

If `JWT_SECRET` changed per session:

❌ **Problem**: Old tokens become invalid
- User logs in → gets token signed with `JWT_SECRET_v1`
- Server restarts → `JWT_SECRET` changes to `JWT_SECRET_v2`
- User's token from step 1 → **VERIFICATION FAILS** (wrong secret)
- User must log in again (bad UX)

✅ **Solution**: Keep `JWT_SECRET` constant
- All tokens signed with same secret
- All tokens verifiable with same secret
- Tokens remain valid until expiration (24h default)

## What IS Generated Per Session

1. **JWT Token** (`server/routes/auth.js:37-41`)
   ```js
   const token = jwt.sign(
     { userId, email, role },  // ← Unique per user
     config.jwtSecret,          // ← Same for all
     { expiresIn: '24h' }
   );
   ```

2. **Session ID** (`server/middleware/session.js`)
   ```js
   const sid = crypto.randomBytes(32).toString('hex');  // ← Unique per browser
   ```

3. **User ID** (`server/routes/auth.js:17`)
   ```js
   const userId = uuidv4();  // ← Unique per user account
   ```

## Security Best Practices

✅ **DO**:
- Set `JWT_SECRET` as environment variable (never in code)
- Use a long, random secret (32+ characters)
- Keep `JWT_SECRET` constant across deployments
- Rotate `JWT_SECRET` only during maintenance windows (with user re-auth)

❌ **DON'T**:
- Generate `JWT_SECRET` per session
- Store `JWT_SECRET` in git or config files
- Expose `JWT_SECRET` to clients
- Change `JWT_SECRET` without planning token invalidation

## Current Implementation

- ✅ `JWT_SECRET`: Set once in Render environment variables
- ✅ JWT Token: Generated per login in `/api/auth/login`
- ✅ Token Storage: Browser `localStorage` (set by Navixy middleware)
- ✅ Token Verification: Uses same `JWT_SECRET` for all tokens

This is the **standard, secure approach** used by most JWT-based applications.
