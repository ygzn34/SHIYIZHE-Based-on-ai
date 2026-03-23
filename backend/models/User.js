// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
}, { timestamps: true }); // timestamps会自动添加createdAt和updatedAt字段

module.exports = mongoose.model('User', UserSchema);

