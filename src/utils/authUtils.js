// Authentication utility - manages current user from localStorage

// Get current authenticated user from localStorage
export function getCurrentUser() {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      // Add avatar URL if not present
      if (!user.avatarUrl) {
        const displayName = user.name || user.username || 'User';
        user.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff`;
      }
      return user;
    }
  } catch (error) {
    console.error('Error getting current user:', error);
  }
  
  // Return guest user if not authenticated
  return {
    _id: 'guest',
    id: 'guest',
    username: 'guest',
    name: 'Guest User',
    email: '',
    avatarUrl: 'https://ui-avatars.com/api/?name=Guest&background=999&color=fff',
    isGuest: true
  };
}

// Helper to get current user ID
export function getCurrentUserId() {
  const user = getCurrentUser();
  return user._id || user.id || 'guest';
}

// Check if user is authenticated
export function isAuthenticated() {
  try {
    const userStr = localStorage.getItem('user');
    return !!userStr;
  } catch {
    return false;
  }
}

// Clear authentication (logout)
export function logout() {
  try {
    localStorage.removeItem('user');
  } catch (error) {
    console.error('Error during logout:', error);
  }
}

// Update current user data in localStorage
export function updateCurrentUser(userData) {
  try {
    const currentUser = getCurrentUser();
    const updatedUser = { ...currentUser, ...userData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
}

