import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { Types } from 'mongoose';

import { Caller } from '../../Models/Caller';
import { Campaign } from '../../Models/Campaign';
import { Client } from '../../Models/Client';
import checkCredentials from '../../tools/checkCredentials';
import getCurrentCampaign from '../../tools/getCurrentCampaign';
import { log } from '../../tools/log';

export default async function validatePhoneNumber(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();

	if (
		!req.body ||
		typeof req.body.phone != 'string' ||
		typeof req.body.pinCode != 'string' ||
		!ObjectId.isValid(req.body.area) ||
		typeof req.body.phoneNumber != 'string' ||
		typeof req.body.satisfaction != 'number' ||
		(req.body.comment && typeof req.body.comment != 'string')
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from: ` + ip, 'WARNING', 'validatePhoneNumber.ts');
		return;
	}

	if (isNaN(req.body.satisfaction) || req.body.satisfaction < -2 || req.body.satisfaction > 2) {
		res.status(400).send({ message: 'satisfaction is not a valid number', OK: false });
		log(`satisfaction is not a valid number from ` + ip, 'WARNING', 'endCall.ts');
		return;
	}

	const caller = await checkCredentials(req.body.phone, req.body.pinCode);
	if (!caller) {
		res.status(403).send({ message: 'Wrong credentials', OK: false });
		log(`Wrong credentials from: ` + ip, 'WARNING', 'validatePhoneNumber.ts');
		return;
	}

	const curentCampaign = await getCurrentCampaign(req.body.area);
	if (!curentCampaign) {
		res.status(404).send({ message: 'no actual Camaing', OK: false });
		log(`no actual Camaing from ${caller.name} (${ip})`, 'WARNING', 'validatePhoneNumber.ts');
		return;
	}

	if (curentCampaign.area.toString() != caller.area.toString() && !caller.campaigns.includes(curentCampaign._id)) {
		res.status(403).send({ message: 'Caller not in campaign', OK: false });
		log(`Caller not in campaign from: ${caller.name} (${ip})`, 'WARNING', 'validatePhoneNumber.ts');
		return;
	}

	if (req.body.phoneNumber.startsWith('0')) {
		req.body.phoneNumber = req.body.phoneNumber.replace('0', '+33');
	}
	const client = await Client.findOne({
		phone: req.body.phoneNumber
	});
	if (!client) {
		res.status(404).send({ message: 'Client not found', OK: false });
		log(`Client not found from: ${caller.name} (${ip})`, 'WARNING', 'validatePhoneNumber.ts');
		return;
	}

	let nbCall = client.data.get(curentCampaign._id.toString())?.length;
	if (!nbCall) {
		const newData = new Types.DocumentArray([{ status: 'not called' }]) as any;
		client.data.set(curentCampaign._id.toString(), newData);
		nbCall = 1;
	}

	if (client.data[nbCall - 1].status == 'inprogress') {
		res.status(403).send({ message: 'Client already in call', OK: false });
		log(`Client already in call from: ${caller.name} (${ip})`, 'WARNING', 'validatePhoneNumber.ts');
		return;
	}

	if (client.data[nbCall - 1].status == 'called') {
		res.status(403).send({ message: 'Client already validate', OK: false });
		log(`Client already validate from: ${caller.name} (${ip})`, 'WARNING', 'validatePhoneNumber.ts');
		return;
	}

	if (
		!client.data.get(curentCampaign._id.toString())?.find(call => call?.caller?.toString() == caller._id.toString())
	) {
		res.status(403).send({ message: 'you dont call this client', OK: false });
		log(`you dont call this client from: ${caller.name} (${ip})`, 'WARNING', 'validatePhoneNumber.ts');
		return;
	}

	if (req.body.satisfaction != -2) {
		const clientCampaign = (client.data.get(curentCampaign._id.toString()) as unknown as Map<string, any>)[
			nbCall - 1
		];
		if (!clientCampaign) {
			res.status(500).send({ message: 'Internal error', OK: false });
			log(`Internal error from ${caller.name} (${ip})`, 'ERROR', 'endCall.ts');
			return;
		}
		if (!clientCampaign) {
			res.status(500).send({ message: 'Internal error', OK: false });
			log(`Internal error from ${caller.name} (${ip})`, 'ERROR', 'endCall.ts');
			return;
		}
		clientCampaign.status = req.body.satisfaction == 0 ? 'not answered' : 'called';
		clientCampaign.startCall = new Date();
		clientCampaign.endCall = new Date();
		clientCampaign.satisfaction = req.body.satisfaction;
		if (req.body.comment && req.body.comment.trim().length > 0) {
			clientCampaign.comment = req.body.comment.trim();
		}
	} else if (req.body.satisfaction == -2) {
		await Campaign.updateOne({ _id: curentCampaign._id }, { $push: { trashUser: client._id } });
		log(`delete ${client.phone} client from ${caller.name} ${caller.name} (${ip})`, 'INFORMATION', 'endCall.ts');
	}

	await Caller.updateOne(
		{ _id: caller._id },
		{
			$push: {
				timeInCall: {
					date: new Date(),
					client: client._id,
					time: req.body.timeInCall,
					campaign: curentCampaign._id
				}
			},
			currentCall: null
		}
	);

	if (req.body.satisfaction != -2) await client.save();

	res.status(200).send({ message: 'OK', OK: true });
	log(`end virtual call from ${caller.name} (${ip})`, 'INFORMATION', 'endCall.ts');
}
