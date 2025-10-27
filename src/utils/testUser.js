// Hardcoded test user for development/testing
// Use this user ID when tracking edit history

export const TEST_USER = {
  _id: "test-user-001",
  id: "test-user-001",
  name: "Test User",
  email: "test@flowdoc.com",
  avatarUrl: "https://ui-avatars.com/api/?name=Test+User&background=0D8ABC&color=fff",
  projectName: "FlowDoc Testing",
  projectDescription: "Testing edit history and documentation features",
  githubUrl: "https://github.com/test-user"
};

// Helper to get current user (for now, always returns test user)
export function getCurrentUser() {
  return TEST_USER;
}

// Helper to get current user ID
export function getCurrentUserId() {
  return TEST_USER._id;
}

