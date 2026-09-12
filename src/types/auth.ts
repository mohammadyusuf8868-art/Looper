export type UserRole = 'admin' | 'user';

export interface UserSavedProject {
  id: string;
  name: string;
  videoUrl: string;
  duration: number;
  mode: 'crossfade' | 'pingpong' | 'standard';
  crossfadeDuration: number;
  updatedAt: string;
}

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  email: string;
  name: string;
  role: UserRole;
  credits: number;
  unlimitedAccess: boolean;
  recoveryEmail?: string;
  createdAt: string;
  signupProvider?: 'local' | 'google' | 'microsoft' | 'github' | 'apple';
  savedProjects?: UserSavedProject[];
}

export interface PaymentPackage {
  id: string;
  credits: number;
  priceInr: number;
  label: string;
  popular?: boolean;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  username: string;
  userEmail: string;
  amount: number; // in INR (1 INR = 1 Credit)
  creditsGranted: number;
  upiIdPaidTo: string;
  transactionRef: string;
  paymentMethod: 'upi_qr' | 'gpay' | 'phonepe' | 'paytm' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  date: string;
}

export interface AdminPaymentConfig {
  ratePerCredit: number; // 1 INR = 1 Credit
  upiId: string;
  phoneNumber: string;
  qrCodeUrl: string;
  autoApprove: boolean;
  recoveryEmail: string;
  note: string;
  packages: PaymentPackage[];
}
