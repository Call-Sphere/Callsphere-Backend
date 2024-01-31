import { Request, Response } from 'express';
import { log } from '../../tools/log';
import { Area } from '../../Models/area';
import { Campaign } from '../../Models/Campaign';

export default async function numberOfCallers(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (!req.body || typeof req.body.campaign != 'string' || typeof req.body.adminCode != 'string') {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log('Missing parameters', 'WARNING', 'numberOfCallers.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log('Wrong admin code from ' + ip, 'WARNING', 'numberOfCallers.ts');
		return;
	}

	const campaign = await Campaign.findOne({ _id: req.body.campaign });
	if (!campaign) {
		res.status(401).send({ message: 'Wrong campaign id', OK: false });
		log('Wrong campaign id from ' + ip, 'WARNING', 'numberOfCallers.ts');
		return;
	}

	res.status(200).send({
		message: 'in this campaign ' + campaign.callerList.length + ' caller was added',
		OK: true,
		data: { numberOfCallers: campaign.callerList.length }
	});
	log('number of caller get by ' + area.name + ' admin', 'INFORMATION', 'numberOfCallers.ts');
}