import * as net from "net";
import { join } from 'path';
import { promises as fs } from 'fs';

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const FILE_NOT_FOUND = "File not found";
const FAIL = "HTTP/1.1 404 Not Found\r\n\r\n"
const SUCCESS =  "HTTP/1.1 200 OK\r\n\r\n";
const SUCCESS_PLAIN = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ";
const SUCCESS_OCTET_STREAM = "HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length:";

async function readFile(filePath: string): Promise<string> {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return content;
    } catch (error) {
        console.error('Error reading file:', error);
        return FILE_NOT_FOUND;
    }
}

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
    const args = process.argv.slice(2);
    socket.on("close", () => {
        socket.end();
    });
    socket.on("data", async (data) => {
        const request = data.toString();
        
        const regex = /(\/|\/user-agent|\/(echo|files)\/([^\/\s]+))(?=\s+HTTP\/1)/;
        const match = request.match(regex);

        let response = FAIL;
        if (match) {
            if (match[1] === '/') {
                response = SUCCESS;
            } else if (match[1] === '/user-agent') {
                const userAgent = request.match(/^User-Agent: (.+?)\s*$/m);
                if(userAgent) {
                    response = SUCCESS_PLAIN + userAgent[1].length + "\r\n\r\n" + userAgent[1];
                }
            } else if (match[2] === 'files') {
                if (args.length === 0) {
                    console.error('Please provide a directory path');
                }
                const fileName = request.match(/\/files\/([^\s]+)/);
                if(fileName) {
                    const absolutePath = join(args[1] + fileName[1]);
                    const content = await readFile(absolutePath);
                    if(content !== FILE_NOT_FOUND) {
                        response = SUCCESS_OCTET_STREAM + content.length + "\r\n\r\n" + content;
                    }
                }
            } else if (match[2] === 'echo') {
                response = SUCCESS_PLAIN + match[3].length + "\r\n\r\n" + match[3];
            }
        }

        socket.write(response);
        socket.end();
  });
});

server.listen(4221, "localhost");
