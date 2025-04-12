const mongoose = require('mongoose');
const plm = require('passport-local-mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/projectdb");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String},
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
});

userSchema.plugin(plm);

module.exports = mongoose.model('User' , userSchema);