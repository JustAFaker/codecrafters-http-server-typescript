import * as net from "net";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
  socket.on("close", () => {
    socket.end();
  });
  socket.on("data", (data) => {
    const request = data.toString();
    
    const regex = /^GET (\/|\/echo\/([^\/\s]+))(?=\s+HTTP\/1)/;
    const match = request.match(regex);

    let response = "HTTP/1.1 404 Not Found\r\n\r\n";
    if (match) {
        if (match[1] === '/') {
            response = "HTTP/1.1 200 OK\r\n\r\n"
        } else if (match[2]) {
            response = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: " + match[2].length + "\r\n\r\n" + match[2];
        }
    }

    socket.write(response);
    socket.end();
  });
});

server.listen(4221, "localhost");
