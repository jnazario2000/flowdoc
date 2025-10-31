// Repository Model
// Represents a repository/project with ownership and access control

export class Repository {
  constructor(data) {
    this._id = data._id;
    this.repoKey = data.repoKey; // Unique identifier (e.g., "owner/repo-name")
    this.name = data.name; // Display name
    this.description = data.description || '';
    this.githubUrl = data.githubUrl || '';
    this.isPrivate = typeof data.isPrivate === 'boolean' ? data.isPrivate : false; // true = requires access token, false = public
    this.ownerId = data.ownerId; // User ID of the owner
    this.ownerUsername = data.ownerUsername; // Username of the owner
    this.collaborators = data.collaborators || []; // Array of { userId, username, addedAt }
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  toJSON() {
    return {
      _id: this._id,
      repoKey: this.repoKey,
      name: this.name,
      description: this.description,
      githubUrl: this.githubUrl,
      isPrivate: this.isPrivate,
      ownerId: this.ownerId,
      ownerUsername: this.ownerUsername,
      collaborators: this.collaborators,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Check if a user has access to this repository
  hasAccess(userId) {
    // Public repos are accessible to everyone
    if (!this.isPrivate) return true;
    
    // Owner always has access
    if (this.ownerId === userId) return true;
    
    // Check if user is a collaborator
    return this.collaborators.some(collab => collab.userId === userId);
  }

  // Check if a user is the owner
  isOwner(userId) {
    return this.ownerId === userId;
  }

  // Add a collaborator
  addCollaborator(userId, username) {
    if (!this.collaborators.some(collab => collab.userId === userId)) {
      this.collaborators.push({
        userId,
        username,
        addedAt: new Date()
      });
      this.updatedAt = new Date();
    }
  }

  // Remove a collaborator
  removeCollaborator(userId) {
    this.collaborators = this.collaborators.filter(collab => collab.userId !== userId);
    this.updatedAt = new Date();
  }
}

