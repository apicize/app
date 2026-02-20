"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var csv_conversion_1 = require("../../src/services/csv-conversion");
describe('CsvConversion', function () {
    describe('fromCsv', function () {
        it('parses simple CSV data', function () {
            var csvString = 'name,age,city\nAlice,30,New York\nBob,25,London';
            var result = csv_conversion_1.CsvConversion.fromCsv(csvString);
            expect(result.columns).toEqual(['name', 'age', 'city']);
            expect(result.rows).toEqual([
                { name: 'Alice', age: '30', city: 'New York' },
                { name: 'Bob', age: '25', city: 'London' }
            ]);
        });
        it('unquotes fields with commas', function () {
            var csvString = 'name,description\nProduct A,"A product, with a comma"\nProduct B,"Another product, also with comma"';
            var result = csv_conversion_1.CsvConversion.fromCsv(csvString);
            expect(result.columns).toEqual(['name', 'description']);
            expect(result.rows).toEqual([
                { name: 'Product A', description: 'A product, with a comma' },
                { name: 'Product B', description: 'Another product, also with comma' }
            ]);
        });
        it('unquotes and unescapes fields with double quotes', function () {
            var csvString = 'name,quote\nAuthor A,"He said ""hello"""\nAuthor B,"She replied ""goodbye"""';
            var result = csv_conversion_1.CsvConversion.fromCsv(csvString);
            expect(result.columns).toEqual(['name', 'quote']);
            expect(result.rows).toEqual([
                { name: 'Author A', quote: 'He said "hello"' },
                { name: 'Author B', quote: 'She replied "goodbye"' }
            ]);
        });
        it('handles fields with both commas and quotes', function () {
            var csvString = 'product,description\nItem 1,"A ""special"" item, very unique"\nItem 2,"Another ""rare"" product, highly valued"';
            var result = csv_conversion_1.CsvConversion.fromCsv(csvString);
            expect(result.columns).toEqual(['product', 'description']);
            expect(result.rows).toEqual([
                { product: 'Item 1', description: 'A "special" item, very unique' },
                { product: 'Item 2', description: 'Another "rare" product, highly valued' }
            ]);
        });
        it('handles empty fields', function () {
            var csvString = 'name,email,phone\nAlice,alice@example.com,\n,bob@example.com,555-1234';
            var result = csv_conversion_1.CsvConversion.fromCsv(csvString);
            expect(result.columns).toEqual(['name', 'email', 'phone']);
            expect(result.rows).toEqual([
                { name: 'Alice', email: 'alice@example.com', phone: '' },
                { name: '', email: 'bob@example.com', phone: '555-1234' }
            ]);
        });
        it('unquotes column headers with commas', function () {
            var csvString = 'Full Name,"Address, City",Phone Number\nAlice Smith,"123 Main St, NYC",555-1234';
            var result = csv_conversion_1.CsvConversion.fromCsv(csvString);
            expect(result.columns).toEqual(['Full Name', 'Address, City', 'Phone Number']);
            expect(result.rows).toEqual([
                { 'Full Name': 'Alice Smith', 'Address, City': '123 Main St, NYC', 'Phone Number': '555-1234' }
            ]);
        });
        it('unquotes and unescapes column headers with quotes', function () {
            var csvString = 'Name,"Favorite ""Color""",Status\nAlice,Blue,Active';
            var result = csv_conversion_1.CsvConversion.fromCsv(csvString);
            expect(result.columns).toEqual(['Name', 'Favorite "Color"', 'Status']);
            expect(result.rows).toEqual([
                { 'Name': 'Alice', 'Favorite "Color"': 'Blue', 'Status': 'Active' }
            ]);
        });
        it('handles mixed quoted and unquoted fields', function () {
            var csvString = 'ID,"Name, Title",Quote,Active,Price\n1,"Dr. Smith, PhD","He said ""hello, world""",true,99.99\n2,Ms. Jones,Simple text,false,49.5';
            var result = csv_conversion_1.CsvConversion.fromCsv(csvString);
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
        it('ignores empty lines', function () {
            var csvString = 'name,value\nAlice,123\n\nBob,456\n';
            var result = csv_conversion_1.CsvConversion.fromCsv(csvString);
            expect(result.columns).toEqual(['name', 'value']);
            expect(result.rows).toEqual([
                { name: 'Alice', value: '123' },
                { name: 'Bob', value: '456' }
            ]);
        });
        it('handles single row', function () {
            var csvString = 'name,value\nSingle,Row';
            var result = csv_conversion_1.CsvConversion.fromCsv(csvString);
            expect(result.columns).toEqual(['name', 'value']);
            expect(result.rows).toEqual([
                { name: 'Single', value: 'Row' }
            ]);
        });
        it('handles single column', function () {
            var csvString = 'name\nAlice\nBob\nCharlie';
            var result = csv_conversion_1.CsvConversion.fromCsv(csvString);
            expect(result.columns).toEqual(['name']);
            expect(result.rows).toEqual([
                { name: 'Alice' },
                { name: 'Bob' },
                { name: 'Charlie' }
            ]);
        });
    });
    describe('toCsvString', function () {
        it('converts simple data to CSV string', function () {
            var data = {
                columns: ['name', 'age', 'city'],
                rows: [
                    { name: 'Alice', age: '30', city: 'New York' },
                    { name: 'Bob', age: '25', city: 'London' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toCsvString(data);
            var expected = 'name,age,city\nAlice,30,New York\nBob,25,London';
            expect(result).toEqual(expected);
        });
        it('escapes commas in data values', function () {
            var data = {
                columns: ['name', 'description'],
                rows: [
                    { name: 'Product A', description: 'A product, with a comma' },
                    { name: 'Product B', description: 'Another product, also with comma' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toCsvString(data);
            var expected = 'name,description\nProduct A,"A product, with a comma"\nProduct B,"Another product, also with comma"';
            expect(result).toEqual(expected);
        });
        it('escapes double quotes in data values', function () {
            var data = {
                columns: ['name', 'quote'],
                rows: [
                    { name: 'Author A', quote: 'He said "hello"' },
                    { name: 'Author B', quote: 'She replied "goodbye"' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toCsvString(data);
            var expected = 'name,quote\nAuthor A,"He said ""hello"""\nAuthor B,"She replied ""goodbye"""';
            expect(result).toEqual(expected);
        });
        it('escapes values with both commas and double quotes', function () {
            var data = {
                columns: ['product', 'description'],
                rows: [
                    { product: 'Item 1', description: 'A "special" item, very unique' },
                    { product: 'Item 2', description: 'Another "rare" product, highly valued' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toCsvString(data);
            var expected = 'product,description\nItem 1,"A ""special"" item, very unique"\nItem 2,"Another ""rare"" product, highly valued"';
            expect(result).toEqual(expected);
        });
        it('handles numeric values', function () {
            var data = {
                columns: ['id', 'price', 'quantity'],
                rows: [
                    { id: '1', price: '19.99', quantity: '5' },
                    { id: '2', price: '29.99', quantity: '3' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toCsvString(data);
            var expected = 'id,price,quantity\n1,19.99,5\n2,29.99,3';
            expect(result).toEqual(expected);
        });
        it('handles boolean values', function () {
            var data = {
                columns: ['name', 'active', 'verified'],
                rows: [
                    { name: 'User 1', active: 'true', verified: 'false' },
                    { name: 'User 2', active: 'false', verified: 'true' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toCsvString(data);
            var expected = 'name,active,verified\nUser 1,true,false\nUser 2,false,true';
            expect(result).toEqual(expected);
        });
        it('escapes special characters (tabs, newlines, carriage returns)', function () {
            var data = {
                columns: ['name', 'notes'],
                rows: [
                    { name: 'Record 1', notes: 'Line 1\nLine 2' },
                    { name: 'Record 2', notes: 'Tab\tseparated\tvalues' },
                    { name: 'Record 3', notes: 'Carriage\rreturn' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toCsvString(data);
            var expected = 'name,notes\nRecord 1,Line 1\\nLine 2\nRecord 2,Tab\\tseparated\\tvalues\nRecord 3,Carriage\\rreturn';
            expect(result).toEqual(expected);
        });
        it('handles empty strings', function () {
            var data = {
                columns: ['name', 'email', 'phone'],
                rows: [
                    { name: 'Alice', email: 'alice@example.com', phone: '' },
                    { name: '', email: 'bob@example.com', phone: '555-1234' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toCsvString(data);
            var expected = 'name,email,phone\nAlice,alice@example.com,\n,bob@example.com,555-1234';
            expect(result).toEqual(expected);
        });
        it('handles single row', function () {
            var data = {
                columns: ['name', 'value'],
                rows: [
                    { name: 'Single', value: 'Row' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toCsvString(data);
            var expected = 'name,value\nSingle,Row';
            expect(result).toEqual(expected);
        });
        it('handles single column', function () {
            var data = {
                columns: ['name'],
                rows: [
                    { name: 'Alice' },
                    { name: 'Bob' },
                    { name: 'Charlie' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toCsvString(data);
            var expected = 'name\nAlice\nBob\nCharlie';
            expect(result).toEqual(expected);
        });
        it('escapes column headers with commas', function () {
            var data = {
                columns: ['Full Name', 'Address, City', 'Phone Number'],
                rows: [
                    { 'Full Name': 'Alice Smith', 'Address, City': '123 Main St, NYC', 'Phone Number': '555-1234' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toCsvString(data);
            var expected = 'Full Name,"Address, City",Phone Number\nAlice Smith,"123 Main St, NYC",555-1234';
            expect(result).toEqual(expected);
        });
        it('escapes column headers with quotes', function () {
            var data = {
                columns: ['Name', 'Favorite "Color"', 'Status'],
                rows: [
                    { 'Name': 'Alice', 'Favorite "Color"': 'Blue', 'Status': 'Active' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toCsvString(data);
            var expected = 'Name,"Favorite ""Color""",Status\nAlice,Blue,Active';
            expect(result).toEqual(expected);
        });
        it('handles complex mixed data with all edge cases', function () {
            var data = {
                columns: ['ID', 'Name, Title', 'Quote', 'Active', 'Price'],
                rows: [
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
                ]
            };
            var result = csv_conversion_1.CsvConversion.toCsvString(data);
            var expected = 'ID,"Name, Title",Quote,Active,Price\n1,"Dr. Smith, PhD","He said ""hello, world""",true,99.99\n2,Ms. Jones,Simple text,false,49.5';
            expect(result).toEqual(expected);
        });
    });
    describe('escapeCsv', function () {
        it('returns simple values unchanged', function () {
            expect(csv_conversion_1.CsvConversion.escapeCsv('hello')).toBe('hello');
            expect(csv_conversion_1.CsvConversion.escapeCsv('simple text')).toBe('simple text');
            expect(csv_conversion_1.CsvConversion.escapeCsv('123')).toBe('123');
        });
        it('converts numbers to strings', function () {
            expect(csv_conversion_1.CsvConversion.escapeCsv(123)).toBe('123');
            expect(csv_conversion_1.CsvConversion.escapeCsv(45.67)).toBe('45.67');
            expect(csv_conversion_1.CsvConversion.escapeCsv(0)).toBe('0');
        });
        it('converts booleans to strings', function () {
            expect(csv_conversion_1.CsvConversion.escapeCsv(true)).toBe('true');
            expect(csv_conversion_1.CsvConversion.escapeCsv(false)).toBe('false');
        });
        it('escapes tabs', function () {
            expect(csv_conversion_1.CsvConversion.escapeCsv('Tab\tseparated')).toBe('Tab\\tseparated');
            expect(csv_conversion_1.CsvConversion.escapeCsv('one\ttwo\tthree')).toBe('one\\ttwo\\tthree');
        });
        it('escapes newlines', function () {
            expect(csv_conversion_1.CsvConversion.escapeCsv('Line 1\nLine 2')).toBe('Line 1\\nLine 2');
            expect(csv_conversion_1.CsvConversion.escapeCsv('a\nb\nc')).toBe('a\\nb\\nc');
        });
        it('escapes carriage returns', function () {
            expect(csv_conversion_1.CsvConversion.escapeCsv('Carriage\rreturn')).toBe('Carriage\\rreturn');
            expect(csv_conversion_1.CsvConversion.escapeCsv('a\rb\rc')).toBe('a\\rb\\rc');
        });
        it('wraps values with commas in quotes', function () {
            expect(csv_conversion_1.CsvConversion.escapeCsv('hello, world')).toBe('"hello, world"');
            expect(csv_conversion_1.CsvConversion.escapeCsv('one, two, three')).toBe('"one, two, three"');
        });
        it('wraps values with quotes in quotes and doubles internal quotes', function () {
            expect(csv_conversion_1.CsvConversion.escapeCsv('He said "hello"')).toBe('"He said ""hello"""');
            expect(csv_conversion_1.CsvConversion.escapeCsv('A "quoted" value')).toBe('"A ""quoted"" value"');
            expect(csv_conversion_1.CsvConversion.escapeCsv('"hello"')).toBe('"""hello"""');
        });
        it('handles values with both commas and quotes', function () {
            expect(csv_conversion_1.CsvConversion.escapeCsv('He said "hello, world"')).toBe('"He said ""hello, world"""');
            expect(csv_conversion_1.CsvConversion.escapeCsv('A "special" item, very unique')).toBe('"A ""special"" item, very unique"');
        });
        it('escapes mixed special characters', function () {
            expect(csv_conversion_1.CsvConversion.escapeCsv('Tab\tseparated\nnewline\rcarriage')).toBe('Tab\\tseparated\\nnewline\\rcarriage');
        });
        it('handles empty string', function () {
            expect(csv_conversion_1.CsvConversion.escapeCsv('')).toBe('');
        });
        it('round-trips with unescapeCsv', function () {
            var originalValues = [
                'simple',
                'with, comma',
                'with "quotes"',
                'with "quotes" and, comma',
                'with\ttab',
                'with\nnewline',
                'with\rcarriage',
                'mixed\ttab\nand\rall'
            ];
            for (var _i = 0, originalValues_1 = originalValues; _i < originalValues_1.length; _i++) {
                var original = originalValues_1[_i];
                var escaped = csv_conversion_1.CsvConversion.escapeCsv(original);
                var unescaped = csv_conversion_1.CsvConversion.unescapeCsv(escaped);
                expect(unescaped).toBe(original);
            }
        });
    });
    describe('unescapeCsv', function () {
        it('returns simple values unchanged', function () {
            expect(csv_conversion_1.CsvConversion.unescapeCsv('hello')).toBe('hello');
            expect(csv_conversion_1.CsvConversion.unescapeCsv('simple text')).toBe('simple text');
            expect(csv_conversion_1.CsvConversion.unescapeCsv('123')).toBe('123');
        });
        it('trims whitespace', function () {
            expect(csv_conversion_1.CsvConversion.unescapeCsv('  hello  ')).toBe('hello');
            expect(csv_conversion_1.CsvConversion.unescapeCsv('\thello\t')).toBe('hello');
        });
        it('removes surrounding quotes', function () {
            expect(csv_conversion_1.CsvConversion.unescapeCsv('"hello"')).toBe('hello');
            expect(csv_conversion_1.CsvConversion.unescapeCsv('"simple text"')).toBe('simple text');
        });
        it('unescapes doubled quotes inside quoted values', function () {
            expect(csv_conversion_1.CsvConversion.unescapeCsv('"He said ""hello"""')).toBe('He said "hello"');
            expect(csv_conversion_1.CsvConversion.unescapeCsv('"A ""quoted"" value"')).toBe('A "quoted" value');
            expect(csv_conversion_1.CsvConversion.unescapeCsv('"""hello"""')).toBe('"hello"');
        });
        it('unescapes values with commas', function () {
            expect(csv_conversion_1.CsvConversion.unescapeCsv('"hello, world"')).toBe('hello, world');
            expect(csv_conversion_1.CsvConversion.unescapeCsv('"one, two, three"')).toBe('one, two, three');
        });
        it('unescapes values with both commas and quotes', function () {
            expect(csv_conversion_1.CsvConversion.unescapeCsv('"He said ""hello, world"""')).toBe('He said "hello, world"');
            expect(csv_conversion_1.CsvConversion.unescapeCsv('"A ""special"" item, very unique"')).toBe('A "special" item, very unique');
        });
        it('unescapes escaped tabs', function () {
            expect(csv_conversion_1.CsvConversion.unescapeCsv('Tab\\tseparated')).toBe('Tab\tseparated');
            expect(csv_conversion_1.CsvConversion.unescapeCsv('one\\ttwo\\tthree')).toBe('one\ttwo\tthree');
        });
        it('unescapes escaped newlines', function () {
            expect(csv_conversion_1.CsvConversion.unescapeCsv('Line 1\\nLine 2')).toBe('Line 1\nLine 2');
            expect(csv_conversion_1.CsvConversion.unescapeCsv('a\\nb\\nc')).toBe('a\nb\nc');
        });
        it('unescapes escaped carriage returns', function () {
            expect(csv_conversion_1.CsvConversion.unescapeCsv('Carriage\\rreturn')).toBe('Carriage\rreturn');
            expect(csv_conversion_1.CsvConversion.unescapeCsv('a\\rb\\rc')).toBe('a\rb\rc');
        });
        it('unescapes mixed special characters', function () {
            expect(csv_conversion_1.CsvConversion.unescapeCsv('Tab\\tseparated\\nnewline\\rcarriage')).toBe('Tab\tseparated\nnewline\rcarriage');
        });
        it('handles empty string', function () {
            expect(csv_conversion_1.CsvConversion.unescapeCsv('')).toBe('');
        });
        it('handles empty quoted string', function () {
            expect(csv_conversion_1.CsvConversion.unescapeCsv('""')).toBe('');
        });
        it('round-trips with escapeCsv via toCsvString/fromCsv', function () {
            var originalValues = [
                'simple',
                'with, comma',
                'with "quotes"',
                'with "quotes" and, comma',
                'with\ttab',
                'with\nnewline',
                'with\rcarriage',
                'mixed\ttab\nand\rall'
            ];
            for (var _i = 0, originalValues_2 = originalValues; _i < originalValues_2.length; _i++) {
                var original = originalValues_2[_i];
                var data = { columns: ['value'], rows: [{ value: original }] };
                var csvString = csv_conversion_1.CsvConversion.toCsvString(data);
                var lines = csvString.split('\n');
                var escapedValue = lines[1];
                var unescaped = csv_conversion_1.CsvConversion.unescapeCsv(escapedValue);
                expect(unescaped).toBe(original);
            }
        });
    });
    describe('round-trip conversion', function () {
        it('preserves data through toCsvString and fromCsv', function () {
            var originalData = {
                columns: ['name', 'description', 'price'],
                rows: [
                    { name: 'Product A', description: 'A product, with a comma', price: '19.99' },
                    { name: 'Product B', description: 'He said "hello"', price: '29.99' },
                    { name: 'Product C', description: 'Both "quotes" and, commas', price: '39.99' }
                ]
            };
            var csvString = csv_conversion_1.CsvConversion.toCsvString(originalData);
            var parsedData = csv_conversion_1.CsvConversion.fromCsv(csvString);
            expect(parsedData.columns).toEqual(originalData.columns);
            expect(parsedData.rows).toEqual(originalData.rows);
        });
        it('preserves special characters in headers and values', function () {
            var originalData = {
                columns: ['ID', 'Name, Title', 'Favorite "Color"'],
                rows: [
                    { 'ID': '1', 'Name, Title': 'Dr. Smith, PhD', 'Favorite "Color"': 'Blue "Sky"' },
                    { 'ID': '2', 'Name, Title': 'Ms. Jones', 'Favorite "Color"': 'Red' }
                ]
            };
            var csvString = csv_conversion_1.CsvConversion.toCsvString(originalData);
            var parsedData = csv_conversion_1.CsvConversion.fromCsv(csvString);
            expect(parsedData.columns).toEqual(originalData.columns);
            expect(parsedData.rows).toEqual(originalData.rows);
        });
        it('preserves empty values', function () {
            var originalData = {
                columns: ['name', 'email', 'phone'],
                rows: [
                    { name: 'Alice', email: 'alice@example.com', phone: '' },
                    { name: '', email: 'bob@example.com', phone: '555-1234' }
                ]
            };
            var csvString = csv_conversion_1.CsvConversion.toCsvString(originalData);
            var parsedData = csv_conversion_1.CsvConversion.fromCsv(csvString);
            expect(parsedData.columns).toEqual(originalData.columns);
            expect(parsedData.rows).toEqual(originalData.rows);
        });
        it('preserves complex nested objects and arrays through fromObject and toObject', function () {
            var originalData = [
                {
                    id: 1,
                    name: 'Alice',
                    address: {
                        street: '123 Main St',
                        city: 'New York',
                        coordinates: { lat: 40.7128, lng: -74.0060 }
                    },
                    tags: ['developer', 'designer'],
                    projects: [
                        { name: 'Project A', status: 'active' },
                        { name: 'Project B', status: 'completed' }
                    ]
                },
                {
                    id: 2,
                    name: 'Bob',
                    address: {
                        street: '456 Oak Ave',
                        city: 'Los Angeles',
                        coordinates: { lat: 34.0522, lng: -118.2437 }
                    },
                    tags: ['manager'],
                    projects: [
                        { name: 'Project C', status: 'pending' }
                    ]
                }
            ];
            // Convert to CSV format
            var csvData = csv_conversion_1.CsvConversion.fromObject(originalData);
            // Verify columns were created
            expect(csvData.columns).toContain('id');
            expect(csvData.columns).toContain('name');
            expect(csvData.columns).toContain('address');
            expect(csvData.columns).toContain('tags');
            expect(csvData.columns).toContain('projects');
            // Convert back to objects
            var result = csv_conversion_1.CsvConversion.toObject(csvData);
            // Verify round-trip preserves the data
            expect(result.length).toBe(2);
            // Check first object
            expect(result[0].id).toBe('1');
            expect(result[0].name).toBe('Alice');
            expect(result[0].address).toEqual({
                street: '123 Main St',
                city: 'New York',
                coordinates: { lat: 40.7128, lng: -74.0060 }
            });
            expect(result[0].tags).toEqual(['developer', 'designer']);
            expect(result[0].projects).toEqual([
                { name: 'Project A', status: 'active' },
                { name: 'Project B', status: 'completed' }
            ]);
            // Check second object
            expect(result[1].id).toBe('2');
            expect(result[1].name).toBe('Bob');
            expect(result[1].address).toEqual({
                street: '456 Oak Ave',
                city: 'Los Angeles',
                coordinates: { lat: 34.0522, lng: -118.2437 }
            });
            expect(result[1].tags).toEqual(['manager']);
            expect(result[1].projects).toEqual([
                { name: 'Project C', status: 'pending' }
            ]);
        });
    });
    describe('toObject', function () {
        it('converts simple CSV data to array of objects', function () {
            var data = {
                columns: ['name', 'age', 'city'],
                rows: [
                    { name: 'Alice', age: '30', city: 'New York' },
                    { name: 'Bob', age: '25', city: 'London' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toObject(data);
            expect(result).toEqual([
                { name: 'Alice', age: '30', city: 'New York' },
                { name: 'Bob', age: '25', city: 'London' }
            ]);
        });
        it('handles single row', function () {
            var data = {
                columns: ['product', 'price'],
                rows: [
                    { product: 'Widget', price: '19.99' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toObject(data);
            expect(result).toEqual([
                { product: 'Widget', price: '19.99' }
            ]);
        });
        it('handles single column', function () {
            var data = {
                columns: ['name'],
                rows: [
                    { name: 'Alice' },
                    { name: 'Bob' },
                    { name: 'Charlie' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toObject(data);
            expect(result).toEqual([
                { name: 'Alice' },
                { name: 'Bob' },
                { name: 'Charlie' }
            ]);
        });
        it('handles empty values as empty strings', function () {
            var data = {
                columns: ['name', 'email', 'phone'],
                rows: [
                    { name: 'Alice', email: 'alice@example.com', phone: '' },
                    { name: '', email: 'bob@example.com', phone: '555-1234' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toObject(data);
            expect(result).toEqual([
                { name: 'Alice', email: 'alice@example.com', phone: '' },
                { name: '', email: 'bob@example.com', phone: '555-1234' }
            ]);
        });
        it('handles missing column values as empty strings', function () {
            var data = {
                columns: ['name', 'email', 'phone'],
                rows: [
                    { name: 'Alice', email: 'alice@example.com' },
                    { name: 'Bob' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toObject(data);
            expect(result).toEqual([
                { name: 'Alice', email: 'alice@example.com', phone: '' },
                { name: 'Bob', email: '', phone: '' }
            ]);
        });
        it('preserves special characters in column names', function () {
            var data = {
                columns: ['Full Name', 'Address, City', 'Favorite "Color"'],
                rows: [
                    { 'Full Name': 'Alice Smith', 'Address, City': '123 Main St, NYC', 'Favorite "Color"': 'Blue' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toObject(data);
            expect(result).toEqual([
                { 'Full Name': 'Alice Smith', 'Address, City': '123 Main St, NYC', 'Favorite "Color"': 'Blue' }
            ]);
        });
        it('preserves special characters in values', function () {
            var data = {
                columns: ['product', 'description'],
                rows: [
                    { product: 'Item 1', description: 'A "special" item, very unique' },
                    { product: 'Item 2', description: 'Has\ttabs\tand\nnewlines' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toObject(data);
            expect(result).toEqual([
                { product: 'Item 1', description: 'A "special" item, very unique' },
                { product: 'Item 2', description: 'Has\ttabs\tand\nnewlines' }
            ]);
        });
        it('handles empty CSV data', function () {
            var data = {
                columns: ['name', 'value'],
                rows: []
            };
            var result = csv_conversion_1.CsvConversion.toObject(data);
            expect(result).toEqual([]);
        });
        it('maintains column order in object keys', function () {
            var data = {
                columns: ['z_field', 'a_field', 'm_field'],
                rows: [
                    { z_field: 'Z', a_field: 'A', m_field: 'M' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toObject(data);
            expect(result).toEqual([
                { z_field: 'Z', a_field: 'A', m_field: 'M' }
            ]);
            // Verify keys exist in object
            var keys = Object.keys(result[0]);
            expect(keys).toContain('z_field');
            expect(keys).toContain('a_field');
            expect(keys).toContain('m_field');
        });
        it('handles complex data with multiple rows and columns', function () {
            var data = {
                columns: ['id', 'name', 'email', 'status', 'score'],
                rows: [
                    { id: '1', name: 'Alice', email: 'alice@example.com', status: 'active', score: '95' },
                    { id: '2', name: 'Bob', email: 'bob@example.com', status: 'inactive', score: '87' },
                    { id: '3', name: 'Charlie', email: 'charlie@example.com', status: 'active', score: '92' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toObject(data);
            expect(result.length).toBe(3);
            expect(Object.keys(result[0]).length).toBe(5);
            expect(Object.keys(result[1]).length).toBe(5);
            expect(Object.keys(result[2]).length).toBe(5);
            expect(result[0]).toEqual({
                id: '1',
                name: 'Alice',
                email: 'alice@example.com',
                status: 'active',
                score: '95'
            });
        });
        it('unescapes CSV-escaped values', function () {
            var data = {
                columns: ['name', 'description'],
                rows: [
                    { name: 'Product A', description: '"A product, with a comma"' },
                    { name: 'Product B', description: '"He said ""hello"""' },
                    { name: 'Product C', description: 'Tab\\tseparated\\nnewline' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toObject(data);
            expect(result).toEqual([
                { name: 'Product A', description: 'A product, with a comma' },
                { name: 'Product B', description: 'He said "hello"' },
                { name: 'Product C', description: 'Tab\tseparated\nnewline' }
            ]);
        });
        it('unescapes quoted values containing JSON and parses them', function () {
            var data = {
                columns: ['name', 'config'],
                rows: [
                    { name: 'Item 1', config: '"{""key"": ""value""}"' }
                ]
            };
            var result = csv_conversion_1.CsvConversion.toObject(data);
            // After unescaping, the JSON is parsed into an object
            expect(result[0]).toEqual({ name: 'Item 1', config: { key: 'value' } });
        });
    });
    describe('fromObject', function () {
        it('converts array of simple objects to CSV', function () {
            var data = [
                { name: 'Alice', age: 30, city: 'New York' },
                { name: 'Bob', age: 25, city: 'London' }
            ];
            var result = csv_conversion_1.CsvConversion.fromObject(data);
            expect(result.columns).toContain('name');
            expect(result.columns).toContain('age');
            expect(result.columns).toContain('city');
            expect(result.rows).toEqual([
                { name: 'Alice', age: '30', city: 'New York' },
                { name: 'Bob', age: '25', city: 'London' }
            ]);
        });
        it('converts single object to CSV (wraps in array)', function () {
            var data = { name: 'Alice', age: 30, city: 'New York' };
            var result = csv_conversion_1.CsvConversion.fromObject(data);
            expect(result.columns).toContain('name');
            expect(result.columns).toContain('age');
            expect(result.columns).toContain('city');
            expect(result.rows).toEqual([
                { name: 'Alice', age: '30', city: 'New York' }
            ]);
        });
        it('converts array of primitives to objects with "data" property', function () {
            var data = ['Alice', 'Bob', 'Charlie'];
            var result = csv_conversion_1.CsvConversion.fromObject(data);
            expect(result.columns).toEqual(['data']);
            expect(result.rows).toEqual([
                { data: 'Alice' },
                { data: 'Bob' },
                { data: 'Charlie' }
            ]);
        });
        it('converts single primitive to object with "data" property', function () {
            var data = 'Hello World';
            var result = csv_conversion_1.CsvConversion.fromObject(data);
            expect(result.columns).toEqual(['data']);
            expect(result.rows).toEqual([
                { data: 'Hello World' }
            ]);
        });
        it('converts numbers to strings', function () {
            var data = [
                { id: 1, price: 19.99, quantity: 5 },
                { id: 2, price: 29.99, quantity: 3 }
            ];
            var result = csv_conversion_1.CsvConversion.fromObject(data);
            expect(result.rows).toEqual([
                { id: '1', price: '19.99', quantity: '5' },
                { id: '2', price: '29.99', quantity: '3' }
            ]);
        });
        it('converts booleans to strings', function () {
            var data = [
                { name: 'User 1', active: true, verified: false },
                { name: 'User 2', active: false, verified: true }
            ];
            var result = csv_conversion_1.CsvConversion.fromObject(data);
            expect(result.rows).toEqual([
                { name: 'User 1', active: 'true', verified: 'false' },
                { name: 'User 2', active: 'false', verified: 'true' }
            ]);
        });
        it('converts null values to empty strings', function () {
            var data = [
                { name: 'Alice', email: 'alice@example.com', phone: null },
                { name: 'Bob', email: null, phone: '555-1234' }
            ];
            var result = csv_conversion_1.CsvConversion.fromObject(data);
            expect(result.rows).toEqual([
                { name: 'Alice', email: 'alice@example.com', phone: '' },
                { name: 'Bob', email: '', phone: '555-1234' }
            ]);
        });
        it('converts undefined values to empty strings', function () {
            var data = [
                { name: 'Alice', email: 'alice@example.com', phone: undefined },
                { name: 'Bob', email: undefined, phone: '555-1234' }
            ];
            var result = csv_conversion_1.CsvConversion.fromObject(data);
            expect(result.rows).toEqual([
                { name: 'Alice', email: 'alice@example.com', phone: '' },
                { name: 'Bob', email: '', phone: '555-1234' }
            ]);
        });
        it('converts nested objects to JSON strings', function () {
            var data = [
                { name: 'Alice', address: { street: '123 Main St', city: 'NYC' } },
                { name: 'Bob', address: { street: '456 Oak Ave', city: 'LA' } }
            ];
            var result = csv_conversion_1.CsvConversion.fromObject(data);
            expect(result.columns).toContain('name');
            expect(result.columns).toContain('address');
            expect(result.rows).toEqual([
                { name: 'Alice', address: '{"street":"123 Main St","city":"NYC"}' },
                { name: 'Bob', address: '{"street":"456 Oak Ave","city":"LA"}' }
            ]);
        });
        it('converts arrays in properties to JSON strings', function () {
            var data = [
                { name: 'Alice', tags: ['developer', 'designer'] },
                { name: 'Bob', tags: ['manager', 'analyst'] }
            ];
            var result = csv_conversion_1.CsvConversion.fromObject(data);
            expect(result.rows).toEqual([
                { name: 'Alice', tags: '["developer","designer"]' },
                { name: 'Bob', tags: '["manager","analyst"]' }
            ]);
        });
        it('handles objects with different properties (creates union of columns)', function () {
            var data = [
                { name: 'Alice', age: 30, city: 'New York' },
                { name: 'Bob', email: 'bob@example.com' },
                { name: 'Charlie', age: 35, phone: '555-1234' }
            ];
            var result = csv_conversion_1.CsvConversion.fromObject(data);
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
        it('handles empty array', function () {
            var data = [];
            var result = csv_conversion_1.CsvConversion.fromObject(data);
            expect(result.columns).toEqual([]);
            expect(result.rows).toEqual([]);
        });
        it('handles null as single value', function () {
            var data = null;
            var result = csv_conversion_1.CsvConversion.fromObject(data);
            expect(result.columns).toEqual(['data']);
            expect(result.rows).toEqual([
                { data: '' }
            ]);
        });
        it('handles undefined as single value', function () {
            var data = undefined;
            var result = csv_conversion_1.CsvConversion.fromObject(data);
            expect(result.columns).toEqual(['data']);
            expect(result.rows).toEqual([
                { data: '' }
            ]);
        });
        it('converts array wrapped in object to JSON string', function () {
            var data = { users: ['Alice', 'Bob', 'Charlie'] };
            var result = csv_conversion_1.CsvConversion.fromObject(data);
            expect(result.columns).toEqual(['users']);
            expect(result.rows).toEqual([
                { users: '["Alice","Bob","Charlie"]' }
            ]);
        });
        it('handles mixed types in array', function () {
            var data = [
                { id: 1, name: 'Product A', active: true },
                'String value',
                42,
                { id: 2, name: 'Product B', active: false }
            ];
            var result = csv_conversion_1.CsvConversion.fromObject(data);
            expect(result.columns).toContain('id');
            expect(result.columns).toContain('name');
            expect(result.columns).toContain('active');
            expect(result.columns).toContain('data');
            expect(result.rows[0]).toEqual({ id: '1', name: 'Product A', active: 'true', data: '' });
            expect(result.rows[1]).toEqual({ id: '', name: '', active: '', data: 'String value' });
            expect(result.rows[2]).toEqual({ id: '', name: '', active: '', data: '42' });
            expect(result.rows[3]).toEqual({ id: '2', name: 'Product B', active: 'false', data: '' });
        });
        it('preserves property order from first occurrence', function () {
            var data = [
                { z: 'Z1', a: 'A1', m: 'M1' },
                { a: 'A2', m: 'M2', z: 'Z2' }
            ];
            var result = csv_conversion_1.CsvConversion.fromObject(data);
            // Column order is based on insertion order (first occurrence)
            expect(result.columns.length).toBe(3);
            expect(result.columns).toContain('z');
            expect(result.columns).toContain('a');
            expect(result.columns).toContain('m');
        });
        it('handles Date objects by converting to string', function () {
            var date1 = new Date('2024-01-15T10:30:00Z');
            var date2 = new Date('2024-02-20T15:45:00Z');
            var data = [
                { name: 'Event 1', date: date1 },
                { name: 'Event 2', date: date2 }
            ];
            var result = csv_conversion_1.CsvConversion.fromObject(data);
            expect(result.rows[0].date).toBe(JSON.stringify(date1));
            expect(result.rows[1].date).toBe(JSON.stringify(date2));
        });
        it('handles complex nested structures', function () {
            var data = [
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
            var result = csv_conversion_1.CsvConversion.fromObject(data);
            expect(result.columns).toEqual(['id', 'user']);
            expect(result.rows[0].id).toBe('1');
            var userObj = JSON.parse(result.rows[0].user);
            expect(userObj.name).toBe('Alice');
            expect(userObj.contacts.email).toBe('alice@example.com');
            expect(userObj.contacts.phones).toEqual(['555-1234', '555-5678']);
        });
    });
});
