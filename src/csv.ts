import { createReadStream } from 'node:fs';

import { parse } from 'csv-parse';

export class CSVUtils {
  static async parse<Row>(filePath: string) {
    return new Promise<Row[]>((resolve, reject) => {
      const records: Row[] = [];

      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) records.push(record);
      });
      parser.on('error', (err) => {
        console.error('CSV Parsing Error:', err.message);
        reject(err);
      });
      parser.on('end', () => resolve(records));

      const readableStream = createReadStream(filePath);
      readableStream.on('error', (err) => {
        console.error(`Error reading file ${filePath}:`, err.message);
        reject(err);
      });
      readableStream.pipe(parser);
    });
  }
}
