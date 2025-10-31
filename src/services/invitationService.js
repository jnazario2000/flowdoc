// Invitation Service
// Handles collaboration invitations for private repositories

import { state, connectDB } from '../models/db.js';
import { Invitation } from '../models/Invitation.js';
import { ObjectId } from 'mongodb';

export const invitationService = {
  // Create a new invitation
  async createInvitation(data) {
    await connectDB();
    
    // Check if invitation already exists and is pending
    const existing = await state.invitations.findOne({
      repositoryKey: data.repositoryKey,
      toUserId: data.toUserId,
      status: 'pending'
    });

    if (existing) {
      throw new Error('Invitation already sent to this user');
    }

    const invitation = new Invitation({
      repositoryKey: data.repositoryKey,
      repositoryName: data.repositoryName,
      fromUserId: data.fromUserId,
      fromUsername: data.fromUsername,
      toUserId: data.toUserId,
      toUsername: data.toUsername,
      status: 'pending',
      createdAt: new Date()
    });

    const result = await state.invitations.insertOne(invitation.toJSON());
    return result.insertedId;
  },

  // Get invitation by ID
  async getInvitationById(id) {
    await connectDB();
    const doc = await state.invitations.findOne({ _id: new ObjectId(id) });
    return doc ? new Invitation(doc) : null;
  },

  // Get all pending invitations for a user
  async getPendingInvitationsForUser(userId) {
    await connectDB();
    const docs = await state.invitations.find({
      toUserId: userId,
      status: 'pending'
    }).sort({ createdAt: -1 }).toArray();
    return docs.map(doc => new Invitation(doc));
  },

  // Get all invitations for a user (any status)
  async getAllInvitationsForUser(userId) {
    await connectDB();
    const docs = await state.invitations.find({
      toUserId: userId
    }).sort({ createdAt: -1 }).toArray();
    return docs.map(doc => new Invitation(doc));
  },

  // Get all invitations sent by a user
  async getInvitationsSentByUser(userId) {
    await connectDB();
    const docs = await state.invitations.find({
      fromUserId: userId
    }).sort({ createdAt: -1 }).toArray();
    return docs.map(doc => new Invitation(doc));
  },

  // Get all invitations for a repository
  async getInvitationsForRepository(repoKey) {
    await connectDB();
    const docs = await state.invitations.find({
      repositoryKey: repoKey
    }).sort({ createdAt: -1 }).toArray();
    return docs.map(doc => new Invitation(doc));
  },

  // Accept an invitation
  async acceptInvitation(invitationId) {
    await connectDB();
    
    const result = await state.invitations.updateOne(
      { _id: new ObjectId(invitationId), status: 'pending' },
      { 
        $set: { 
          status: 'accepted',
          respondedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      throw new Error('Invitation not found or already responded to');
    }

    return await this.getInvitationById(invitationId);
  },

  // Decline an invitation
  async declineInvitation(invitationId) {
    await connectDB();
    
    const result = await state.invitations.updateOne(
      { _id: new ObjectId(invitationId), status: 'pending' },
      { 
        $set: { 
          status: 'declined',
          respondedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      throw new Error('Invitation not found or already responded to');
    }

    return await this.getInvitationById(invitationId);
  },

  // Cancel an invitation (by sender)
  async cancelInvitation(invitationId, userId) {
    await connectDB();
    
    const result = await state.invitations.deleteOne({
      _id: new ObjectId(invitationId),
      fromUserId: userId,
      status: 'pending'
    });

    if (result.deletedCount === 0) {
      throw new Error('Invitation not found or cannot be cancelled');
    }

    return true;
  },

  // Delete invitation
  async deleteInvitation(invitationId) {
    await connectDB();
    const result = await state.invitations.deleteOne({ _id: new ObjectId(invitationId) });
    return result.deletedCount > 0;
  }
};

