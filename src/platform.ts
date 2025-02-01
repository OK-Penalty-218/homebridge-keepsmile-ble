import noble, { Peripheral } from 'noble';  // Import noble correctly
import { API, DynamicPlatformPlugin, PlatformAccessory, Logging, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLUGIN_NAME, PLATFORM_NAME } from './settings';
import { ExamplePlatformAccessory } from './platformAccessory'; // Assuming you have a platformAccessory file

export class ExampleHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly accessories: PlatformAccessory[] = [];
  private connected: boolean = false;

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.startScanning();
    });

    // Handle Bluetooth state on startup
    if (noble.state === 'poweredOn') {
      this.startScanning();
    } else {
      noble.on('stateChange', (state: string) => {
        if (state === 'poweredOn') {
          this.startScanning();
        } else {
          this.log.warn('Bluetooth is powered off, cannot scan for devices.');
          noble.stopScanning();
        }
      });
    }
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  startScanning() {
    this.log.info('Starting Bluetooth scanning...');
    noble.startScanning([], false);

    noble.on('discover', (peripheral: Peripheral) => {
      const localName = peripheral.advertisement.localName;
      if (localName && localName.includes('KS03')) {
        this.log.debug(`Discovered peripheral: ${localName} - ${peripheral.uuid}`);

        const uuid = this.api.hap.uuid.generate(peripheral.uuid);
        const existingAccessory = this.accessories.find(
          (accessory) => accessory.UUID === uuid,
        );

        if (existingAccessory) {
          this.log.info(`Restoring existing accessory from cache: ${existingAccessory.displayName}`);
          new ExamplePlatformAccessory(this, existingAccessory);
        } else {
          this.log.info(`Adding new accessory: ${localName}`);
          const accessory = new this.api.platformAccessory(
            localName || 'BLE Light',
            uuid,
          );

          accessory.context.device = {
            uuid: peripheral.uuid,
            name: localName,
          };

          new ExamplePlatformAccessory(this, accessory);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          this.log.debug('Accessory added successfully!');
        }

        peripheral.disconnect();
      }
    });
  }
}
