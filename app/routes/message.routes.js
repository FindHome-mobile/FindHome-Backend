const express = require('express');
const router = express.Router();
const messages = require('../controllers/message.controller');

router.post('/', messages.create); 
router.get('/', messages.findAll);

module.exports = router;