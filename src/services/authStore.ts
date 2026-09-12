import { AdminPaymentConfig, PaymentPackage, PaymentRequest, UserAccount, UserSavedProject } from '../types/auth';

const USERS_STORAGE_KEY = 'vlooper_users_v2';
const CURRENT_USER_KEY = 'vlooper_current_user_v2';
const PAYMENT_CONFIG_KEY = 'vlooper_payment_config_v2';
const PAYMENTS_KEY = 'vlooper_payments_v2';
const USER_PROJECTS_PREFIX = 'vlooper_user_projects_';

export const DEFAULT_PACKAGES: PaymentPackage[] = [
  { id: 'pkg_25', credits: 25, priceInr: 25, label: 'Starter Pack' },
  { id: 'pkg_50', credits: 50, priceInr: 50, label: 'Standard Pack' },
  { id: 'pkg_100', credits: 100, priceInr: 100, label: 'Pro Creator Pack', popular: true },
  { id: 'pkg_200', credits: 200, priceInr: 200, label: 'Studio Mega Pack' },
];

export const DEFAULT_ADMIN: UserAccount = {
  id: 'usr_admin_yusuf',
  username: 'yusufadmin',
  password: 'yusuf2121@admin',
  email: 'mohammadyusuf8868@gmail.com',
  name: 'Mohammad Yusuf (Super Admin)',
  role: 'admin',
  credits: 999999,
  unlimitedAccess: true,
  recoveryEmail: 'mohammadyusuf8868@gmail.com',
  createdAt: new Date().toISOString(),
  signupProvider: 'local',
};

export const DEFAULT_PAYMENT_CONFIG: AdminPaymentConfig = {
  ratePerCredit: 1, // 1 INR = 1 Credit
  upiId: 'mohammad.yusuf@okhdfcbank',
  phoneNumber: '+91 9876543210',
  qrCodeUrl: '',
  autoApprove: true,
  recoveryEmail: 'mohammadyusuf8868@gmail.com',
  note: 'Pay via any UPI app (GPay, PhonePe, Paytm, BHIM, Cred) by scanning the QR code or clicking the app buttons. ₹1 = 1 Credit. Enter your 12-digit UTR/Txn ID for immediate credit.',
  packages: DEFAULT_PACKAGES,
};

export function getStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      const initial: UserAccount[] = [
        DEFAULT_ADMIN,
        {
          id: 'usr_demo_creator',
          username: 'creator',
          password: 'user123',
          email: 'creator@example.com',
          name: 'Demo Creator',
          role: 'user',
          credits: 5,
          unlimitedAccess: false,
          recoveryEmail: 'creator@example.com',
          createdAt: new Date().toISOString(),
          signupProvider: 'local',
        },
      ];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as UserAccount[];
    // Ensure the admin account exists with yusufadmin username
    const adminIndex = parsed.findIndex(
      (u) =>
        u.username.toLowerCase() === 'yusufadmin' ||
        u.email.toLowerCase() === 'mohammadyusuf8868@gmail.com'
    );
    if (adminIndex === -1) {
      parsed.unshift(DEFAULT_ADMIN);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return [DEFAULT_ADMIN];
  }
}

export function saveUsers(users: UserAccount[]) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export function getCurrentUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as UserAccount;
    // Keep in sync with stored users list
    const users = getStoredUsers();
    const found = users.find((u) => u.id === user.id);
    return found || user;
  } catch {
    return null;
  }
}

export function saveCurrentUser(user: UserAccount | null) {
  if (!user) {
    localStorage.removeItem(CURRENT_USER_KEY);
  } else {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }
}

export function getPaymentConfig(): AdminPaymentConfig {
  try {
    const raw = localStorage.getItem(PAYMENT_CONFIG_KEY);
    if (!raw) {
      localStorage.setItem(PAYMENT_CONFIG_KEY, JSON.stringify(DEFAULT_PAYMENT_CONFIG));
      return DEFAULT_PAYMENT_CONFIG;
    }
    return { ...DEFAULT_PAYMENT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PAYMENT_CONFIG;
  }
}

export function savePaymentConfig(config: AdminPaymentConfig) {
  localStorage.setItem(PAYMENT_CONFIG_KEY, JSON.stringify(config));
}

export function getPaymentRequests(): PaymentRequest[] {
  try {
    const raw = localStorage.getItem(PAYMENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PaymentRequest[];
  } catch {
    return [];
  }
}

export function savePaymentRequests(requests: PaymentRequest[]) {
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(requests));
}

// User-isolated project storage
export function getUserProjects(userId: string): UserSavedProject[] {
  try {
    const raw = localStorage.getItem(`${USER_PROJECTS_PREFIX}${userId}`);
    if (!raw) return [];
    return JSON.parse(raw) as UserSavedProject[];
  } catch {
    return [];
  }
}

export function saveUserProjects(userId: string, projects: UserSavedProject[]) {
  localStorage.setItem(`${USER_PROJECTS_PREFIX}${userId}`, JSON.stringify(projects));
}
