import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import https from 'https';
import mongoose from 'mongoose';

import router from './routes';
import { log } from './tools/log';

dotenv.config({ path: '.env' });
const port = 8443;

// Connect to MongoDB using Mongoose
mongoose
	.connect(process.env.URI ?? '')
	.then(() => {
		log('Successfully connected to MongoDB', 'INFORMATION', 'index.ts');
	})
	.catch(error => {
		log('Error connecting to MongoDB: ' + error, 'CRITICAL', 'index.ts');
	});

// Create an instance of the Express app
const app = express();
if (process.env.ISDEV == 'false') {
	const options = {
		key: fs.readFileSync('./certs/privkey.pem'),
		cert: fs.readFileSync('./certs/fullchain.pem')
	};
	const server = https.createServer(options, app);
	server.listen(port, () => {
		log(`Listening at https://localhost:${port}`, 'DEBUG', 'index.ts');
	});
} else {
	app.listen(port, () => {
		log(`Listening at http://localhost:${port}`, 'DEBUG', 'index.ts');
	});
}

app.use(express.json());
app.use(cors());
app.use((err: { status: number }, req: any, res: any, next: Function) => {
	if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
		return res.sendStatus(400);
	}
	next();
});
app.use('/api', router);

app.get('/', (req, res) => {
	res.send({ message: 'Hello World!' });
});
