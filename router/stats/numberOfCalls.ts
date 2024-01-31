import { Request, Response } from 'express';
import { Campaign } from '../../Models/Campaign';
import { Client } from '../../Models/Client';
import { Area } from '../../Models/area';
import { log } from '../../tools/log';

export default async function numberOfCalls(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (!req.body || typeof req.body.campaign != 'string' || typeof req.body.adminCode != 'string') {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log('Missing parameters', 'WARNING', 'numberOfCall.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log('Wrong admin code from ' + ip, 'WARNING', 'numberOfCall.ts');
		return;
	}

	const campaign = await Campaign.findOne({ _id: req.body.campaign });
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log('Wrong campaign id from ' + ip, 'WARNING', 'numberOfCall.ts');
		return;
	}

	const clients = await Client.find({ _id: { $in: campaign.userList } });
	let numberOfCalls = 0;
	clients.forEach(client => {
		if (client.data.has(campaign._id.toString()))
			numberOfCalls += client.data.get(campaign._id.toString())?.length ?? 0;
	});
	res.status(200).send({
		message: 'in this campaign ' + numberOfCalls + ' call was made',
		OK: true,
		data: { numberOfCalls: numberOfCalls }
	});
	log('number of call get by ' + area.name + ' admin', 'INFORMATION', 'numberOfCall.ts');
}