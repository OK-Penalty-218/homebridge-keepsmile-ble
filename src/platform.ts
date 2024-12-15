import noble from 'noble';  // Import noble correctly
import { API, DynamicPlatformPlugin, PlatformAccessory, Logging, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME } from './settings';
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
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  discoverDevices() {
    noble.on('stateChange', async (state: string) => {  // Explicitly typing 'state' as a string
      if (state === 'poweredOn') {
        await noble.startScanningAsync([], false);  // Scan for all BLE devices
      } else if (state === 'poweredOff') {
        this.log.warn('Bluetooth is powered off, cannot scan for devices.');
        noble.stopScanning();
      }
    });

    noble.on('discover', async (peripheral: any) => {  // Typing 'peripheral' as 'any' for now
      if (peripheral.advertisement.localName && peripheral.advertisement.localName.includes('KS03')) {
        this.log.debug(`Discovered peripheral: ${peripheral.advertisement.localName} - ${peripheral.uuid}`);

        const uuid = this.api.hap.uuid.generate(peripheral.uuid);
        const existingAccessory = this.accessories.find(
          (accessory) => accessory.UUID === uuid
        );

        if (existingAccessory) {
          this.log.info(`Restoring existing accessory from cache: ${existingAccessory.displayName}`);
          new ExamplePlatformAccessory(this, existingAccessory);
        } else {
          this.log.info(`Adding new accessory: ${peripheral.advertisement.localName}`);
          const accessory = new this.api.platformAccessory(
            peripheral.advertisement.localName || 'BLE Light',
            uuid
          );

          accessory.context.device = {
            uuid: peripheral.uuid,
            name: peripheral.advertisement.localName,
          };

          new ExamplePlatformAccessory(this, accessory);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          this.log.debug('Accessory added successfully!');
        }

        peripheral.disconnectAsync();
      }
    });
  }
}
