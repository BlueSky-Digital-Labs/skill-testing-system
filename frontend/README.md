# React 19 Frontend Boilerplate

A production-ready React 19 frontend boilerplate built with TypeScript, Vite, and Redux Toolkit. This starter template provides a solid foundation for building modern web applications with centralized content management, comprehensive design system, and enterprise-grade development tools.

## 🎯 What's Included

This boilerplate comes pre-configured with:
- ⚛️ **React 19** with latest features and JSX transform
- 🔷 **TypeScript** for full type safety
- ⚡ **Vite** for lightning-fast development and builds
- 🗂️ **Redux Toolkit** for predictable state management
- 🎨 **Comprehensive Design System** with CSS custom properties
- 📝 **Centralized Content Management** for easy text updates
- 🏗️ **Atomic Design Architecture** for scalable components
- 🐳 **Docker Support** with multi-environment configurations
- 🔒 **Authentication System** ready for backend integration
- 📱 **Responsive Design** with mobile-first approach
- 🛠️ **Development Tools** (ESLint, Husky, lint-staged)
- 🚀 **Production Optimized** builds and deployment

## 🚀 Getting Started

### 1. Clone or Use This Template

```bash
# Clone the repository
git clone <your-repo-url>
cd frontend

# Or use as GitHub template
# Click "Use this template" button on GitHub
```

### 2. Prerequisites
- Node.js 24+ 
- Bun (preferred) or npm
- Docker & Docker Compose (optional, for containerized development)

### 3. Setup Your Project

```bash
# Install dependencies
bun install
# or
npm install

# Start development server
bun run dev
# or
npm run dev

# Build for production
bun run build
# or
npm run build
```

### 4. Customize for Your Project

1. **Update Content**: Edit `src/content/index.ts` with your app's text content
2. **Branding**: Replace logo files in `src/assets/images/`
3. **Theme**: Customize colors in `src/styles/theme.css`
4. **App Name**: Update `package.json`, `index.html`, and content files
5. **API Integration**: Configure your backend endpoints in `src/services/`

### Docker Development

```bash
# Start development environment
make dev

# Build production image
make build

# View logs
make logs

# Stop services
make down
```

## 📁 Project Structure

```
frontend/
├── public/                     # Static assets
│   ├── favicon.svg            # Horizon Digital favicon
│   └── vite.svg              # Default Vite icon
├── src/
│   ├── assets/               # Application assets
│   │   └── images/          # Logo and image files
│   │       ├── HD_LOGO.05c83a78cc145c1d05b98dc498e68ee5.svg
│   │       ├── horizon-digital-logo.png
│   │       └── horizon-digital-logo-lg.png
│   ├── components/          # Reusable UI components (Atomic Design)
│   │   ├── atoms/          # Basic building blocks
│   │   │   ├── Button/     # Button component with variants
│   │   │   ├── Input/      # Form input component
│   │   │   └── Logo/       # Horizon Digital logo component
│   │   ├── molecules/      # Combinations of atoms
│   │   │   └── DashboardCard/  # Dashboard metric cards
│   │   ├── organisms/      # Complex UI sections
│   │   │   ├── Header/     # Application header
│   │   │   ├── Sidebar/    # Navigation sidebar
│   │   │   └── ProtectedRoute/  # Route protection wrapper
│   │   └── templates/      # Page layouts
│   │       ├── Layout/     # Main application layout
│   │       └── DashboardLayout/  # Dashboard-specific layout
│   ├── content/            # 🎯 Centralized Content Management
│   │   └── index.ts       # All application text content
│   ├── hooks/             # Custom React hooks
│   │   ├── useAuth.ts     # Authentication hook
│   │   ├── useContent.ts  # Content management hooks
│   │   └── index.ts       # Hook exports
│   ├── pages/             # Application pages (organized by feature)
│   ├── pages/             # Application pages (organized by feature)
│   │   ├── auth/          # Authentication pages
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── SignIn.tsx
│   │   │   ├── ForgotPassword.tsx
│   │   │   ├── ResetPassword.tsx
│   │   │   ├── LoginPage.css
│   │   │   ├── AuthPages.css
│   │   │   └── index.ts
│   │   └── dashboard/     # Dashboard pages
│   │       ├── DashboardPage.tsx
│   │       ├── DashboardPage.css
│   │       └── index.ts
│   ├── services/          # API and external services
│   │   ├── api.ts         # Base API configuration
│   │   └── authService.ts # Legacy authentication API calls
│   ├── api/               # Fetch-based auth API client
│   │   ├── auth.ts
│   │   ├── authStorage.ts
│   │   └── http.ts
│   ├── store/             # Redux store configuration
│   │   ├── slices/        # Redux slices
│   │   │   └── authSlice.ts
│   │   └── index.ts       # Store setup
│   ├── styles/            # Global styles and theme
│   │   └── theme.css      # CSS custom properties (design system)
│   ├── types/             # TypeScript type definitions
│   │   ├── auth.ts        # Authentication types
│   │   └── api.ts         # API response types
│   ├── utils/             # Utility functions
│   │   ├── cn.ts          # Class name utility
│   │   └── index.ts       # Utility exports
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # Application entry point
│   └── index.css          # Global styles
├── Dockerfile             # Docker configuration
├── entrypoint.sh          # Docker entrypoint script
├── Makefile              # Development commands
├── compose.dev.yml       # Development Docker Compose
├── compose.prod.yml      # Production Docker Compose
├── compose.uat.yml       # UAT Docker Compose
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## 🎨 Design System

### Theme System
The application uses a comprehensive CSS custom properties system defined in `src/styles/theme.css`:

```css
:root {
  /* Primary Colors - Dark Navy */
  --hd-primary: #1a2332;
  --hd-primary-light: #2d3748;
  --hd-primary-dark: #0f1419;
  
  /* Secondary Colors - Purple Accent */
  --hd-secondary: #8b5cf6;
  --hd-secondary-light: #a78bfa;
  --hd-secondary-dark: #7c3aed;
  
  /* Sidebar Specific */
  --hd-sidebar-bg: #1a2332;
  --hd-sidebar-text: #e2e8f0;
  --hd-sidebar-active: #8b5cf6;
}
```

### Component Architecture (Atomic Design)

#### Atoms
- **Button**: Primary, secondary, outline, ghost variants
- **Input**: Form inputs with validation states
- **Logo**: Horizon Digital branding with multiple sizes

#### Molecules
- **DashboardCard**: Metric display cards with icons

#### Organisms
- **Header**: Top navigation with user menu
- **Sidebar**: Left navigation with menu items
- **ProtectedRoute**: Authentication wrapper

#### Templates
- **Layout**: Main application shell
- **DashboardLayout**: Dashboard-specific layout

## 🎯 Content Management System

### Centralized Content Architecture
This boilerplate includes a powerful centralized content management system. All text content is managed from a single source: `src/content/index.ts`

```typescript
export const content = {
  app: {
    name: 'Your App Name',           // 👈 Customize this
    tagline: 'Your app description'  // 👈 Customize this
  },
  auth: {
    login: {
      title: 'Welcome Back',
      subtitle: 'Sign in to your account to continue',
      loginButton: 'Sign In'
    }
  },
  dashboard: {
    welcome: {
      title: 'Welcome back',
      subtitle: 'Here\'s what\'s happening today'
    }
  }
  // Add your own content sections here
}
```

### Why Centralized Content?
- **Single Source of Truth**: All text in one place
- **Easy Internationalization**: Ready for multi-language support
- **Consistent Messaging**: Unified tone across the application
- **Quick Updates**: Change content without touching components
- **Type Safety**: Full TypeScript support for content keys

### Content Hooks
Access content easily with custom hooks:

```typescript
// Specific content sections
const authContent = useAuthContent()
const dashboardContent = useDashboardContent()
const sidebarContent = useSidebarContent()

// Path-based access
const title = useContent('auth.login.title')

// Full content object
const { auth, dashboard } = useContent()
```

### Usage in Components
```typescript
const LoginPage = () => {
  const authContent = useAuthContent()
  
  return (
    <div>
      <h1>{authContent.login.title}</h1>
      <p>{authContent.login.subtitle}</p>
      <button>{authContent.login.loginButton}</button>
    </div>
  )
}
```

## 🔐 Authentication System

### Redux Store
Authentication state is managed with Redux Toolkit:

```typescript
// Login
dispatch(loginUser({ email, password }))

// Register
dispatch(registerUser({ email, password, password_confirm }))

// Logout
dispatch(logout())
```

### Protected Routes
Routes are protected using the `ProtectedRoute` component:

```typescript
<Route
  path="/dashboard"
  element={
    <ProtectedRoute isAuthenticated={isAuthenticated}>
      <DashboardPage />
    </ProtectedRoute>
  }
/>
```

### API Integration
Authentication integrates with the Django backend through `src/api/auth.ts`:

| Function | Endpoint | Description |
|----------|----------|-------------|
| `signIn(email, password)` | `POST /api/auth/token/` | Obtain JWT access and refresh tokens |
| `refreshToken(refresh)` | `POST /api/auth/token/refresh/` | Refresh an access token |
| `forgotPassword(email)` | `POST /api/auth/password/forgot/` | Request a password reset email |
| `resetPassword(token, newPassword)` | `POST /api/auth/password/reset/` | Confirm password reset |

Tokens are stored in `localStorage` via `src/api/authStorage.ts`. Optional `src/api/http.ts` retries authorized requests once after a `401` by refreshing the access token.

### Auth Routes

| Route | Page |
|-------|------|
| `/auth/sign-in` | Email/password sign-in |
| `/auth/forgot` | Forgot password request |
| `/auth/reset?token=...` | Reset password with token |

Legacy Redux login/register pages remain at `/login` and `/register`.

### Admin User & Role Management

System administrators (`SYSTEM_ADMIN` role) can manage users and roles from the dashboard sidebar:

| Route | Page | Access |
|-------|------|--------|
| `/admin/users` | User list, search, create/edit modal, activation toggle | `SYSTEM_ADMIN` |
| `/admin/roles` | Role list, create/edit modal | `SYSTEM_ADMIN` |

**Initial access:** You need at least one active user with the `SYSTEM_ADMIN` role before these pages are available. Seed or promote an administrator via the backend (Django admin, management command, or database migration) and sign in at `/auth/sign-in`. The sidebar shows **Users** and **Roles** only when the current session passes the system-admin access check (`GET /api/admin/roles/`).

**API client:** `src/api/admin.ts` wraps `GET/POST/PATCH /api/admin/users/` and `/api/admin/roles/`, including role assignment via `assign-role` / `remove-role` actions when creating or updating users.

## 🛠 Development Tools

### Available Scripts

```bash
# Development
bun run dev          # Start development server
bun run build        # Build for production
bun run preview      # Preview production build
bun run lint         # Run ESLint
bun run test         # Run Vitest smoke tests

# Docker Commands (via Makefile)
make dev            # Start development environment
make build          # Build production image
make logs           # View container logs
make down           # Stop all services
make install        # Install dependencies in container
```

### Code Quality
- **ESLint**: Code linting with React 19 rules
- **TypeScript**: Full type safety
- **Husky**: Git hooks for pre-commit checks (includes build verification)
- **lint-staged**: Run linters on staged files
- **Build Check**: Automatic build verification before each commit

### Environment Configuration

`VITE_API_BASE_URL` must be set for local development when the API is not served from the same origin as the Vite dev server. Copy `env.example` to `.env` before starting the app:

```bash
cp env.example .env
```

#### Development (.env)
```env
# Backend API origin used by fetch-based auth client (without trailing slash)
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=Horizon Digital
```

When `VITE_API_BASE_URL` is unset, the frontend uses relative `/api/...` requests. In local Vite development, the proxy in `vite.config.ts` forwards `/api` to the backend.

#### Docker Environment
- **Development**: `compose.dev.yml`
- **Production**: `compose.prod.yml`
- **UAT**: `compose.uat.yml`

### Manual verification (auth pages)

1. Copy `frontend/env.example` to `frontend/.env` and set `VITE_API_BASE_URL=http://localhost:8000`.
2. Start the backend API and run `npm run dev` in `frontend/`.
3. Visit `/auth/sign-in`, sign in with a valid user, and confirm redirect to `/dashboard`.
4. Visit `/auth/forgot`, submit an email, and confirm the generic success message appears.
5. Open `/auth/reset?token=<valid-token>` and reset the password; confirm the success message and sign-in link.

## 🐳 Docker Configuration

### Multi-Stage Build
The Dockerfile uses multi-stage builds for optimization:

1. **Dependencies**: Install packages with bun/npm fallback
2. **Build**: Create production build
3. **Runtime**: Serve application

### Package Manager Fallback
Supports both bun and npm with automatic fallback:

```dockerfile
# Try bun first, fallback to npm
RUN if command -v bun >/dev/null 2>&1; then \
        bun install; \
    else \
        npm install; \
    fi
```

### Environment-Specific Configs
- **Development**: Hot reload, source maps
- **Production**: Optimized build, preview server
- **UAT**: Production-like environment for testing

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile */
@media (max-width: 480px) { }

/* Tablet */
@media (max-width: 768px) { }

/* Desktop */
@media (max-width: 1200px) { }
```

### Mobile-First Approach
All components are built mobile-first with progressive enhancement for larger screens.

## 🔧 Configuration Files

### Vite Configuration (`vite.config.ts`)
- Path aliases for clean imports
- Proxy configuration for API calls
- Development server settings

### TypeScript Configuration (`tsconfig.json`)
- Strict type checking
- Path mapping for aliases
- React 19 JSX transform

### ESLint Configuration (`eslint.config.js`)
- React 19 specific rules
- TypeScript integration
- Import/export linting

## 🚀 Deployment

### Production Build
```bash
# Build optimized bundle
bun run build

# Preview production build locally
bun run preview
```

### Docker Production
```bash
# Build production image
docker build -t horizon-digital-frontend .

# Run production container
docker run -p 3000:3000 horizon-digital-frontend
```

## 🔒 Pre-Commit Quality Checks

The project uses Husky to enforce code quality before every commit. The pre-commit hook automatically runs:

### 1. Code Quality Checks
- **ESLint**: Lints all staged files
- **Prettier**: Formats code according to project standards
- **TypeScript**: Type checking on staged files

### 2. Build Verification
- **Full Build**: Runs `bun run build` (or `npm run build`)
- **Type Checking**: Ensures TypeScript compilation succeeds
- **Bundle Creation**: Verifies the production build works

### Pre-Commit Process Flow
```bash
🔍 Running pre-commit checks...
📝 Checking code quality...
   ✓ ESLint passed
   ✓ Prettier formatting applied
   ✓ TypeScript types valid

🏗️ Checking if project builds successfully...
   ✓ TypeScript compilation successful
   ✓ Vite build completed
   ✓ Production bundle created

✅ All pre-commit checks passed!
```

### If Checks Fail
```bash
❌ Build failed. Please fix the build errors and try again.
```

The commit will be **blocked** until all issues are resolved. This ensures:
- No broken code enters the repository
- Consistent code quality across the team
- Production builds always work
- TypeScript errors are caught early

### Bypassing Checks (Not Recommended)
```bash
# Only in emergency situations
git commit --no-verify -m "Emergency fix"
```

## 🔄 Working with Husky & Code Contributions

### Understanding Husky Pre-Commit Hooks

Husky automatically runs quality checks before every commit to ensure code quality and prevent broken code from entering the repository.

### Code Contribution Workflow

#### 1. **Making Changes**
```bash
# Make your code changes
# Edit files, add features, fix bugs, etc.
```

#### 2. **Stage Your Changes**
```bash
# Stage specific files
git add src/components/MyComponent.tsx

# Or stage all changes
git add .
```

#### 3. **Commit (Triggers Husky)**
```bash
git commit -m "feat: add new user dashboard component"
```

**What happens automatically:**
- 🔍 **Lint-staged runs**: Checks only your staged files
- 📝 **ESLint**: Fixes linting issues automatically where possible
- 🎨 **Prettier**: Formats your code to project standards
- 🔧 **TypeScript**: Validates types in staged files
- 🏗️ **Build Check**: Runs full build to ensure nothing is broken
- ✅ **Success**: Commit proceeds if all checks pass
- ❌ **Failure**: Commit is rejected if any check fails

#### 4. **Push to Repository**
```bash
# Push to your branch
git push origin feature/my-new-feature

# Or push to main (if you have permissions)
git push origin main
```

### Handling Pre-Commit Failures

#### **ESLint Errors**
```bash
❌ ESLint failed with 3 errors
```
**Solution:**
```bash
# Fix the errors manually or run ESLint with --fix
bun run lint:fix
# Or
npm run lint:fix

# Then commit again
git add .
git commit -m "fix: resolve linting issues"
```

#### **TypeScript Errors**
```bash
❌ Build failed: TypeScript compilation errors
```
**Solution:**
```bash
# Check TypeScript errors
bun run type-check
# Or
npm run type-check

# Fix the type errors in your code
# Then commit again
git add .
git commit -m "fix: resolve TypeScript errors"
```

#### **Build Failures**
```bash
❌ Build failed: Vite build errors
```
**Solution:**
```bash
# Run build locally to see the full error
bun run build
# Or
npm run build

# Fix the build issues
# Then commit again
git add .
git commit -m "fix: resolve build errors"
```

### Advanced Husky Usage

#### **Commit Message Format**
```bash
# Good commit messages (follows conventional commits)
git commit -m "feat: add user authentication system"
git commit -m "fix: resolve login redirect issue"
git commit -m "docs: update API documentation"
git commit -m "style: improve button component styling"
git commit -m "refactor: optimize dashboard performance"
git commit -m "test: add unit tests for auth service"

# Poor commit messages (avoid these)
git commit -m "fix stuff"
git commit -m "updates"
git commit -m "wip"
```

#### **Working with Branches**
```bash
# Create feature branch
git checkout -b feature/user-dashboard

# Make changes and commit (Husky runs automatically)
git add .
git commit -m "feat: implement user dashboard layout"

# Push feature branch
git push origin feature/user-dashboard

# Create pull request for review
```

#### **Before Committing - Best Practices**
```bash
# 1. Test your changes locally
bun run dev
# Or
npm run dev

# 2. Run linting manually to catch issues early
bun run lint
# Or
npm run lint

# 3. Check TypeScript types
bun run type-check
# Or
npm run type-check

# 4. Test the build
bun run build
# Or
npm run build

# 5. Stage and commit (Husky will run all checks again)
git add .
git commit -m "feat: your descriptive commit message"
```

### Troubleshooting Husky

#### **Husky not running?**
```bash
# Reinstall Husky hooks
bun run prepare
# Or
npm run prepare

# Check if .git/hooks/pre-commit exists
ls -la .git/hooks/

# Verify Husky configuration
cat .husky/pre-commit
```

#### **Permission issues?**
```bash
# Make pre-commit hook executable
chmod +x .husky/pre-commit

# Check permissions
ls -la .husky/pre-commit
```

#### **Package manager conflicts?**
The pre-commit hook automatically detects and uses:
1. **Bun** (if available) - faster execution
2. **NPM** (fallback) - universal compatibility

```bash
# You can see which one is being used in the output:
# "Using bun for build check..." or "Using npm for build check..."
```

### Performance Tips

- **Partial staging**: Only stage files you want to commit to run checks on fewer files
  ```bash
  git add src/components/Button.tsx  # Only check this file
  ```
- **Local testing**: Run checks manually before committing to catch issues early
- **IDE integration**: Use ESLint and Prettier extensions in your editor for real-time feedback
- **Incremental commits**: Make smaller, focused commits for faster pre-commit checks

### Husky Configuration Files

#### **`.husky/pre-commit`** (Current Configuration)
```bash
echo "🔍 Running pre-commit checks..."

# Run lint-staged first (linting and formatting)
echo "📝 Checking code quality..."
npx lint-staged

# Check if lint-staged passed
if [ $? -ne 0 ]; then
  echo "❌ Lint-staged failed. Please fix the issues and try again."
  exit 1
fi

# Run build check
echo "🏗️  Checking if project builds successfully..."
if command -v bun >/dev/null 2>&1; then
  echo "Using bun for build check..."
  bun run build
else
  echo "Using npm for build check..."
  npm run build
fi

# Check if build passed
if [ $? -ne 0 ]; then
  echo "❌ Build failed. Please fix the build errors and try again."
  exit 1
fi

echo "✅ All pre-commit checks passed!"
```

#### **`package.json`** (lint-staged configuration)
```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix"
    ],
    "*.{json,css,md}": [
      "prettier --write"
    ]
  }
}
```

## 📋 Best Practices

### Component Development
1. Use atomic design principles
2. Implement proper TypeScript types
3. Follow the established naming conventions
4. Use centralized content system for all text

### State Management
1. Use Redux Toolkit for global state
2. Keep local state in components when appropriate
3. Use custom hooks for reusable logic

### Styling
1. Use CSS custom properties from theme system
2. Follow BEM methodology for class names
3. Implement responsive design mobile-first

### Content Management
1. All text content goes in `src/content/index.ts`
2. Use appropriate content hooks in components
3. Organize content by feature/section

## 🤝 Using This Boilerplate

### For Your Project
1. **Fork or Clone**: Use this as a starting point for your project
2. **Customize Content**: Update `src/content/index.ts` with your app's content
3. **Brand It**: Replace logos and update theme colors
4. **Extend Features**: Add your specific business logic and components
5. **Deploy**: Use the included Docker configuration for deployment

### Contributing to the Boilerplate
1. Follow the established folder structure
2. Use the centralized content system for all text
3. Implement proper TypeScript types
4. Test components in both light and dark themes
5. Ensure responsive design works across all breakpoints
6. Update documentation for new features

## 📚 Tech Stack

- **React 19**: Latest React with new features
- **TypeScript**: Full type safety
- **Vite**: Fast build tool and dev server
- **Redux Toolkit**: State management
- **React Router DOM**: Client-side routing
- **Axios**: HTTP client
- **Lucide React**: Icon library
- **Docker**: Containerization
- **Bun/NPM**: Package management with fallback

## 🎯 Key Features

- ✅ React 19 with latest features
- ✅ Centralized content management system
- ✅ Comprehensive design system
- ✅ Atomic design component architecture
- ✅ Full TypeScript support
- ✅ Redux Toolkit state management
- ✅ Protected routing
- ✅ Responsive design
- ✅ Docker containerization
- ✅ Multi-environment support
- ✅ Package manager fallback (bun/npm)
- ✅ Git hooks with Husky
- ✅ ESLint code quality
- ✅ Hot reload development

---

## 🎉 Ready to Build Something Amazing?

This boilerplate gives you everything you need to start building modern React applications. From authentication to responsive design, from centralized content management to production-ready Docker configurations - it's all here and ready to use.

### What's Next?
1. **Customize the content** in `src/content/index.ts`
2. **Update the branding** with your logos and colors
3. **Connect your backend** API endpoints
4. **Build your features** using the established patterns
5. **Deploy with confidence** using the included Docker setup

---

**React 19 Frontend Boilerplate** - Built with ❤️ using React 19 and modern web technologies.

*Start building your next great application today!* 🚀

