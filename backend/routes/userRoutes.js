const express = require("express");
const usersCtrl = require("../controllers/userController");
// No curly braces around auth!
const auth = require("../middleware/authMiddleware"); 

const router = express.Router();

router.get("/", auth, usersCtrl.listUsers);
router.get("/:id", auth, usersCtrl.getUser);

module.exports = router;