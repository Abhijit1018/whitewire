export function validatePasswordChange(password: string, confirm: string): string | null {
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (password !== confirm) return "Passwords do not match.";
  return null;
}
