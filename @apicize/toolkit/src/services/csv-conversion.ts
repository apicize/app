export type CsvRow = { [name: string]: string }

export interface Csv {
    columns: string[],
    rows: CsvRow[],
}

export class CsvConversion {
    /**
     * Convert CSV text blog to JavaScript array
     * @param csvString 
     * @returns array of JavaScript object
     */
    public static fromCsv(csvString: string): Csv {
        const regex = /,(?=(?:[^"]*"[^"]*")*(?![^"]*"))/;
        const rows: string[] = csvString
            .split("\n");
        const headers: string[] = rows[0]
            .split(regex);
        const lines: CsvRow[] = [];

        const unquoteField = (field: string): string => {
            const trimmed = field.trim();
            // Check if the field starts and ends with quotes
            if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                // Remove surrounding quotes and unescape internal quotes
                return trimmed.slice(1, -1).replaceAll('""', '"');
            }
            return trimmed;
        };

        for (let i = 1; i < rows.length; i++) {
            const s = rows[i]
            if (s.length === 0) continue
            const values: string[] = s.split(regex);
            const obj: { [key: string]: string } = {};
            for (let j = 0; j < headers.length; j++) {
                obj[unquoteField(headers[j])] = unquoteField(values[j]);
            }
            lines.push(obj);
        }


        return {
            columns: headers.map(h => unquoteField(h)),
            rows: lines
        }
    }

    public static toCsvString(data: Csv) {
        const escapeCsv = (s: string | number | boolean) => {
            const t = s.toString().replaceAll('\t', '\\t')
                .replaceAll('\n', '\\n')
                .replaceAll('\r', '\\r')
            const hasComma = t.indexOf(',') >= 0
            const hasQuotes = t.indexOf('"') >= 0
            if (hasComma || hasQuotes) {
                return `"${t.replaceAll('"', '""')}"`
            } else {
                return t
            }
        }
        return [
            data.columns.map(c => escapeCsv(c)).join(','),
            ...data.rows.map(d => data.columns.map(c => escapeCsv(d[c])).join(','))
        ].join('\n')
    }

    /**
     * Convert CSV data to an array of objects with name/value pairs
     * @param data - CSV data with columns and rows
     * @returns Array of objects where each object has { name, value } properties for each column in the row
     */
    public static toObject(data: Csv): object[] {
        return data.rows.map(row =>
            Object.fromEntries(data.columns.map(column => ([
                column,
                row[column] || ''
            ])))
        );
    }

    /**
     * Convert a JavaScript object or array to CSV format
     * @param data - Object or array to convert
     * @returns CSV data with columns and rows
     */
    public static fromObject(data: unknown): Csv {
        // Convert to array if not already
        let dataArray: unknown[];
        if (!Array.isArray(data)) {
            dataArray = [data];
        } else {
            dataArray = data;
        }

        // Convert non-objects to objects with 'data' property
        const objectArray = dataArray.map(item => {
            if (item === null || item === undefined) {
                return { data: '' };
            }
            if (typeof item !== 'object' || Array.isArray(item)) {
                return { data: item };
            }
            return item as Record<string, unknown>;
        });

        // Gather all unique column names from all objects
        const columnSet = new Set<string>();
        objectArray.forEach(obj => {
            Object.keys(obj).forEach(key => columnSet.add(key));
        });
        const columns = Array.from(columnSet);

        // Convert each object to a row
        const rows: CsvRow[] = objectArray.map(obj => {
            const row: CsvRow = {};
            columns.forEach(column => {
                const value = obj[column];

                // Convert null/undefined to empty string
                if (value === null || value === undefined) {
                    row[column] = '';
                }
                // Keep strings as-is
                else if (typeof value === 'string') {
                    row[column] = value;
                }
                // Keep numbers and booleans as strings
                else if (typeof value === 'number' || typeof value === 'boolean') {
                    row[column] = value.toString();
                }
                // Convert non-scalar values (objects, arrays) to JSON string
                else {
                    row[column] = JSON.stringify(value);
                }
            });
            return row;
        });

        return { columns, rows };
    }
}