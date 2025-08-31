const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const authenticateToken = require('../middleware/auth');

// Get specific group
router.get('/:groupId', authenticateToken, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member of the group
    if (!group.members.includes(req.user.email)) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }

    // Fetch full user details for all members
    const User = require('../models/User');
    const memberDetails = await User.find(
      { email: { $in: group.members } },
      { password: 0 } // Exclude password field
    );

    // Create response with populated member data
    const groupWithMembers = {
      ...group.toObject(),
      members: memberDetails.map(user => ({
        id: user._id,
        email: user.email,
        name: user.name,
        firstName: user.name.split(' ')[0],
        lastName: user.name.split(' ').slice(1).join(' '),
        role: user.role,
        companyName: user.companyName,
        college: user.college,
        cgpa: user.cgpa,
        skills: user.skills
      }))
    };

    res.json(groupWithMembers);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ message: 'Failed to fetch group' });
  }
});

// Update group name
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, members, type = 'private' } = req.body;
    
    if (!name || !members || members.length === 0) {
      return res.status(400).json({ message: 'Group name and members are required' });
    }

    const group = new Group({
      name,
      description,
      members,
      creator: req.user.email,
      type,
      createdAt: new Date()
    });

    const savedGroup = await group.save();
    res.status(201).json(savedGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Failed to create group' });
  }
});

// Get user's groups
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const groups = await Group.find({
      members: req.user.email
    }).sort({ createdAt: -1 });
    
    res.json(groups);
  } catch (error) {
    console.error('Error fetching user groups:', error);
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
});

// Get group by ID
router.get('/:groupId', authenticateToken, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member of the group
    if (!group.members.includes(req.user.email)) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }

    res.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ message: 'Failed to fetch group' });
  }
});

// Update group name
router.put('/:groupId', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is the creator or admin
    if (group.creator !== req.user.email) {
      return res.status(403).json({ message: 'Only group creator can update group name' });
    }

    group.name = name;
    const updatedGroup = await group.save();
    
    res.json(updatedGroup);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ message: 'Failed to update group' });
  }
});

// Add members to group
router.post('/:groupId/members', authenticateToken, async (req, res) => {
  try {
    const { members } = req.body;
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member of the group
    if (!group.members.includes(req.user.email)) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }

    // Add new members (avoiding duplicates)
    const newMembers = members.filter(member => !group.members.includes(member));
    group.members.push(...newMembers);
    
    const updatedGroup = await group.save();
    res.json(updatedGroup);
  } catch (error) {
    console.error('Error adding group members:', error);
    res.status(500).json({ message: 'Failed to add group members' });
  }
});

// Leave group
router.post('/:groupId/leave', authenticateToken, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Remove user from members
    group.members = group.members.filter(member => member !== req.user.email);
    
    // If creator leaves and there are other members, transfer ownership
    if (group.creator === req.user.email && group.members.length > 0) {
      group.creator = group.members[0];
    }
    
    // If no members left, delete the group
    if (group.members.length === 0) {
      await Group.findByIdAndDelete(req.params.groupId);
      await GroupMessage.deleteMany({ groupId: req.params.groupId });
      return res.json({ message: 'Group deleted as no members remain' });
    }
    
    await group.save();
    res.json({ message: 'Successfully left the group' });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ message: 'Failed to leave group' });
  }
});

// Get group messages
router.get('/:groupId/messages', authenticateToken, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member of the group
    if (!group.members.includes(req.user.email)) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }

    const messages = await GroupMessage.find({ groupId: req.params.groupId })
      .sort({ timestamp: 1 })
      .limit(100); // Limit to last 100 messages
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching group messages:', error);
    res.status(500).json({ message: 'Failed to fetch group messages' });
  }
});

// Send message to group
router.post('/:groupId/messages', authenticateToken, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member of the group
    if (!group.members.includes(req.user.email)) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }

    const message = new GroupMessage({
      ...req.body,
      groupId: req.params.groupId,
      userId: req.user.email,
      userName: req.user.name || req.user.email,
      userEmail: req.user.email,
      timestamp: Date.now()
    });

    const savedMessage = await message.save();
    res.status(201).json(savedMessage);
  } catch (error) {
    console.error('Error sending group message:', error);
    res.status(500).json({ message: 'Failed to send group message' });
  }
});

// Clear all messages for a group (actually delete from database)
router.delete('/:groupId/messages/clear', authenticateToken, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member of the group
    if (!group.members.includes(req.user.email)) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }

    // Delete all messages for this group
    const result = await GroupMessage.deleteMany({ groupId: req.params.groupId });
    
    console.log(`🗑️ Cleared ${result.deletedCount} messages for group ${req.params.groupId}`);
    res.json({ 
      message: 'Group messages cleared successfully', 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error clearing group messages:', error);
    res.status(500).json({ message: 'Failed to clear group messages' });
  }
});

module.exports = router;
