export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  // Allow formats like: (123) 456-7890, 123-456-7890, 1234567890
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
};

export const validateName = (name: string): boolean => {
  // Allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s\-']{2,50}$/;
  return nameRegex.test(name);
};

export const validateCaregiverInfo = (info: {
  caregiverName: string;
  caregiverPhone: string;
  caregiverEmail: string;
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!validateName(info.caregiverName)) {
    errors.caregiverName = "Please enter a valid name (2-50 characters, letters only)";
  }

  if (!validatePhone(info.caregiverPhone)) {
    errors.caregiverPhone = "Please enter a valid phone number (10-15 digits)";
  }

  if (!validateEmail(info.caregiverEmail)) {
    errors.caregiverEmail = "Please enter a valid email address";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}; 