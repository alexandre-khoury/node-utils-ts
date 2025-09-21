import { ImapFlow, ImapFlowOptions } from 'imapflow';
import { simpleParser } from 'mailparser';

export declare namespace ImapUtils {
  interface ParsedEmail {
    sender: string;
    date: Date;
    subject: string;
    bodyHtml: string;
    bodyText: string;
  }
}

export class ImapUtils {
  static async getLatestEmails(
    options: ImapFlowOptions,
    since: Date,
    filterBySender?: string,
  ) {
    const parsedEmails: ImapUtils.ParsedEmail[] = [];
    const client = new ImapFlow(options);
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const emails = await client.search({ since });
      if (emails) {
        for await (const email of client.fetch(emails, {
          envelope: true,
          internalDate: true,
          source: true,
        })) {
          const sender = email.envelope?.sender?.[0]?.address;
          const subject = email.envelope?.subject;
          const date = email.envelope?.date;
          const source = email.source;
          if (!sender || !subject || !date || !source) continue;
          if (filterBySender && sender !== filterBySender) continue;

          const parsed = await simpleParser(source);

          parsedEmails.push({
            sender,
            date,
            subject,
            bodyHtml: parsed.html || '',
            bodyText: parsed.text ?? '',
          });
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
    return parsedEmails;
  }
}
