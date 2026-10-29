import nodemailer from 'nodemailer';

const user = process.env.PROBE_USER;
const pass = process.env.PROBE_PASS;
const targets = (process.env.PROBE_HOSTS || '').split(',').filter(Boolean);

for (const t of targets) {
  const [host, portStr, secureStr] = t.split(':');
  const port = Number(portStr || 465);
  const secure = secureStr !== '0';
  const transport = nodemailer.createTransport({
    host, port, secure,
    auth: { user, pass },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 15000,
  });
  try {
    await transport.verify();
    console.log(`OK   ${host}:${port} secure=${secure}`);
    transport.close();
    process.exit(0);
  } catch (err) {
    console.log(`FAIL ${host}:${port} secure=${secure} :: ${err.code || ''} ${String(err.message).slice(0, 120)}`);
    transport.close();
  }
}
process.exit(1);
