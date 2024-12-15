import { API, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { ExamplePlatformAccessory } from './platformAccessory.js';

export class ExampleHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.name);

    // Do not call discoverDevices, now it's a manual configuration process.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.loadConfiguredAccessories(); // Manually load configured accessories
    });
  }

  /**
   * This method loads manually configured accessories from `config.json`.
   */
  loadConfiguredAccessories() {
    const devices = this.config.devices; // Assuming you have a `devices` field in your config

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
        accessory.context.device = device; // Store device information in the context

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

