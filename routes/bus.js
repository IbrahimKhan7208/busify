const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
    name: { type: String, required: true },
    busnumber: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    capacity: { type: Number, required: true },
    source: { type: String, enum: ['Mumbai', 'Delhi', 'Hyderabad', 'Ahmedabad', 'Kolkata'], required: true },
    destination: { type: String, enum: ['Mumbai', 'Delhi', 'Hyderabad', 'Ahmedabad', 'Kolkata'], required: true },
    departureTime: { type: Date, required: true },
    arrivalTime: { type: Date, required: true },
    fare: { type: Number, required:true},
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

module.exports = mongoose.model('Bus', busSchema);