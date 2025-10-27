const express = require("express");
const { getUserNotifications, markAsRead } = require("../controllers/notificationControllers");
const router = express.Router();

router.get("/", getUserNotifications);
router.put("/:id/read", markAsRead);

module.exports = router;
