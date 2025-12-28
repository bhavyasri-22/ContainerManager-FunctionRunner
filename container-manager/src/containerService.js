const Docker = require('dockerode');

class ContainerService {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.containers = new Map();
  }

  async getOrCreate(imageName) {
    // Reuse container if running
    if (this.containers.has(imageName)) {
      const info = this.containers.get(imageName);
      if (await this.isRunning(info.id)) {
        console.log(`Reusing container for ${imageName}`);
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
      HostConfig: {
        PortBindings: { '3000/tcp': [{ HostPort: '3000' }] } // fixed port for local testing
      }
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
