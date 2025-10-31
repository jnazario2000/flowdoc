// Invitation Routes
// API endpoints for collaboration invitations

import { Router } from 'express';
import { invitationController } from '../controllers/invitationController.js';

const router = Router();

// Send an invitation
router.post('/invitations', invitationController.sendInvitation);

// Get invitations for a user (received)
router.get('/invitations', invitationController.getInvitations);

// Get invitations sent by a user
router.get('/invitations/sent', invitationController.getSentInvitations);

// Accept an invitation
router.post('/invitations/:invitationId/accept', invitationController.acceptInvitation);

// Decline an invitation
router.post('/invitations/:invitationId/decline', invitationController.declineInvitation);

// Cancel an invitation (by sender)
router.delete('/invitations/:invitationId', invitationController.cancelInvitation);

export default router;

