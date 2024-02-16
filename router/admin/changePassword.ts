import { Request, Response } from 'express';
import { log } from '../../tools/log';
import { ObjectId } from 'mongodb';
import { Area } from '../../Models/area';

export default async function changePasword(req: Request<any>, res: Response<any>) {
	const ip = req.socket?.remoteAddress?.split(':').pop();
	if (!req.body || typeof req.body.adminCode != 'string' || !ObjectId.isValid(req.body.area)) {
		res.status(400).send({ message: 'Missing parameters', OK: false });
		log(`Missing parameters from ` + ip, 'WARNING', 'changePasword.ts');
		return;
	}

	const area = await Area.findOne({ _id: req.body.area, AdminPassword: req.body.adminCode });
	if (!area) {
		res.status(401).send({ message: 'Wrong admin code', OK: false });
		log(`Wrong admin code from ${ip}`, 'WARNING', 'changePasword.ts');
		return;
	}

	const output = await Area.updateOne({ _id: area._id }, { AdminPassword: req.body.newAdminCode });

	if (output.modifiedCount != 1) {
		res.status(400).send({ message: 'Area not found or badPassword', OK: false });
		log(`Area not found from ${ip}`, 'WARNING', 'changePasword.ts');
		return;
	}

	res.status(200).send({ message: 'OK', OK: true });
	log(`Admin password changed from ${ip} (${area.name})`, 'INFORMATION', 'changePasword.ts');
}