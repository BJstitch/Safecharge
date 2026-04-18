// services/authService.js
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { get, ref, remove, set } from "firebase/database";
import { auth, db } from "./firebase";

// ── Helpers ────────────────────────────────────────────────────────

/** Replace . with , so email can be used as Firebase key */
const emailKey = (email) => email.replace(/\./g, ",");

/** Generate a random 4-digit code */
const generateOTP = () => String(Math.floor(1000 + Math.random() * 9000));

// ── Core Auth ──────────────────────────────────────────────────────

export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const registerWithEmail = async (email, password, displayName) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(user, { displayName });
  }
  await sendEmailVerification(user);
  // Store OTP for in-app verification screen
  const code = await storeOTP(email, "register");
  // 🔑 Log code to terminal so you can test without email
  console.log(`\n============================`);
  console.log(`📧 REGISTER OTP for ${email}: ${code}`);
  console.log(`============================\n`);
  return user;
};

export const loginWithGoogle = async (idToken) => {
  const credential = GoogleAuthProvider.credential(idToken);
  const { user } = await signInWithCredential(auth, credential);
  return user;
};

export const logout = () => signOut(auth);

export const updateDisplayName = (name) =>
  updateProfile(auth.currentUser, { displayName: name });

export const changePassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
};

// ── OTP Management ─────────────────────────────────────────────────

/**
 * Store OTP in Firebase /otps/{emailKey} with 10-min expiry
 * Returns the generated code (so we can log it)
 */
const storeOTP = async (email, mode) => {
  const code = generateOTP();
  const key = emailKey(email);
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  await set(ref(db, `/otps/${key}`), { code, mode, expiresAt });
  return code;
};

/**
 * Send password reset email + generate OTP for in-app verify step
 */
export const sendPasswordResetWithCode = async (email) => {
  // Will throw auth/user-not-found if email not registered
  await sendPasswordResetEmail(auth, email);
  const code = await storeOTP(email, "reset");
  // 🔑 Log code to terminal so you can test without email
  console.log(`\n============================`);
  console.log(`🔑 RESET OTP for ${email}: ${code}`);
  console.log(`============================\n`);
};

/**
 * Verify a 4-digit OTP against what's stored in Firebase
 */
export const verifyEmailCode = async (email, code, mode) => {
  const key = emailKey(email);
  const snap = await get(ref(db, `/otps/${key}`));

  if (!snap.exists()) {
    throw new Error("No verification code found. Please request a new one.");
  }

  const { code: stored, expiresAt } = snap.val();

  if (Date.now() > expiresAt) {
    await remove(ref(db, `/otps/${key}`));
    throw new Error("Code expired. Please request a new one.");
  }

  if (stored !== code) {
    throw new Error("Incorrect code. Please try again.");
  }

  // Clean up after successful verify
  await remove(ref(db, `/otps/${key}`));
};

/**
 * Resend: generate new OTP and re-trigger email
 */
export const resendVerificationEmail = async (email, mode) => {
  if (mode === "register") {
    const user = auth.currentUser;
    if (user) await sendEmailVerification(user);
    const code = await storeOTP(email, mode);
    console.log(`\n============================`);
    console.log(`📧 RESEND REGISTER OTP for ${email}: ${code}`);
    console.log(`============================\n`);
  } else {
    await sendPasswordResetWithCode(email);
  }
};
