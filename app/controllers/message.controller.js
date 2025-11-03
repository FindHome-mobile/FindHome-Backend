const Message = require('../models/message.model');

exports.create = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).send({ message: 'Tous les champs sont requis' });
    }

    const newMessage = new Message({
      name,
      email,
      subject,
      message
    });

    const savedMessage = await newMessage.save();
    console.log('Message created:', savedMessage.email);
    res.status(201).send(savedMessage);
  } catch (err) {
    console.error('Error creating message:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message).join(', ');
      res.status(400).send({ message: `Erreur de validation: ${messages}` });
    } else {
      res.status(500).send({
        message: err.message || 'Une erreur est survenue lors de la création du message.'
      });
    }
  }
};

exports.findAll = async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.send(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).send({
      message: err.message || 'Une erreur est survenue lors de la récupération des messages.'
    });
  }
};
