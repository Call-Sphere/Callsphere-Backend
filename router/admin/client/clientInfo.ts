import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { log } from '../../../tools/log';
import phoneNumberCheck from '../../../tools/phoneNumberCheck';
import clearPhone from '../../../tools/clearPhone';
import { Area } from '../../../Models/Area';
import { Client } from '../../../Models/Client';
import { Caller } from '../../../Models/Caller';
import { Campaign } from '../../../Models/Campaign';
import getCurrentCampaign from '../../../tools/getCurrentCampaign';

export default async function clientInfo(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		typeof req.body.phone != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		(req.body.campaign && !ObjectId.isValid(req.body.campaign))
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'clientInfo.ts');
		return;
	}
	req.body.phone = clearPhone(req.body.phone);
	if (!phoneNumberCheck(req.body.phone)) {
		res.status(400).send({ message: 'Wrong phone number', OK: false });
		log(`Wrong phone number from ${ip}`, 'WARNING', 'clientInfo.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'clientInfo.ts');
		return;
	}

	let campaign: InstanceType<typeof Campaign> | null = null;

	if (req.body.campaign) {
		campaign = await Campaign.findOne({ _id: req.body.campaign, area: area._id });
	} else {
		campaign = await getCurrentCampaign(area._id);
	}
	if (!campaign) {
		res.status(404).send({ message: 'Campaign not found', OK: false });
		log(`Campaign not found from ${area.name} (${ip})`, 'WARNING', 'clientInfo.ts');
		return;
	}

	const client = await Client.findOne({ phone: req.body.phone, area: req.body.area });
	if (!client) {
		res.status(404).send({ message: 'User not found', OK: false });
		log(`User not found from ${area.name} (${ip})`, 'WARNING', 'clientInfo.ts');
		return;
	}

	const callers = client.data.get(campaign._id.toString())?.map(async clientCallObj => {
		const caller = await Caller.findById(clientCallObj.caller);
		if (!caller) return null;
		return {
			id: caller._id,
			name: caller.name,
			phone: caller.phone
		};
	});
	if (!callers) {
		res.status(200).send({
			OK: true,
			data: { client: client, callers: [] }
		});
	} else {
		let callerResolve: any[] = [];
		await Promise.all(callers).then(resolvedCallers => {
			callerResolve = resolvedCallers.filter(caller => caller != null);
		});

		res.status(200).send({
			OK: true,
			data: {
				client: client,
				callers: callerResolve
			}
		});
	}
	log(`Client info got from ${area.name} (${ip})`, 'INFORMATION', 'clientInfo.ts');
}
