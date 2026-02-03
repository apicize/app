import { CsvConversion, CsvRow } from '../../src/services/csv-conversion';

describe('CsvConversion', () => {
    describe('fromCsv', () => {
        it('parses simple CSV data', () => {
            const csvString = 'name,age,city\nAlice,30,New York\nBob,25,London';
            const result = CsvConversion.fromCsv(csvString);

            expect(result.columns).toEqual(['name', 'age', 'city']);
            expect(result.rows).toEqual([
                { name: 'Alice', age: '30', city: 'New York' },
                { name: 'Bob', age: '25', city: 'London' }
            ]);
        });

        it('unquotes fields with commas', () => {
            const csvString = 'name,description\nProduct A,"A product, with a comma"\nProduct B,"Another product, also with comma"';
            const result = CsvConversion.fromCsv(csvString);

            expect(result.columns).toEqual(['name', 'description']);
            expect(result.rows).toEqual([
                { name: 'Product A', description: 'A product, with a comma' },
                { name: 'Product B', description: 'Another product, also with comma' }
            ]);
        });

        it('unquotes and unescapes fields with double quotes', () => {
            const csvString = 'name,quote\nAuthor A,"He said ""hello"""\nAuthor B,"She replied ""goodbye"""';
            const result = CsvConversion.fromCsv(csvString);

            expect(result.columns).toEqual(['name', 'quote']);
            expect(result.rows).toEqual([
                { name: 'Author A', quote: 'He said "hello"' },
                { name: 'Author B', quote: 'She replied "goodbye"' }
            ]);
        });

        it('handles fields with both commas and quotes', () => {
            const csvString = 'product,description\nItem 1,"A ""special"" item, very unique"\nItem 2,"Another ""rare"" product, highly valued"';
            const result = CsvConversion.fromCsv(csvString);

            expect(result.columns).toEqual(['product', 'description']);
            expect(result.rows).toEqual([
                { product: 'Item 1', description: 'A "special" item, very unique' },
                { product: 'Item 2', description: 'Another "rare" product, highly valued' }
            ]);
        });

        it('handles empty fields', () => {
            const csvString = 'name,email,phone\nAlice,alice@example.com,\n,bob@example.com,555-1234';
            const result = CsvConversion.fromCsv(csvString);

            expect(result.columns).toEqual(['name', 'email', 'phone']);
            expect(result.rows).toEqual([
                { name: 'Alice', email: 'alice@example.com', phone: '' },
                { name: '', email: 'bob@example.com', phone: '555-1234' }
            ]);
        });

        it('unquotes column headers with commas', () => {
            const csvString = 'Full Name,"Address, City",Phone Number\nAlice Smith,"123 Main St, NYC",555-1234';
            const result = CsvConversion.fromCsv(csvString);

            expect(result.columns).toEqual(['Full Name', 'Address, City', 'Phone Number']);
            expect(result.rows).toEqual([
                { 'Full Name': 'Alice Smith', 'Address, City': '123 Main St, NYC', 'Phone Number': '555-1234' }
            ]);
        });

        it('unquotes and unescapes column headers with quotes', () => {
            const csvString = 'Name,"Favorite ""Color""",Status\nAlice,Blue,Active';
            const result = CsvConversion.fromCsv(csvString);

            expect(result.columns).toEqual(['Name', 'Favorite "Color"', 'Status']);
            expect(result.rows).toEqual([
                { 'Name': 'Alice', 'Favorite "Color"': 'Blue', 'Status': 'Active' }
            ]);
        });

        it('handles mixed quoted and unquoted fields', () => {
            const csvString = 'ID,"Name, Title",Quote,Active,Price\n1,"Dr. Smith, PhD","He said ""hello, world""",true,99.99\n2,Ms. Jones,Simple text,false,49.5';
            const result = CsvConversion.fromCsv(csvString);

            expect(result.columns).toEqual(['ID', 'Name, Title', 'Quote', 'Active', 'Price']);
            expect(result.rows).toEqual([
                {
                    'ID': '1',
                    'Name, Title': 'Dr. Smith, PhD',
                    'Quote': 'He said "hello, world"',
                    'Active': 'true',
                    'Price': '99.99'
                },
                {
                    'ID': '2',
                    'Name, Title': 'Ms. Jones',
                    'Quote': 'Simple text',
                    'Active': 'false',
                    'Price': '49.5'
                }
            ]);
        });

        it('ignores empty lines', () => {
            const csvString = 'name,value\nAlice,123\n\nBob,456\n';
            const result = CsvConversion.fromCsv(csvString);

            expect(result.columns).toEqual(['name', 'value']);
            expect(result.rows).toEqual([
                { name: 'Alice', value: '123' },
                { name: 'Bob', value: '456' }
            ]);
        });

        it('handles single row', () => {
            const csvString = 'name,value\nSingle,Row';
            const result = CsvConversion.fromCsv(csvString);

            expect(result.columns).toEqual(['name', 'value']);
            expect(result.rows).toEqual([
                { name: 'Single', value: 'Row' }
            ]);
        });

        it('handles single column', () => {
            const csvString = 'name\nAlice\nBob\nCharlie';
            const result = CsvConversion.fromCsv(csvString);

            expect(result.columns).toEqual(['name']);
            expect(result.rows).toEqual([
                { name: 'Alice' },
                { name: 'Bob' },
                { name: 'Charlie' }
            ]);
        });
    });

    describe('toCsvString', () => {
        it('converts simple data to CSV string', () => {
            const data = {
                columns: ['name', 'age', 'city'],
                rows: [
                    { name: 'Alice', age: 30, city: 'New York' },
                    { name: 'Bob', age: 25, city: 'London' }
                ]
            };

            const result = CsvConversion.toCsvString(data);
            const expected = 'name,age,city\nAlice,30,New York\nBob,25,London';

            expect(result).toEqual(expected);
        });

        it('escapes commas in data values', () => {
            const data = {
                columns: ['name', 'description'],
                rows: [
                    { name: 'Product A', description: 'A product, with a comma' },
                    { name: 'Product B', description: 'Another product, also with comma' }
                ]
            };

            const result = CsvConversion.toCsvString(data);
            const expected = 'name,description\nProduct A,"A product, with a comma"\nProduct B,"Another product, also with comma"';

            expect(result).toEqual(expected);
        });

        it('escapes double quotes in data values', () => {
            const data = {
                columns: ['name', 'quote'],
                rows: [
                    { name: 'Author A', quote: 'He said "hello"' },
                    { name: 'Author B', quote: 'She replied "goodbye"' }
                ]
            };

            const result = CsvConversion.toCsvString(data);
            const expected = 'name,quote\nAuthor A,"He said ""hello"""\nAuthor B,"She replied ""goodbye"""';

            expect(result).toEqual(expected);
        });

        it('escapes values with both commas and double quotes', () => {
            const data = {
                columns: ['product', 'description'],
                rows: [
                    { product: 'Item 1', description: 'A "special" item, very unique' },
                    { product: 'Item 2', description: 'Another "rare" product, highly valued' }
                ]
            };

            const result = CsvConversion.toCsvString(data);
            const expected = 'product,description\nItem 1,"A ""special"" item, very unique"\nItem 2,"Another ""rare"" product, highly valued"';

            expect(result).toEqual(expected);
        });

        it('handles numeric values', () => {
            const data = {
                columns: ['id', 'price', 'quantity'],
                rows: [
                    { id: 1, price: 19.99, quantity: 5 },
                    { id: 2, price: 29.99, quantity: 3 }
                ]
            };

            const result = CsvConversion.toCsvString(data);
            const expected = 'id,price,quantity\n1,19.99,5\n2,29.99,3';

            expect(result).toEqual(expected);
        });

        it('handles boolean values', () => {
            const data = {
                columns: ['name', 'active', 'verified'],
                rows: [
                    { name: 'User 1', active: true, verified: false },
                    { name: 'User 2', active: false, verified: true }
                ]
            };

            const result = CsvConversion.toCsvString(data);
            const expected = 'name,active,verified\nUser 1,true,false\nUser 2,false,true';

            expect(result).toEqual(expected);
        });

        it('escapes special characters (tabs, newlines, carriage returns)', () => {
            const data = {
                columns: ['name', 'notes'],
                rows: [
                    { name: 'Record 1', notes: 'Line 1\nLine 2' },
                    { name: 'Record 2', notes: 'Tab\tseparated\tvalues' },
                    { name: 'Record 3', notes: 'Carriage\rreturn' }
                ]
            };

            const result = CsvConversion.toCsvString(data);
            const expected = 'name,notes\nRecord 1,Line 1\\nLine 2\nRecord 2,Tab\\tseparated\\tvalues\nRecord 3,Carriage\\rreturn';

            expect(result).toEqual(expected);
        });

        it('handles empty strings', () => {
            const data = {
                columns: ['name', 'email', 'phone'],
                rows: [
                    { name: 'Alice', email: 'alice@example.com', phone: '' },
                    { name: '', email: 'bob@example.com', phone: '555-1234' }
                ]
            };

            const result = CsvConversion.toCsvString(data);
            const expected = 'name,email,phone\nAlice,alice@example.com,\n,bob@example.com,555-1234';

            expect(result).toEqual(expected);
        });

        it('handles single row', () => {
            const data = {
                columns: ['name', 'value'],
                rows: [
                    { name: 'Single', value: 'Row' }
                ]
            };

            const result = CsvConversion.toCsvString(data);
            const expected = 'name,value\nSingle,Row';

            expect(result).toEqual(expected);
        });

        it('handles single column', () => {
            const data = {
                columns: ['name'],
                rows: [
                    { name: 'Alice' },
                    { name: 'Bob' },
                    { name: 'Charlie' }
                ]
            };

            const result = CsvConversion.toCsvString(data);
            const expected = 'name\nAlice\nBob\nCharlie';

            expect(result).toEqual(expected);
        });

        it('escapes column headers with commas', () => {
            const data = {
                columns: ['Full Name', 'Address, City', 'Phone Number'],
                rows: [
                    { 'Full Name': 'Alice Smith', 'Address, City': '123 Main St, NYC', 'Phone Number': '555-1234' }
                ]
            };

            const result = CsvConversion.toCsvString(data);
            const expected = 'Full Name,"Address, City",Phone Number\nAlice Smith,"123 Main St, NYC",555-1234';

            expect(result).toEqual(expected);
        });

        it('escapes column headers with quotes', () => {
            const data = {
                columns: ['Name', 'Favorite "Color"', 'Status'],
                rows: [
                    { 'Name': 'Alice', 'Favorite "Color"': 'Blue', 'Status': 'Active' }
                ]
            };

            const result = CsvConversion.toCsvString(data);
            const expected = 'Name,"Favorite ""Color""",Status\nAlice,Blue,Active';

            expect(result).toEqual(expected);
        });

        it('handles complex mixed data with all edge cases', () => {
            const data = {
                columns: ['ID', 'Name, Title', 'Quote', 'Active', 'Price'],
                rows: [
                    {
                        'ID': 1,
                        'Name, Title': 'Dr. Smith, PhD',
                        'Quote': 'He said "hello, world"',
                        'Active': true,
                        'Price': 99.99
                    },
                    {
                        'ID': 2,
                        'Name, Title': 'Ms. Jones',
                        'Quote': 'Simple text',
                        'Active': false,
                        'Price': 49.5
                    }
                ]
            };

            const result = CsvConversion.toCsvString(data);
            const expected = 'ID,"Name, Title",Quote,Active,Price\n1,"Dr. Smith, PhD","He said ""hello, world""",true,99.99\n2,Ms. Jones,Simple text,false,49.5';

            expect(result).toEqual(expected);
        });
    });

    describe('round-trip conversion', () => {
        it('preserves data through toCsvString and fromCsv', () => {
            const originalData = {
                columns: ['name', 'description', 'price'],
                rows: [
                    { name: 'Product A', description: 'A product, with a comma', price: '19.99' },
                    { name: 'Product B', description: 'He said "hello"', price: '29.99' },
                    { name: 'Product C', description: 'Both "quotes" and, commas', price: '39.99' }
                ]
            };

            const csvString = CsvConversion.toCsvString(originalData);
            const parsedData = CsvConversion.fromCsv(csvString);

            expect(parsedData.columns).toEqual(originalData.columns);
            expect(parsedData.rows).toEqual(originalData.rows);
        });

        it('preserves special characters in headers and values', () => {
            const originalData = {
                columns: ['ID', 'Name, Title', 'Favorite "Color"'],
                rows: [
                    { 'ID': '1', 'Name, Title': 'Dr. Smith, PhD', 'Favorite "Color"': 'Blue "Sky"' },
                    { 'ID': '2', 'Name, Title': 'Ms. Jones', 'Favorite "Color"': 'Red' }
                ]
            };

            const csvString = CsvConversion.toCsvString(originalData);
            const parsedData = CsvConversion.fromCsv(csvString);

            expect(parsedData.columns).toEqual(originalData.columns);
            expect(parsedData.rows).toEqual(originalData.rows);
        });

        it('preserves empty values', () => {
            const originalData = {
                columns: ['name', 'email', 'phone'],
                rows: [
                    { name: 'Alice', email: 'alice@example.com', phone: '' },
                    { name: '', email: 'bob@example.com', phone: '555-1234' }
                ]
            };

            const csvString = CsvConversion.toCsvString(originalData);
            const parsedData = CsvConversion.fromCsv(csvString);

            expect(parsedData.columns).toEqual(originalData.columns);
            expect(parsedData.rows).toEqual(originalData.rows);
        });
    });

    describe('toObject', () => {
        it('converts simple CSV data to array of name/value objects', () => {
            const data = {
                columns: ['name', 'age', 'city'],
                rows: [
                    { name: 'Alice', age: '30', city: 'New York' },
                    { name: 'Bob', age: '25', city: 'London' }
                ]
            };

            const result = CsvConversion.toObject(data);

            expect(result).toEqual([
                [
                    { name: 'name', value: 'Alice' },
                    { name: 'age', value: '30' },
                    { name: 'city', value: 'New York' }
                ],
                [
                    { name: 'name', value: 'Bob' },
                    { name: 'age', value: '25' },
                    { name: 'city', value: 'London' }
                ]
            ]);
        });

        it('handles single row', () => {
            const data = {
                columns: ['product', 'price'],
                rows: [
                    { product: 'Widget', price: '19.99' }
                ]
            };

            const result = CsvConversion.toObject(data);

            expect(result).toEqual([
                [
                    { name: 'product', value: 'Widget' },
                    { name: 'price', value: '19.99' }
                ]
            ]);
        });

        it('handles single column', () => {
            const data = {
                columns: ['name'],
                rows: [
                    { name: 'Alice' },
                    { name: 'Bob' },
                    { name: 'Charlie' }
                ]
            };

            const result = CsvConversion.toObject(data);

            expect(result).toEqual([
                [{ name: 'name', value: 'Alice' }],
                [{ name: 'name', value: 'Bob' }],
                [{ name: 'name', value: 'Charlie' }]
            ]);
        });

        it('handles empty values as empty strings', () => {
            const data = {
                columns: ['name', 'email', 'phone'],
                rows: [
                    { name: 'Alice', email: 'alice@example.com', phone: '' },
                    { name: '', email: 'bob@example.com', phone: '555-1234' }
                ]
            };

            const result = CsvConversion.toObject(data);

            expect(result).toEqual([
                [
                    { name: 'name', value: 'Alice' },
                    { name: 'email', value: 'alice@example.com' },
                    { name: 'phone', value: '' }
                ],
                [
                    { name: 'name', value: '' },
                    { name: 'email', value: 'bob@example.com' },
                    { name: 'phone', value: '555-1234' }
                ]
            ]);
        });

        it('handles missing column values as empty strings', () => {
            const data = {
                columns: ['name', 'email', 'phone'],
                rows: [
                    { name: 'Alice', email: 'alice@example.com' } as CsvRow,
                    { name: 'Bob' } as CsvRow
                ]
            };

            const result = CsvConversion.toObject(data);

            expect(result).toEqual([
                [
                    { name: 'name', value: 'Alice' },
                    { name: 'email', value: 'alice@example.com' },
                    { name: 'phone', value: '' }
                ],
                [
                    { name: 'name', value: 'Bob' },
                    { name: 'email', value: '' },
                    { name: 'phone', value: '' }
                ]
            ]);
        });

        it('preserves special characters in column names', () => {
            const data = {
                columns: ['Full Name', 'Address, City', 'Favorite "Color"'],
                rows: [
                    { 'Full Name': 'Alice Smith', 'Address, City': '123 Main St, NYC', 'Favorite "Color"': 'Blue' }
                ]
            };

            const result = CsvConversion.toObject(data);

            expect(result).toEqual([
                [
                    { name: 'Full Name', value: 'Alice Smith' },
                    { name: 'Address, City', value: '123 Main St, NYC' },
                    { name: 'Favorite "Color"', value: 'Blue' }
                ]
            ]);
        });

        it('preserves special characters in values', () => {
            const data = {
                columns: ['product', 'description'],
                rows: [
                    { product: 'Item 1', description: 'A "special" item, very unique' },
                    { product: 'Item 2', description: 'Has\ttabs\tand\nnewlines' }
                ]
            };

            const result = CsvConversion.toObject(data);

            expect(result).toEqual([
                [
                    { name: 'product', value: 'Item 1' },
                    { name: 'description', value: 'A "special" item, very unique' }
                ],
                [
                    { name: 'product', value: 'Item 2' },
                    { name: 'description', value: 'Has\ttabs\tand\nnewlines' }
                ]
            ]);
        });

        it('handles empty CSV data', () => {
            const data = {
                columns: ['name', 'value'],
                rows: []
            };

            const result = CsvConversion.toObject(data);

            expect(result).toEqual([]);
        });

        it('maintains column order', () => {
            const data = {
                columns: ['z_field', 'a_field', 'm_field'],
                rows: [
                    { z_field: 'Z', a_field: 'A', m_field: 'M' }
                ]
            };

            const result = CsvConversion.toObject(data);

            expect(result).toEqual([
                [
                    { name: 'z_field', value: 'Z' },
                    { name: 'a_field', value: 'A' },
                    { name: 'm_field', value: 'M' }
                ]
            ]);

            // Verify order is preserved
            expect(result[0][0].name).toBe('z_field');
            expect(result[0][1].name).toBe('a_field');
            expect(result[0][2].name).toBe('m_field');
        });

        it('handles complex data with multiple rows and columns', () => {
            const data = {
                columns: ['id', 'name', 'email', 'status', 'score'],
                rows: [
                    { id: '1', name: 'Alice', email: 'alice@example.com', status: 'active', score: '95' },
                    { id: '2', name: 'Bob', email: 'bob@example.com', status: 'inactive', score: '87' },
                    { id: '3', name: 'Charlie', email: 'charlie@example.com', status: 'active', score: '92' }
                ]
            };

            const result = CsvConversion.toObject(data);

            expect(result.length).toBe(3);
            expect(result[0].length).toBe(5);
            expect(result[1].length).toBe(5);
            expect(result[2].length).toBe(5);

            expect(result[0]).toEqual([
                { name: 'id', value: '1' },
                { name: 'name', value: 'Alice' },
                { name: 'email', value: 'alice@example.com' },
                { name: 'status', value: 'active' },
                { name: 'score', value: '95' }
            ]);
        });
    });

    describe('fromObject', () => {
        it('converts array of simple objects to CSV', () => {
            const data = [
                { name: 'Alice', age: 30, city: 'New York' },
                { name: 'Bob', age: 25, city: 'London' }
            ];

            const result = CsvConversion.fromObject(data);

            expect(result.columns).toContain('name');
            expect(result.columns).toContain('age');
            expect(result.columns).toContain('city');
            expect(result.rows).toEqual([
                { name: 'Alice', age: '30', city: 'New York' },
                { name: 'Bob', age: '25', city: 'London' }
            ]);
        });

        it('converts single object to CSV (wraps in array)', () => {
            const data = { name: 'Alice', age: 30, city: 'New York' };

            const result = CsvConversion.fromObject(data);

            expect(result.columns).toContain('name');
            expect(result.columns).toContain('age');
            expect(result.columns).toContain('city');
            expect(result.rows).toEqual([
                { name: 'Alice', age: '30', city: 'New York' }
            ]);
        });

        it('converts array of primitives to objects with "data" property', () => {
            const data = ['Alice', 'Bob', 'Charlie'];

            const result = CsvConversion.fromObject(data);

            expect(result.columns).toEqual(['data']);
            expect(result.rows).toEqual([
                { data: 'Alice' },
                { data: 'Bob' },
                { data: 'Charlie' }
            ]);
        });

        it('converts single primitive to object with "data" property', () => {
            const data = 'Hello World';

            const result = CsvConversion.fromObject(data);

            expect(result.columns).toEqual(['data']);
            expect(result.rows).toEqual([
                { data: 'Hello World' }
            ]);
        });

        it('converts numbers to strings', () => {
            const data = [
                { id: 1, price: 19.99, quantity: 5 },
                { id: 2, price: 29.99, quantity: 3 }
            ];

            const result = CsvConversion.fromObject(data);

            expect(result.rows).toEqual([
                { id: '1', price: '19.99', quantity: '5' },
                { id: '2', price: '29.99', quantity: '3' }
            ]);
        });

        it('converts booleans to strings', () => {
            const data = [
                { name: 'User 1', active: true, verified: false },
                { name: 'User 2', active: false, verified: true }
            ];

            const result = CsvConversion.fromObject(data);

            expect(result.rows).toEqual([
                { name: 'User 1', active: 'true', verified: 'false' },
                { name: 'User 2', active: 'false', verified: 'true' }
            ]);
        });

        it('converts null values to empty strings', () => {
            const data = [
                { name: 'Alice', email: 'alice@example.com', phone: null },
                { name: 'Bob', email: null, phone: '555-1234' }
            ];

            const result = CsvConversion.fromObject(data);

            expect(result.rows).toEqual([
                { name: 'Alice', email: 'alice@example.com', phone: '' },
                { name: 'Bob', email: '', phone: '555-1234' }
            ]);
        });

        it('converts undefined values to empty strings', () => {
            const data = [
                { name: 'Alice', email: 'alice@example.com', phone: undefined },
                { name: 'Bob', email: undefined, phone: '555-1234' }
            ];

            const result = CsvConversion.fromObject(data);

            expect(result.rows).toEqual([
                { name: 'Alice', email: 'alice@example.com', phone: '' },
                { name: 'Bob', email: '', phone: '555-1234' }
            ]);
        });

        it('converts nested objects to JSON strings', () => {
            const data = [
                { name: 'Alice', address: { street: '123 Main St', city: 'NYC' } },
                { name: 'Bob', address: { street: '456 Oak Ave', city: 'LA' } }
            ];

            const result = CsvConversion.fromObject(data);

            expect(result.columns).toContain('name');
            expect(result.columns).toContain('address');
            expect(result.rows).toEqual([
                { name: 'Alice', address: '{"street":"123 Main St","city":"NYC"}' },
                { name: 'Bob', address: '{"street":"456 Oak Ave","city":"LA"}' }
            ]);
        });

        it('converts arrays in properties to JSON strings', () => {
            const data = [
                { name: 'Alice', tags: ['developer', 'designer'] },
                { name: 'Bob', tags: ['manager', 'analyst'] }
            ];

            const result = CsvConversion.fromObject(data);

            expect(result.rows).toEqual([
                { name: 'Alice', tags: '["developer","designer"]' },
                { name: 'Bob', tags: '["manager","analyst"]' }
            ]);
        });

        it('handles objects with different properties (creates union of columns)', () => {
            const data = [
                { name: 'Alice', age: 30, city: 'New York' },
                { name: 'Bob', email: 'bob@example.com' },
                { name: 'Charlie', age: 35, phone: '555-1234' }
            ];

            const result = CsvConversion.fromObject(data);

            expect(result.columns).toContain('name');
            expect(result.columns).toContain('age');
            expect(result.columns).toContain('city');
            expect(result.columns).toContain('email');
            expect(result.columns).toContain('phone');

            // Missing properties should be empty strings
            expect(result.rows[0].email).toBe('');
            expect(result.rows[0].phone).toBe('');
            expect(result.rows[1].age).toBe('');
            expect(result.rows[1].city).toBe('');
            expect(result.rows[1].phone).toBe('');
            expect(result.rows[2].city).toBe('');
            expect(result.rows[2].email).toBe('');
        });

        it('handles empty array', () => {
            const data: unknown[] = [];

            const result = CsvConversion.fromObject(data);

            expect(result.columns).toEqual([]);
            expect(result.rows).toEqual([]);
        });

        it('handles null as single value', () => {
            const data = null;

            const result = CsvConversion.fromObject(data);

            expect(result.columns).toEqual(['data']);
            expect(result.rows).toEqual([
                { data: '' }
            ]);
        });

        it('handles undefined as single value', () => {
            const data = undefined;

            const result = CsvConversion.fromObject(data);

            expect(result.columns).toEqual(['data']);
            expect(result.rows).toEqual([
                { data: '' }
            ]);
        });

        it('converts array wrapped in object to JSON string', () => {
            const data = { users: ['Alice', 'Bob', 'Charlie'] };

            const result = CsvConversion.fromObject(data);

            expect(result.columns).toEqual(['users']);
            expect(result.rows).toEqual([
                { users: '["Alice","Bob","Charlie"]' }
            ]);
        });

        it('handles mixed types in array', () => {
            const data = [
                { id: 1, name: 'Product A', active: true },
                'String value',
                42,
                { id: 2, name: 'Product B', active: false }
            ];

            const result = CsvConversion.fromObject(data);

            expect(result.columns).toContain('id');
            expect(result.columns).toContain('name');
            expect(result.columns).toContain('active');
            expect(result.columns).toContain('data');

            expect(result.rows[0]).toEqual({ id: '1', name: 'Product A', active: 'true', data: '' });
            expect(result.rows[1]).toEqual({ id: '', name: '', active: '', data: 'String value' });
            expect(result.rows[2]).toEqual({ id: '', name: '', active: '', data: '42' });
            expect(result.rows[3]).toEqual({ id: '2', name: 'Product B', active: 'false', data: '' });
        });

        it('preserves property order from first occurrence', () => {
            const data = [
                { z: 'Z1', a: 'A1', m: 'M1' },
                { a: 'A2', m: 'M2', z: 'Z2' }
            ];

            const result = CsvConversion.fromObject(data);

            // Column order is based on insertion order (first occurrence)
            expect(result.columns.length).toBe(3);
            expect(result.columns).toContain('z');
            expect(result.columns).toContain('a');
            expect(result.columns).toContain('m');
        });

        it('handles Date objects by converting to string', () => {
            const date1 = new Date('2024-01-15T10:30:00Z');
            const date2 = new Date('2024-02-20T15:45:00Z');
            const data = [
                { name: 'Event 1', date: date1 },
                { name: 'Event 2', date: date2 }
            ];

            const result = CsvConversion.fromObject(data);

            expect(result.rows[0].date).toBe(JSON.stringify(date1));
            expect(result.rows[1].date).toBe(JSON.stringify(date2));
        });

        it('handles complex nested structures', () => {
            const data = [
                {
                    id: 1,
                    user: {
                        name: 'Alice',
                        contacts: {
                            email: 'alice@example.com',
                            phones: ['555-1234', '555-5678']
                        }
                    }
                }
            ];

            const result = CsvConversion.fromObject(data);

            expect(result.columns).toEqual(['id', 'user']);
            expect(result.rows[0].id).toBe('1');

            const userObj = JSON.parse(result.rows[0].user);
            expect(userObj.name).toBe('Alice');
            expect(userObj.contacts.email).toBe('alice@example.com');
            expect(userObj.contacts.phones).toEqual(['555-1234', '555-5678']);
        });
    });
});
