import mongoose from 'mongoose';
const CampaignSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true
	},
	script: {
		type: Array<String>(),
		required: true
	},
	dateStart: {
		type: Date,
		required: true
	},
	dateEnd: {
		type: Date,
		required: true
	},
	userList: {
		type: Array<typeof mongoose.Schema.ObjectId>(),
		ref: 'Client',
		required: true
	},
	callerList: {
		type: Array<typeof mongoose.Schema.ObjectId>(),
		ref: 'Caller',
		required: true
	},
	area: {
		type: typeof mongoose.Schema.ObjectId,
		ref: 'Area',
		required: true
	},
	createdAt: {
		type: Date,
		default: Date.now()
	}
});

export const Campaign = mongoose.model('Campaign', CampaignSchema);
