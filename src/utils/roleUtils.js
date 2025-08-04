// src/utils/roleUtils.js (updated)
export const getUserRole = () => {
  const user = localStorage.getItem('user');
  if (!user) return null;

  try {
    const parsed = JSON.parse(user);
    return parsed.role || parsed.roles?.[0]?.name || null;
  } catch {
    return null;
  }
};

export const isAdmin = () => getUserRole() === 'Admin';
