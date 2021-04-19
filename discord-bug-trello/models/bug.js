const { Schema, model } = require("mongoose");

const Bugs = new Schema({
	id: {type: Number},
	title: {type: String},
	description: {type: String},
	owner: {type: String},
	messageid: {type: String},
	reportStatus: {type: String, default: "none"},
});

module.exports = model("bug_scheme", Bugs);