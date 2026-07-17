import 'dotenv/config';
import { POST } from './app/api/v1/auth/signup/route';
const req = new Request('http://localhost/api', { method: 'POST', body: JSON.stringify({ email: 'test1234567@test.com', name: 'test', password: 'password' }) });
POST(req).then(async r => { console.log(r.status); console.log(await r.json()); }).catch(console.error);
