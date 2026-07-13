// Centralized Content Management System
// All text content for the webapp is controlled from this file

export const content = {
  // Application Info
  app: {
    name: 'Horizon Digital',
    tagline: 'Your digital transformation partner for modern business solutions',
    version: '3.1.0'
  },

  // Authentication Pages
  auth: {
    login: {
      title: 'Welcome Back',
      subtitle: 'Sign in to your account to continue',
      emailLabel: 'Email Address',
      emailPlaceholder: 'Enter your email',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot your password?',
      loginButton: 'Sign In',
      noAccount: "Don't have an account?",
      signUpLink: 'Sign up here',
      loginError: 'Invalid email or password. Please try again.'
    },
    register: {
      title: 'Create Account',
      subtitle: 'Join Horizon Digital today',
      emailLabel: 'Email Address',
      emailPlaceholder: 'Enter your email',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Create a password',
      confirmPasswordLabel: 'Confirm Password',
      confirmPasswordPlaceholder: 'Confirm your password',
      registerButton: 'Create Account',
      hasAccount: 'Already have an account?',
      signInLink: 'Sign in here',
      registerError: 'Registration failed. Please try again.',
      passwordMismatch: 'Passwords do not match'
    }
  },

  // Dashboard
  dashboard: {
    welcome: {
      title: 'Welcome back',
      subtitle: 'Here\'s what\'s happening with your projects today'
    },
    cards: {
      totalProjects: {
        title: 'Total Projects',
        description: 'Active projects in progress'
      },
      completedTasks: {
        title: 'Completed Tasks',
        description: 'Tasks finished this month'
      },
      teamMembers: {
        title: 'Team Members',
        description: 'Active team members'
      },
      revenue: {
        title: 'Revenue',
        description: 'Total revenue this quarter'
      }
    },
    recentActivity: {
      title: 'Recent Activity',
      noActivity: 'No recent activity to show'
    }
  },

  // Sidebar Navigation
  sidebar: {
    menuItems: {
      dashboard: 'Dashboard',
      jobs: 'Jobs',
      calendar: 'Calendar',
      clients: 'Clients',
      employees: 'Employees',
      invoicing: 'Invoicing',
      skillMatrix: 'Skill Matrix',
      discoverySession: 'Discovery Session',
      feedback: 'Feedback',
      settings: 'Settings'
    },
    user: {
      logout: 'Logout'
    }
  },

  // Header
  header: {
    welcome: 'Welcome',
    dashboard: 'Dashboard',
    login: 'Login',
    register: 'Register',
    logout: 'Logout'
  },

  // Common UI Elements
  common: {
    buttons: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      filter: 'Filter',
      submit: 'Submit',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      previous: 'Previous'
    },
    messages: {
      loading: 'Loading...',
      error: 'Something went wrong. Please try again.',
      success: 'Operation completed successfully',
      noData: 'No data available',
      unauthorized: 'You are not authorized to access this resource',
      networkError: 'Network error. Please check your connection.'
    },
    forms: {
      required: 'This field is required',
      invalidEmail: 'Please enter a valid email address',
      passwordTooShort: 'Password must be at least 8 characters',
      passwordsNoMatch: 'Passwords do not match'
    }
  },

  // Meta Information
  meta: {
    title: 'Horizon Digital',
    description: 'Horizon Digital - Your digital transformation partner for modern business solutions',
    keywords: 'digital transformation, business solutions, technology, consulting'
  }
} as const

// Type for content keys (for TypeScript support)
export type ContentKey = keyof typeof content
export type AuthContentKey = keyof typeof content.auth
export type DashboardContentKey = keyof typeof content.dashboard

// Helper function to get nested content
export const getContent = (path: string): string => {
  const keys = path.split('.')
  let result: unknown = content
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key]
    } else {
      console.warn(`Content path "${path}" not found`)
      return path // Return the path as fallback
    }
  }
  
  return typeof result === 'string' ? result : path
}
