// Invitation Controller
// Handles HTTP requests for collaboration invitations

import { invitationService } from '../services/invitationService.js';
import { repositoryService } from '../services/repositoryService.js';
import { userService } from '../services/userService.js';

export const invitationController = {
  // Send an invitation
  async sendInvitation(req, res) {
    try {
      const { repositoryKey, fromUserId, toUsername } = req.body;

      if (!repositoryKey || !fromUserId || !toUsername) {
        return res.status(400).json({
          message: 'Repository key, sender ID, and recipient username are required'
        });
      }

      // Get repository
      const repository = await repositoryService.getRepositoryByKey(repositoryKey);
      if (!repository) {
        return res.status(404).json({ message: 'Repository not found' });
      }

      // Check if sender is the owner
      if (!repository.isOwner(fromUserId)) {
        return res.status(403).json({
          message: 'Only the repository owner can send invitations'
        });
      }

      // Get recipient user by username
      const toUser = await userService.getUserByUsername(toUsername);
      if (!toUser) {
        return res.status(404).json({
          message: `User "${toUsername}" not found`
        });
      }

      // Get sender user info
      const fromUser = await userService.getUserById(fromUserId);

      // Check if user is already a collaborator
      if (repository.hasAccess(toUser._id.toString())) {
        return res.status(400).json({
          message: 'User already has access to this repository'
        });
      }

      const invitationId = await invitationService.createInvitation({
        repositoryKey,
        repositoryName: repository.name,
        fromUserId,
        fromUsername: fromUser.username,
        toUserId: toUser._id.toString(),
        toUsername: toUser.username
      });

      const invitation = await invitationService.getInvitationById(invitationId);

      return res.status(201).json({
        message: 'Invitation sent successfully',
        invitation: invitation.toJSON()
      });
    } catch (error) {
      console.error('Error sending invitation:', error);
      return res.status(400).json({ message: error.message });
    }
  },

  // Get invitations for a user
  async getInvitations(req, res) {
    try {
      const { userId, status } = req.query;

      if (!userId) {
        return res.status(400).json({ message: 'User ID required' });
      }

      let invitations;
      if (status === 'pending') {
        invitations = await invitationService.getPendingInvitationsForUser(userId);
      } else {
        invitations = await invitationService.getAllInvitationsForUser(userId);
      }

      return res.json({
        invitations: invitations.map(inv => inv.toJSON())
      });
    } catch (error) {
      console.error('Error getting invitations:', error);
      return res.status(500).json({ message: error.message });
    }
  },

  // Get invitations sent by a user
  async getSentInvitations(req, res) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ message: 'User ID required' });
      }

      const invitations = await invitationService.getInvitationsSentByUser(userId);

      return res.json({
        invitations: invitations.map(inv => inv.toJSON())
      });
    } catch (error) {
      console.error('Error getting sent invitations:', error);
      return res.status(500).json({ message: error.message });
    }
  },

  // Accept an invitation
  async acceptInvitation(req, res) {
    try {
      const { invitationId } = req.params;
      const { userId } = req.body;

      // Get invitation
      const invitation = await invitationService.getInvitationById(invitationId);
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found' });
      }

      // Verify user is the recipient
      if (invitation.toUserId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      // Accept invitation
      const updatedInvitation = await invitationService.acceptInvitation(invitationId);

      // Add user as collaborator
      await repositoryService.addCollaborator(
        invitation.repositoryKey,
        invitation.toUserId,
        invitation.toUsername
      );

      return res.json({
        message: 'Invitation accepted successfully',
        invitation: updatedInvitation.toJSON()
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return res.status(500).json({ message: error.message });
    }
  },

  // Decline an invitation
  async declineInvitation(req, res) {
    try {
      const { invitationId } = req.params;
      const { userId } = req.body;

      // Get invitation
      const invitation = await invitationService.getInvitationById(invitationId);
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found' });
      }

      // Verify user is the recipient
      if (invitation.toUserId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      // Decline invitation
      const updatedInvitation = await invitationService.declineInvitation(invitationId);

      return res.json({
        message: 'Invitation declined',
        invitation: updatedInvitation.toJSON()
      });
    } catch (error) {
      console.error('Error declining invitation:', error);
      return res.status(500).json({ message: error.message });
    }
  },

  // Cancel an invitation (by sender)
  async cancelInvitation(req, res) {
    try {
      const { invitationId } = req.params;
      const { userId } = req.body;

      await invitationService.cancelInvitation(invitationId, userId);

      return res.json({
        message: 'Invitation cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      return res.status(500).json({ message: error.message });
    }
  }
};

