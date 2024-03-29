import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { Area } from '../../../Models/Area';
import { Caller } from '../../../Models/Caller';
import clearPhone from '../../../tools/clearPhone';
import { log } from '../../../tools/log';
import phoneNumberCheck from '../../../tools/phoneNumberCheck';

export default async function changeCallerPassword(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (
		!req.body ||
		typeof req.body.adminCode != 'string' ||
		typeof req.body.newPassword != 'string' ||
		typeof req.body.Callerphone != 'string' ||
		!ObjectId.isValid(req.body.area)
	) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'changeCallerPassword.ts');
		return;
	}

	const area = await Area.findOne({ AdminPassword: req.body.adminCode, _id: req.body.area });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ` + ip, 'WARNING', 'changeCallerPassword.ts');
		return;
	}

	req.body.Callerphone = clearPhone(req.body.Callerphone);
	if (!phoneNumberCheck(req.body.Callerphone)) {
		res.status(400).send({ message: 'Invalid phone number', OK: false });
		log(`Invalid phone number from ` + ip, 'WARNING', 'changeCallerPassword.ts');
		return;
	}
	const result = await Caller.updateOne(
		{ phone: req.body.Callerphone, area: area._id },
		{ pinCode: req.body.newPassword }
	);
	if (result.matchedCount != 1) {
		res.status(404).send({ message: 'Caller not found or same password', OK: false });
		log(`Caller not found or same password from ${area.name} admin (${ip})`, 'WARNING', 'changeCallerPassword.ts');
		return;
	}

	res.status(200).send({ message: 'Password changed', OK: true });
	log(
		`Password of ${req.body.Callerphone} changed from ${area.name} admin (${ip})`,
		'INFORMATION',
		'changeCallerPassword.ts'
	);
}
