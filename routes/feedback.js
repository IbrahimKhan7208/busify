const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
    username: { type: String, required: true },
    rating: { type: Number, required: true },
    comments: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
