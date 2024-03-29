import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Client } from '../../Models/Client';
import checkCredentials from '../../tools/checkCredentials';
import getCurrentCampaign from '../../tools/getCurrentCampaign';
import { log } from '../../tools/log';

export default async function giveUp(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters`, 'WARNING', 'giveUp.ts');
		return;
	}
	const caller = await checkCredentials(req.body.phone, req.body.pinCode);
	if (!caller) {
		res.status(403).send({ message: 'Invalid credential', OK: false });
		log(`Invalid credential from ` + ip, 'WARNING', 'giveUp.ts');
		return;
	}
	if (!caller.currentCall || !caller.currentCall.client) {
		res.status(400).send({ message: 'Not in a call', OK: false });
		log(`Not in a call from ${caller.name} (${ip})`, 'WARNING', 'giveUp.ts');
		return;
	}

	const curentCampaign = await getCurrentCampaign(req.body.area);
	if (!curentCampaign) {
		res.status(404).send({ message: 'no actual Camaing', OK: false });
		log(`no actual Camaing from ${caller.name} (${ip})`, 'WARNING', 'giveUp.ts');
		return;
	}

	const client = await Client.findOne({ _id: caller.currentCall.client.toString() });
	if (!client) {
		res.status(400).send({ message: 'Not in a call', OK: false });
		log(`Not in a call from ${caller.name} (${ip})`, 'WARNING', 'giveUp.ts');
		return;
	}

	const data = client.data.get(curentCampaign._id.toString());
	if (data && data.length < 2) {
		data[data.length - 1].status = 'not called';
		data[data.length - 1].caller = null;
		data[data.length - 1].scriptVersion = null;
	} else {
		data?.pop();
	}
	caller.currentCall = null;
	await Promise.all([caller.save(), client.save()]);
	res.status(200).send({ message: 'Call gived up', OK: true });
	log(`Call gived up from ${caller.name} (${ip})`, 'INFORMATION', 'giveUp.ts');
}
