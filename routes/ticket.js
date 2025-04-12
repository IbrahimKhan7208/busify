const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
    username: { type: String, required: true },
    passengers: [
      {
        name: { type: String, required: true },
        gender: { type: String, enum: ['Male', 'Female'], required: true },
        age: { type: Number, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
      },
    ],
    seats: { type: Number, required: true },
    fare: { type: Number, required: true },
    departureTime: { type: Date, required: true },
    arrivalTime: { type: Date, required: true },
    bookingDate: { type: Date, default: Date.now },
    status: { type: String, default: 'active' },
  });

module.exports = mongoose.model('Ticket', ticketSchema);