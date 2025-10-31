// Invitation Model
// Represents an invitation for a user to collaborate on a private repository

export class Invitation {
  constructor(data) {
    this._id = data._id;
    this.repositoryKey = data.repositoryKey; // The repository being shared
    this.repositoryName = data.repositoryName; // Display name of repository
    this.fromUserId = data.fromUserId; // User ID of the person inviting
    this.fromUsername = data.fromUsername; // Username of the person inviting
    this.toUserId = data.toUserId; // User ID of the person being invited
    this.toUsername = data.toUsername; // Username of the person being invited
    this.status = data.status || 'pending'; // pending, accepted, declined
    this.createdAt = data.createdAt || new Date();
    this.respondedAt = data.respondedAt || null;
  }

  toJSON() {
    return {
      _id: this._id,
      repositoryKey: this.repositoryKey,
      repositoryName: this.repositoryName,
      fromUserId: this.fromUserId,
      fromUsername: this.fromUsername,
      toUserId: this.toUserId,
      toUsername: this.toUsername,
      status: this.status,
      createdAt: this.createdAt,
      respondedAt: this.respondedAt
    };
  }
}

