import { API, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { ExamplePlatformAccessory } from './platformAccessory.js';
import axios from 'axios'; // Assuming you're using axios to interact with Keepsmile API

export class ExampleHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  public readonly accessories: PlatformAccessory[] = [];
  private keepsmileToken?: string; // Store the token for future API requests

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');
      await this.authenticateKeepsmile();
      this.loadConfiguredAccessories(); // Load devices manually after successful login
    });
  }

  /**
   * Authenticates with the Keepsmile app using the provided username and password.
   */
  async authenticateKeepsmile() {
    const { username, password } = this.config;

    if (!username || !password) {
      this.log.error('Keepsmile username and password must be provided in config.json');
      return;
    }

    try {
      // Make an API request to authenticate with Keepsmile (assuming there's an API endpoint)
      const response = await axios.post('https://api.keepsmile.com/login', {
        username,
        password,
      });

      if (response.data && response.data.token) {
        this.keepsmileToken = response.data.token;
        this.log.info('Successfully authenticated with Keepsmile app');
      } else {
        this.log.error('Keepsmile authentication failed: no token received');
      }
    } catch (error) {
      this.log.error(`Keepsmile authentication error: ${error.message}`);
    }
  }

  /**
   * This method loads manually configured accessories from `config.json`.
   */
  loadConfiguredAccessories() {
    const devices = this.config.devices; // Devices are defined in the config

    if (!devices || devices.length === 0) {
      this.log.warn('No devices configured in config.json');
      return;
    }

    devices.forEach((device) => {
      const uuid = this.api.hap.uuid.generate(device.bluetoothuuid || device.name);
      const existingAccessory = this.accessories.find(
        (accessory) => accessory.UUID === uuid
      );

      if (existingAccessory) {
        this.log.info(`Restoring existing accessory from cache: ${existingAccessory.displayName}`);
        new ExamplePlatformAccessory(this, existingAccessory);
      } else {
        this.log.info(`Adding new accessory: ${device.name}`);
        const accessory = new this.api.platformAccessory(device.name, uuid);
        accessory.context.device = device; // Store device info in context

        new ExamplePlatformAccessory(this, accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.log.debug('Accessory added successfully!');
      }
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }
}
