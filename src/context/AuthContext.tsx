import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  AdminPaymentConfig,
  PaymentRequest,
  UserAccount,
  UserSavedProject,
} from '../types/auth';
import {
  DEFAULT_ADMIN,
  DEFAULT_PAYMENT_CONFIG,
  getCurrentUser,
  getPaymentConfig,
  getPaymentRequests,
  getStoredUsers,
  getUserProjects,
  saveCurrentUser,
  savePaymentConfig,
  savePaymentRequests,
  saveUserProjects,
  saveUsers,
} from '../services/authStore';

interface SignupParams {
  username: string;
  password: string;
  email: string;
  name: string;
  signupProvider?: 'local' | 'google' | 'microsoft' | 'github' | 'apple';
}

interface AuthContextType {
  currentUser: UserAccount | null;
  users: UserAccount[];
  paymentConfig: AdminPaymentConfig;
  paymentRequests: PaymentRequest[];
  isAdmin: boolean;
  hasCredits: boolean;
  userProjects: UserSavedProject[];
  login: (username: string, password: string) => { success: boolean; message?: string };
  signup: (params: SignupParams) => { success: boolean; message?: string };
  logout: () => void;
  switchUser: (userId: string) => void;
  deductCredit: () => boolean;
  buyCredits: (
    amountInr: number,
    transactionRef: string,
    paymentMethod?: 'upi_qr' | 'gpay' | 'phonepe' | 'paytm' | 'other'
  ) => { success: boolean; autoApproved: boolean };
  updatePaymentConfig: (newConfig: Partial<AdminPaymentConfig>) => void;
  updateUserCredits: (userId: string, credits: number, unlimitedAccess?: boolean) => void;
  changeAdminCredentials: (
    newUsername: string,
    newPassword: string,
    newRecoveryEmail?: string
  ) => { success: boolean; message?: string };
  resetPasswordWithRecovery: (
    usernameOrEmail: string,
    newPassword: string
  ) => { success: boolean; message?: string };
  reviewPayment: (paymentId: string, status: 'approved' | 'rejected') => void;
  saveProjectForCurrentUser: (project: Omit<UserSavedProject, 'id' | 'updatedAt'>) => void;
  showPaymentModal: boolean;
  setShowPaymentModal: (show: boolean) => void;
  showAdminModal: boolean;
  setShowAdminModal: (show: boolean) => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<UserAccount | null>(() => getCurrentUser());
  const [users, setUsersState] = useState<UserAccount[]>(() => getStoredUsers());
  const [paymentConfig, setPaymentConfigState] = useState<AdminPaymentConfig>(() => getPaymentConfig());
  const [paymentRequests, setPaymentRequestsState] = useState<PaymentRequest[]>(() => getPaymentRequests());
  const [userProjects, setUserProjectsState] = useState<UserSavedProject[]>([]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Sync state on load or user switch
  useEffect(() => {
    const loadedUsers = getStoredUsers();
    setUsersState(loadedUsers);
    const curr = getCurrentUser();
    setCurrentUserState(curr);
    setPaymentConfigState(getPaymentConfig());
    setPaymentRequestsState(getPaymentRequests());

    if (curr) {
      setUserProjectsState(getUserProjects(curr.id));
    } else {
      setUserProjectsState([]);
    }
  }, []);

  // Update user projects whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      setUserProjectsState(getUserProjects(currentUser.id));
    } else {
      setUserProjectsState([]);
    }
  }, [currentUser?.id]);

  const isAdmin =
    currentUser !== null &&
    (currentUser.role === 'admin' ||
      currentUser.username.toLowerCase() === 'yusufadmin' ||
      currentUser.email.toLowerCase() === 'mohammadyusuf8868@gmail.com');

  const hasCredits =
    isAdmin ||
    (currentUser !== null && (currentUser.unlimitedAccess || currentUser.credits > 0));

  const login = (usernameInput: string, passwordInput: string) => {
    const cleanUser = usernameInput.trim().toLowerCase();
    const loadedUsers = getStoredUsers();

    const targetUser = loadedUsers.find(
      (u) =>
        u.username.toLowerCase() === cleanUser ||
        u.email.toLowerCase() === cleanUser
    );

    if (!targetUser) {
      return {
        success: false,
        message: 'No account found with this username or email.',
      };
    }

    if (targetUser.password && targetUser.password !== passwordInput) {
      return {
        success: false,
        message: 'Incorrect password. Please try again or use recovery.',
      };
    }

    saveCurrentUser(targetUser);
    setCurrentUserState(targetUser);
    return { success: true };
  };

  const signup = ({
    username,
    password,
    email,
    name,
    signupProvider = 'local',
  }: SignupParams) => {
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanEmail = email.trim().toLowerCase();
    const loadedUsers = getStoredUsers();

    if (!cleanUsername) {
      return { success: false, message: 'Please enter a valid alphanumeric username.' };
    }

    if (loadedUsers.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return { success: false, message: 'This username is already taken. Please choose another.' };
    }

    if (loadedUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: 'An account with this email already exists. Please log in.' };
    }

    const isAccountAdmin = cleanUsername === 'yusufadmin' || cleanEmail === 'mohammadyusuf8868@gmail.com';

    const newUser: UserAccount = {
      id: `usr_${Date.now()}`,
      username: cleanUsername,
      password: password || 'user123',
      email: cleanEmail,
      name: name.trim() || cleanUsername,
      role: isAccountAdmin ? 'admin' : 'user',
      credits: isAccountAdmin ? 999999 : 5, // 5 starter credits
      unlimitedAccess: isAccountAdmin,
      recoveryEmail: cleanEmail,
      createdAt: new Date().toISOString(),
      signupProvider,
    };

    const updated = [newUser, ...loadedUsers];
    saveUsers(updated);
    setUsersState(updated);
    saveCurrentUser(newUser);
    setCurrentUserState(newUser);
    return { success: true };
  };

  const logout = () => {
    saveCurrentUser(null);
    setCurrentUserState(null);
    setUserProjectsState([]);
  };

  const switchUser = (userId: string) => {
    const loadedUsers = getStoredUsers();
    const target = loadedUsers.find((u) => u.id === userId);
    if (target) {
      saveCurrentUser(target);
      setCurrentUserState(target);
    }
  };

  const deductCredit = (): boolean => {
    if (!currentUser) return false;
    if (isAdmin || currentUser.unlimitedAccess) {
      return true;
    }
    if (currentUser.credits <= 0) {
      setShowPaymentModal(true);
      return false;
    }

    const newCredits = Math.max(0, currentUser.credits - 1);
    const updatedUser = { ...currentUser, credits: newCredits };
    setCurrentUserState(updatedUser);
    saveCurrentUser(updatedUser);

    const loadedUsers = getStoredUsers().map((u) =>
      u.id === currentUser.id ? updatedUser : u
    );
    saveUsers(loadedUsers);
    setUsersState(loadedUsers);
    return true;
  };

  const buyCredits = (
    amountInr: number,
    transactionRef: string,
    paymentMethod: 'upi_qr' | 'gpay' | 'phonepe' | 'paytm' | 'other' = 'upi_qr'
  ) => {
    if (!currentUser) return { success: false, autoApproved: false };

    const creditsToAdd = amountInr * paymentConfig.ratePerCredit; // 1 INR = 1 Credit
    const autoApproved = paymentConfig.autoApprove;

    const newReq: PaymentRequest = {
      id: `pay_${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      userEmail: currentUser.email,
      amount: amountInr,
      creditsGranted: creditsToAdd,
      upiIdPaidTo: paymentConfig.upiId,
      transactionRef: transactionRef.trim(),
      paymentMethod,
      status: autoApproved ? 'approved' : 'pending',
      date: new Date().toISOString(),
    };

    const updatedReqs = [newReq, ...paymentRequests];
    savePaymentRequests(updatedReqs);
    setPaymentRequestsState(updatedReqs);

    if (autoApproved) {
      const updatedUser: UserAccount = {
        ...currentUser,
        credits: currentUser.credits + creditsToAdd,
      };
      setCurrentUserState(updatedUser);
      saveCurrentUser(updatedUser);

      const loadedUsers = getStoredUsers().map((u) =>
        u.id === currentUser.id ? updatedUser : u
      );
      saveUsers(loadedUsers);
      setUsersState(loadedUsers);
    }

    return { success: true, autoApproved };
  };

  const updatePaymentConfig = (newConfig: Partial<AdminPaymentConfig>) => {
    const updated = { ...paymentConfig, ...newConfig };
    setPaymentConfigState(updated);
    savePaymentConfig(updated);
  };

  const updateUserCredits = (userId: string, credits: number, unlimitedAccess?: boolean) => {
    const loadedUsers = getStoredUsers().map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          credits,
          unlimitedAccess: unlimitedAccess !== undefined ? unlimitedAccess : u.unlimitedAccess,
        };
      }
      return u;
    });
    saveUsers(loadedUsers);
    setUsersState(loadedUsers);

    if (currentUser?.id === userId) {
      const target = loadedUsers.find((u) => u.id === userId);
      if (target) {
        setCurrentUserState(target);
        saveCurrentUser(target);
      }
    }
  };

  const changeAdminCredentials = (
    newUsername: string,
    newPassword: string,
    newRecoveryEmail?: string
  ) => {
    const cleanUser = newUsername.trim().toLowerCase();
    const loadedUsers = getStoredUsers();

    const adminIndex = loadedUsers.findIndex((u) => u.role === 'admin');
    if (adminIndex === -1) {
      return { success: false, message: 'Admin account not found.' };
    }

    const updatedAdmin: UserAccount = {
      ...loadedUsers[adminIndex],
      username: cleanUser,
      password: newPassword,
      recoveryEmail: newRecoveryEmail?.trim() || loadedUsers[adminIndex].recoveryEmail,
    };

    loadedUsers[adminIndex] = updatedAdmin;
    saveUsers(loadedUsers);
    setUsersState(loadedUsers);

    if (currentUser?.role === 'admin') {
      setCurrentUserState(updatedAdmin);
      saveCurrentUser(updatedAdmin);
    }

    // Also update paymentConfig recovery email if provided
    if (newRecoveryEmail) {
      updatePaymentConfig({ recoveryEmail: newRecoveryEmail.trim() });
    }

    return { success: true };
  };

  const resetPasswordWithRecovery = (usernameOrEmail: string, newPassword: string) => {
    const query = usernameOrEmail.trim().toLowerCase();
    const loadedUsers = getStoredUsers();

    const targetIndex = loadedUsers.findIndex(
      (u) =>
        u.username.toLowerCase() === query ||
        u.email.toLowerCase() === query ||
        (u.recoveryEmail && u.recoveryEmail.toLowerCase() === query)
    );

    if (targetIndex === -1) {
      return { success: false, message: 'No registered user found with this identifier or recovery email.' };
    }

    loadedUsers[targetIndex].password = newPassword;
    saveUsers(loadedUsers);
    setUsersState(loadedUsers);

    return { success: true };
  };

  const reviewPayment = (paymentId: string, status: 'approved' | 'rejected') => {
    const targetReq = paymentRequests.find((p) => p.id === paymentId);
    if (!targetReq) return;

    const updatedReqs = paymentRequests.map((p) =>
      p.id === paymentId ? { ...p, status } : p
    );
    savePaymentRequests(updatedReqs);
    setPaymentRequestsState(updatedReqs);

    if (status === 'approved') {
      const loadedUsers = getStoredUsers().map((u) => {
        if (u.id === targetReq.userId) {
          return {
            ...u,
            credits: u.credits + targetReq.creditsGranted,
          };
        }
        return u;
      });
      saveUsers(loadedUsers);
      setUsersState(loadedUsers);

      if (currentUser?.id === targetReq.userId) {
        const found = loadedUsers.find((u) => u.id === currentUser.id);
        if (found) {
          setCurrentUserState(found);
          saveCurrentUser(found);
        }
      }
    }
  };

  const saveProjectForCurrentUser = (project: Omit<UserSavedProject, 'id' | 'updatedAt'>) => {
    if (!currentUser) return;
    const newProj: UserSavedProject = {
      ...project,
      id: `proj_${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    const updated = [newProj, ...userProjects];
    setUserProjectsState(updated);
    saveUserProjects(currentUser.id, updated);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        paymentConfig,
        paymentRequests,
        isAdmin,
        hasCredits,
        userProjects,
        login,
        signup,
        logout,
        switchUser,
        deductCredit,
        buyCredits,
        updatePaymentConfig,
        updateUserCredits,
        changeAdminCredentials,
        resetPasswordWithRecovery,
        reviewPayment,
        saveProjectForCurrentUser,
        showPaymentModal,
        setShowPaymentModal,
        showAdminModal,
        setShowAdminModal,
        showAuthModal,
        setShowAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
