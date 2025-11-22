import { ImapFlow, ImapFlowOptions } from "imapflow";
import { simpleParser } from "mailparser";

export declare namespace ImapUtils {
  interface ParsedEmail {
    uid: number;
    sender: string;
    date: Date;
    subject: string;
    bodyHtml: string;
    bodyText: string;
  }
}

export class ImapUtils {
  static async moveEmail(
    options: ImapFlowOptions,
    uid: number,
    sourceMailboxName: string,
    destinationMailboxName: string
  ) {
    const client = new ImapFlow(options);
    await client.connect();
    const lock = await client.getMailboxLock(sourceMailboxName);
    let result: boolean = false;
    try {
      const moveResult = await client.messageMove(uid, destinationMailboxName, {
        uid: true,
      });
      result = !!moveResult;
    } finally {
      lock.release();
    }
    await client.logout();
    return result;
  }

  static async getLatestEmails(
    options: ImapFlowOptions,
    since: Date,
    filterBySender?: string,
    mailboxName: string = "INBOX"
  ) {
    const parsedEmails: ImapUtils.ParsedEmail[] = [];
    const client = new ImapFlow(options);
    await client.connect();
    const lock = await client.getMailboxLock(mailboxName);
    try {
      const uids = await client.search({ since });
      if (uids) {
        for await (const email of client.fetch(uids, {
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
            uid: email.uid,
            sender,
            date,
            subject,
            bodyHtml: parsed.html || "",
            bodyText: parsed.text ?? "",
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
