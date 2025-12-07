const express = require('express');
const router = express.Router();
const { User } = require('../models/user');
const Group = require('../models/Group');
const GroupInvite = require('../models/GroupInvite');
const Notification = require('../models/notification');
const { userAuth } = require('../middleware/Auth');
const nodemailer = require('nodemailer');

// ======================== Nodemailer setup ========================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER  ,
    pass: process.env.EMAIL_PASS  
  }
});

// ======================== SEND INVITATION ========================
router.post('/invite', userAuth, async (req, res) => {
  try {
    const { groupId, receiverEmail } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const existingInvite = await GroupInvite.findOne({ group: groupId, receiverEmail });
    if (existingInvite) return res.status(400).json({ error: "User already invited" });

    const invite = new GroupInvite({
      group: groupId,
      sender: req.user._id,
      receiverEmail,
      status: "pending"
    });
    await invite.save();

    // Send email
    const inviteLink = `http://localhost:5173/groupInvites`;
    const mailOptions = {
      from: 'APIverse <jethanandj52@gmail.com>',
      to: receiverEmail,
      subject: `Invitation to join group "${group.name}"`,
      html: `<p>You have been invited to join the group "<b>${group.name}</b>"</p>
             <p>Click the link below to accept:</p>
             <a href="${inviteLink}">${inviteLink}</a>`
    };
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Invitation sent", invite });
  } catch (error) {
    console.error("Send invite error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ======================== ACCEPT INVITATION ========================
router.post('/accept/:inviteId', userAuth, async (req, res) => {
  try {
    const invite = await GroupInvite.findById(req.params.inviteId);
    if (!invite) return res.status(404).json({ error: "Invite not found" });

    const group = await Group.findById(invite.group);
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Add user to group if not already
    if (!group.members.includes(req.user._id)) {
      group.members.push(req.user._id);
      await group.save();
    }

    invite.status = "accepted";
    await invite.save();

    // Create notification safely
    try {
      await Notification.create({
        user: invite.sender,
        type: "Group",
        itemId: group._id,
        message: `${req.user.firstName} accepted your invitation to join "${group.name}"`
      });
    } catch (notifErr) {
      console.error("Notification error:", notifErr);
    }

    res.status(200).json({ message: "Joined group successfully", group });
  } catch (error) {
    console.error("Accept invite error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ======================== REJECT INVITATION ========================
router.post('/reject/:inviteId', userAuth, async (req, res) => {
  try {
    const invite = await GroupInvite.findById(req.params.inviteId);
    if (!invite) return res.status(404).json({ error: "Invite not found" });

    invite.status = "rejected";
    await invite.save();

    try {
      await Notification.create({
        user: invite.sender,
        type: "Group",
        itemId: invite.group,
        message: `${req.user.firstName} rejected your invitation to join the group`
      });
    } catch (notifErr) {
      console.error("Notification error:", notifErr);
    }

    res.status(200).json({ message: "Invitation rejected" });
  } catch (error) {
    console.error("Reject invite error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ======================== GET MY INVITES ========================
router.get('/myInvites', userAuth, async (req, res) => {
  try {
    const invites = await GroupInvite.find({ receiverEmail: req.user.email, status: "pending" })
      .populate('group', 'name description'); // populate group details
    res.status(200).json(invites);
  } catch (error) {
    console.error("Get invites error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/:groupId/members", userAuth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate("members", "firstName lastName email");
    if (!group) return res.status(404).json({ error: "Group not found" });

    res.status(200).json(group.members);
  } catch (error) {
    console.error("Fetch members error:", error);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/shared/:shareId", async (req, res) => {
  try {
    const shared = await SharedRequest.findById(req.params.shareId)
      .populate("sender", "firstName lastName email")
      .populate("group", "name");

    if (!shared) return res.status(404).json({ error: "Shared request not found" });

    res.status(200).json(shared);
  } catch (error) {
    console.error("Fetch shared request error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
