import * as net from "net";
import path, { join } from 'path';
import { promises as fs } from 'fs';

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const FILE_NOT_FOUND = "File not found";
const HEADER_END = "\r\n\r\n";
const FAIL = "HTTP/1.1 404 Not Found" + HEADER_END;
const CREATED = "HTTP/1.1 201 Created";
const SUCCESS =  "HTTP/1.1 200 OK";
const SUCCESS_PLAIN = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ";
const SUCCESS_OCTET_STREAM = "HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length:";
const CONTENT_ENCODING = "\r\nContent-Encoding: ";

enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH'
}

async function readFile(filePath: string): Promise<string> {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return content;
    } catch (error) {
        console.error('Error reading file:', error);
        return FILE_NOT_FOUND;
    }
}

async function writeFile(filePath: string, content: string): Promise<void> {
    try {
        // Ensure the directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });

        // Write the file
        await fs.writeFile(filePath, content, 'utf8');

        console.log(`File successfully written to ${filePath}`);
    } catch (error) {
        console.error(`Error writing file: ${error}`);
        throw error;
    }
}

function extractHttpMethod(request: string): string | null {
    const regex = /^(\w+)/;
    const match = request.match(regex);
    return match ? match[1] : null;
}

function extractAcceptEncoding(request: string): string | null {
    const regex = /^accept-encoding:\s*(.+)$/im;
    const match = request.match(regex);
    
    return match ? match[1].trim() : null;
}


async function getFailResponse(): Promise<string> {
    return FAIL;
}

async function handleRequest(request: string, inputParams: string[]): Promise<string> {
    const method = extractHttpMethod(request);

    console.log("Method: " + method);

    if (method === null) {
        return 'Invalid HTTP method';
    }

    let response: Promise<string>;

    switch (method) {
        case HttpMethod.GET:
            response = handleGet(request, inputParams);
            break;
        case HttpMethod.POST:
            response = handlePost(request, inputParams);
            break;
        default:
            response = getFailResponse();
    }

    return response;
}

async function handleGet(request: string, inputParams: string[]): Promise<string> {
    const regex = /(\/|\/user-agent|\/(echo|files)\/([^\/\s]+))(?=\s+HTTP\/1)/;
        const match = request.match(regex);

        let response = FAIL;
        if (match) {
            const encoding = extractAcceptEncoding(request);
            let responseEncoding = "";
            if(encoding && encoding === "gzip") {
                responseEncoding = CONTENT_ENCODING + encoding;
            }
            if (match[1] === '/') {
                response = SUCCESS + responseEncoding + HEADER_END;
            } else if (match[1] === '/user-agent') {
                const userAgent = request.match(/^User-Agent: (.+?)\s*$/m);
                if(userAgent) {
                    response = SUCCESS_PLAIN + userAgent[1].length + responseEncoding + HEADER_END + userAgent[1];
                }
            } else if (match[2] === 'files') {
                if (inputParams.length === 0) {
                    console.error('Please provide a directory path');
                }
                const fileName = request.match(/\/files\/([^\s]+)/);
                if(fileName) {
                    const absolutePath = join(inputParams[1] + fileName[1]);
                    const content = await readFile(absolutePath);
                    if(content !== FILE_NOT_FOUND) {
                        response = SUCCESS_OCTET_STREAM + content.length + responseEncoding + HEADER_END + content;
                    }
                }
            } else if (match[2] === 'echo') {
                response = SUCCESS_PLAIN + match[3].length + responseEncoding + HEADER_END + match[3];
            }
        }
    
        return response;
}

function getHttpRequestBody(request: string): string {
    const [headersString, ...bodyParts] = request.split('\r\n\r\n');
    const body = bodyParts.join('\r\n\r\n');

    return body;
}

async function handlePost(request: string, inputParams: string[]): Promise<string> {
    let response = FAIL;
    const requestBody = getHttpRequestBody(request);

    const fileName = request.match(/\/files\/([^\s]+)/);
    if(fileName) {
        const absolutePath = join(inputParams[1] + fileName[1]);
    
        try {
            await writeFile(absolutePath, requestBody);
        } catch (error) {
            console.error('Failed to write file:', error);
        }

        response = CREATED + HEADER_END;
    }

    return response;
}

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
    const inputParams = process.argv.slice(2);
    socket.on("close", () => {
        socket.end();
    });
    socket.on("data", async (data) => {
        const request = data.toString();

        console.log("Request: " + request);
        
        const response = await handleRequest(request, inputParams);

        console.log("Response: " + response);

        socket.write(response);
        socket.end();
  });
});

server.listen(4221, "localhost");
