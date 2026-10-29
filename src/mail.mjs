import nodemailer from 'nodemailer';

export function emailReady(cfg) {
  const e = cfg.email || {};
  return Boolean(e.enabled && e.host && e.user && e.pass && (e.to?.length || e.from));
}

export function emailMissing(cfg) {
  const e = cfg.email || {};
  const miss = [];
  if (!e.enabled) miss.push('email.enabled=false');
  if (!e.host) miss.push('email.host');
  if (!e.user) miss.push('email.user');
  if (!e.pass) miss.push('email.pass');
  if (!e.to?.length) miss.push('email.to');
  return miss;
}

export function createTransport(cfg) {
  const e = cfg.email;
  return nodemailer.createTransport({
    host: e.host,
    port: e.port || 465,
    secure: e.secure !== false,
    auth: { user: e.user, pass: e.pass },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 40000,
  });
}

export async function sendReport({ cfg, subject, html, markdown, filename }) {
  const t = createTransport(cfg);
  const info = await t.sendMail({
    from: cfg.email.from || cfg.email.user,
    to: cfg.email.to,
    subject,
    html,
    text: markdown,
    attachments: [{ filename, content: markdown, contentType: 'text/markdown; charset=utf-8' }],
  });
  t.close();
  return info;
}

export async function sendTest(cfg) {
  const t = createTransport(cfg);
  const info = await t.sendMail({
    from: cfg.email.from || cfg.email.user,
    to: cfg.email.to,
    subject: `${cfg.email.subjectPrefix} 发信测试`,
    text: '如果你收到这封信，说明 SMTP 配置可用。',
    html: '<p>如果你收到这封信，说明 <b>SMTP 配置可用</b>。</p>',
  });
  t.close();
  return info;
}
