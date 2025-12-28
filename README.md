# Container Manager & Function Runner

A modular system for executing user code in isolated Docker containers.

## 🎯 What Does This Do?

This system allows you to:
- **Execute arbitrary JavaScript code** safely in isolated containers
- **Automatically manage containers** - creates them when needed, reuses existing ones
- **Scale dynamically** - spin up multiple Function Runner containers for different tasks
- **Isolate execution** - each code execution runs in its own sandboxed environment

## 🏛️ Architecture

The system consists of two main components:

### 1. **Function Runner** (Worker Service)
- Runs inside Docker containers
- Executes user-provided JavaScript code
- Listens on port 3000
- Multiple instances can run simultaneously

### 2. **Container Manager** (Orchestrator Service)
- Manages Function Runner containers
- Listens on port 8080 (exposed to host)
- Handles container lifecycle (create, reuse, stop)
- Routes execution requests to appropriate containers
- Monitors container health

### How It Works:
```
Client Request → Container Manager → Finds/Creates Function Runner → Executes Code → Returns Result
```

---

## 🔍 Understanding the System Components

### **Function Runner Components:**

1. **`executor.js`** - Core execution engine
   - Takes JavaScript code as string
   - Creates isolated function context
   - Executes code with provided input
   - Returns result or error

2. **`routes.js`** - API endpoints
   - `POST /execute` - Execute code endpoint
   - `GET /health` - Health check endpoint
   - Validates requests
   - Handles errors

3. **`server.js`** - HTTP server
   - Starts Express server on port 3000
   - Configures middleware
   - Registers routes

### **Container Manager Components:**

1. **`containerService.js`** - Docker management
   - Creates new Function Runner containers
   - Tracks running containers
   - Reuses existing containers
   - Stops/removes containers
   - Manages container lifecycle

2. **`httpClient.js`** - HTTP communication
   - Sends requests to Function Runner
   - Performs health checks
   - Handles timeouts
   - Retries failed connections

3. **`routes.js`** - API endpoints
   - `POST /execute` - Main execution endpoint
   - `GET /containers` - List active containers
   - `DELETE /containers/:image` - Stop container
   - `GET /health` - Health check

4. **`server.js`** - HTTP server
   - Starts Express server on port 8080
   - Exposes Container Manager API

### **Request Flow:**

```
1. Client sends POST request to Container Manager (:8080/execute)
   ↓
2. Container Manager checks if Function Runner container exists
   ↓
3. If not exists: Creates new Function Runner container
   If exists: Reuses existing container
   ↓
4. Container Manager waits for Function Runner health check
   ↓
5. Container Manager forwards request to Function Runner (:3000/execute)
   ↓
6. Function Runner executes the code
   ↓
7. Function Runner returns result
   ↓
8. Container Manager returns result to client
```

---

## 📋 Prerequisites

- **Docker** installed and running ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose** installed ([Install Docker Compose](https://docs.docker.com/compose/install/))
- **curl** or **Postman** for testing (curl usually pre-installed)
- **Terminal/Command Line** access

---

## 🏗️ Project Structure

```
project-root/
├── docker-compose.yml
├── function-runner/
│   ├── src/
│   │   ├── server.js
│   │   ├── routes.js
│   │   └── executor.js
│   ├── package.json
│   └── Dockerfile
└── container-manager/
    ├── src/
    │   ├── server.js
    │   ├── routes.js
    │   ├── containerService.js
    │   └── httpClient.js
    ├── package.json
    └── Dockerfile
```

---

## 🚀 Complete Setup & Execution Guide

Follow these steps **exactly** in order to get the system running.

---

### **STEP 1: Verify Prerequisites**

Make sure Docker is installed and running:

```bash
# Check Docker version
docker --version
# Should show: Docker version 20.x.x or higher

# Check Docker Compose version
docker-compose --version
# Should show: Docker Compose version 2.x.x or higher

# Check if Docker is running
docker ps
# Should show list of containers (may be empty)
```

If any command fails, install Docker first.

---

### **STEP 2: Create Project Directory**

```bash
# Create main project folder
mkdir container-manager-project

# Navigate into it
cd container-manager-project

# Verify you're in the right place
pwd
# Should show: /path/to/container-manager-project
```

---

### **STEP 3: Create Function Runner Service**

#### 3.1 Create directory structure:
```bash
mkdir -p function-runner/src
```

#### 3.2 Create Function Runner files:

**Create `function-runner/package.json`:**
```bash
cat > function-runner/package.json << 'EOF'
{
  "name": "function-runner",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
EOF
```

**Create `function-runner/Dockerfile`:**
```bash
cat > function-runner/Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY src ./src
EXPOSE 3000
CMD ["npm", "start"]
EOF
```

**Create `function-runner/src/executor.js`:**
```bash
cat > function-runner/src/executor.js << 'EOF'
class Executor {
  execute(code, input) {
    try {
      const func = new Function('input', code);
      return func(input);
    } catch (error) {
      throw new Error(`Execution failed: ${error.message}`);
    }
  }
}

module.exports = new Executor();
EOF
```

**Create `function-runner/src/routes.js`:**
```bash
cat > function-runner/src/routes.js << 'EOF'
const express = require('express');
const executor = require('./executor');

const router = express.Router();

router.post('/execute', (req, res) => {
  try {
    const { code, input } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const result = executor.execute(code, input);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

module.exports = router;
EOF
```

**Create `function-runner/src/server.js`:**
```bash
cat > function-runner/src/server.js << 'EOF'
const express = require('express');
const routes = require('./routes');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/', routes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Function Runner on port ${PORT}`);
});
EOF
```

#### 3.3 Verify Function Runner files:
```bash
# Check structure
ls -R function-runner/

# Should show:
# function-runner/:
# Dockerfile  package.json  src/
# 
# function-runner/src:
# executor.js  routes.js  server.js
```

---

### **STEP 4: Create Container Manager Service**

#### 4.1 Create directory structure:
```bash
mkdir -p container-manager/src
```

#### 4.2 Create Container Manager files:

**Create `container-manager/package.json`:**
```bash
cat > container-manager/package.json << 'EOF'
{
  "name": "container-manager",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "dockerode": "^4.0.0",
    "axios": "^1.6.0"
  }
}
EOF
```

**Create `container-manager/Dockerfile`:**
```bash
cat > container-manager/Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY src ./src
EXPOSE 8080
CMD ["npm", "start"]
EOF
```

**Create `container-manager/src/containerService.js`:**
```bash
cat > container-manager/src/containerService.js << 'EOF'
const Docker = require('dockerode');

class ContainerService {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.containers = new Map();
  }

  async getOrCreate(imageName) {
    if (this.containers.has(imageName)) {
      const info = this.containers.get(imageName);
      if (await this.isRunning(info.id)) {
        return info;
      }
      this.containers.delete(imageName);
    }

    return await this.createContainer(imageName);
  }

  async createContainer(imageName) {
    console.log(`Creating container for ${imageName}`);

    const container = await this.docker.createContainer({
      Image: imageName,
      ExposedPorts: { '3000/tcp': {} },
      HostConfig: { PublishAllPorts: true }
    });

    await container.start();
    
    const inspect = await container.inspect();
    const hostPort = inspect.NetworkSettings.Ports['3000/tcp'][0].HostPort;

    const info = {
      id: container.id,
      port: hostPort,
      url: `http://localhost:${hostPort}`,
      image: imageName
    };

    this.containers.set(imageName, info);
    console.log(`Container ready on port ${hostPort}`);

    return info;
  }

  async isRunning(containerId) {
    try {
      const container = this.docker.getContainer(containerId);
      const inspect = await container.inspect();
      return inspect.State.Running;
    } catch (error) {
      return false;
    }
  }

  listContainers() {
    return Array.from(this.containers.entries()).map(([image, info]) => ({
      image,
      containerId: info.id.substring(0, 12),
      port: info.port
    }));
  }

  async stopContainer(imageName) {
    if (!this.containers.has(imageName)) {
      throw new Error('Container not found');
    }

    const info = this.containers.get(imageName);
    const container = this.docker.getContainer(info.id);
    
    await container.stop();
    await container.remove();
    
    this.containers.delete(imageName);
  }
}

module.exports = new ContainerService();
EOF
```

**Create `container-manager/src/httpClient.js`:**
```bash
cat > container-manager/src/httpClient.js << 'EOF'
const axios = require('axios');

class HttpClient {
  async post(url, data, timeout = 30000) {
    try {
      const response = await axios.post(url, data, { timeout });
      return response.data;
    } catch (error) {
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }

  async waitForHealth(url, maxAttempts = 30) {
    console.log(`Waiting for health check at ${url}/health`);
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await axios.get(`${url}/health`, { timeout: 1000 });
        console.log(`Health check passed on attempt ${i + 1}`);
        return true;
      } catch (error) {
        console.log(`Health check attempt ${i + 1}/${maxAttempts} failed`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    throw new Error('Container health check failed');
  }
}

module.exports = new HttpClient();
EOF
```

**Create `container-manager/src/routes.js`:**
```bash
cat > container-manager/src/routes.js << 'EOF'
const express = require('express');
const containerService = require('./containerService');
const httpClient = require('./httpClient');

const router = express.Router();

router.post('/execute', async (req, res) => {
  try {
    const { image, payload } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    if (!payload) {
      return res.status(400).json({ error: 'Payload is required' });
    }

    const containerInfo = await containerService.getOrCreate(image);
    await httpClient.waitForHealth(containerInfo.url);

    const result = await httpClient.post(
      `${containerInfo.url}/execute`,
      payload
    );

    res.json({
      success: true,
      containerId: containerInfo.id.substring(0, 12),
      result
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/containers', (req, res) => {
  const containers = containerService.listContainers();
  res.json({ containers });
});

router.delete('/containers/:image', async (req, res) => {
  try {
    await containerService.stopContainer(req.params.image);
    res.json({ success: true, message: 'Container stopped' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    activeContainers: containerService.listContainers().length
  });
});

module.exports = router;
EOF
```

**Create `container-manager/src/server.js`:**
```bash
cat > container-manager/src/server.js << 'EOF'
const express = require('express');
const routes = require('./routes');

const app = express();
const PORT = 8080;

app.use(express.json());
app.use('/', routes);

app.listen(PORT, () => {
  console.log(`Container Manager on port ${PORT}`);
});
EOF
```

#### 4.3 Verify Container Manager files:
```bash
# Check structure
ls -R container-manager/

# Should show:
# container-manager/:
# Dockerfile  package.json  src/
# 
# container-manager/src:
# containerService.js  httpClient.js  routes.js  server.js
```

---

### **STEP 5: Create Docker Compose File**

**Create `docker-compose.yml` at project root:**
```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  container-manager:
    build: ./container-manager
    ports:
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped
EOF
```

#### 5.1 Verify complete project structure:
```bash
# From project root
tree -L 3
# OR if tree is not installed:
find . -type f -name "*.js" -o -name "*.json" -o -name "Dockerfile" -o -name "*.yml"

# Should show all files created
```

---

### **STEP 6: Build Function Runner Docker Image**

This is the **most important step** - the Function Runner image must exist before Container Manager can use it.

```bash
# Navigate to function-runner directory
cd function-runner

# Build the Docker image
docker build -t function-runner:latest .

# You'll see output like:
# [+] Building 15.2s (10/10) FINISHED
# => [internal] load build definition
# => => transferring dockerfile
# => [internal] load .dockerignore
# ...
# => exporting to image
# => => naming to docker.io/library/function-runner:latest

# Go back to project root
cd ..
```

#### 6.1 Verify the image was built:
```bash
docker images | grep function-runner

# Should show:
# function-runner   latest   abc123def456   2 minutes ago   150MB
```

**⚠️ CRITICAL:** If you don't see the image, the system won't work. Rebuild it.

---

### **STEP 7: Start Container Manager**

```bash
# From project root
docker-compose up -d

# You'll see:
# [+] Running 2/2
#  ✔ Network container-manager-project_default  Created
#  ✔ Container container-manager-project-container-manager-1  Started
```

#### 7.1 Verify Container Manager is running:
```bash
docker-compose ps

# Should show:
# NAME                                          STATUS
# container-manager-project-container-manager-1 Up 5 seconds
```

#### 7.2 Check Container Manager logs:
```bash
docker-compose logs -f

# Should show:
# container-manager-1  | Container Manager on port 8080

# Press Ctrl+C to exit logs
```

---

### **STEP 8: Test the System**

Now let's verify everything works!

#### 8.1 Test Container Manager Health:
```bash
curl http://localhost:8080/health

# Expected response:
# {"status":"healthy","activeContainers":0}
```

✅ If you see this, Container Manager is working!

#### 8.2 Test Code Execution (Simple Addition):
```bash
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "image": "function-runner:latest",
    "payload": {
      "code": "return input.a + input.b;",
      "input": {"a": 5, "b": 3}
    }
  }'

# Expected response:
# {
#   "success": true,
#   "containerId": "abc123def456",
#   "result": {
#     "success": true,
#     "result": 8
#   }
# }
```

✅ If you see `"result": 8`, the entire system is working!

#### 8.3 Check active containers:
```bash
curl http://localhost:8080/containers

# Expected response:
# {
#   "containers": [
#     {
#       "image": "function-runner:latest",
#       "containerId": "abc123def456",
#       "port": "32768"
#     }
#   ]
# }
```

#### 8.4 Verify Function Runner container is running:
```bash
docker ps | grep function-runner

# Should show a running container
```

---

### **STEP 9: Test More Complex Examples**

#### 9.1 String Manipulation:
```bash
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "image": "function-runner:latest",
    "payload": {
      "code": "return input.name.toUpperCase() + \"!\";",
      "input": {"name": "alice"}
    }
  }'

# Expected: {"success":true,"containerId":"...","result":{"success":true,"result":"ALICE!"}}
```

#### 9.2 Array Operations:
```bash
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "image": "function-runner:latest",
    "payload": {
      "code": "return input.numbers.reduce((sum, n) => sum + n, 0);",
      "input": {"numbers": [1, 2, 3, 4, 5]}
    }
  }'

# Expected: {"success":true,"containerId":"...","result":{"success":true,"result":15}}
```

#### 9.3 Object Manipulation:
```bash
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "image": "function-runner:latest",
    "payload": {
      "code": "return { fullName: input.firstName + \" \" + input.lastName, age: input.age + 1 };",
      "input": {"firstName": "John", "lastName": "Doe", "age": 30}
    }
  }'

# Expected: {"success":true,"containerId":"...","result":{"success":true,"result":{"fullName":"John Doe","age":31}}}
```

---

### **STEP 10: Test Container Reuse**

The Container Manager reuses containers for efficiency. Let's verify:

```bash
# Send first request
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{"image":"function-runner:latest","payload":{"code":"return 1;","input":{}}}'

# Immediately send second request
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{"image":"function-runner:latest","payload":{"code":"return 2;","input":{}}}'

# Check logs - should see "Container already exists" or similar
docker-compose logs container-manager
```

The same container handles both requests!

---

## 🔍 Using Postman

### Configuration

1. **Method:** `POST`
2. **URL:** `http://localhost:8080/execute`
3. **Headers:**
   - `Content-Type: application/json`
4. **Body (raw JSON):**

```json
{
  "image": "function-runner:latest",
  "payload": {
    "code": "return input.a + input.b;",
    "input": {"a": 5, "b": 3}
  }
}
```

### More Examples

**String Manipulation:**
```json
{
  "image": "function-runner:latest",
  "payload": {
    "code": "return input.text.split('').reverse().join('');",
    "input": {"text": "hello"}
  }
}
```

**Object Operations:**
```json
{
  "image": "function-runner:latest",
  "payload": {
    "code": "return { fullName: input.firstName + ' ' + input.lastName, age: input.age };",
    "input": {"firstName": "John", "lastName": "Doe", "age": 30}
  }
}
```

**Conditional Logic:**
```json
{
  "image": "function-runner:latest",
  "payload": {
    "code": "return input.age >= 18 ? 'Adult' : 'Minor';",
    "input": {"age": 25}
  }
}
```

---

## 🛠️ Management Commands

### Check Container Manager Status

```bash
docker-compose ps
```

### View Container Manager Logs

```bash
docker-compose logs -f container-manager
```

### Restart Container Manager

```bash
docker-compose restart
```

### Stop Everything

```bash
docker-compose down
```

### Stop and Remove All Function Runner Containers

```bash
docker ps -a | grep function-runner | awk '{print $1}' | xargs docker rm -f
```

### View All Running Containers

```bash
docker ps
```

---

## 🐛 Troubleshooting

### Problem: "Container health check failed"

**Cause:** Function Runner image not built or container not starting.

**Solution:**
```bash
# Rebuild Function Runner
cd function-runner
docker build -t function-runner:latest .
cd ..

# Restart Container Manager
docker-compose restart

# Check logs
docker-compose logs -f
```

### Problem: "Cannot connect to Docker daemon"

**Cause:** Docker is not running or Container Manager doesn't have socket access.

**Solution:**
```bash
# Start Docker
sudo systemctl start docker

# Check Docker status
docker ps

# On Mac: Make sure Docker Desktop is running
```

### Problem: Port 8080 already in use

**Cause:** Another service is using port 8080.

**Solution:**

Edit `docker-compose.yml` and change the port:
```yaml
ports:
  - "8081:8080"  # Use 8081 instead
```

Then access via `http://localhost:8081/execute`

### Problem: "No such image: function-runner:latest"

**Cause:** Function Runner image not built.

**Solution:**
```bash
cd function-runner
docker build -t function-runner:latest .
cd ..
```

### View Detailed Logs

```bash
# Container Manager logs
docker-compose logs container-manager

# Function Runner logs (if running)
docker logs <container-id>

# Get container ID
docker ps | grep function-runner
```

---

## 📊 System Architecture

```
┌─────────┐         ┌──────────────────┐         ┌─────────────────┐
│ Client  │ ──────> │ Container Manager│ ──────> │ Function Runner │
│(Postman)│  POST   │   (Port 8080)    │  HTTP   │   (Port 3000)   │
└─────────┘         └──────────────────┘         └─────────────────┘
                            │                             │
                            │                             │
                            ├─ Manages containers        │
                            ├─ Routes requests           │
                            └─ Monitors health  <────────┘
```

---

## 🔧 Development

### Run Function Runner Locally (Without Docker)

```bash
cd function-runner
npm install
npm start
```

Test directly:
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "return input.a + input.b;",
    "input": {"a": 5, "b": 3}
  }'
```

### Run Container Manager Locally (Without Docker)

```bash
cd container-manager
npm install
npm start
```

**Note:** When running locally, ensure Docker is running and the socket is accessible.

---

## 📝 API Reference

### POST /execute

Execute code in a Function Runner container.

**Request:**
```json
{
  "image": "function-runner:latest",
  "payload": {
    "code": "return input.a + input.b;",
    "input": {"a": 5, "b": 3}
  }
}
```

**Response:**
```json
{
  "success": true,
  "containerId": "abc123def456",
  "result": {
    "success": true,
    "result": 8
  }
}
```

### GET /containers

List all active Function Runner containers.

**Response:**
```json
{
  "containers": [
    {
      "image": "function-runner:latest",
      "containerId": "abc123def456",
      "port": "32768"
    }
  ]
}
```

### DELETE /containers/:image

Stop and remove a specific container.

**Response:**
```json
{
  "success": true,
  "message": "Container stopped"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "activeContainers": 1
}
```

---

## 🔒 Security Notes

- Code execution is isolated in containers
- No direct filesystem access
- Network isolation between containers
- Resource limits can be added in Dockerfile

---

## 📚 Next Steps

- Add authentication to Container Manager
- Implement resource limits (CPU/Memory)
- Add request rate limiting
- Implement container pooling for better performance
- Add monitoring and metrics

---

## 📄 License

MIT

---

## 🤝 Contributing

Feel free to submit issues and pull requests!
