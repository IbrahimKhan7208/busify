const mongoose = require('mongoose');
const plm = require('passport-local-mongoose');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String},
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
});

userSchema.plugin(plm);

module.exports = mongoose.model('User' , userSchema);